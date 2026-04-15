/// Modul WhatsApp — klien HTTP + sub-modul OTP dan webhook.
///
/// Env vars:
/// - `WHATSAPP_ACCESS_TOKEN`   — Bearer token WhatsApp Business API
/// - `WHATSAPP_PHONE_NUMBER_ID` — Phone Number ID dari Meta Business
/// - `WHATSAPP_PROVIDER`       — "wa_business" | "fonnte" | "wablas" | "mock"
/// - `WHATSAPP_API_KEY`        — API key untuk Fonnte / Wablas
/// - `WHATSAPP_BASE_URL`       — Base URL untuk Fonnte / Wablas

// DEPENDENCY: reqwest = { version = "0.12", features = ["json", "rustls-tls"] }

pub mod otp;
pub mod types;
pub mod webhook;

use edusync_middleware::errors::AppError;

// ── Provider enum ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WhatsAppProvider {
    /// WhatsApp Business API (Meta Cloud API)
    WaBusiness,
    /// Fonnte — provider lokal Indonesia
    Fonnte,
    /// Wablas — provider lokal Indonesia
    Wablas,
    /// Mode mock untuk pengembangan (hanya log)
    Mock,
}

impl WhatsAppProvider {
    pub fn from_env() -> Self {
        match std::env::var("WHATSAPP_PROVIDER")
            .unwrap_or_default()
            .to_lowercase()
            .as_str()
        {
            "wa_business" => WhatsAppProvider::WaBusiness,
            "fonnte" => WhatsAppProvider::Fonnte,
            "wablas" => WhatsAppProvider::Wablas,
            _ => WhatsAppProvider::Mock,
        }
    }
}

// ── WhatsAppClient ────────────────────────────────────────────────────────────

/// Klien pengiriman pesan WhatsApp multi-provider.
#[derive(Clone)]
pub struct WhatsAppClient {
    pub provider: WhatsAppProvider,
    http: reqwest::Client,
    access_token: Option<String>,
    phone_number_id: Option<String>,
    api_key: Option<String>,
    base_url: Option<String>,
}

impl WhatsAppClient {
    /// Buat klien dari environment variables.
    ///
    /// Menggunakan `reqwest::Client` default dengan timeout 15 detik.
    /// Jika TLS tidak tersedia di sistem, fungsi ini akan panic — ini
    /// adalah kondisi fatal yang harus ditangani saat startup.
    pub fn from_env() -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            // Client::build() hanya gagal jika TLS backend tidak ada —
            // di binary produksi dengan rustls ini tidak pernah terjadi.
            .unwrap_or_else(|_| reqwest::Client::new());

        WhatsAppClient {
            provider: WhatsAppProvider::from_env(),
            http,
            access_token: std::env::var("WHATSAPP_ACCESS_TOKEN").ok(),
            phone_number_id: std::env::var("WHATSAPP_PHONE_NUMBER_ID").ok(),
            api_key: std::env::var("WHATSAPP_API_KEY").ok(),
            base_url: std::env::var("WHATSAPP_BASE_URL").ok(),
        }
    }

    /// Kirim pesan teks ke nomor telepon.
    ///
    /// `phone` harus dalam format internasional tanpa `+` (contoh: `6281234567890`).
    pub async fn send_message(&self, phone: &str, message: &str) -> Result<(), AppError> {
        // Hapus '+' jika ada (API umumnya tidak membutuhkan)
        let phone = phone.trim_start_matches('+');

        match &self.provider {
            WhatsAppProvider::Mock => {
                tracing::info!(
                    to = %phone,
                    message = %message,
                    "[WhatsAppClient] MOCK — pesan tidak dikirim"
                );
                Ok(())
            }
            WhatsAppProvider::WaBusiness => {
                self.send_wa_business(phone, message).await
            }
            WhatsAppProvider::Fonnte => {
                self.send_fonnte(phone, message).await
            }
            WhatsAppProvider::Wablas => {
                self.send_wablas(phone, message).await
            }
        }
    }

    // ── WhatsApp Business API (Meta Cloud API) ────────────────────────────────

    async fn send_wa_business(&self, phone: &str, message: &str) -> Result<(), AppError> {
        let token = self
            .access_token
            .as_deref()
            .ok_or_else(|| AppError::internal("WHATSAPP_ACCESS_TOKEN tidak diset".to_string()))?;
        let phone_number_id = self
            .phone_number_id
            .as_deref()
            .ok_or_else(|| {
                AppError::internal("WHATSAPP_PHONE_NUMBER_ID tidak diset".to_string())
            })?;

        let url = format!(
            "https://graph.facebook.com/v19.0/{phone_number_id}/messages"
        );

        let body = serde_json::json!({
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": { "body": message }
        });

        let response = self
            .http
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::internal(format!("WhatsApp API request gagal: {e}")))?;

        if response.status().is_success() {
            tracing::info!(to = %phone, "[WhatsAppClient] Pesan terkirim via WA Business");
            Ok(())
        } else {
            let status = response.status();
            let err_body = response.text().await.unwrap_or_default();
            Err(AppError::internal(format!(
                "WhatsApp API error {status}: {err_body}"
            )))
        }
    }

    // ── Fonnte ────────────────────────────────────────────────────────────────

    async fn send_fonnte(&self, phone: &str, message: &str) -> Result<(), AppError> {
        let api_key = self
            .api_key
            .as_deref()
            .ok_or_else(|| AppError::internal("WHATSAPP_API_KEY tidak diset".to_string()))?;
        let base_url = self
            .base_url
            .as_deref()
            .unwrap_or("https://api.fonnte.com");

        let response = self
            .http
            .post(format!("{base_url}/send"))
            .header("Authorization", api_key)
            .json(&serde_json::json!({
                "target": phone,
                "message": message,
            }))
            .send()
            .await
            .map_err(|e| AppError::internal(format!("Fonnte request gagal: {e}")))?;

        if response.status().is_success() {
            tracing::info!(to = %phone, "[WhatsAppClient] Pesan terkirim via Fonnte");
            Ok(())
        } else {
            let status = response.status();
            let err_body = response.text().await.unwrap_or_default();
            Err(AppError::internal(format!(
                "Fonnte API error {status}: {err_body}"
            )))
        }
    }

    // ── Wablas ────────────────────────────────────────────────────────────────

    async fn send_wablas(&self, phone: &str, message: &str) -> Result<(), AppError> {
        let api_key = self
            .api_key
            .as_deref()
            .ok_or_else(|| AppError::internal("WHATSAPP_API_KEY tidak diset".to_string()))?;
        let base_url = self
            .base_url
            .as_deref()
            .unwrap_or("https://solo.wablas.com");

        let response = self
            .http
            .post(format!("{base_url}/api/send-message"))
            .header("Authorization", api_key)
            .json(&serde_json::json!({
                "phone": phone,
                "message": message,
            }))
            .send()
            .await
            .map_err(|e| AppError::internal(format!("Wablas request gagal: {e}")))?;

        if response.status().is_success() {
            tracing::info!(to = %phone, "[WhatsAppClient] Pesan terkirim via Wablas");
            Ok(())
        } else {
            let status = response.status();
            let err_body = response.text().await.unwrap_or_default();
            Err(AppError::internal(format!(
                "Wablas API error {status}: {err_body}"
            )))
        }
    }
}
