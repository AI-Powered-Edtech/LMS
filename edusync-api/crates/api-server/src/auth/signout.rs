use std::sync::Arc;
use edusync_auth::session::revoke_session;
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::SignoutRequest;

pub async fn signout_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: SignoutRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if let Some(token) = body.refresh_token {
        let _ = revoke_session(&state.db, &token).await;
    }

    Ok(VilResponse::ok(serde_json::json!({ "success": true })))
}
