/// Port dari `supabase/functions/send-push/index.ts`
///
/// Mengirim Web Push notification ke semua perangkat terdaftar milik pengguna.
/// Menggunakan VAPID JWT untuk autentikasi ke push service.
///
/// Env vars:
/// - `VAPID_PRIVATE_KEY` — private key ECDSA P-256 dalam format base64url (PKCS8)
/// - `VAPID_SUBJECT`     — mailto contact (default: mailto:admin@edusync.id)
///
/// DEPENDENCY: reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
/// DEPENDENCY: base64 = "0.22"
/// DEPENDENCY: ring = "0.17"   (ECDSA P-256 signing untuk VAPID JWT)

pub mod types;

use ring::signature::KeyPair;
use sqlx::PgPool;
use uuid::Uuid;

use crate::push::types::{PushPayload, PushSubscription};
use edusync_middleware::errors::AppError;

// ── Konstanta ─────────────────────────────────────────────────────────────────

const PUSH_TTL: &str = "86400"; // 24 jam
const DEFAULT_ICON: &str = "/icon-192x192.png";
const DEFAULT_BADGE: &str = "/badge-72x72.png";

// ── Fungsi utama: kirim ke semua subscription user ───────────────────────────

/// Kirim Web Push notification ke semua perangkat milik `user_id`.
///
/// - Memuat daftar subscription dari tabel `push_subscriptions`.
/// - Mengirim satu per satu; subscription yang sudah kadaluarsa (HTTP 410/404)
///   dihapus otomatis.
/// - Mengembalikan jumlah push yang berhasil dikirim.
pub async fn send_push_to_user(
    db: &PgPool,
    user_id: Uuid,
    payload: PushPayload,
) -> Result<usize, AppError> {
    // Ambil semua subscription aktif milik user
    let subscriptions: Vec<PushSubscription> = sqlx::query_as::<_, PushSubscription>(
        r#"
        SELECT id, user_id, endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil push subscriptions: {e}")))?;

    if subscriptions.is_empty() {
        tracing::debug!(
            user_id = %user_id,
            "[send_push] Tidak ada subscription aktif"
        );
        return Ok(0);
    }

    let vapid_private_key = std::env::var("VAPID_PRIVATE_KEY").ok();
    let vapid_subject = std::env::var("VAPID_SUBJECT")
        .unwrap_or_else(|_| "mailto:admin@edusync.id".to_string());

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::internal(format!("Gagal membuat HTTP client: {e}")))?;

    let push_body = build_push_body(&payload);
    let mut sent = 0usize;
    let mut expired_ids: Vec<Uuid> = Vec::new();

    for sub in &subscriptions {
        match send_single_push(
            &http_client,
            sub,
            &push_body,
            vapid_private_key.as_deref(),
            &vapid_subject,
        )
        .await
        {
            Ok(true) => sent += 1,
            Ok(false) => {
                // Subscription kadaluarsa (410/404)
                expired_ids.push(sub.id);
            }
            Err(e) => {
                tracing::warn!(
                    subscription_id = %sub.id,
                    error = %e,
                    "[send_push] Gagal kirim push, melewati subscription ini"
                );
            }
        }
    }

    // Hapus subscription kadaluarsa
    if !expired_ids.is_empty() {
        let _ = sqlx::query("DELETE FROM push_subscriptions WHERE id = ANY($1)")
            .bind(&expired_ids[..])
            .execute(db)
            .await;
        tracing::info!(
            count = expired_ids.len(),
            "[send_push] Subscription kadaluarsa dihapus"
        );
    }

    Ok(sent)
}

// ── Bangun JSON body push ─────────────────────────────────────────────────────

fn build_push_body(payload: &PushPayload) -> String {
    serde_json::json!({
        "title": payload.title,
        "body": payload.body,
        "icon": payload.icon.as_deref().unwrap_or(DEFAULT_ICON),
        "badge": DEFAULT_BADGE,
        "tag": "edusync-notification",
        "data": {
            "url": payload.url.as_deref().unwrap_or("/"),
            "notification_id": payload.notification_id,
        }
    })
    .to_string()
}

// ── Kirim ke satu endpoint ────────────────────────────────────────────────────

/// Mengembalikan `Ok(true)` jika berhasil, `Ok(false)` jika 410/404 (expired),
/// `Err` jika terjadi kesalahan jaringan / konfigurasi.
async fn send_single_push(
    client: &reqwest::Client,
    sub: &PushSubscription,
    body: &str,
    vapid_private_key: Option<&str>,
    vapid_subject: &str,
) -> Result<bool, AppError> {
    // Derivasi audience dari endpoint URL
    let endpoint_url = sub.endpoint.as_str();
    let audience = {
        let url = reqwest::Url::parse(endpoint_url)
            .map_err(|e| AppError::internal(format!("Endpoint URL tidak valid: {e}")))?;
        format!("{}://{}", url.scheme(), url.host_str().unwrap_or_default())
    };

    let mut request = client.post(endpoint_url);

    // Tambahkan VAPID Authorization header jika kunci tersedia
    if let Some(private_key) = vapid_private_key {
        let auth_header = build_vapid_header(private_key, &audience, vapid_subject)?;
        request = request.header("Authorization", auth_header);
    } else {
        // Mode dev — log dan anggap berhasil tanpa header VAPID
        tracing::warn!(
            endpoint = %&endpoint_url[..endpoint_url.len().min(60)],
            "[send_push] VAPID_PRIVATE_KEY tidak diset — push disimulasikan"
        );
        return Ok(true);
    }

    let response = request
        .header("TTL", PUSH_TTL)
        .header("Urgency", "normal")
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| AppError::internal(format!("HTTP error saat kirim push: {e}")))?;

    match response.status().as_u16() {
        200..=204 => Ok(true),
        // Subscription kadaluarsa — caller akan menghapusnya
        410 | 404 => {
            tracing::info!(endpoint = %&endpoint_url[..endpoint_url.len().min(60)], "[send_push] Subscription kadaluarsa ({})", response.status());
            Ok(false)
        }
        code => {
            let body = response.text().await.unwrap_or_default();
            Err(AppError::internal(format!(
                "Push service merespons {code}: {body}"
            )))
        }
    }
}

// ── VAPID JWT builder ─────────────────────────────────────────────────────────

/// Membangun header `Authorization: vapid t=<jwt>, k=<pubkey>`.
///
/// Implementasi manual menggunakan `ring` untuk ECDSA P-256 signing.
/// Private key harus dalam format base64url PKCS8.
fn build_vapid_header(
    private_key_b64: &str,
    audience: &str,
    subject: &str,
) -> Result<String, AppError> {
    // DEPENDENCY: ring = "0.17"
    // DEPENDENCY: base64 = "0.22"
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    use ring::signature::{EcdsaKeyPair, ECDSA_P256_SHA256_FIXED_SIGNING};

    let private_key_bytes = URL_SAFE_NO_PAD
        .decode(private_key_b64)
        .map_err(|e| AppError::internal(format!("VAPID private key base64 tidak valid: {e}")))?;

    let key_pair = EcdsaKeyPair::from_pkcs8(
        &ECDSA_P256_SHA256_FIXED_SIGNING,
        &private_key_bytes,
        &ring::rand::SystemRandom::new(),
    )
    .map_err(|e| AppError::internal(format!("VAPID key pair tidak valid: {e}")))?;

    // Ambil public key bytes dan encode base64url
    let public_key_b64 = URL_SAFE_NO_PAD.encode(key_pair.public_key().as_ref());

    // Bangun JWT header + payload
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let header_b64 = URL_SAFE_NO_PAD
        .encode(serde_json::json!({"typ":"JWT","alg":"ES256"}).to_string());
    let payload_b64 = URL_SAFE_NO_PAD.encode(
        serde_json::json!({
            "aud": audience,
            "exp": now + 12 * 3600,
            "sub": subject
        })
        .to_string(),
    );

    let unsigned = format!("{}.{}", header_b64, payload_b64);
    let rng = ring::rand::SystemRandom::new();
    let sig = key_pair
        .sign(&rng, unsigned.as_bytes())
        .map_err(|e| AppError::internal(format!("VAPID signing gagal: {e}")))?;

    let sig_b64 = URL_SAFE_NO_PAD.encode(sig.as_ref());
    let jwt = format!("{}.{}", unsigned, sig_b64);

    Ok(format!("vapid t={jwt}, k={public_key_b64}"))
}

// ── Service-layer push dispatch ───────────────────────────────────────────────
//
// Axum handler (`push_notification_handler`) is wired in the api-server crate,
// which has access to both the extractors (RbacGuard / AuthedRequest) and this
// service.  The services crate intentionally does NOT depend on api-server to
// avoid a circular dependency.
//
// The api-server handler should call `send_push_to_user` directly:
//
//   pub async fn push_notification_handler(
//       rbac: RbacGuard,
//       Extension(state): Extension<Arc<AppState>>,
//       Json(req): Json<edusync_services::push::types::SendPushRequest>,
//   ) -> Result<Json<edusync_services::push::types::SendPushResponse>, AppError> {
//       rbac.require("teacher").map_err(|_| AppError::Forbidden)?;
//       let payload = PushPayload { title: req.title, body: req.body,
//                                   icon: None, url: req.url, notification_id: None };
//       let sent = edusync_services::push::send_push_to_user(&state.db, req.user_id, payload).await?;
//       Ok(Json(SendPushResponse { success: sent > 0, sent,
//           message: if sent > 0 { format!("Push berhasil dikirim ke {sent} perangkat") }
//                    else { "Tidak ada perangkat yang menerima push notification".into() } }))
//   }
