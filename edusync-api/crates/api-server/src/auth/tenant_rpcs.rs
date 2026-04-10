use std::sync::Arc;
use axum::{extract::{Extension, Query}, http::{HeaderMap, StatusCode}, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use edusync_auth::{AuthError, verify_access_token};
use crate::state::AppState;
use super::types::{OnboardStudentRequest, EnrollStudentRequest, CreateTenantRequest, AcceptInvitationRequest};
use super::types::{AuthResponse, UserPayload};
use edusync_auth::{password::hash_password, session::create_session};

// --- 1B-18: Validate invitation (public) ---
#[derive(Deserialize)]
pub struct ValidateInvitationQuery {
    pub token: String,
}

#[derive(Serialize)]
pub struct InvitationInfo {
    pub email: String,
    pub role: String,
    pub tenant_id: Uuid,
    pub tenant_name: String,
}

pub async fn validate_invitation_handler(
    Extension(state): Extension<Arc<AppState>>,
    Query(params): Query<ValidateInvitationQuery>,
) -> Result<Json<InvitationInfo>, AuthError> {
    let row = sqlx::query!(
        r#"SELECT i.email, i.role::text as "role!", i.tenant_id, t.name as tenant_name
           FROM public.user_invitations i
           JOIN public.tenants t ON t.id = i.tenant_id
           WHERE i.token = $1
             AND i.status = 'pending'
             AND i.expires_at > now()"#,
        params.token
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvitationNotFound)?;

    Ok(Json(InvitationInfo {
        email: row.email,
        role: row.role.to_lowercase(),
        tenant_id: row.tenant_id,
        tenant_name: row.tenant_name,
    }))
}

// --- 1B-17: Accept invitation (requires Bearer JWT) ---
pub async fn accept_invitation_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<AcceptInvitationRequest>,
) -> Result<Json<serde_json::Value>, AuthError> {
    // Verify JWT
    let token_str = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::Unauthorized)?;

    let claims = verify_access_token(token_str, &state.jwt_secret)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;

    // Look up pending, non-expired invitation
    let inv = sqlx::query!(
        r#"SELECT id, email, role::text as "role!", tenant_id
           FROM public.user_invitations
           WHERE token = $1 AND status = 'pending' AND expires_at > now()"#,
        body.token
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvitationNotFound)?;

    // Verify the logged-in user's email matches the invitation
    let user_email: String = sqlx::query_scalar!(
        "SELECT COALESCE(email, '') FROM public.users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .flatten()
    .ok_or(AuthError::UserNotFound)?;

    if user_email.trim().to_lowercase() != inv.email.trim().to_lowercase() {
        return Err(AuthError::TenantMismatch);
    }

    let role_upper = inv.role.to_uppercase();

    let mut tx = state.db.begin().await?;

    // 1. Mark invitation accepted
    sqlx::query!(
        "UPDATE public.user_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1",
        inv.id
    )
    .execute(&mut *tx)
    .await?;

    // 2. Upsert tenant_memberships
    sqlx::query!(
        r#"INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, joined_at, updated_at)
           VALUES ($1, $2, $3, 'active', now(), now())
           ON CONFLICT (tenant_id, user_id) DO UPDATE
           SET role = EXCLUDED.role, status = 'active', updated_at = now()"#,
        inv.tenant_id, user_id, role_upper
    )
    .execute(&mut *tx)
    .await?;

    // 3. Upsert user_roles — mirrors sync_user_tenant_access:
    //    remove existing (user, tenant) entry first to avoid unique(user_id, tenant_id) conflict,
    //    then insert/update on unique(user_id, role).
    sqlx::query(
        "DELETE FROM public.user_roles WHERE user_id = $1 AND tenant_id = $2"
    )
    .bind(user_id)
    .bind(inv.tenant_id)
    .execute(&mut *tx)
    .await?;

    // Use non-macro query for app_role enum cast (sqlx! macro has no built-in app_role mapping)
    sqlx::query(
        r#"INSERT INTO public.user_roles (user_id, tenant_id, role)
           VALUES ($1, $2, $3::app_role)
           ON CONFLICT (user_id, role) DO UPDATE
           SET tenant_id = EXCLUDED.tenant_id"#
    )
    .bind(user_id)
    .bind(inv.tenant_id)
    .bind(&role_upper)
    .execute(&mut *tx)
    .await?;

    // 4. Update profile tenant_id if currently unset
    sqlx::query!(
        "UPDATE public.profiles SET tenant_id = COALESCE(tenant_id, $1), updated_at = now() WHERE id = $2",
        inv.tenant_id, user_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "tenant_id": inv.tenant_id,
        "role": inv.role.to_lowercase()
    })))
}

// --- 1B-20: Lookup class by join code (public) ---
#[derive(Deserialize)]
pub struct LookupClassQuery {
    pub code: String,
}

#[derive(Serialize)]
pub struct ClassInfo {
    pub id: Uuid,
    pub name: String,
    pub tenant_id: Uuid,
}

pub async fn lookup_class_handler(
    Extension(state): Extension<Arc<AppState>>,
    Query(params): Query<LookupClassQuery>,
) -> Result<Json<ClassInfo>, AuthError> {
    let class = sqlx::query!(
        "SELECT id, name, tenant_id FROM public.classes WHERE join_code = $1",
        params.code
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::ClassNotFound)?;

    Ok(Json(ClassInfo {
        id: class.id,
        name: class.name,
        tenant_id: class.tenant_id,
    }))
}

// --- 1B-19: Enroll student via join code ---
pub async fn enroll_student_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<EnrollStudentRequest>,
) -> Result<StatusCode, AuthError> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::InvalidToken)?;

    let claims = verify_access_token(token, &state.jwt_secret)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;

    let class = sqlx::query!(
        "SELECT id, tenant_id FROM public.classes WHERE join_code = $1",
        body.join_code
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::ClassNotFound)?;

    // Upsert enrollment (use student_id per schema)
    // enrollments has no unique constraint on (class_id, student_id) — use plain INSERT with conflict guard
    let existing: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id = $1 AND student_id = $2)",
        class.id, user_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !existing {
        sqlx::query!(
            r#"INSERT INTO public.enrollments (class_id, student_id, tenant_id)
               VALUES ($1, $2, $3)"#,
            class.id, user_id, class.tenant_id
        )
        .execute(&state.db)
        .await?;
    }

    Ok(StatusCode::OK)
}

// --- 1B-21: Onboard student (register + enroll in one tx) ---
pub async fn onboard_student_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<OnboardStudentRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    if !body.email.contains('@') { return Err(AuthError::InvalidEmail); }
    if body.password.len() < 8   { return Err(AuthError::WeakPassword); }

    // Find class
    let class = sqlx::query!(
        "SELECT id, tenant_id FROM public.classes WHERE join_code = $1",
        body.join_code
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::ClassNotFound)?;

    let exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE email = $1)",
        body.email
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if exists { return Err(AuthError::EmailAlreadyExists); }

    let user_id = Uuid::new_v4();
    let hash = hash_password(&body.password)?;
    let (first_name, last_name) = split_name(body.full_name.as_deref().unwrap_or(""));

    let mut tx = state.db.begin().await?;

    sqlx::query!(
        r#"INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
        user_id, body.email, hash
    )
    .execute(&mut *tx).await?;

    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, now(), now())"#,
        user_id, body.email, first_name, last_name, class.tenant_id
    )
    .execute(&mut *tx).await?;

    sqlx::query!(
        r#"INSERT INTO public.user_roles (user_id, role, tenant_id)
           VALUES ($1, 'STUDENT', $2)"#,
        user_id, class.tenant_id
    )
    .execute(&mut *tx).await?;

    sqlx::query!(
        r#"INSERT INTO public.enrollments (class_id, student_id, tenant_id)
           VALUES ($1, $2, $3)"#,
        class.id, user_id, class.tenant_id
    )
    .execute(&mut *tx).await?;

    tx.commit().await?;

    let tokens = create_session(
        &state.db, user_id, &body.email, "STUDENT",
        Some(class.tenant_id), false, &state.jwt_secret,
    ).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: body.email, role: "STUDENT".to_string(), tenant_id: Some(class.tenant_id) },
    }))
}

// --- 1B-22: Create tenant ---
pub async fn create_tenant_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<CreateTenantRequest>,
) -> Result<StatusCode, AuthError> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::InvalidToken)?;

    let claims = verify_access_token(token, &state.jwt_secret)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;

    let mut tx = state.db.begin().await?;
    let tenant_id = Uuid::new_v4();

    sqlx::query!(
        r#"INSERT INTO public.tenants (id, name, slug, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
        tenant_id, body.name, body.slug
    )
    .execute(&mut *tx).await?;

    sqlx::query!(
        r#"INSERT INTO public.user_roles (user_id, role, tenant_id)
           VALUES ($1, 'ADMIN', $2)"#,
        user_id, tenant_id
    )
    .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(StatusCode::CREATED)
}

fn split_name(full: &str) -> (String, String) {
    let mut parts = full.splitn(2, ' ');
    let first = parts.next().unwrap_or("").to_string();
    let last = parts.next().unwrap_or("").to_string();
    (first, last)
}
