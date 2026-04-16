use crate::extractors::IntoVilError;
use std::sync::Arc;
use axum::{extract::Query, http::HeaderMap};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use edusync_auth::{AuthError, verify_access_token};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{OnboardStudentRequest, EnrollStudentRequest, CreateTenantRequest, AcceptInvitationRequest};
use super::types::{AuthResponse, TenantMembershipPayload, UserPayload};
use edusync_auth::{password::hash_password, session::create_session};

#[derive(sqlx::FromRow)]
struct ValidateInvitationRow {
    email: String,
    role: String,
    tenant_id: Uuid,
    tenant_name: String,
}

#[derive(sqlx::FromRow)]
struct InvitationRow {
    id: Uuid,
    email: String,
    role: String,
    tenant_id: Uuid,
}

#[derive(sqlx::FromRow)]
struct ClassInfoRow {
    id: Uuid,
    name: String,
    tenant_id: Uuid,
    tenant_name: String,
}

#[derive(sqlx::FromRow)]
struct ClassRow {
    id: Uuid,
    tenant_id: Uuid,
}

#[derive(sqlx::FromRow)]
struct TenantInfoRow {
    name: String,
    slug: String,
}

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
    svc: ServiceCtx,
    Query(params): Query<ValidateInvitationQuery>,
) -> HandlerResult<VilResponse<InvitationInfo>> {
    let state = svc.state::<Arc<AppState>>()?.clone();

    let row: ValidateInvitationRow = sqlx::query_as::<_, ValidateInvitationRow>(
        r#"SELECT i.email, i.role::text as role, i.tenant_id, t.name as tenant_name
           FROM public.user_invitations i
           JOIN public.tenants t ON t.id = i.tenant_id
           WHERE i.token = $1
             AND i.status = 'pending'
             AND i.expires_at > now()"#,
    )
    .bind(&params.token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::InvitationNotFound.into_vil_error())?;

    Ok(VilResponse::ok(InvitationInfo {
        email: row.email,
        role: row.role.to_lowercase(),
        tenant_id: row.tenant_id,
        tenant_name: row.tenant_name,
    }))
}

// --- 1B-17: Accept invitation (requires Bearer JWT) ---
pub async fn accept_invitation_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: AcceptInvitationRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // Verify JWT
    let token_str = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AuthError::Unauthorized)
        .map_err(IntoVilError::into_vil_error)?;

    let claims = verify_access_token(token_str, &state.jwt_secret)
        .map_err(IntoVilError::into_vil_error)?;
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    // Look up pending, non-expired invitation
    let inv: InvitationRow = sqlx::query_as::<_, InvitationRow>(
        r#"SELECT id, email, role::text as role, tenant_id
           FROM public.user_invitations
           WHERE token = $1 AND status = 'pending' AND expires_at > now()"#,
    )
    .bind(&body.token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::InvitationNotFound.into_vil_error())?;

    // Verify the logged-in user's email matches the invitation
    let user_email: String =
        sqlx::query_scalar("SELECT COALESCE(email, '') FROM public.users WHERE id = $1")
            .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .flatten()
    .ok_or_else(|| AuthError::UserNotFound.into_vil_error())?;

    if user_email.trim().to_lowercase() != inv.email.trim().to_lowercase() {
        return Err(AuthError::TenantMismatch.into_vil_error());
    }

    let role_upper = inv.role.to_uppercase();

    let mut tx = state.db.begin().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    // 1. Mark invitation accepted
    sqlx::query(
        "UPDATE public.user_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1",
    )
    .bind(inv.id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    // 2. Upsert tenant_memberships
    sqlx::query(
        r#"INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, joined_at, updated_at)
           VALUES ($1, $2, $3, 'active', now(), now())
           ON CONFLICT (tenant_id, user_id) DO UPDATE
           SET role = EXCLUDED.role, status = 'active', updated_at = now()"#,
    )
    .bind(inv.tenant_id)
    .bind(user_id)
    .bind(&role_upper)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    // 3. Upsert user_roles — mirrors sync_user_tenant_access:
    //    remove existing (user, tenant) entry first to avoid unique(user_id, tenant_id) conflict,
    //    then insert/update on unique(user_id, role).
    sqlx::query(
        "DELETE FROM public.user_roles WHERE user_id = $1 AND tenant_id = $2"
    )
    .bind(user_id)
    .bind(inv.tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

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
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    // 4. Update profile tenant_id if currently unset
    sqlx::query(
        "UPDATE public.profiles SET tenant_id = COALESCE(tenant_id, $1), updated_at = now() WHERE id = $2",
    )
    .bind(inv.tenant_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    tx.commit().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    Ok(VilResponse::ok(serde_json::json!({
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
    pub tenant_name: String,
}

pub async fn lookup_class_handler(
    svc: ServiceCtx,
    Query(params): Query<LookupClassQuery>,
) -> HandlerResult<VilResponse<ClassInfo>> {
    let state = svc.state::<Arc<AppState>>()?.clone();

    let class: ClassInfoRow = sqlx::query_as::<_, ClassInfoRow>(
        r#"SELECT c.id, c.name, c.tenant_id, t.name as tenant_name
           FROM public.classes c
           JOIN public.tenants t ON t.id = c.tenant_id
           WHERE c.join_code = $1"#,
    )
    .bind(&params.code)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::ClassNotFound.into_vil_error())?;

    Ok(VilResponse::ok(ClassInfo {
        id: class.id,
        name: class.name,
        tenant_id: class.tenant_id,
        tenant_name: class.tenant_name,
    }))
}

// --- 1B-19: Enroll student via join code ---
pub async fn enroll_student_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: EnrollStudentRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(IntoVilError::into_vil_error)?;
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    let class: ClassRow = sqlx::query_as::<_, ClassRow>(
        "SELECT id, tenant_id FROM public.classes WHERE join_code = $1",
    )
    .bind(&body.join_code)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::ClassNotFound.into_vil_error())?;

    // Upsert enrollment (use student_id per schema)
    // enrollments has no unique constraint on (class_id, student_id) — use plain INSERT with conflict guard
    let existing: bool = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id = $1 AND student_id = $2)",
    )
    .bind(class.id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    if !existing {
        sqlx::query(
            r#"INSERT INTO public.enrollments (class_id, student_id, tenant_id)
               VALUES ($1, $2, $3)"#,
        )
        .bind(class.id)
        .bind(user_id)
        .bind(class.tenant_id)
        .execute(&state.db)
        .await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;
    }

    Ok(VilResponse::ok(serde_json::json!({ "success": true })))
}

// --- 1B-21: Onboard student (register + enroll in one tx) ---
pub async fn onboard_student_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: OnboardStudentRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if !body.email.contains('@') {
        return Err(AuthError::InvalidEmail.into_vil_error());
    }
    if body.password.len() < 8 {
        return Err(AuthError::WeakPassword.into_vil_error());
    }

    // Find class
    let class: ClassRow = sqlx::query_as::<_, ClassRow>(
        "SELECT id, tenant_id FROM public.classes WHERE join_code = $1",
    )
    .bind(&body.join_code)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::ClassNotFound.into_vil_error())?;

    let exists: bool = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE email = $1)",
    )
    .bind(&body.email)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    if exists {
        return Err(AuthError::EmailAlreadyExists.into_vil_error());
    }

    let user_id = Uuid::new_v4();
    let hash = hash_password(&body.password).map_err(IntoVilError::into_vil_error)?;
    let (first_name, last_name) = split_name(body.full_name.as_deref().unwrap_or(""));

    let mut tx = state.db.begin().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    // Insert into auth.users FIRST — public.profiles.id FK references auth.users.id
    sqlx::query(
        r#"INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
           VALUES ($1, $2, $3, now(), now(), 'authenticated', 'authenticated', false, false)
           ON CONFLICT (id) DO NOTHING"#
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, now(), now())"#,
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&first_name)
    .bind(&last_name)
    .bind(class.tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.user_roles (user_id, role, tenant_id)
           VALUES ($1, 'STUDENT', $2)"#,
    )
    .bind(user_id)
    .bind(class.tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.enrollments (class_id, student_id, tenant_id)
           VALUES ($1, $2, $3)"#,
    )
    .bind(class.id)
    .bind(user_id)
    .bind(class.tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    tx.commit().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    let tokens = create_session(
        &state.db, user_id, &body.email, "STUDENT",
        Some(class.tenant_id), false, &state.jwt_secret,
    ).await.map_err(IntoVilError::into_vil_error)?;

    let tenant_info: TenantInfoRow = sqlx::query_as::<_, TenantInfoRow>(
        r#"SELECT name, slug FROM public.tenants WHERE id = $1"#,
    )
    .bind(class.tenant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::TenantMismatch.into_vil_error())?;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: body.email, role: "STUDENT".to_string(), tenant_id: Some(class.tenant_id) },
        active_tenant_id: Some(class.tenant_id),
        memberships: vec![TenantMembershipPayload {
            tenant_id: class.tenant_id,
            tenant_name: tenant_info.name,
            tenant_slug: tenant_info.slug,
            tenant_logo: None,
            role: "student".to_string(),
            status: "active".to_string(),
            is_active: true,
            joined_at: None,
        }],
    }))
}

// --- 1B-22: Create tenant ---
pub async fn create_tenant_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: CreateTenantRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(IntoVilError::into_vil_error)?;
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AuthError::InvalidToken)
        .map_err(IntoVilError::into_vil_error)?;

    let mut tx = state.db.begin().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;
    let tenant_id = Uuid::new_v4();
    let requested_role = body
        .role
        .as_deref()
        .map(|value| value.trim().to_uppercase())
        .filter(|value| matches!(value.as_str(), "ADMIN" | "TEACHER"))
        .unwrap_or_else(|| "ADMIN".to_string());

    sqlx::query(
        r#"INSERT INTO public.tenants (id, name, slug, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
    )
    .bind(tenant_id)
    .bind(&body.name)
    .bind(&body.slug)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.user_roles (user_id, role, tenant_id)
           VALUES ($1, $2::app_role, $3)"#
    )
    .bind(user_id)
    .bind(&requested_role)
    .bind(tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query(
        r#"INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, joined_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'active', now(), now(), now())
           ON CONFLICT (tenant_id, user_id) DO UPDATE
           SET role = EXCLUDED.role, status = 'active', updated_at = now()"#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(&requested_role)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    if let Some(full_name) = body.full_name.as_deref() {
        let (first_name, last_name) = split_name(full_name);
        sqlx::query(
            r#"UPDATE public.profiles
               SET first_name = CASE WHEN COALESCE(first_name, '') = '' THEN $1 ELSE first_name END,
                   last_name = CASE WHEN COALESCE(last_name, '') = '' THEN $2 ELSE last_name END,
                   tenant_id = COALESCE(tenant_id, $3),
                   updated_at = now()
               WHERE id = $4"#,
        )
        .bind(&first_name)
        .bind(&last_name)
        .bind(tenant_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;
    } else {
        sqlx::query("UPDATE public.profiles SET tenant_id = COALESCE(tenant_id, $1), updated_at = now() WHERE id = $2")
        .bind(tenant_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;
    }

    tx.commit().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    Ok(VilResponse::ok(serde_json::json!({
        "tenant_id": tenant_id,
        "role": requested_role.to_lowercase(),
    })))
}

fn split_name(full: &str) -> (String, String) {
    let mut parts = full.splitn(2, ' ');
    let first = parts.next().unwrap_or("").to_string();
    let last = parts.next().unwrap_or("").to_string();
    (first, last)
}
