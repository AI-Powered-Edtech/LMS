// DEPENDENCY: serde = { version = "1", features = ["derive"] }
// DEPENDENCY: serde_json = "1"
// DEPENDENCY: uuid = { version = "1", features = ["serde", "v4"] }

use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── WhatsApp Business API Webhook Payload ─────────────────────────────────────

/// Payload utama dari WhatsApp Business API webhook.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppWebhookPayload {
    pub object: String,
    pub entry: Vec<WhatsAppEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppEntry {
    pub id: String,
    pub changes: Vec<WhatsAppChange>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppChange {
    pub value: WhatsAppValue,
    pub field: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppValue {
    pub messaging_product: String,
    pub messages: Option<Vec<WhatsAppMessage>>,
    pub statuses: Option<Vec<WhatsAppStatus>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppMessage {
    pub from: String,
    pub id: String,
    pub timestamp: String,
    pub text: Option<WhatsAppText>,
    #[serde(rename = "type")]
    pub message_type: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppText {
    pub body: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WhatsAppStatus {
    pub id: String,
    pub status: String,
    pub timestamp: String,
    pub recipient_id: String,
}

// ── Payload provider generik ─────────────────────────────────────────────────

/// Laporan pengiriman yang dinormalisasi dari semua provider.
#[derive(Debug, Clone, Serialize)]
pub struct DeliveryReport {
    pub message_id: String,
    pub phone: String,
    pub status: DeliveryStatus,
    pub timestamp: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DeliveryStatus {
    Sent,
    Delivered,
    Read,
    Failed,
}

impl std::fmt::Display for DeliveryStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            DeliveryStatus::Sent => "sent",
            DeliveryStatus::Delivered => "delivered",
            DeliveryStatus::Read => "read",
            DeliveryStatus::Failed => "failed",
        };
        write!(f, "{s}")
    }
}

// ── Request kirim pesan ───────────────────────────────────────────────────────

/// Request body untuk endpoint kirim pesan WhatsApp.
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    /// UUID pengguna tujuan di sistem EduSync.
    pub to: Uuid,
    /// Isi pesan teks.
    pub message: String,
}

// ── Payload Fonnte / Wablas ───────────────────────────────────────────────────

/// Payload generik dari webhook Fonnte.
#[derive(Debug, Deserialize)]
pub struct FonnteWebhookBody {
    pub id: Option<serde_json::Value>,
    pub phone: Option<String>,
    pub status: Option<String>,
}

/// Payload generik dari webhook Wablas.
#[derive(Debug, Deserialize)]
pub struct WablasWebhookBody {
    pub id: Option<serde_json::Value>,
    pub phone: Option<String>,
    pub status: Option<String>,
}
