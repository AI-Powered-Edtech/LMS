pub struct EmailService;

impl EmailService {
    pub fn new() -> Self { EmailService }

    pub async fn send_verification(&self, to: &str, token: &str) -> Result<(), String> {
        let url = format!("http://localhost:5173/#/verify-email?token_hash={}&type=signup", token);
        // Security: Prevent exposing sensitive tokens in non-development logs
        if std::env::var("APP_ENV").unwrap_or_else(|_| "development".into()) == "development" {
            tracing::info!(to = %to, url = %url, "Kirim email verifikasi (dev: console only)");
        }
        // TODO: wire SMTP via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
        Ok(())
    }

    pub async fn send_password_reset(&self, to: &str, token: &str) -> Result<(), String> {
        let url = format!("http://localhost:5173/#/reset-password?token={}", token);
        // Security: Prevent exposing sensitive tokens in non-development logs
        if std::env::var("APP_ENV").unwrap_or_else(|_| "development".into()) == "development" {
            tracing::info!(to = %to, url = %url, "Kirim email reset password (dev: console only)");
        }
        Ok(())
    }
}
