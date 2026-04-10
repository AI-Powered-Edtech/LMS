use std::sync::Arc;
use axum::{extract::Extension, http::StatusCode, Json};
use edusync_auth::AuthError;
use crate::state::AppState;
use super::types::VerifyEmailRequest;

pub async fn verify_email_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<VerifyEmailRequest>,
) -> Result<StatusCode, AuthError> {
    // token_hash is SHA-256 of the confirmation_token stored in public.users
    let user = sqlx::query!(
        r#"SELECT id FROM public.users
           WHERE confirmation_token = $1 AND email_confirmed_at IS NULL"#,
        body.token_hash
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    sqlx::query!(
        "UPDATE public.users SET email_confirmed_at = now(), confirmation_token = NULL WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::OK)
}
