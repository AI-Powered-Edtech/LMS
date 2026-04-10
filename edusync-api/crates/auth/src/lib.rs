pub mod error;
pub mod jwt;
pub mod password;
pub mod session;

pub use error::AuthError;
pub use jwt::{issue_access_token, issue_refresh_token, verify_access_token, verify_refresh_token};

pub const RATE_LIMIT_AUTH: &str = "10/min per IP";
pub const RATE_LIMIT_AI: &str = "50/hr per user";
pub const RATE_LIMIT_QUIZ: &str = "5/min per user";
pub const RATE_LIMIT_GENERAL: &str = "100/min per user";
