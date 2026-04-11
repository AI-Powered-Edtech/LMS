//! Middleware errors — migrated to VilError in Phase VIL (Wave 1A).
//!
//! `AppError` is now a type alias for `VilError` from `vil_server`.
//! All existing code that imports or matches on `AppError` continues to
//! compile — it is now operating directly on `VilError`.
//!
//! Migration guide for handler authors:
//! ```rust
//! // Old (Axum):
//! return Err(AppError::NotFound);
//!
//! // New (VIL) — identical import, different underlying type:
//! return Err(AppError::not_found("Data tidak ditemukan"));
//! ```
//!
//! `VilError` already implements `IntoResponse`; no custom impl needed.

pub use vil_server::prelude::VilError as AppError;
pub use vil_server::prelude::VilError;

/// Convenience constructors that mirror the old `AppError` enum variants so
/// call-sites can migrate incrementally without a flag-day rewrite.
pub mod compat {
    use vil_server::prelude::VilError;

    /// Equivalent to `AppError::NotFound`
    #[inline]
    pub fn not_found() -> VilError {
        VilError::not_found("Data tidak ditemukan")
    }

    /// Equivalent to `AppError::Unauthorized`
    #[inline]
    pub fn unauthorized() -> VilError {
        VilError::unauthorized("Tidak terautentikasi")
    }

    /// Equivalent to `AppError::BadRequest(msg)`
    #[inline]
    pub fn bad_request(msg: impl Into<String>) -> VilError {
        VilError::bad_request(msg)
    }

    /// Equivalent to `AppError::Internal(detail)`
    #[inline]
    pub fn internal(detail: impl std::fmt::Display) -> VilError {
        tracing::error!(detail = %detail, "AppError::Internal");
        VilError::internal("Terjadi kesalahan server internal")
    }

    /// Equivalent to `AppError::Forbidden`
    #[inline]
    pub fn forbidden() -> VilError {
        VilError::forbidden("Akses ditolak")
    }
}

/// `From<sqlx::Error>` conversion preserved for all handlers that use `?`
/// on database calls.
impl From<sqlx::Error> for VilError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!("DB error: {:?}", error);
        match error {
            sqlx::Error::RowNotFound => VilError::not_found("Data tidak ditemukan"),
            _ => VilError::internal("Terjadi kesalahan pada database"),
        }
    }
}
