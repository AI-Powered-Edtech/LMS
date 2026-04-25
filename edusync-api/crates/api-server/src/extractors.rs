use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
    Extension,
};
use edusync_auth::{AuthError, verify_access_token};
use edusync_middleware::rbac::role_has_permission;
use edusync_middleware::rbac_roles::{load_roles, merge_roles};
use edusync_middleware::tenant::TenantContext;
use vil_server::prelude::VilError;
use std::sync::Arc;
use uuid::Uuid;
use crate::state::AppState;

fn extract_tenant_context(
    parts: &Parts,
) -> Result<TenantContext, AuthError> {
    let auth_value = parts
        .headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AuthError::Unauthorized)?;

    let token = auth_value
        .strip_prefix("Bearer ")
        .ok_or(AuthError::Unauthorized)?;

    let claims = verify_access_token(token)?;

    let user_id = claims
        .sub
        .parse::<Uuid>()
        .map_err(|_| AuthError::InvalidToken)?;

    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| t.parse::<Uuid>().ok())
        .ok_or(AuthError::Unauthorized)?;

    let role = claims.role.clone();
    Ok(TenantContext {
        user_id,
        tenant_id,
        role: role.clone(),
        // Provisional: extractor's async path will overwrite this with the
        // DB-loaded multi-role vector. Sync callers (legacy `RbacGuard`) get
        // at least the JWT role so policy evaluation is never empty.
        roles: vec![role],
        email: claims.email,
    })
}

// ---------------------------------------------------------------------------
// AuthError → VilError conversion
// ---------------------------------------------------------------------------

pub trait IntoVilError {
    fn into_vil_error(self) -> VilError;
}

impl IntoVilError for AuthError {
    fn into_vil_error(self) -> VilError {
        match self {
            AuthError::Unauthorized
            | AuthError::InvalidToken
            | AuthError::TokenExpired => VilError::unauthorized(self.to_string()),
            AuthError::Forbidden
            | AuthError::UserBanned
            | AuthError::TenantMismatch => VilError::forbidden(self.to_string()),
            AuthError::InvitationNotFound
            | AuthError::ClassNotFound
            | AuthError::UserNotFound => VilError::not_found(self.to_string()),
            AuthError::TooManyRequests => {
                let mut e = VilError::rate_limited();
                e.detail = self.to_string();
                e
            }
            AuthError::EmailAlreadyExists
            | AuthError::InvalidEmail
            | AuthError::WeakPassword
            | AuthError::InvalidCredentials
            | AuthError::EmailNotConfirmed
            | AuthError::MfaRequired => VilError::bad_request(self.to_string()),
            AuthError::Internal(_) | AuthError::Database(_) => {
                tracing::error!(error = ?self, "AuthError internal");
                VilError::internal("Terjadi kesalahan server internal")
            }
        }
    }
}

/// Axum extractor: validates Bearer token, returns authenticated user context.
///
/// Returns 401 when the Authorization header is missing, malformed, or the token
/// is invalid. Returns 401 when `tenant_id` is absent from the claims.
///
/// # Usage
///
/// ```no_run
/// async fn my_handler(AuthedRequest(ctx): AuthedRequest) -> ... {
///     // ctx.user_id, ctx.tenant_id, ctx.role, ctx.email
/// }
/// ```
pub struct AuthedRequest(pub TenantContext);

#[async_trait]
impl<S> FromRequestParts<S> for AuthedRequest
where
    S: Send + Sync,
{
    type Rejection = VilError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let mut ctx = extract_tenant_context(parts).map_err(IntoVilError::into_vil_error)?;

        // A0: enrich ctx.roles from public.user_roles. Failure-soft — fall
        // back to the JWT role so a transient DB error never locks anyone
        // out. Logged at `rbac_roles_loaded` / `rbac_roles_fallback`.
        let db_roles = load_roles(ctx.user_id, ctx.tenant_id).await;
        let merged = merge_roles(&ctx.role, db_roles);
        tracing::debug!(
            target: "rbac_roles_loaded",
            user_id = %ctx.user_id, tenant_id = %ctx.tenant_id,
            roles_count = merged.len(),
            "rbac_roles_loaded"
        );
        ctx.roles = merged;

        // Shadow-mode policy evaluation — per ADR-001 / U06.3c. Logs verdict
        // but does NOT block (until shadow_mode=false in rbac_policy.yaml).
        shadow_evaluate_policy(parts, &ctx);
        Ok(AuthedRequest(ctx))
    }
}

/// Evaluate rbac_policy for the current request and log the verdict.
/// Never blocks. Intended to surface policy drift before enforcement is flipped.
fn shadow_evaluate_policy(parts: &Parts, ctx: &TenantContext) {
    use edusync_middleware::rbac_policy::{global, Verdict};
    let Some(policy) = global() else { return };
    let method = parts.method.as_str();
    let path = parts.uri.path();
    // A0: evaluate against the *full* role vector, not the legacy single
    // role, so users with TEACHER+WALI_KELAS satisfy either-side policies.
    match policy.evaluate(&ctx.roles, method, path) {
        Verdict::Allow => {}
        Verdict::Deny => {
            tracing::warn!(
                target: "rbac_shadow",
                method = %method, path = %path,
                user_role = %ctx.role, user_id = %ctx.user_id,
                roles = ?ctx.roles,
                "rbac_shadow: would_deny (shadow_mode={})", policy.shadow_mode,
            );
        }
        Verdict::Unmatched => {
            if policy.deny_unmatched {
                tracing::warn!(
                    target: "rbac_shadow",
                    method = %method, path = %path,
                    user_role = %ctx.role,
                    roles = ?ctx.roles,
                    "rbac_shadow: would_deny_unmatched (shadow_mode={})", policy.shadow_mode,
                );
            }
        }
    }
}

/// Axum extractor: same as `AuthedRequest` plus runtime role enforcement.
///
/// Call `rbac.require("teacher")?` to gate by role. `admin` passes every check.
///
/// # Usage
///
/// ```no_run
/// async fn teacher_only(rbac: RbacGuard) -> Result<..., VilError> {
///     rbac.require("teacher")?;
///     let ctx = rbac.ctx();
///     // ...
/// }
/// ```
pub struct RbacGuard(pub TenantContext);

impl RbacGuard {
    /// Returns `Ok(())` if the user has at least `required_role` privilege level.
    pub fn require(&self, required_role: &str) -> Result<(), VilError> {
        if role_has_permission(&self.0.role, required_role) {
            Ok(())
        } else {
            Err(VilError::forbidden("Akses ditolak"))
        }
    }

    pub fn ctx(&self) -> &TenantContext {
        &self.0
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for RbacGuard
where
    S: Send + Sync,
{
    type Rejection = VilError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        extract_tenant_context(parts)
            .map(RbacGuard)
            .map_err(IntoVilError::into_vil_error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use edusync_auth::AuthError;

    #[test]
    fn too_many_requests_maps_to_429() {
        let err: VilError = AuthError::TooManyRequests.into_vil_error();
        assert_eq!(err.status, StatusCode::TOO_MANY_REQUESTS);
    }
}
