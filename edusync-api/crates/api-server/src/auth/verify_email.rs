use std::sync::Arc;
use axum::http::StatusCode;
use edusync_auth::AuthError;
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::VerifyEmailRequest;

pub async fn verify_email_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<StatusCode>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: VerifyEmailRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // token_hash is SHA-256 of the confirmation_token stored in public.users
    let user = sqlx::query!(
        r#"SELECT id FROM public.users
           WHERE confirmation_token = $1 AND email_confirmed_at IS NULL"#,
        body.token_hash
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?
    .ok_or_else(|| VilError::from(AuthError::InvalidToken))?;

    sqlx::query!(
        "UPDATE public.users SET email_confirmed_at = now(), confirmation_token = NULL WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    Ok(VilResponse::ok(StatusCode::OK))
}
