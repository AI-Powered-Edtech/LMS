// DEPENDENCY: uuid = { version = "1", features = ["serde", "v4"] }
// DEPENDENCY: serde = { version = "1", features = ["derive"] }

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Satu entri langganan push Web Push yang tersimpan di database.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PushSubscription {
    pub id: Uuid,
    pub user_id: Uuid,
    /// URL endpoint push service (FCM, Mozilla Push, dll.).
    pub endpoint: String,
    /// Kunci publik ECDH (base64url) dari browser.
    pub p256dh: String,
    /// Auth secret (base64url) dari browser.
    pub auth: String,
}

/// Isi notifikasi yang akan dikirim ke service worker.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushPayload {
    /// Judul notifikasi (wajib).
    pub title: String,
    /// Isi notifikasi.
    pub body: String,
    /// URL ikon (opsional, default: /icon-192x192.png).
    pub icon: Option<String>,
    /// URL tujuan saat notifikasi diklik.
    pub url: Option<String>,
    /// ID notifikasi terkait (untuk deep-link).
    pub notification_id: Option<Uuid>,
}

/// Request body untuk endpoint `POST /api/v1/push/send`.
#[derive(Debug, Deserialize)]
pub struct SendPushRequest {
    /// ID pengguna tujuan (harus cocok dengan JWT jika bukan teacher/admin).
    pub user_id: Uuid,
    /// Judul notifikasi.
    pub title: String,
    /// Isi notifikasi.
    pub body: String,
    /// URL tujuan opsional.
    pub url: Option<String>,
}

/// Response dari endpoint push.
#[derive(Debug, Serialize)]
pub struct SendPushResponse {
    /// Apakah setidaknya satu push berhasil dikirim.
    pub success: bool,
    /// Jumlah subscription yang berhasil.
    pub sent: usize,
    /// Pesan keterangan.
    pub message: String,
}
