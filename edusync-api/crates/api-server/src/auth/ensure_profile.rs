use std::sync::Arc;
use axum::{extract::Extension, http::HeaderMap, http::StatusCode};
use edusync_auth::{AuthError, verify_access_token};
use crate::state::AppState;

pub async fn ensure_profile_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<StatusCode, AuthError> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::InvalidToken)?;

    let claims = verify_access_token(token, &state.jwt_secret)?;
    let user_id: uuid::Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;

    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, '', '', now(), now())
           ON CONFLICT (id) DO UPDATE SET updated_at = now()"#,
        user_id,
        claims.email,
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::OK)
}
