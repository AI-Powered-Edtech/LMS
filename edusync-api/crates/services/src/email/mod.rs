// DEPENDENCY: lettre = { version = "0.11", features = ["smtp-transport", "tokio1-native-tls", "builder"] }
// DEPENDENCY: tokio = { version = "1", features = ["full"] }

pub mod digest;
pub mod parent_digest;
pub mod templates;
pub mod types;

use edusync_middleware::errors::AppError;
use types::EmailRecipient;

// ── EmailClient ───────────────────────────────────────────────────────────────

/// Klien pengiriman email berbasis SMTP (lettre).
///
/// Konfigurasi via env vars:
/// - `SMTP_HOST`     — hostname server SMTP (wajib di produksi)
/// - `SMTP_PORT`     — port SMTP (default: 587)
/// - `SMTP_USERNAME` — username autentikasi
/// - `SMTP_PASSWORD` — password autentikasi
/// - `SMTP_FROM`     — alamat pengirim (default: noreply@edusync.id)
///
/// Jika `SMTP_HOST` tidak diset, email hanya di-log ke console (mode dev).
#[derive(Clone)]
pub struct EmailClient {
    from_email: String,
    from_name: String,
    smtp_host: Option<String>,
    smtp_port: u16,
    smtp_username: Option<String>,
    smtp_password: Option<String>,
}

impl EmailClient {
    /// Buat `EmailClient` baru dari environment variables.
    pub fn from_env() -> Self {
        let smtp_host = std::env::var("SMTP_HOST").ok();
        let smtp_port = std::env::var("SMTP_PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(587);
        let smtp_username = std::env::var("SMTP_USERNAME").ok();
        let smtp_password = std::env::var("SMTP_PASSWORD").ok();
        let from_email = std::env::var("SMTP_FROM")
            .unwrap_or_else(|_| "noreply@edusync.id".to_string());
        let from_name = std::env::var("SMTP_FROM_NAME")
            .unwrap_or_else(|_| "EduSync LMS".to_string());

        EmailClient {
            from_email,
            from_name,
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
        }
    }

    /// Kirim email ke satu penerima.
    ///
    /// Jika `SMTP_HOST` tidak dikonfigurasi, email dilog ke `tracing::info!`
    /// (mode pengembangan) dan fungsi mengembalikan `Ok(())`.
    pub async fn send_email(
        &self,
        to: &EmailRecipient,
        subject: &str,
        html: &str,
        text: &str,
    ) -> Result<(), AppError> {
        let smtp_host = match &self.smtp_host {
            Some(h) => h.clone(),
            None => {
                // Mode dev — log dan anggap berhasil
                tracing::info!(
                    to = %to.email,
                    subject = %subject,
                    html_len = html.len(),
                    "[EmailClient] Mode dev: email tidak dikirim, hanya dicatat"
                );
                return Ok(());
            }
        };

        // ── Bangun pesan lettre ──────────────────────────────────────────────
        // DEPENDENCY: lettre = { version = "0.11", features = ["smtp-transport", "tokio1-native-tls", "builder"] }
        use lettre::{
            message::{header::ContentType, Mailbox, MultiPart, SinglePart},
            transport::smtp::authentication::Credentials,
            AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
        };

        let from_mailbox: Mailbox = format!("{} <{}>", self.from_name, self.from_email)
            .parse()
            .map_err(|e| AppError::Internal(format!("Alamat pengirim tidak valid: {e}")))?;

        let to_display = to
            .name
            .as_deref()
            .map(|n| format!("{n} <{}>", to.email))
            .unwrap_or_else(|| to.email.clone());

        let to_mailbox: Mailbox = to_display
            .parse()
            .map_err(|e| AppError::Internal(format!("Alamat penerima tidak valid: {e}")))?;

        let email = Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(text.to_string()),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html.to_string()),
                    ),
            )
            .map_err(|e| AppError::Internal(format!("Gagal membangun email: {e}")))?;

        // ── Bangun transport SMTP ────────────────────────────────────────────
        let transport = if let (Some(user), Some(pass)) =
            (&self.smtp_username, &self.smtp_password)
        {
            let creds = Credentials::new(user.clone(), pass.clone());
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
                .map_err(|e| AppError::Internal(format!("Konfigurasi SMTP gagal: {e}")))?
                .port(self.smtp_port)
                .credentials(creds)
                .build()
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&smtp_host)
                .port(self.smtp_port)
                .build()
        };

        transport
            .send(email)
            .await
            .map_err(|e| AppError::Internal(format!("Gagal mengirim email ke {}: {e}", to.email)))?;

        tracing::info!(to = %to.email, subject = %subject, "Email berhasil dikirim");
        Ok(())
    }
}
