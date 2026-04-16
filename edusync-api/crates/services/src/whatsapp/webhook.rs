/// Port dari `supabase/functions/whatsapp-webhook/index.ts`
///
/// Logika pemrosesan webhook WhatsApp (laporan pengiriman dan pesan masuk)
/// dari provider Fonnte, Wablas, dan WhatsApp Business API.
///
/// **Catatan arsitektur:** Handler Axum (`GET/POST /api/v1/whatsapp/webhook`)
/// didaftarkan di crate `api-server`.  Crate ini hanya menyediakan logika bisnis:
/// parsing payload, normalisasi, dan persistensi ke DB.
///
/// Contoh registrasi di api-server:
/// ```text
/// GET  /api/v1/whatsapp/webhook  → verify_webhook
/// POST /api/v1/whatsapp/webhook  → handle_incoming
/// ```

use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::whatsapp::types::{DeliveryReport, DeliveryStatus};
use edusync_middleware::errors::AppError;

// ── Provider identifier ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookProvider {
    Fonnte,
    Wablas,
    WaBusiness,
}

impl WebhookProvider {
    /// Parse dari query string `provider=<value>`.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "fonnte" => Some(WebhookProvider::Fonnte),
            "wablas" => Some(WebhookProvider::Wablas),
            "wa_business" => Some(WebhookProvider::WaBusiness),
            _ => None,
        }
    }
}

// ── Hasil verifikasi webhook ──────────────────────────────────────────────────

/// Hasil verifikasi GET webhook dari WhatsApp Business API.
#[derive(Debug)]
pub enum VerifyResult {
    /// Token cocok — kembalikan challenge string ini ke provider.
    Accepted(String),
    /// Token tidak cocok atau bukan request verifikasi.
    Rejected,
    /// Bukan request verifikasi (mode, token, challenge tidak ada).
    NotAVerification,
}

// ── Verifikasi webhook GET ────────────────────────────────────────────────────

/// Proses GET request verifikasi dari WhatsApp Business API.
///
/// Handler di api-server:
/// ```text
/// let result = verify_webhook(mode, token, challenge);
/// match result {
///     VerifyResult::Accepted(ch) => (StatusCode::OK, ch).into_response(),
///     VerifyResult::Rejected     => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
///     VerifyResult::NotAVerification => (StatusCode::OK, "OK").into_response(),
/// }
/// ```
pub fn verify_webhook(
    hub_mode: Option<&str>,
    hub_verify_token: Option<&str>,
    hub_challenge: Option<&str>,
) -> VerifyResult {
    match (hub_mode, hub_verify_token, hub_challenge) {
        (Some("subscribe"), Some(token), Some(challenge)) => {
            let expected = std::env::var("WHATSAPP_WEBHOOK_SECRET").unwrap_or_default();
            if token == expected {
                tracing::info!("[whatsapp_webhook] Verifikasi berhasil");
                VerifyResult::Accepted(challenge.to_string())
            } else {
                tracing::warn!("[whatsapp_webhook] Verifikasi gagal: token tidak cocok");
                VerifyResult::Rejected
            }
        }
        _ => VerifyResult::NotAVerification,
    }
}

// ── Proses webhook POST ───────────────────────────────────────────────────────

/// Proses payload POST webhook dari provider.
///
/// Mengembalikan laporan pengiriman yang sudah dinormalisasi, atau `None`
/// jika payload tidak dapat di-parse (tetap kembalikan HTTP 200 ke provider).
pub async fn handle_incoming(
    db: &PgPool,
    provider: WebhookProvider,
    body: &[u8],
) -> Result<Option<DeliveryReport>, AppError> {
    let json_val: Value = serde_json::from_slice(body)
        .map_err(|e| {
            tracing::warn!(error = %e, "[whatsapp_webhook] Body bukan JSON valid");
            AppError::BadRequest("Body tidak valid JSON".to_string())
        })?;

    let report = match provider {
        WebhookProvider::Fonnte => parse_fonnte(&json_val),
        WebhookProvider::Wablas => parse_wablas(&json_val),
        WebhookProvider::WaBusiness => parse_wa_business(&json_val),
    };

    if let Some(ref r) = report {
        tracing::info!(
            provider = ?provider,
            message_id = %r.message_id,
            phone = %r.phone,
            status = %r.status,
            "[whatsapp_webhook] Laporan diterima"
        );
        // Simpan ke activity_events (non-fatal)
        let _ = save_delivery_report(db, r).await;
    } else {
        tracing::warn!(
            provider = ?provider,
            body_preview = %String::from_utf8_lossy(&body[..body.len().min(200)]),
            "[whatsapp_webhook] Gagal parse payload"
        );
    }

    Ok(report)
}

// ── Parser per provider ───────────────────────────────────────────────────────

fn map_status(raw: &str) -> DeliveryStatus {
    match raw.to_lowercase().as_str() {
        "sent" | "pending" => DeliveryStatus::Sent,
        "delivered" => DeliveryStatus::Delivered,
        "read" => DeliveryStatus::Read,
        "failed" => DeliveryStatus::Failed,
        _ => DeliveryStatus::Sent,
    }
}

fn parse_fonnte(body: &Value) -> Option<DeliveryReport> {
    let id = body.get("id")?.as_str().map(String::from)
        .or_else(|| body.get("id")?.as_u64().map(|n| n.to_string()))?;
    let phone = body.get("phone")?.as_str()?.to_string();
    let status = body.get("status")?.as_str()?;

    Some(DeliveryReport {
        message_id: id,
        phone,
        status: map_status(status),
        timestamp: chrono::Utc::now().to_rfc3339(),
        provider: "fonnte".to_string(),
    })
}

fn parse_wablas(body: &Value) -> Option<DeliveryReport> {
    let id = body.get("id")?.as_str().map(String::from)
        .or_else(|| body.get("id")?.as_u64().map(|n| n.to_string()))?;
    let phone = body.get("phone")?.as_str()?.to_string();
    let status = body.get("status")?.as_str()?;

    Some(DeliveryReport {
        message_id: id,
        phone,
        status: map_status(status),
        timestamp: chrono::Utc::now().to_rfc3339(),
        provider: "wablas".to_string(),
    })
}

fn parse_wa_business(body: &Value) -> Option<DeliveryReport> {
    let entries = body.get("entry")?.as_array()?;
    let entry = entries.first()?;
    let changes = entry.get("changes")?.as_array()?;
    let change = changes.first()?;
    let value = change.get("value")?;
    let statuses = value.get("statuses")?.as_array()?;
    let st = statuses.first()?;

    let id = st.get("id")?.as_str()?.to_string();
    let recipient = st.get("recipient_id")?.as_str()?.to_string();
    let status = st.get("status")?.as_str()?;
    let ts = st
        .get("timestamp")
        .and_then(|t| t.as_str())
        .and_then(|t| t.parse::<i64>().ok())
        .and_then(|secs| chrono::DateTime::from_timestamp(secs, 0))
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    Some(DeliveryReport {
        message_id: id,
        phone: recipient,
        status: map_status(status),
        timestamp: ts,
        provider: "wa_business".to_string(),
    })
}

// ── Persistensi ──────────────────────────────────────────────────────────────

async fn save_delivery_report(
    db: &PgPool,
    report: &DeliveryReport,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO whatsapp_delivery_reports (metadata)
        VALUES ($1)
        "#,
    )
    .bind(serde_json::json!({
            "message_id": report.message_id,
            "phone":      report.phone,
            "status":     report.status.to_string(),
            "provider":   report.provider,
            "timestamp":  report.timestamp,
        }))
    .execute(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal simpan delivery report: {e}")))?;
    Ok(())
}
