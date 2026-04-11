use std::sync::Arc;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use edusync_auth::{AuthError, verify_access_token};
use vil_server::prelude::{ServiceCtx, VilResponse, VilError, HandlerResult};
use crate::state::AppState;

pub async fn ensure_profile_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
) -> HandlerResult<VilResponse<StatusCode>> {
    let state = svc.state::<Arc<AppState>>()?.clone();

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| VilError::from(AuthError::InvalidToken))?;

    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(VilError::from)?;
    let user_id: uuid::Uuid = claims.sub.parse().map_err(|_| VilError::from(AuthError::InvalidToken))?;

    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, '', '', now(), now())
           ON CONFLICT (id) DO UPDATE SET updated_at = now()"#,
        user_id,
        claims.email,
    )
    .execute(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    Ok(VilResponse::ok(StatusCode::OK))
}
