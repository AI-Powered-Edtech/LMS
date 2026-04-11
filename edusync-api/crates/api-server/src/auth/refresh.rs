use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::{verify_refresh_token, session::refresh_session};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{RefreshRequest, AuthResponse, UserPayload};

pub async fn refresh_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: RefreshRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let claims = verify_refresh_token(&body.refresh_token, &state.jwt_refresh_secret)
        .map_err(VilError::from)?;
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| VilError::unauthorized("Token tidak valid"))?;

    // Load current user data
    let user = sqlx::query!(
        "SELECT email FROM public.users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching user for refresh");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .ok_or_else(|| VilError::unauthorized("Pengguna tidak ditemukan"))?;

    let role: String = sqlx::query_scalar!(
        "SELECT role::text FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching role");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching tenant_id");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    let tokens = refresh_session(
        &state.db, &body.refresh_token, user_id, &user.email,
        &role, tenant_id, true, &state.jwt_secret,
    )
    .await
    .map_err(VilError::from)?;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: user.email, role, tenant_id },
    }))
}
