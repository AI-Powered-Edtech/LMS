// Google OAuth PKCE — Phase 1B stub
// Full implementation requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars
use axum::{extract::{Extension, Query}, http::StatusCode, response::Redirect};
use serde::Deserialize;
use std::sync::Arc;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn oauth_google_init_handler(
    Extension(_state): Extension<Arc<AppState>>,
) -> Result<Redirect, StatusCode> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .unwrap_or_else(|_| "NOT_CONFIGURED".to_string());

    if client_id == "NOT_CONFIGURED" {
        tracing::warn!("Google OAuth not configured — set GOOGLE_CLIENT_ID");
        return Err(StatusCode::NOT_IMPLEMENTED);
    }

    let redirect_uri = std::env::var("APP_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());
    let state = uuid::Uuid::new_v4().to_string();

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}/api/v1/auth/callback/google&response_type=code&scope=openid%20email%20profile&state={}",
        client_id,
        redirect_uri,
        state
    );

    Ok(Redirect::temporary(&url))
}

pub async fn oauth_google_callback_handler(
    Extension(_state): Extension<Arc<AppState>>,
    Query(params): Query<OAuthCallbackQuery>,
) -> Result<Redirect, StatusCode> {
    if let Some(err) = params.error {
        tracing::error!("OAuth error: {}", err);
        return Err(StatusCode::BAD_REQUEST);
    }
    if params.code.is_none() {
        return Err(StatusCode::BAD_REQUEST);
    }
    // TODO: exchange code for tokens, create/get user, create session
    tracing::warn!("Google OAuth callback received but token exchange not yet implemented");
    Ok(Redirect::temporary("http://localhost:5173/#/login?error=oauth_not_implemented"))
}
