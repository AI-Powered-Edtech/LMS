// Google OAuth PKCE — Phase 1B stub
// Full implementation requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars
use axum::{extract::Query, http::StatusCode, response::Redirect};
use serde::Deserialize;
use vil_server::prelude::{ServiceCtx};

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn oauth_google_init_handler(
    _ctx: ServiceCtx,
) -> Result<Redirect, StatusCode> {
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn oauth_google_callback_handler(
    _ctx: ServiceCtx,
    Query(_params): Query<OAuthCallbackQuery>,
) -> Result<Redirect, StatusCode> {
    Err(StatusCode::NOT_IMPLEMENTED)
}
