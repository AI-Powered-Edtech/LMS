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
    #[error("Not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Forbidden")]
    Forbidden,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "PGRST116", self.to_string()),
            AppError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "PGRST301", self.to_string())
            }
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "PGRST100", msg.clone()),
            AppError::Internal(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "PGRST500", msg.clone())
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
            _ => AppError::Internal(error.to_string()),
        }
    }
}
