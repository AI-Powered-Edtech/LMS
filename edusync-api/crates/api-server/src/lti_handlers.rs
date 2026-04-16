//! Phase 3B — LTI 1.3 handlers (VIL Way).
//!
//! These handlers are called by external LTI platforms and do not require
//! EduSync auth — they validate the LTI id_token themselves.
//!
//! Handler migration notes:
//! - `lti_jwks_handler`       — no extractors (public endpoint); returns raw response.
//! - `lti_oidc_login_handler` — platform-initiated GET; keeps `Query<T>` extractor.
//! - `lti_launch_handler`     — platform-initiated POST with form-encoded body;
//!                              keeps `Form<T>` extractor (NOT ShmSlice — not JSON).
//!
//! All three use `ServiceCtx` instead of `Extension<Arc<AppState>>`.

use axum::{
    extract::{Form, Query},
    response::IntoResponse,
};
use std::sync::Arc;
use vil_server::prelude::{HandlerResult, ServiceCtx, VilError};

use crate::state::AppState;
use edusync_services::lti::{
    jwks::get_jwks,
    launch::{handle_launch, LaunchContext, LtiLaunchForm},
    oidc_login::{handle_oidc_login, OidcLoginContext},
    types::LtiOidcLoginRequest,
};

// ─── JWKS ─────────────────────────────────────────────────────────────────────

/// Public JWKS endpoint — no auth required.
pub async fn lti_jwks_handler() -> HandlerResult<impl IntoResponse> {
    let resp = get_jwks()
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(resp.into_response())
}

// ─── OIDC Login ───────────────────────────────────────────────────────────────

/// LTI OIDC login initiation — called by the platform via GET.
///
/// Keeps `Query<T>` extractor: the platform sends query-string parameters,
/// not a JSON body, so `ShmSlice` is not applicable here.
pub async fn lti_oidc_login_handler(
    svc: ServiceCtx,
    Query(req): Query<LtiOidcLoginRequest>,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<Arc<AppState>>()?;
    let ctx = OidcLoginContext {
        db: Arc::new(state.db.clone()),
    };

    let resp = handle_oidc_login(ctx, req)
        .await
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    Ok(resp.into_response())
}

// ─── Launch ───────────────────────────────────────────────────────────────────

/// LTI launch — called by the platform via POST with form-encoded id_token + state.
///
/// Keeps `Form<T>` extractor: the LTI 1.3 spec mandates
/// `application/x-www-form-urlencoded` for the launch POST — not JSON.
pub async fn lti_launch_handler(
    svc: ServiceCtx,
    Form(form): Form<LtiLaunchForm>,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<Arc<AppState>>()?;
    let ctx = LaunchContext {
        db: Arc::new(state.db.clone()),
        jwt_secret: state.jwt_secret.clone(),
    };

    let resp = handle_launch(ctx, form)
        .await
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    Ok(resp.into_response())
}
