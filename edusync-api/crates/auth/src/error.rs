use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Email sudah terdaftar")]
    EmailAlreadyExists,
    #[error("Format email tidak valid")]
    InvalidEmail,
    #[error("Password terlalu lemah (minimal 8 karakter)")]
    WeakPassword,
    #[error("Email atau password salah")]
    InvalidCredentials,
    #[error("Pengguna tidak ditemukan")]
    UserNotFound,
    #[error("Email belum dikonfirmasi")]
    EmailNotConfirmed,
    #[error("Akun diblokir")]
    UserBanned,
    #[error("Token kedaluwarsa")]
    TokenExpired,
    #[error("Token tidak valid")]
    InvalidToken,
    #[error("Verifikasi MFA diperlukan")]
    MfaRequired,
    #[error("Tenant tidak cocok")]
    TenantMismatch,
    #[error("Terlalu banyak percobaan, coba lagi nanti")]
    TooManyRequests,
    #[error("Undangan tidak ditemukan atau kedaluwarsa")]
    InvitationNotFound,
    #[error("Kode kelas tidak ditemukan")]
    ClassNotFound,
    #[error("Tidak memiliki otorisasi")]
    Unauthorized,
    #[error("Akses ditolak")]
    Forbidden,
    /// Internal error: detail is logged server-side but NOT sent to the client.
    #[error("Terjadi kesalahan server internal")]
    Internal(String),
    /// Database error: detail is logged server-side but NOT sent to the client.
    #[error("Terjadi kesalahan pada database")]
    Database(#[from] sqlx::Error),
}

#[derive(Serialize)]
struct AuthErrorBody {
    code: &'static str,
    message: String,
    details: Option<String>,
    hint: Option<String>,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        // Log internal details server-side before stripping them from the response.
        match &self {
            AuthError::Internal(detail) => {
                tracing::error!(detail = %detail, "AuthError::Internal");
            }
            AuthError::Database(db_err) => {
                tracing::error!(error = ?db_err, "AuthError::Database");
            }
            _ => {}
        }

        let (status, code) = match &self {
            AuthError::EmailAlreadyExists => (StatusCode::UNPROCESSABLE_ENTITY, "email_exists"),
            AuthError::InvalidEmail => (StatusCode::UNPROCESSABLE_ENTITY, "invalid_email"),
            AuthError::WeakPassword => (StatusCode::UNPROCESSABLE_ENTITY, "weak_password"),
            AuthError::InvalidCredentials => (StatusCode::BAD_REQUEST, "invalid_credentials"),
            AuthError::UserNotFound => (StatusCode::BAD_REQUEST, "user_not_found"),
            AuthError::EmailNotConfirmed => (StatusCode::BAD_REQUEST, "email_not_confirmed"),
            AuthError::UserBanned => (StatusCode::FORBIDDEN, "user_banned"),
            AuthError::TokenExpired => (StatusCode::UNAUTHORIZED, "token_expired"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "invalid_token"),
            AuthError::MfaRequired => (StatusCode::BAD_REQUEST, "mfa_required"),
            AuthError::TenantMismatch => (StatusCode::FORBIDDEN, "tenant_mismatch"),
            AuthError::TooManyRequests => {
                (StatusCode::TOO_MANY_REQUESTS, "over_request_rate_limit")
            }
            AuthError::InvitationNotFound => (StatusCode::NOT_FOUND, "invitation_not_found"),
            AuthError::ClassNotFound => (StatusCode::NOT_FOUND, "class_not_found"),
            AuthError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            AuthError::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
            AuthError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
            AuthError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error"),
        };

        // Use self.to_string() for the client message — Internal/Database now produce
        // generic Indonesian messages rather than leaking internal detail.
        (
            status,
            Json(AuthErrorBody {
                code,
                message: self.to_string(),
                details: None,
                hint: None,
            }),
        )
            .into_response()
    }
}
