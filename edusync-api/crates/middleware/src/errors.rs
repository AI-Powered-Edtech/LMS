use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub hint: Option<String>,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Data tidak ditemukan")]
    NotFound,
    #[error("Tidak terautentikasi")]
    Unauthorized,
    #[error("Permintaan tidak valid: {0}")]
    BadRequest(String),
    #[error("Terjadi kesalahan server internal")]
    Internal(String),
    #[error("Akses ditolak")]
    Forbidden,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "PGRST116", self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "PGRST301", self.to_string()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "PGRST100", msg.clone()),
            // Internal: log the raw detail but send only a generic message to the client
            // to avoid leaking implementation details.
            AppError::Internal(detail) => {
                tracing::error!(detail = %detail, "AppError::Internal");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "PGRST500",
                    "Terjadi kesalahan server internal".to_string(),
                )
            }
            AppError::Forbidden => (StatusCode::FORBIDDEN, "PGRST302", self.to_string()),
        };

        (
            status,
            Json(ApiError {
                code: code.to_string(),
                message,
                details: None,
                hint: None,
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!("DB error: {:?}", error);
        match error {
            sqlx::Error::RowNotFound => AppError::NotFound,
            _ => AppError::Internal("Terjadi kesalahan pada database".to_string()),
        }
    }
}
