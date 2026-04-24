use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub fn validate_email(email: &str) -> Result<(), String> {
    let email = email.trim();
    if email.is_empty() {
        return Err("Email tidak boleh kosong".to_string());
    }
    if email.len() > 254 {
        return Err("Email terlalu panjang".to_string());
    }
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err("Format email tidak valid".to_string());
    }
    let local = parts[0];
    let domain = parts[1];
    if local.is_empty() {
        return Err("Format email tidak valid".to_string());
    }
    if domain.is_empty() || !domain.contains('.') {
        return Err("Format email tidak valid".to_string());
    }
    Ok(())
}

pub fn validate_password(password: &str) -> Result<(), String> {
    if password.is_empty() {
        return Err("Password tidak boleh kosong".to_string());
    }
    if password.len() < 8 {
        return Err("Password terlalu lemah (minimal 8 karakter)".to_string());
    }
    if password.len() > 128 {
        return Err("Password terlalu panjang".to_string());
    }
    Ok(())
}

pub fn validate_full_name(full_name: &Option<String>) -> Result<(), String> {
    if let Some(name) = full_name {
        if name.len() > 100 {
            return Err("Nama lengkap terlalu panjang (maksimal 100 karakter)".to_string());
        }
    }
    Ok(())
}

pub fn validate_non_empty(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{} tidak boleh kosong", field));
    }
    Ok(())
}

pub fn validate_max_length(value: &str, max: usize, field: &str) -> Result<(), String> {
    if value.len() > max {
        return Err(format!(
            "{} terlalu panjang (maksimal {} karakter)",
            field, max
        ));
    }
    Ok(())
}

pub fn validate_slug(slug: &str) -> Result<(), String> {
    if slug.is_empty() {
        return Err("Slug tidak boleh kosong".to_string());
    }
    if slug.len() > 50 {
        return Err("Slug terlalu panjang (maksimal 50 karakter)".to_string());
    }
    for c in slug.chars() {
        if !c.is_ascii_alphanumeric() && c != '-' {
            return Err("Slug hanya boleh berisi huruf, angka, dan dash".to_string());
        }
    }
    Ok(())
}

pub trait Validatable {
    fn validate(&self) -> Result<(), String>;
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
    /// Opsional: 'teacher' | 'student'. Default 'student' (kompatibel perilaku lama).
    /// Diperkenalkan oleh migrasi 025 — kebijakan tenant multi-tenant.
    #[serde(default)]
    pub role: Option<String>,
    /// Opsional: kode undangan tenant (redeem_tenant_invite).
    /// - Bila `role='teacher'` dan `invite_code` diisi: user gabung ke organization tenant.
    /// - Bila `role='teacher'` dan `invite_code` kosong: provision personal tenant.
    /// - Bila `role='student'`: kode diabaikan di register (student butuh join_code class via onboard-student).
    #[serde(default)]
    pub invite_code: Option<String>,
}

impl Validatable for RegisterRequest {
    fn validate(&self) -> Result<(), String> {
        validate_email(&self.email)?;
        validate_password(&self.password)?;
        validate_full_name(&self.full_name)?;
        if let Some(role) = self.role.as_deref() {
            let role_lc = role.to_lowercase();
            if role_lc != "teacher" && role_lc != "student" {
                return Err(format!(
                    "Peran '{role}' tidak dikenal. Gunakan 'teacher' atau 'student'."
                ));
            }
        }
        Ok(())
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

impl Validatable for LoginRequest {
    fn validate(&self) -> Result<(), String> {
        validate_email(&self.email)?;
        validate_non_empty(&self.password, "Password")?;
        Ok(())
    }
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

impl Validatable for ResetPasswordRequest {
    fn validate(&self) -> Result<(), String> {
        validate_email(&self.email)?;
        Ok(())
    }
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

impl Validatable for OnboardStudentRequest {
    fn validate(&self) -> Result<(), String> {
        validate_email(&self.email)?;
        validate_password(&self.password)?;
        validate_full_name(&self.full_name)?;
        validate_non_empty(&self.join_code, "Kode join")?;
        Ok(())
    }
}

#[derive(Deserialize)]
pub struct CreateTenantRequest {
    pub name: String,
    pub slug: String,
    pub role: Option<String>,
    pub full_name: Option<String>,
}

impl Validatable for CreateTenantRequest {
    fn validate(&self) -> Result<(), String> {
        validate_non_empty(&self.name, "Nama")?;
        validate_max_length(&self.name, 100, "Nama")?;
        validate_slug(&self.slug)?;
        validate_full_name(&self.full_name)?;
        Ok(())
    }
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
    pub active_tenant_id: Option<Uuid>,
    pub memberships: Vec<TenantMembershipPayload>,
}

#[derive(Serialize, Clone)]
pub struct UserPayload {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub tenant_id: Option<Uuid>,
}
