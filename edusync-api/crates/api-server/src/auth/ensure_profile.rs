use crate::extractors::IntoVilError;
use std::sync::Arc;
use axum::http::HeaderMap;
use edusync_auth::{AuthError, verify_access_token};
use vil_server::prelude::{ServiceCtx, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use uuid::Uuid;

pub async fn ensure_profile_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>().map(|s| Arc::new(s.clone()))?;

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    let claims = verify_access_token(token)
        .map_err(IntoVilError::into_vil_error)?;
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    sqlx::query(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, '', '', now(), now())
           ON CONFLICT (id) DO UPDATE SET updated_at = now()"#,
    )
    .bind(user_id)
    .bind(&claims.email)
    .execute(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    Ok(VilResponse::ok(serde_json::json!({ "ok": true })))
}
