#[derive(Debug, Clone)]
pub struct AuthClaims {
    pub user_id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub role: String,
}

pub const RATE_LIMIT_AUTH: &str = "10/min per IP";
pub const RATE_LIMIT_AI: &str = "50/hr per user";
pub const RATE_LIMIT_QUIZ: &str = "5/min per user";
pub const RATE_LIMIT_GENERAL: &str = "100/min per user";
