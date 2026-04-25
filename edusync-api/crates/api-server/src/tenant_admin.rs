//! Tenant-admin endpoints (P4).
//!
//! Endpoint dan gate level role:
//! - GET  /api/v1/tenant-settings                        — baca `tenants.settings`
//!     gate: `rbac.require("principal")` → admin + principal lolos (read-only oversight).
//! - PATCH /api/v1/tenant-settings                       — merge patch JSON
//!     gate: `rbac.require("admin")` → admin-only.
//! - GET  /api/v1/tenant-members                         — list user+roles pada tenant aktif
//!     gate: `rbac.require("admin")` → admin-only.
//! - POST /api/v1/tenant-members/:user_id/roles          — tambah role ke user
//!     gate: `rbac.require("admin")` → admin-only.
//! - DELETE /api/v1/tenant-members/:user_id/roles/:role  — cabut role
//!     gate: `rbac.require("admin")` → admin-only.
//!
//! Selain handler-level `rbac.require(...)`, semua route ini juga lewat
//! `build_authed_ctx` di extractors.rs yang menjalankan policy evaluator
//! (rbac_policy.yaml). Untuk path yang ada di `enforce_paths`, policy adalah
//! primary gate; handler-level check tetap dipertahankan sebagai
//! belt-and-suspenders.

use edusync_middleware::errors::from_sqlx_error;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, NoContent, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{
    extractors::RbacGuard,
    state::AppState,
};

// ---------- Settings ----------

#[derive(Serialize)]
pub struct TenantSettingsResponse {
    pub tenant_id: Uuid,
    pub settings: serde_json::Value,
}

pub async fn get_tenant_settings_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
) -> HandlerResult<VilResponse<TenantSettingsResponse>> {
    let state = svc.state::<AppState>()?.clone();
    // Read access matches policy: admin OR principal (kepala sekolah read-only
    // oversight). PATCH stays admin-only below. Belt-and-suspenders only —
    // the policy evaluator in build_authed_ctx is the primary gate.
    rbac.require("principal")?;
    let tenant_id = rbac.ctx().tenant_id;

    let row = sqlx::query("SELECT settings FROM public.tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(&state.db)
        .await
        .map_err(from_sqlx_error)?
        .ok_or_else(|| VilError::not_found("Tenant tidak ditemukan"))?;
    let settings: serde_json::Value = row
        .try_get::<serde_json::Value, _>("settings")
        .unwrap_or_else(|_| serde_json::json!({}));

    Ok(VilResponse::ok(TenantSettingsResponse {
        tenant_id,
        settings,
    }))
}

#[derive(Deserialize)]
pub struct PatchTenantSettingsRequest {
    /// Object patch yang akan di-merge dengan `tenants.settings` existing
    /// (top-level keys overwritten, nilai `null` menghapus key).
    pub patch: serde_json::Value,
}

pub async fn patch_tenant_settings_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    body: ShmSlice,
) -> HandlerResult<VilResponse<TenantSettingsResponse>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;
    let tenant_id = rbac.ctx().tenant_id;

    let body: PatchTenantSettingsRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    if !body.patch.is_object() {
        return Err(VilError::bad_request(
            "Field `patch` harus berupa object JSON",
        ));
    }

    // `jsonb || patch` merge (top-level) + strip null values via jsonb_strip_nulls.
    let row = sqlx::query(
        r#"UPDATE public.tenants
              SET settings = jsonb_strip_nulls(COALESCE(settings, '{}'::jsonb) || $2::jsonb),
                  updated_at = now()
            WHERE id = $1
            RETURNING settings"#,
    )
    .bind(tenant_id)
    .bind(&body.patch)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Tenant tidak ditemukan"))?;
    let settings: serde_json::Value = row
        .try_get::<serde_json::Value, _>("settings")
        .unwrap_or_else(|_| serde_json::json!({}));

    tracing::info!(
        target: "edusync_api_server::tenant_admin",
        tenant_id = %tenant_id,
        actor_id = %rbac.ctx().user_id,
        "tenant_settings_patched"
    );

    Ok(VilResponse::ok(TenantSettingsResponse {
        tenant_id,
        settings,
    }))
}

// ---------- Members / Roles ----------

const ALLOWED_ROLES: &[&str] = &[
    "STUDENT",
    "TEACHER",
    "ADMIN",
    "REVIEWER",
];

fn normalize_role(input: &str) -> Result<String, VilError> {
    let upper = input.trim().to_uppercase();
    if ALLOWED_ROLES.iter().any(|r| *r == upper) {
        Ok(upper)
    } else {
        Err(VilError::bad_request(format!(
            "Role `{input}` tidak valid. Gunakan salah satu: {}",
            ALLOWED_ROLES.join(", ")
        )))
    }
}

#[derive(Serialize)]
pub struct TenantMemberEntry {
    pub user_id: Uuid,
    pub email: String,
    pub roles: Vec<String>,
    pub joined_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn list_tenant_members_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
) -> HandlerResult<VilResponse<Vec<TenantMemberEntry>>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;
    let tenant_id = rbac.ctx().tenant_id;

    let rows = sqlx::query(
        r#"SELECT ur.user_id,
                 COALESCE(u.email, '') as email,
                 ARRAY_AGG(ur.role::text ORDER BY ur.role::text) as roles,
                 MIN(ur.created_at) as joined_at
             FROM public.user_roles ur
             LEFT JOIN public.users u ON u.id = ur.user_id
            WHERE ur.tenant_id = $1
            GROUP BY ur.user_id, u.email
            ORDER BY joined_at ASC NULLS LAST"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let members = rows
        .into_iter()
        .map(|row| TenantMemberEntry {
            user_id: row.try_get("user_id").unwrap_or_default(),
            email: row.try_get("email").unwrap_or_default(),
            roles: row
                .try_get::<Vec<String>, _>("roles")
                .unwrap_or_default(),
            joined_at: row.try_get("joined_at").ok(),
        })
        .collect();
    Ok(VilResponse::ok(members))
}

#[derive(Deserialize)]
pub struct GrantRoleRequest {
    pub role: String,
}

#[derive(Serialize)]
pub struct RoleMutationResponse {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub role: String,
    pub granted: bool,
}

pub async fn grant_tenant_role_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    axum::extract::Path(user_id): axum::extract::Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<RoleMutationResponse>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;
    let tenant_id = rbac.ctx().tenant_id;

    let body: GrantRoleRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;
    let role = normalize_role(&body.role)?;

    // Pastikan user ada.
    let exists: bool = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE id = $1)",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(from_sqlx_error)?;
    if !exists {
        return Err(VilError::not_found("User tidak ditemukan"));
    }

    let result = sqlx::query(
        r#"INSERT INTO public.user_roles (user_id, role, tenant_id)
           VALUES ($1, $2::public.app_role, $3)
           ON CONFLICT ON CONSTRAINT user_roles_user_id_role_tenant_id_key DO NOTHING"#,
    )
    .bind(user_id)
    .bind(&role)
    .bind(tenant_id)
    .execute(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    tracing::info!(
        target: "edusync_api_server::tenant_admin",
        tenant_id = %tenant_id,
        actor_id = %rbac.ctx().user_id,
        target_user = %user_id,
        role = %role,
        granted = result.rows_affected() > 0,
        "tenant_role_granted"
    );

    Ok(VilResponse::ok(RoleMutationResponse {
        user_id,
        tenant_id,
        role,
        granted: result.rows_affected() > 0,
    }))
}

pub async fn revoke_tenant_role_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    axum::extract::Path((user_id, role)): axum::extract::Path<(Uuid, String)>,
) -> HandlerResult<NoContent> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;
    let tenant_id = rbac.ctx().tenant_id;
    let role = normalize_role(&role)?;

    // Guard: jangan hapus admin terakhir di tenant.
    if role == "ADMIN" {
        let remaining: i64 = sqlx::query_scalar(
            r#"SELECT count(*) FROM public.user_roles
                WHERE tenant_id = $1 AND role = 'ADMIN'::public.app_role
                  AND user_id <> $2"#,
        )
        .bind(tenant_id)
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .map_err(from_sqlx_error)?;
        if remaining < 1 {
            return Err(VilError::bad_request(
                "Tidak dapat mencabut admin terakhir pada tenant ini",
            ));
        }
    }

    let result = sqlx::query(
        r#"DELETE FROM public.user_roles
            WHERE user_id = $1 AND tenant_id = $2 AND role = $3::public.app_role"#,
    )
    .bind(user_id)
    .bind(tenant_id)
    .bind(&role)
    .execute(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    if result.rows_affected() == 0 {
        return Err(VilError::not_found(
            "Role tidak ditemukan untuk user ini pada tenant aktif",
        ));
    }

    tracing::info!(
        target: "edusync_api_server::tenant_admin",
        tenant_id = %tenant_id,
        actor_id = %rbac.ctx().user_id,
        target_user = %user_id,
        role = %role,
        "tenant_role_revoked"
    );

    Ok(NoContent)
}
