use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct SignoutRequest {
    pub refresh_token: Option<String>,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct UpdatePasswordRequest {
    pub token: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct VerifyEmailRequest {
    pub token_hash: String,
    #[serde(rename = "type")]
    pub token_type: String,
}

#[derive(Deserialize)]
pub struct EnrollStudentRequest {
    pub join_code: String,
}

#[derive(Deserialize)]
pub struct OnboardStudentRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
    pub join_code: String,
}

#[derive(Deserialize)]
pub struct CreateTenantRequest {
    pub name: String,
    pub slug: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub refresh_token: String,
    pub user: UserPayload,
}

#[derive(Serialize, Clone)]
pub struct UserPayload {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub tenant_id: Option<Uuid>,
}
