use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use edusync_auth::{AuthError, verify_access_token};
use edusync_middleware::rbac::role_has_permission;
use edusync_middleware::rbac_roles::{load_roles, merge_roles};
use edusync_middleware::tenant::TenantContext;
use vil_server::prelude::VilError;
use uuid::Uuid;

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

impl From<AuthError> for VilError {
    fn from(error: AuthError) -> Self {
        error.into_vil_error()
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

/// Shared FromRequestParts pipeline used by both `AuthedRequest` and
/// `RbacGuard`: validate JWT → enrich multi-role from DB → run the
/// shadow/enforce policy evaluator. Anything calling this gets the same
/// authz semantics, so wiring a new extractor type to this helper is enough
/// to inherit RBAC enforcement.
async fn build_authed_ctx(parts: &mut Parts) -> Result<TenantContext, VilError> {
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

    // A3 partial enforce flip — Deny verdicts return 403 only for paths
    // listed in `enforce_paths` of rbac_policy.yaml (or any path when
    // global shadow_mode is off). Other modules stay shadow-mode and
    // only log "would_deny", to keep the rollout incremental.
    evaluate_policy_or_enforce(parts, &ctx)?;
    Ok(ctx)
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthedRequest
where
    S: Send + Sync,
{
    type Rejection = VilError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(AuthedRequest(build_authed_ctx(parts).await?))
    }
}

/// Evaluate rbac_policy for the current request. Returns `Err(VilError::forbidden)`
/// when the verdict is Deny *and* the path is hard-enforced (or shadow_mode is
/// globally off). Otherwise just logs and returns Ok — preserving the original
/// shadow-mode telemetry for the rest of the surface.
fn evaluate_policy_or_enforce(parts: &Parts, ctx: &TenantContext) -> Result<(), VilError> {
    use edusync_middleware::rbac_policy::{global, Verdict};
    let Some(policy) = global() else { return Ok(()) };
    let method = parts.method.as_str();
    // vil_server's ServiceProcess.prefix() already strips `/api/v1` from the
    // path before the extractor runs — so paths look like `/data/invoices`,
    // matching the policy key convention. Both `evaluate` and `is_enforced`
    // see the same shape.
    let raw_path = parts.uri.path();
    let enforced = policy.is_enforced(raw_path);
    let global_enforce = !policy.shadow_mode;

    // A0: evaluate against the *full* role vector, not the legacy single
    // role, so users with TEACHER+WALI_KELAS satisfy either-side policies.
    match policy.evaluate(&ctx.roles, method, raw_path) {
        Verdict::Allow => Ok(()),
        Verdict::Deny => {
            if global_enforce || enforced {
                tracing::warn!(
                    target: "rbac_enforce",
                    method = %method, path = %raw_path,
                    user_id = %ctx.user_id, roles = ?ctx.roles,
                    "rbac_enforce: deny",
                );
                Err(VilError::forbidden("Akses ditolak (RBAC)"))
            } else {
                tracing::warn!(
                    target: "rbac_shadow",
                    method = %method, path = %raw_path,
                    user_role = %ctx.role, user_id = %ctx.user_id,
                    roles = ?ctx.roles,
                    "rbac_shadow: would_deny (shadow_mode=true)",
                );
                Ok(())
            }
        }
        Verdict::Unmatched => {
            if policy.deny_unmatched && (global_enforce || enforced) {
                tracing::warn!(
                    target: "rbac_enforce",
                    method = %method, path = %raw_path,
                    user_id = %ctx.user_id, roles = ?ctx.roles,
                    "rbac_enforce: deny_unmatched",
                );
                Err(VilError::forbidden(
                    "Akses ditolak (RBAC: route not in policy)",
                ))
            } else if policy.deny_unmatched {
                tracing::warn!(
                    target: "rbac_shadow",
                    method = %method, path = %raw_path,
                    user_role = %ctx.role,
                    roles = ?ctx.roles,
                    "rbac_shadow: would_deny_unmatched (shadow_mode=true)",
                );
                Ok(())
            } else {
                Ok(())
            }
        }
    }
}

/// Axum extractor: same JWT/multi-role/policy pipeline as `AuthedRequest`,
/// plus a `require()` helper for handler-level role checks.
///
/// As of the A3 partial enforce flip, RbacGuard runs through the same
/// `build_authed_ctx` pipeline as AuthedRequest — so middleware-level
/// enforcement applies identically to `/tenant-members`, `/tenant-invites`,
/// `/tenant-settings` and friends. `require()` is preserved as a
/// belt-and-suspenders handler-level gate for legacy code paths and for
/// stricter checks the policy file does not yet express.
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
        Ok(RbacGuard(build_authed_ctx(parts).await?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use edusync_auth::AuthError;

    #[test]
    fn too_many_requests_maps_to_429() {
        let err: VilError = AuthError::TooManyRequests.into();
        assert_eq!(err.status, StatusCode::TOO_MANY_REQUESTS);
    }
}
