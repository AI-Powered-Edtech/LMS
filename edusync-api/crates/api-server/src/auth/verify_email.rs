use crate::extractors::IntoVilError;
use std::sync::Arc;
use edusync_auth::AuthError;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};
use crate::state::AppState;
use super::types::VerifyEmailRequest;
use uuid::Uuid;

pub async fn verify_email_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>().map(|s| Arc::new(s.clone()))?;
    let body: VerifyEmailRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // token_hash is SHA-256 of the confirmation_token stored in public.users
    let user_id: Uuid = sqlx::query_scalar(
        r#"SELECT id FROM public.users
           WHERE confirmation_token = $1 AND email_confirmed_at IS NULL"#,
    )
    .bind(body.token_hash)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::InvalidToken.into_vil_error())?;

    sqlx::query("UPDATE public.users SET email_confirmed_at = now(), confirmation_token = NULL WHERE id = $1")
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    Ok(VilResponse::ok(serde_json::json!({ "ok": true })))
}
