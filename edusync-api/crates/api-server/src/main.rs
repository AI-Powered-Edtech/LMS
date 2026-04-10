mod auth;
mod health;
mod observability;
mod state;

use dotenvy::dotenv;
use health::{health_handler, ready_handler};
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use vil_server::prelude::{delete, get, post, Method, ServiceProcess, VilApp};

use auth::bootstrap::bootstrap_handler;
use auth::ensure_profile::ensure_profile_handler;
use auth::login::login_handler;
use auth::mfa::{mfa_enroll_handler, mfa_unenroll_handler, mfa_verify_handler};
use auth::oauth::{oauth_google_callback_handler, oauth_google_init_handler};
use auth::refresh::refresh_handler;
use auth::register::register_handler;
use auth::reset_password::{reset_password_handler, update_password_handler};
use auth::signout::signout_handler;
use auth::tenant_rpcs::{
    accept_invitation_handler, create_tenant_handler, enroll_student_handler,
    lookup_class_handler, onboard_student_handler, validate_invitation_handler,
};
use auth::verify_email::verify_email_handler;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "dev-secret-change-in-prod".to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8080);

    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

    let _sentry = observability::init_sentry();

    let app_state = AppState { db, jwt_secret };

    let health_service = ServiceProcess::new("system")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/health", get(health_handler))
        .endpoint(Method::GET, "/ready", get(ready_handler))
        .state(app_state.clone());

    let auth_service = ServiceProcess::new("auth")
        .prefix("/api/v1/auth")
        // Registration & Login
        .endpoint(Method::POST, "/register", post(register_handler))
        .endpoint(Method::POST, "/login", post(login_handler))
        .endpoint(Method::POST, "/signout", post(signout_handler))
        .endpoint(Method::POST, "/refresh", post(refresh_handler))
        // Bootstrap — frontend init
        .endpoint(Method::GET, "/bootstrap", get(bootstrap_handler))
        .endpoint(Method::POST, "/ensure-profile", post(ensure_profile_handler))
        // Password reset
        .endpoint(Method::POST, "/reset-password", post(reset_password_handler))
        .endpoint(Method::POST, "/update-password", post(update_password_handler))
        // Email verification
        .endpoint(Method::POST, "/verify", post(verify_email_handler))
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
        .state(app_state.clone());

    VilApp::new("edusync-api")
        .port(port)
        .profile("development")
        .observer(true)
        .state(app_state)
        .service(health_service)
        .service(auth_service)
        .run()
        .await;

    Ok(())
}
