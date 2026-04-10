use std::sync::Arc;
use axum::{extract::Extension, http::StatusCode, Json};
use edusync_auth::session::revoke_session;
use crate::state::AppState;
use super::types::SignoutRequest;

pub async fn signout_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<SignoutRequest>,
) -> StatusCode {
    if let Some(token) = body.refresh_token {
        let _ = revoke_session(&state.db, &token).await;
    }
    StatusCode::NO_CONTENT
}
