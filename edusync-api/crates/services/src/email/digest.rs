/// Port dari `supabase/functions/send-email-digest/index.ts`
///
/// Mengambil semua notifikasi yang belum terkirim email dalam 24 jam terakhir,
/// mengelompokkannya per pengguna, dan mengirim satu email digest per pengguna.
/// Notifikasi yang sudah dikirim ditandai dengan `email_sent = true`.
use sqlx::PgPool;
use uuid::Uuid;

use crate::email::{
    EmailClient,
    templates::{digest_html, digest_text},
    types::{DigestItem, DigestResult, EmailDigestData, EmailRecipient},
};
use edusync_middleware::errors::AppError;

// ── Row dari query JOIN notifications + profiles ──────────────────────────────

#[derive(sqlx::FromRow)]
struct NotificationRow {
    id: Uuid,
    user_id: Uuid,
    notification_type: String,
    title: String,
    body: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    email: String,
    full_name: Option<String>,
}

// ── Row preferensi email ──────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct NotifPref {
    email_enabled: Option<bool>,
    disabled_types: Option<Vec<String>>,
}

// ── Fungsi utama ──────────────────────────────────────────────────────────────

/// Kirim email digest harian ke semua pengguna yang memiliki notifikasi belum terkirim.
///
/// Dipanggil oleh scheduler setiap hari (misalnya jam 07:00 WIB).
/// Mengembalikan [`DigestResult`] berisi jumlah terkirim, dilewati, dan gagal.
pub async fn send_email_digest(db: &PgPool) -> Result<DigestResult, AppError> {
    let client = EmailClient::from_env();
    let mut result = DigestResult::default();

    // ── Ambil semua notifikasi belum terkirim dalam 24 jam ────────────────────
    let rows: Vec<NotificationRow> = sqlx::query_as!(
        NotificationRow,
        r#"
        SELECT
            n.id,
            n.user_id,
            n.type::text     AS "notification_type!",
            n.title,
            n.body,
            n.created_at,
            p.email,
            p.full_name
        FROM notifications n
        JOIN profiles p ON p.id = n.user_id
        WHERE
            n.email_sent = false
            AND n.is_read  = false
            AND n.created_at > NOW() - INTERVAL '24 hours'
        ORDER BY n.user_id, n.created_at
        "#
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil notifikasi: {e}")))?;

    if rows.is_empty() {
        tracing::info!("[send_email_digest] Tidak ada notifikasi baru dalam 24 jam");
        return Ok(result);
    }

    // ── Kelompokkan per user_id ───────────────────────────────────────────────
    let mut by_user: std::collections::HashMap<Uuid, Vec<&NotificationRow>> =
        std::collections::HashMap::new();
    for row in &rows {
        by_user.entry(row.user_id).or_default().push(row);
    }

    // ── Proses tiap user ──────────────────────────────────────────────────────
    for (user_id, user_rows) in &by_user {
        match process_user_digest(db, &client, *user_id, user_rows).await {
            Ok(DigestOutcome::Sent(n)) => result.sent += n,
            Ok(DigestOutcome::Skipped(n)) => result.skipped += n,
            Err(e) => {
                tracing::error!(
                    user_id = %user_id,
                    error = %e,
                    "[send_email_digest] Gagal memproses digest"
                );
                result.errors += 1;
            }
        }
    }

    tracing::info!(
        sent = result.sent,
        skipped = result.skipped,
        errors = result.errors,
        "[send_email_digest] Selesai"
    );
    Ok(result)
}

// ── Hasil proses per user ─────────────────────────────────────────────────────

enum DigestOutcome {
    Sent(usize),
    Skipped(usize),
}

async fn process_user_digest(
    db: &PgPool,
    client: &EmailClient,
    user_id: Uuid,
    rows: &[&NotificationRow],
) -> Result<DigestOutcome, AppError> {
    // Cek preferensi email
    let pref: Option<NotifPref> = sqlx::query_as!(
        NotifPref,
        r#"
        SELECT email_enabled, disabled_types
        FROM notification_preferences
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal membaca preferensi: {e}")))?;

    // Skip jika email dinonaktifkan
    if let Some(ref p) = pref {
        if p.email_enabled == Some(false) {
            return Ok(DigestOutcome::Skipped(rows.len()));
        }
    }

    // Filter berdasarkan disabled_types
    let disabled: Vec<String> = pref
        .as_ref()
        .and_then(|p| p.disabled_types.clone())
        .unwrap_or_default();

    let filtered: Vec<&&NotificationRow> = rows
        .iter()
        .filter(|r| !disabled.contains(&r.notification_type))
        .collect();

    if filtered.is_empty() {
        return Ok(DigestOutcome::Skipped(rows.len()));
    }

    // Ambil email dan nama dari baris pertama (semua baris milik user yang sama)
    let first = filtered[0];
    let recipient = EmailRecipient {
        email: first.email.clone(),
        name: first.full_name.clone(),
    };

    // Bangun item digest
    let items: Vec<DigestItem> = filtered
        .iter()
        .map(|r| DigestItem {
            title: r.title.clone(),
            body: r.body.clone().unwrap_or_default(),
            notification_type: r.notification_type.clone(),
            created_at: r.created_at,
        })
        .collect();

    let data = EmailDigestData {
        recipient: recipient.clone(),
        items,
        tenant_name: String::new(), // tidak diperlukan di template
    };

    let subject = format!("EduSync: {} notifikasi belum dibaca", filtered.len());
    let html = digest_html(&data);
    let text = digest_text(&data);

    client
        .send_email(&recipient, &subject, &html, &text)
        .await?;

    // Tandai notifikasi sebagai sudah dikirim
    let ids: Vec<Uuid> = filtered.iter().map(|r| r.id).collect();
    sqlx::query!(
        "UPDATE notifications SET email_sent = true WHERE id = ANY($1)",
        &ids as &[Uuid]
    )
    .execute(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal menandai email_sent: {e}")))?;

    tracing::info!(
        to = %recipient.email,
        count = filtered.len(),
        "[send_email_digest] Digest terkirim"
    );
    Ok(DigestOutcome::Sent(filtered.len()))
}
