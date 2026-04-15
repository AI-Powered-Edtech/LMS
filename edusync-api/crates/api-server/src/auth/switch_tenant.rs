use std::sync::Arc;

use axum::http::HeaderMap;
use edusync_auth::{session::refresh_session, verify_access_token, AuthError};
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::state::AppState;

use super::token::verify_refresh_token_with_session_secret;
use super::types::{AuthResponse, SwitchTenantRequest, TenantMembershipPayload, UserPayload};

pub async fn switch_tenant_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: SwitchTenantRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| VilError::from(AuthError::InvalidToken))?;

    let access_claims = verify_access_token(token, &state.jwt_secret).map_err(VilError::from)?;
    let user_id: Uuid = access_claims
        .sub
        .parse()
        .map_err(|_| VilError::from(AuthError::InvalidToken))?;

    let refresh_claims = verify_refresh_token_with_session_secret(&state, &body.refresh_token)
        .map_err(VilError::from)?;
    if refresh_claims.sub != user_id.to_string() {
        return Err(VilError::from(AuthError::InvalidToken));
    }

    let user = sqlx::query!(
        "SELECT email FROM public.users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?
    .ok_or_else(|| VilError::unauthorized("Pengguna tidak ditemukan"))?;

    let memberships_rows = sqlx::query!(
        r#"SELECT ur.role::text as "role!", ur.tenant_id, ur.created_at,
                  t.name as tenant_name, t.slug as tenant_slug,
                  NULL::text as tenant_logo
           FROM public.user_roles ur
           JOIN public.tenants t ON t.id = ur.tenant_id
           WHERE ur.user_id = $1
           ORDER BY ur.created_at ASC"#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    if memberships_rows.is_empty() {
        return Err(VilError::unauthorized("Pengguna belum terdaftar pada tenant mana pun"));
    }

    let memberships: Vec<TenantMembershipPayload> = memberships_rows
        .iter()
        .map(|m| TenantMembershipPayload {
            tenant_id: m.tenant_id,
            tenant_name: m.tenant_name.clone(),
            tenant_slug: m.tenant_slug.clone(),
            tenant_logo: m.tenant_logo.clone(),
            role: m.role.to_lowercase(),
            status: "active".to_string(),
            is_active: true,
            joined_at: Some(
                m.created_at
                    .format(&time::format_description::well_known::Rfc3339)
                    .unwrap_or_default(),
            ),
        })
        .collect();

    let membership = memberships
        .iter()
        .find(|m| m.tenant_id == body.tenant_id)
        .ok_or_else(|| VilError::forbidden("Anda tidak memiliki akses ke ruang kerja ini."))?;

    let active_role = membership.role.clone();

    let _ = sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, '', '', $3, now(), now())
           ON CONFLICT (id) DO UPDATE
           SET tenant_id = EXCLUDED.tenant_id, updated_at = now()"#,
        user_id,
        user.email,
        body.tenant_id
    )
    .execute(&state.db)
    .await;

    let tokens = refresh_session(
        &state.db,
        &body.refresh_token,
        user_id,
        &user.email,
        &active_role,
        Some(body.tenant_id),
        true,
        &state.jwt_secret,
    )
    .await
    .map_err(VilError::from)?;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload {
            id: user_id,
            email: user.email,
            role: active_role,
            tenant_id: Some(body.tenant_id),
        },
        memberships,
    }))
}
