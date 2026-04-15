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
    pub role: Option<String>,
    pub full_name: Option<String>,
}

#[derive(Deserialize)]
pub struct AcceptInvitationRequest {
    pub token: String,
}

#[derive(Deserialize)]
pub struct SwitchTenantRequest {
    pub tenant_id: Uuid,
    pub refresh_token: String,
}

#[derive(Serialize, Clone)]
pub struct TenantMembershipPayload {
    pub tenant_id: Uuid,
    pub tenant_name: String,
    pub tenant_slug: String,
    pub tenant_logo: Option<String>,
    pub role: String,
    pub status: String,
    pub is_active: bool,
    pub joined_at: Option<String>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub refresh_token: String,
    pub user: UserPayload,
    pub memberships: Vec<TenantMembershipPayload>,
}

#[derive(Serialize, Clone)]
pub struct UserPayload {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub tenant_id: Option<Uuid>,
}
