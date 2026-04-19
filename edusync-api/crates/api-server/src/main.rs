mod ai_handlers;
mod auth;
mod cache;
mod courses;
mod cron;
mod data_plane;
mod extractors;
mod health;
mod lti_handlers;
mod notification_handlers;
mod observability;
mod processing_handlers;
mod realtime;
mod state;
mod storage;

use dotenvy::dotenv;
use health::{health_handler, ready_handler};
use realtime::{handler::ws_handler, pg_notify::start_pg_listener, WsHub};
use sqlx::postgres::PgPoolOptions;
use state::{AppState, ShadowRuntimeConfig, SmtpConfig};
use cache::CacheClient;
use edusync_auth::init_rsa_keys;
use base64::Engine;
use std::sync::Arc;
use vil_server::prelude::{delete, get, post, put, Method, ServiceProcess, VilApp};
use anyhow::{bail, Context};

use ai_handlers::{
    generate_content_handler, generate_quiz_handler, grade_essay_handler, tutor_chat_handler,
};
use auth::bootstrap::bootstrap_handler;
use auth::ensure_profile::ensure_profile_handler;
use auth::login::login_handler;
use auth::mfa::{mfa_enroll_handler, mfa_unenroll_handler, mfa_verify_handler};
use auth::oauth::{oauth_google_callback_handler, oauth_google_init_handler};
use auth::refresh::refresh_handler;
use auth::register::register_handler;
use auth::reset_password::{reset_password_handler, update_password_handler};
use auth::signout::signout_handler;
use auth::switch_tenant::switch_tenant_handler;
use auth::session::{list_sessions_handler, revoke_session_handler};
use auth::tenant_rpcs::{
    accept_invitation_handler, create_tenant_handler, enroll_student_handler,
    lookup_class_handler, onboard_student_handler, validate_invitation_handler,
};
use auth::verify_email::verify_email_handler;
use courses::{
    create_course_handler, delete_course_handler, get_course_handler, get_course_modules_handler,
    list_courses_handler, update_course_handler,
};
use data_plane::{query_table_handler, rpc_proxy_handler};
use lti_handlers::{lti_jwks_handler, lti_launch_handler, lti_oidc_login_handler};
use notification_handlers::{
    generate_pdf_handler, send_otp_handler, send_push_handler, verify_otp_handler,
    whatsapp_webhook_get_handler, whatsapp_webhook_post_handler,
};
use processing_handlers::{
    enqueue_events_handler, extract_scorm_handler, import_users_handler, load_quiz_handler,
};
use storage::handlers::{
    create_signed_url_handler, download_handler, list_handler, migration_status_handler,
    presign_upload_handler, public_url_handler, remove_handler, upload_handler,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    observability::init_tracing();
    let _sentry_guard = observability::init_sentry();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    let jwt_rsa_private_key = std::env::var("JWT_RSA_PRIVATE_KEY").context("JWT_RSA_PRIVATE_KEY harus diset")?;
    let jwt_rsa_public_key = std::env::var("JWT_RSA_PUBLIC_KEY").context("JWT_RSA_PUBLIC_KEY harus diset")?;
    
    let private_key_pem = String::from_utf8(
        base64::engine::general_purpose::STANDARD.decode(&jwt_rsa_private_key)
            .map_err(|e| anyhow::anyhow!("Invalid base64 in private key: {}", e))?
    ).map_err(|e| anyhow::anyhow!("Invalid UTF-8 in private key: {}", e))?;
    
    let public_key_pem = String::from_utf8(
        base64::engine::general_purpose::STANDARD.decode(&jwt_rsa_public_key)
            .map_err(|e| anyhow::anyhow!("Invalid base64 in public key: {}", e))?
    ).map_err(|e| anyhow::anyhow!("Invalid UTF-8 in public key: {}", e))?;
    
    init_rsa_keys(private_key_pem.as_bytes(), public_key_pem.as_bytes())
        .map_err(|e| anyhow::anyhow!("Failed to initialize RSA keys: {}", e))?;

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8080);
    let vil_profile = std::env::var("VIL_PROFILE").unwrap_or_else(|_| "dev".to_string());
    let shadow_enabled = std::env::var("SHADOW_MODE_ENABLED")
        .ok()
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"))
        .unwrap_or(false);

    let observer_enabled = std::env::var("ENABLE_OBSERVER")
        .ok()
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"))
        .unwrap_or(false);

    let divergence_sample_rate = std::env::var("DIVERGENCE_SAMPLE_RATE")
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
        .map(|value| value.clamp(0.0, 1.0))
        .unwrap_or(if shadow_enabled { 1.0 } else { 0.0 });


    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

    let brute_force = edusync_middleware::brute_force::BruteForceTracker::new();

    // ── Phase 3 configuration from environment ────────────────────────────────
    let groq_api_key = std::env::var("GROQ_API_KEY").ok();
    if groq_api_key.is_none() {
        tracing::warn!("GROQ_API_KEY tidak dikonfigurasi — endpoint AI tidak akan berfungsi");
    }
    let vapid_private_key = std::env::var("VAPID_PRIVATE_KEY").ok();
    let vapid_public_key = std::env::var("VAPID_PUBLIC_KEY").ok();
    let whatsapp_access_token = std::env::var("WHATSAPP_ACCESS_TOKEN").ok();
    let whatsapp_phone_number_id = std::env::var("WHATSAPP_PHONE_NUMBER_ID").ok();

    let smtp = SmtpConfig {
        host: std::env::var("SMTP_HOST").ok(),
        port: std::env::var("SMTP_PORT")
            .ok()
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(587),
        username: std::env::var("SMTP_USERNAME").ok(),
        password: std::env::var("SMTP_PASSWORD").ok(),
        from_email: std::env::var("SMTP_FROM_EMAIL")
            .unwrap_or_else(|_| "noreply@edusync.dev".to_string()),
    };

    // ── Wave 1D: S3 config (vil_conn_s3 client built per-handler) ───────────
    let s3_endpoint = std::env::var("S3_ENDPOINT").ok();
    if s3_endpoint.is_none() {
        tracing::warn!(
            "S3_ENDPOINT tidak dikonfigurasi — endpoint storage tidak akan berfungsi. \
             Atur S3_ENDPOINT, S3_ACCESS_KEY_ID, dan S3_SECRET_ACCESS_KEY untuk mengaktifkan."
        );
    } else {
        tracing::info!("S3 config terdeteksi — vil_conn_s3 siap digunakan");
    }
    let s3_bucket = std::env::var("S3_BUCKET").unwrap_or_else(|_| "edusync".to_string());
    let s3_public_url = std::env::var("S3_PUBLIC_URL").ok();

    let redis_url = std::env::var("REDIS_URL").ok();
    let cache = match redis_url {
        Some(url) => match CacheClient::new(&url).await {
            Ok(client) => {
                tracing::info!("Redis cache initialized");
                Some(client)
            }
            Err(e) => {
                tracing::warn!("Failed to initialize Redis cache: {} — caching disabled", e);
                None
            }
        },
        None => {
            tracing::warn!("REDIS_URL not set — caching disabled");
            None
        }
    };

    let app_state = AppState {
        db,
        brute_force,
        shadow: ShadowRuntimeConfig {
            enabled: shadow_enabled,
            divergence_sample_rate,
        },
        groq_api_key,
        vapid_private_key,
        vapid_public_key,
        smtp,
        whatsapp_access_token,
        whatsapp_phone_number_id,
        s3_endpoint,
        s3_bucket,
        s3_public_url,
        cache,
    };

    let state_arc: Arc<AppState> = Arc::new(app_state);

    // ── Wave 1D: VIL Scheduler replaces manual tokio::time::interval cron ────
    let _scheduler = cron::build_scheduler(state_arc.db.clone());

    // ── Wave 1D: WsHub replaces manual RoomManager ───────────────────────────
    let ws_hub = Arc::new(WsHub::new());

    // ── Start pg_notify listener — forwards NOTIFY to WsHub ──────────────────
    start_pg_listener(state_arc.db.clone(), ws_hub.clone());

    // ── Service registrations ─────────────────────────────────────────────────

    let health_service = ServiceProcess::new("system")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/health", get(health_handler))
        .endpoint(Method::GET, "/ready", get(ready_handler))
        .extension(Arc::clone(&state_arc));

    let auth_service = ServiceProcess::new("auth")
        .prefix("/api/v1/auth")
        // Registration & Login
        .endpoint(Method::POST, "/register", post(register_handler))
        .endpoint(Method::POST, "/login", post(login_handler))
        .endpoint(Method::POST, "/signout", post(signout_handler))
        .endpoint(Method::POST, "/refresh", post(refresh_handler))
        .endpoint(Method::POST, "/switch-tenant", post(switch_tenant_handler))
        // Bootstrap — frontend init
        .endpoint(Method::GET, "/bootstrap", get(bootstrap_handler))
        .endpoint(Method::POST, "/ensure-profile", post(ensure_profile_handler))
        // Password reset
        .endpoint(Method::POST, "/reset-password", post(reset_password_handler))
        .endpoint(Method::POST, "/update-password", post(update_password_handler))
        // Email verification
        .endpoint(Method::POST, "/verify", post(verify_email_handler))
        // Sessions
        .endpoint(Method::GET, "/sessions", get(list_sessions_handler))
        .endpoint(Method::POST, "/sessions/revoke", post(revoke_session_handler))
        // OAuth
        .endpoint(Method::GET, "/login/google", get(oauth_google_init_handler))
        .endpoint(Method::GET, "/callback/google", get(oauth_google_callback_handler))
        // MFA
        .endpoint(Method::POST, "/mfa/enroll", post(mfa_enroll_handler))
        .endpoint(Method::POST, "/mfa/verify", post(mfa_verify_handler))
        .endpoint(Method::DELETE, "/mfa/unenroll", delete(mfa_unenroll_handler))
        // Tenant / class RPCs
        .endpoint(Method::GET, "/validate-invitation", get(validate_invitation_handler))
        .endpoint(Method::POST, "/accept-invitation", post(accept_invitation_handler))
        .endpoint(Method::GET, "/lookup-class", get(lookup_class_handler))
        .endpoint(Method::POST, "/enroll", post(enroll_student_handler))
        .endpoint(Method::POST, "/onboard-student", post(onboard_student_handler))
        .endpoint(Method::POST, "/create-tenant", post(create_tenant_handler))
        .extension(Arc::clone(&state_arc));

    let course_service = ServiceProcess::new("courses")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/courses", get(list_courses_handler))
        .endpoint(Method::GET, "/courses/:id", get(get_course_handler))
        .endpoint(Method::POST, "/courses", post(create_course_handler))
        .endpoint(Method::PUT, "/courses/:id", put(update_course_handler))
        .endpoint(Method::DELETE, "/courses/:id", delete(delete_course_handler))
        .endpoint(Method::GET, "/courses/:id/modules", get(get_course_modules_handler))
        .extension(Arc::clone(&state_arc));

    let data_service = ServiceProcess::new("data")
        .prefix("/api/v1")
        .endpoint(Method::POST, "/data/:table", post(query_table_handler))
        .endpoint(Method::POST, "/rpc/:name", post(rpc_proxy_handler))
        .extension(Arc::clone(&state_arc));

    let observability_service = ServiceProcess::new("observability")
        .prefix("/api/v1/internal")
        .endpoint(
            Method::GET,
            "/shadow-config",
            get(observability::shadow_config_handler),
        )
        .endpoint(
            Method::POST,
            "/divergence-events",
            post(observability::divergence_event_handler),
        )
        .extension(Arc::clone(&state_arc));

    // ── Phase 3A: AI services ─────────────────────────────────────────────────
    let ai_service = ServiceProcess::new("ai")
        .prefix("/api/v1/ai")
        .endpoint(Method::POST, "/grade-essay", post(grade_essay_handler))
        .endpoint(Method::POST, "/tutor", post(tutor_chat_handler))
        .endpoint(Method::POST, "/generate-content", post(generate_content_handler))
        .endpoint(Method::POST, "/generate-quiz", post(generate_quiz_handler))
        .extension(Arc::clone(&state_arc));

    // ── Phase 3B: LTI 1.3 ────────────────────────────────────────────────────
    let lti_service = ServiceProcess::new("lti")
        .prefix("/api/v1/lti")
        .endpoint(Method::GET, "/jwks", get(lti_jwks_handler))
        .endpoint(Method::GET, "/oidc-login", get(lti_oidc_login_handler))
        .endpoint(Method::POST, "/launch", post(lti_launch_handler))
        .extension(Arc::clone(&state_arc));

    // ── Phase 3C: Notifications ───────────────────────────────────────────────
    let notification_service = ServiceProcess::new("notifications")
        .prefix("/api/v1")
        .endpoint(Method::POST, "/push/send", post(send_push_handler))
        .endpoint(Method::GET, "/webhooks/whatsapp", get(whatsapp_webhook_get_handler))
        .endpoint(Method::POST, "/webhooks/whatsapp", post(whatsapp_webhook_post_handler))
        .endpoint(Method::POST, "/whatsapp/send-otp", post(send_otp_handler))
        .endpoint(Method::POST, "/whatsapp/verify-otp", post(verify_otp_handler))
        .endpoint(Method::POST, "/pdf/certificate", post(generate_pdf_handler))
        .extension(Arc::clone(&state_arc));

    // ── Phase 3D: Processing ──────────────────────────────────────────────────
    let processing_service = ServiceProcess::new("processing")
        .prefix("/api/v1")
        .endpoint(Method::POST, "/progress", post(enqueue_events_handler))
        .endpoint(Method::GET, "/quiz/:quiz_id/load", get(load_quiz_handler))
        .endpoint(Method::POST, "/scorm/extract", post(extract_scorm_handler))
        .endpoint(Method::POST, "/import/users", post(import_users_handler))
        .extension(Arc::clone(&state_arc));

    // ── Wave 1D: WebSocket realtime service — WsHub injected ─────────────────
    let ws_service = ServiceProcess::new("realtime")
        .prefix("/ws")
        .endpoint(Method::GET, "", get(ws_handler))
        .extension(Arc::clone(&state_arc))
        .extension(ws_hub.clone());

    // ── Wave 1D: S3-compatible object storage — vil_conn_s3 ────────────────
    let storage_service = ServiceProcess::new("storage")
        .prefix("/api/v1/storage")
        .endpoint(Method::POST, "/upload", post(upload_handler))
        .endpoint(Method::GET, "/object/:bucket/*path", get(download_handler))
        .endpoint(Method::DELETE, "/object/:bucket", delete(remove_handler))
        .endpoint(
            Method::GET,
            "/public-url/:bucket/*path",
            get(public_url_handler),
        )
        .endpoint(Method::POST, "/sign", post(create_signed_url_handler))
        .endpoint(Method::POST, "/presign-upload", post(presign_upload_handler))
        .endpoint(Method::GET, "/list/:bucket", get(list_handler))
        .endpoint(
            Method::GET,
            "/migration-status",
            get(migration_status_handler),
        )
        .extension(Arc::clone(&state_arc));

    VilApp::new("edusync-api")
        .port(port)
        .profile(&vil_profile)
        .observer(observer_enabled)
        .service(health_service)
        .service(auth_service)
        .service(course_service)
        .service(data_service)
        .service(observability_service)
        .service(ai_service)
        .service(lti_service)
        .service(notification_service)
        .service(processing_service)
        .service(ws_service)
        .service(storage_service)
        .run()
        .await;

    Ok(())
}
