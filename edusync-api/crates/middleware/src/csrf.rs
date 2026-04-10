//! CSRF protection utilities.
//!
//! ## Why this is a pass-through for this API
//!
//! CSRF attacks exploit browser cookie auto-send behaviour. This API authenticates
//! exclusively via `Authorization: Bearer` JWT headers, which browsers never send
//! automatically for cross-site requests. Bearer-token APIs are therefore **not
//! vulnerable to CSRF** without additional cookie-based session state.
//!
//! This module documents the exempt path list and provides a helper for checking
//! whether a path should bypass additional auth layers. If cookie-based sessions
//! are added in the future, implement the Double Submit Cookie pattern here.

/// Paths that are public entry points — no authentication required.
/// Used by CORS pre-flight passthrough and any future CSRF layer.
pub const AUTH_PUBLIC_PATHS: &[&str] = &[
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/verify",
    "/api/v1/auth/login/google",
    "/api/v1/auth/callback/google",
    "/api/v1/health",
    "/api/v1/ready",
];

/// Returns `true` if the request path is a public auth or health endpoint.
pub fn is_public_path(path: &str) -> bool {
    AUTH_PUBLIC_PATHS.iter().any(|&p| path.starts_with(p))
}
