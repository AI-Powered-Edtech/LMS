use std::sync::Arc;
use axum::{extract::Extension, Json};
use uuid::Uuid;
use edusync_auth::{AuthError, verify_refresh_token, session::refresh_session};
use crate::state::AppState;
use super::types::{RefreshRequest, AuthResponse, UserPayload};

pub async fn refresh_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    let claims = verify_refresh_token(&body.refresh_token, &state.jwt_secret)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;

    // Load current user data
    let user = sqlx::query!(
        "SELECT email FROM public.users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::UserNotFound)?;

    let role: String = sqlx::query_scalar!(
        "SELECT role::text FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?;

    let tokens = refresh_session(
        &state.db, &body.refresh_token, user_id, &user.email,
        &role, tenant_id, true, &state.jwt_secret,
    ).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: user.email, role, tenant_id },
    }))
}
