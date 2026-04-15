use std::sync::Arc;
use axum::http::HeaderMap;
use edusync_auth::{verify_access_token, AuthError};
use serde::Serialize;
use uuid::Uuid;
use vil_server::prelude::{ServiceCtx, VilResponse, VilError, HandlerResult};

use crate::{observability::request_id_from_headers, state::AppState};

#[derive(Serialize)]
pub struct BootstrapProfile {
    pub id: Uuid,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub avatar_url: Option<String>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct BootstrapMembership {
    pub role: String,
    pub status: String,
    pub is_active: bool,
    pub joined_at: Option<String>,
    pub tenant_id: Uuid,
    pub tenant_logo: Option<String>,
    pub tenant_name: String,
    pub tenant_slug: String,
}

#[derive(Serialize)]
pub struct BootstrapResponse {
    pub profile: BootstrapProfile,
    pub memberships: Vec<BootstrapMembership>,
    pub default_tenant_id: Option<Uuid>,
    pub requires_email_verification: bool,
}

pub async fn bootstrap_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
) -> HandlerResult<VilResponse<BootstrapResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();

    let request_id = request_id_from_headers(&headers);
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| VilError::from(AuthError::InvalidToken))?;

    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(VilError::from)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| VilError::from(AuthError::InvalidToken))?;
    tracing::info!(
        target: "edusync_api_server::auth",
        request_id = %request_id,
        flow = "auth.bootstrap",
        user_id = %user_id,
        role = %claims.role,
        tenant_id = %claims.tenant_id.clone().unwrap_or_default(),
        "auth_bootstrap_request"
    );

    // Get profile + email_confirmed_at
    let row = sqlx::query!(
        r#"SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.tenant_id,
                  COALESCE(u.email, p.email) as "email!",
                  u.email_confirmed_at
           FROM public.profiles p
           LEFT JOIN public.users u ON u.id = p.id
           WHERE p.id = $1"#,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?
    .ok_or_else(|| VilError::from(AuthError::UserNotFound))?;

    let requires_email_verification = row.email_confirmed_at.is_none();

    // Get memberships via user_roles JOIN tenants
    let memberships_rows = sqlx::query!(
        r#"SELECT ur.role::text as "role!", ur.tenant_id, ur.created_at,
                  t.name as tenant_name, t.slug as tenant_slug,
                  NULL::text as tenant_logo
           FROM public.user_roles ur
           JOIN public.tenants t ON t.id = ur.tenant_id
           WHERE ur.user_id = $1"#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    let memberships: Vec<BootstrapMembership> = memberships_rows
        .into_iter()
        .map(|m| BootstrapMembership {
            role: m.role.to_lowercase(),
            status: "active".to_string(),
            is_active: true,
            // OffsetDateTime → RFC3339 string via time crate
            joined_at: Some(m.created_at.format(&time::format_description::well_known::Rfc3339).unwrap_or_default()),
            tenant_id: m.tenant_id,
            tenant_logo: m.tenant_logo,
            tenant_name: m.tenant_name,
            tenant_slug: m.tenant_slug,
        })
        .collect();

    let default_tenant_id = row
        .tenant_id
        .filter(|tenant_id| memberships.iter().any(|m| m.tenant_id == *tenant_id))
        .or_else(|| memberships.first().map(|m| m.tenant_id));

    // first_name / last_name are NOT NULL String in profiles (default '')
    let first_name = if row.first_name.is_empty() { None } else { Some(row.first_name) };
    let last_name  = if row.last_name.is_empty()  { None } else { Some(row.last_name) };

    Ok(VilResponse::ok(BootstrapResponse {
        profile: BootstrapProfile {
            id: row.id,
            email: row.email,
            first_name,
            last_name,
            avatar_url: row.avatar_url,
            tenant_id: row.tenant_id,
        },
        memberships,
        default_tenant_id,
        requires_email_verification,
    }))
}
