use edusync_middleware::brute_force::BruteForceTracker;
use sqlx::PgPool;

#[derive(Clone)]
pub struct ShadowRuntimeConfig {
    pub enabled: bool,
    pub divergence_sample_rate: f64,
}

/// SMTP connection settings for email-based notifications.
#[derive(Clone, Default)]
pub struct SmtpConfig {
    pub host: Option<String>,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub from_email: String,
}

/// Central application state shared across all request handlers.
///
/// Access in handlers: `let state = ctx.state::<Arc<AppState>>()?;`
/// Injection in main.rs: `ServiceProcess::new(...).extension(Arc::new(app_state))`
///
/// All `Option<String>` fields are `None` when the corresponding environment
/// variable is not set; handlers that need them must return an appropriate
/// error rather than panicking.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,
    pub brute_force: BruteForceTracker,
    pub shadow: ShadowRuntimeConfig,

    // ── Phase 3A: AI ──────────────────────────────────────────────────────────
    /// Groq API key for AI grading / tutor / content-gen endpoints.
    /// Set via GROQ_API_KEY environment variable.
    pub groq_api_key: Option<String>,

    // ── Phase 3C: Push notifications ─────────────────────────────────────────
    /// VAPID private key for Web Push. Set via VAPID_PRIVATE_KEY.
    pub vapid_private_key: Option<String>,
    /// VAPID public key for Web Push. Set via VAPID_PUBLIC_KEY.
    pub vapid_public_key: Option<String>,

    // ── Phase 3C: Email ───────────────────────────────────────────────────────
    pub smtp: SmtpConfig,

    // ── Phase 3C: WhatsApp ────────────────────────────────────────────────────
    /// WhatsApp Cloud API access token. Set via WHATSAPP_ACCESS_TOKEN.
    pub whatsapp_access_token: Option<String>,
    /// WhatsApp phone number ID. Set via WHATSAPP_PHONE_NUMBER_ID.
    pub whatsapp_phone_number_id: Option<String>,

    // ── Phase VIL / Wave 1A: S3-compatible Storage ────────────────────────────
    /// S3-compatible endpoint URL (MinIO local / Cloudflare R2 production).
    /// `None` when S3_ENDPOINT is not configured — handlers return 503.
    /// The vil_storage_s3 client is constructed per-handler or as a service
    /// extension using these config values.
    pub s3_endpoint: Option<String>,
    /// S3 bucket name. Set via S3_BUCKET environment variable.
    pub s3_bucket: String,
    /// Public base URL for serving stored objects. Set via S3_PUBLIC_URL.
    /// Used to generate public download links without signed URLs.
    pub s3_public_url: Option<String>,
}
