use std::sync::Arc;
use axum::{extract::{Extension, Query}, http::{HeaderMap, StatusCode}, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use edusync_auth::{AuthError, verify_access_token};
use crate::state::AppState;
use super::types::{OnboardStudentRequest, EnrollStudentRequest, CreateTenantRequest};
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
    pub tenant_name: String,
}

pub async fn validate_invitation_handler(
    Query(_params): Query<ValidateInvitationQuery>,
) -> Result<Json<InvitationInfo>, AuthError> {
    // invitations table doesn't exist yet — stub
    Err(AuthError::InvitationNotFound)
}

// --- 1B-17: Accept invitation ---
pub async fn accept_invitation_handler(
    Extension(_state): Extension<Arc<AppState>>,
    _headers: HeaderMap,
) -> Result<StatusCode, AuthError> {
    // invitations table doesn't exist yet — stub
    Err(AuthError::InvitationNotFound)
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
