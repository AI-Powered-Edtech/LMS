use serde::{Deserialize, Serialize};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};

#[derive(Debug, Deserialize)]
pub struct RevokeSessionRequest {
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub user_id: String,
    pub created_at: String,
    pub expires_at: String,
}

pub async fn list_sessions_handler(
    _svc: ServiceCtx,
) -> HandlerResult<VilResponse<Vec<SessionInfo>>> {
    Ok(VilResponse::ok(vec![]))
}

pub async fn revoke_session_handler(
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<bool>> {
    let _body: RevokeSessionRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;
    Ok(VilResponse::ok(true))
}