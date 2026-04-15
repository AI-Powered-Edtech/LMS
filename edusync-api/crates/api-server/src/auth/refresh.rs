use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::session::refresh_session;
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::token::verify_refresh_token_with_session_secret;
use super::types::{AuthResponse, RefreshRequest, TenantMembershipPayload, UserPayload};
use super::tenant_selection::{select_active_role, select_active_tenant};

pub async fn refresh_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: RefreshRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let claims = verify_refresh_token_with_session_secret(&state, &body.refresh_token)
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
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching memberships");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

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

    let profile_tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.profiles WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching profile tenant_id");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .flatten();

    let active_tenant_id = select_active_tenant(profile_tenant_id, &memberships);
    let active_role = select_active_role(active_tenant_id, &memberships);

    if profile_tenant_id != Some(active_tenant_id) {
        let _ = sqlx::query!(
            r#"UPDATE public.profiles SET tenant_id = $1, updated_at = now() WHERE id = $2"#,
            active_tenant_id,
            user_id
        )
        .execute(&state.db)
        .await;
    }

    let tokens = refresh_session(
        &state.db, &body.refresh_token, user_id, &user.email,
        &active_role, Some(active_tenant_id), true, &state.jwt_secret,
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
            tenant_id: Some(active_tenant_id),
        },
        active_tenant_id: Some(active_tenant_id),
        memberships,
    }))
}
