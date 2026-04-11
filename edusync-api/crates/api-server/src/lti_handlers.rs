//! Phase 3B — LTI 1.3 Axum handlers.
//!
//! These handlers are called by external LTI platforms and do not require
//! EduSync auth — they validate the LTI id_token themselves.

use axum::{
    extract::{Form, Query},
    response::IntoResponse,
    Extension,
};
use std::sync::Arc;

use crate::state::AppState;
use edusync_services::lti::{
    jwks::get_jwks,
    launch::{handle_launch, LaunchContext, LtiLaunchForm},
    oidc_login::{handle_oidc_login, OidcLoginContext},
    types::LtiOidcLoginRequest,
};

// ─── JWKS ─────────────────────────────────────────────────────────────────────

/// Public JWKS endpoint — no auth required.
pub async fn lti_jwks_handler() -> impl IntoResponse {
    match get_jwks().await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
}

// ─── OIDC Login ───────────────────────────────────────────────────────────────

/// LTI OIDC login initiation — called by the platform via GET.
pub async fn lti_oidc_login_handler(
    Extension(state): Extension<Arc<AppState>>,
    Query(req): Query<LtiOidcLoginRequest>,
) -> impl IntoResponse {
    let ctx = OidcLoginContext {
        db: Arc::new(state.db.clone()),
    };
    match handle_oidc_login(ctx, req).await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
}

// ─── Launch ───────────────────────────────────────────────────────────────────

/// LTI launch — called by the platform via POST with form-encoded id_token + state.
pub async fn lti_launch_handler(
    Extension(state): Extension<Arc<AppState>>,
    Form(form): Form<LtiLaunchForm>,
) -> impl IntoResponse {
    let ctx = LaunchContext {
        db: Arc::new(state.db.clone()),
        jwt_secret: state.jwt_secret.clone(),
    };
    match handle_launch(ctx, form).await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
}
