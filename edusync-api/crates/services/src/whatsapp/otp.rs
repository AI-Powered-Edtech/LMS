/// Port dari `supabase/functions/send-parent-otp/index.ts`
///
/// OTP 6 digit untuk verifikasi orang tua via WhatsApp.
/// Tersimpan di tabel `parent_otp_codes` dengan kedaluwarsa 5 menit.
use chrono::{Duration, Utc};
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::whatsapp::WhatsAppClient;
use edusync_middleware::errors::AppError;

// DEPENDENCY: rand = "0.9"

// ── Struct OTP ────────────────────────────────────────────────────────────────

/// OTP yang baru dibuat.
#[derive(Debug)]
pub struct Otp {
    /// Kode 6 digit.
    pub code: String,
    /// Waktu kedaluwarsa (UTC).
    pub expires_at: chrono::DateTime<Utc>,
}

// ── Row tabel parent_otp_codes ────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct OtpRow {
    code: String,
    expires_at: chrono::DateTime<Utc>,
    used: bool,
}

// ── Normalisasi nomor HP ──────────────────────────────────────────────────────

/// Normalisasi nomor HP ke format internasional (Indonesia).
/// `08xx` → `+628xx`, `628xx` → `+628xx`, `+628xx` → tetap.
pub fn normalize_phone(phone: &str) -> String {
    let digits: String = phone
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect();
    if digits.starts_with('+') {
        return digits;
    }
    if digits.starts_with("62") {
        return format!("+{}", digits);
    }
    if digits.starts_with('0') {
        return format!("+62{}", &digits[1..]);
    }
    format!("+62{}", digits)
}

/// Validasi format nomor HP Indonesia.
pub fn is_valid_phone(phone: &str) -> bool {
    let normalized = normalize_phone(phone);
    // +62 diikuti 8–12 digit
    normalized.starts_with("+62")
        && normalized[3..].chars().all(|c| c.is_ascii_digit())
        && (11..=15).contains(&normalized.len())
}

// ── Fungsi kirim OTP ──────────────────────────────────────────────────────────

/// Buat OTP 6 digit, simpan ke DB, dan kirim via WhatsApp.
///
/// Rate limit ditangani di DB: hanya 1 OTP per 1 menit per `parent_user_id`.
pub async fn send_otp(db: &PgPool, parent_user_id: Uuid) -> Result<Otp, AppError> {
    // Ambil nomor HP orang tua
    let phone_row = sqlx::query!(
        "SELECT phone FROM profiles WHERE id = $1",
        parent_user_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal mengambil profil: {e}")))?
    .ok_or(AppError::NotFound)?;

    let raw_phone = phone_row
        .phone
        .ok_or_else(|| AppError::BadRequest("Nomor HP orang tua belum diisi".to_string()))?;

    if !is_valid_phone(&raw_phone) {
        return Err(AppError::BadRequest(
            "Format nomor HP tidak valid. Gunakan format: 08xx-xxxx-xxxx".to_string(),
        ));
    }

    let phone = normalize_phone(&raw_phone);

    // Cek rate limit — batalkan jika sudah ada OTP aktif dibuat < 1 menit lalu
    let recent = sqlx::query!(
        r#"
        SELECT id FROM parent_otp_codes
        WHERE parent_user_id = $1
          AND created_at > NOW() - INTERVAL '1 minute'
          AND used = false
        LIMIT 1
        "#,
        parent_user_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal cek rate limit OTP: {e}")))?;

    if recent.is_some() {
        return Err(AppError::BadRequest(
            "Harap tunggu 1 menit sebelum meminta OTP baru".to_string(),
        ));
    }

    // Buat kode 6 digit
    let code = format!("{:06}", rand::thread_rng().gen_range(0..=999_999u32));
    let expires_at = Utc::now() + Duration::minutes(5);

    // Hapus OTP lama yang belum terpakai, simpan yang baru
    sqlx::query!(
        r#"
        DELETE FROM parent_otp_codes
        WHERE parent_user_id = $1 AND used = false
        "#,
        parent_user_id
    )
    .execute(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal hapus OTP lama: {e}")))?;

    sqlx::query!(
        r#"
        INSERT INTO parent_otp_codes
            (parent_user_id, code, expires_at, used)
        VALUES
            ($1, $2, $3, false)
        "#,
        parent_user_id,
        code,
        expires_at,
    )
    .execute(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal menyimpan OTP: {e}")))?;

    // Kirim via WhatsApp
    let wa_client = WhatsAppClient::from_env();
    let message = format!(
        "[EduSync] Kode verifikasi Anda: {code}\n\
         Berlaku 5 menit.\n\
         Jangan bagikan kode ini ke siapapun."
    );

    match wa_client.send_message(&phone, &message).await {
        Ok(()) => {
            tracing::info!(
                parent_user_id = %parent_user_id,
                phone = %&phone[..phone.len().min(8)],
                "[send_otp] OTP berhasil dikirim"
            );
        }
        Err(e) => {
            // OTP sudah tersimpan di DB — tidak fatal, user bisa retry
            tracing::error!(
                parent_user_id = %parent_user_id,
                error = %e,
                "[send_otp] WhatsApp gagal, OTP tersimpan di DB sebagai fallback"
            );
        }
    }

    Ok(Otp { code, expires_at })
}

// ── Fungsi verifikasi OTP ─────────────────────────────────────────────────────

/// Verifikasi kode OTP yang dimasukkan oleh orang tua.
///
/// Mengembalikan `Ok(true)` jika kode valid dan belum kedaluwarsa,
/// `Ok(false)` jika kode salah atau sudah kadaluarsa.
pub async fn verify_otp(
    db: &PgPool,
    parent_user_id: Uuid,
    code: &str,
) -> Result<bool, AppError> {
    let row: Option<OtpRow> = sqlx::query_as!(
        OtpRow,
        r#"
        SELECT code, expires_at, used
        FROM parent_otp_codes
        WHERE parent_user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        "#,
        parent_user_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal membaca OTP: {e}")))?;

    let row = match row {
        Some(r) => r,
        None => return Ok(false),
    };

    if row.used {
        return Ok(false);
    }

    if Utc::now() > row.expires_at {
        return Ok(false);
    }

    if row.code != code {
        return Ok(false);
    }

    // Tandai OTP sudah dipakai
    sqlx::query!(
        r#"
        UPDATE parent_otp_codes
        SET used = true
        WHERE parent_user_id = $1 AND code = $2
        "#,
        parent_user_id,
        code,
    )
    .execute(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal menandai OTP terpakai: {e}")))?;

    tracing::info!(
        parent_user_id = %parent_user_id,
        "[verify_otp] OTP valid dan berhasil diverifikasi"
    );
    Ok(true)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_phone_formats() {
        assert_eq!(normalize_phone("081234567890"), "+6281234567890");
        assert_eq!(normalize_phone("6281234567890"), "+6281234567890");
        assert_eq!(normalize_phone("+6281234567890"), "+6281234567890");
        assert_eq!(normalize_phone("081 234 567 890"), "+6281234567890");
    }

    #[test]
    fn valid_phone() {
        assert!(is_valid_phone("081234567890"));
        assert!(is_valid_phone("+6281234567890"));
        assert!(!is_valid_phone("123"));
        assert!(!is_valid_phone("not-a-phone"));
    }
}
