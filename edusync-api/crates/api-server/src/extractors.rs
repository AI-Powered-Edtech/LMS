use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
    Extension,
};
use edusync_auth::{AuthError, verify_access_token};
use edusync_middleware::rbac::role_has_permission;
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

    Ok(TenantContext { user_id, tenant_id, role: claims.role, email: claims.email })
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
        let Extension(state): Extension<Arc<Arc<AppState>>> =
            Extension::from_request_parts(parts, _state)
                .await
                .map_err(|_| VilError::unauthorized("Tidak terautentikasi"))?;
        extract_tenant_context(parts)
            .map(AuthedRequest)
            .map_err(IntoVilError::into_vil_error)
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
        let Extension(state): Extension<Arc<Arc<AppState>>> =
            Extension::from_request_parts(parts, _state)
                .await
                .map_err(|_| VilError::unauthorized("Tidak terautentikasi"))?;
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
        let err: VilError = AuthError::TooManyRequests.into();
        assert_eq!(err.status, StatusCode::TOO_MANY_REQUESTS);
    }
}
