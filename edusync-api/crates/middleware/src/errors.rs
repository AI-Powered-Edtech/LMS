pub use vil_server::prelude::VilError;
use axum::response::{IntoResponse, Response};
use std::fmt;

#[derive(Debug, Clone)]
pub enum AppError {
    BadRequest(String),
    Unauthorized,
    Forbidden,
    NotFound,
    NotFoundMsg(String),
    Conflict(String),
    RateLimited(String),
    Internal(String),
    Database(String),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    pub fn unauthorized() -> Self {
        Self::Unauthorized
    }

    pub fn forbidden() -> Self {
        Self::Forbidden
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        let msg = msg.into();
        if msg.is_empty() {
            Self::NotFound
        } else {
            Self::NotFoundMsg(msg)
        }
    }

    pub fn conflict(msg: impl Into<String>) -> Self {
        Self::Conflict(msg.into())
    }

    pub fn rate_limited(msg: impl Into<String>) -> Self {
        Self::RateLimited(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    pub fn database(msg: impl Into<String>) -> Self {
        Self::Database(msg.into())
    }

    pub fn into_vil_error(self) -> VilError {
        match self {
            Self::BadRequest(msg) => VilError::bad_request(msg),
            Self::Unauthorized => VilError::unauthorized("Tidak terautentikasi"),
            Self::Forbidden => VilError::forbidden("Akses ditolak"),
            Self::NotFound => VilError::not_found("Data tidak ditemukan"),
            Self::NotFoundMsg(msg) => VilError::not_found(msg),
            Self::Conflict(msg) => VilError::bad_request(msg),
            Self::RateLimited(msg) => {
                let mut e = VilError::rate_limited();
                if !msg.is_empty() {
                    e.detail = msg;
                }
                e
            }
            Self::Internal(msg) => VilError::internal(msg),
            Self::Database(msg) => {
                tracing::error!(detail = %msg, "AppError::Database");
                VilError::internal("Terjadi kesalahan pada database")
            }
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::BadRequest(msg) => write!(f, "{msg}"),
            Self::Unauthorized => write!(f, "Tidak terautentikasi"),
            Self::Forbidden => write!(f, "Akses ditolak"),
            Self::NotFound => write!(f, "Data tidak ditemukan"),
            Self::NotFoundMsg(msg) => write!(f, "{msg}"),
            Self::Conflict(msg) => write!(f, "{msg}"),
            Self::RateLimited(msg) => write!(f, "{msg}"),
            Self::Internal(msg) => write!(f, "{msg}"),
            Self::Database(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        self.into_vil_error().into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => Self::NotFound,
            other => Self::Database(other.to_string()),
        }
    }
}

pub fn from_sqlx_error(error: sqlx::Error) -> VilError {
    tracing::error!("DB error: {:?}", error);
    match error {
        sqlx::Error::RowNotFound => VilError::not_found("Data tidak ditemukan"),
        _ => VilError::internal("Terjadi kesalahan pada database"),
    }
}
