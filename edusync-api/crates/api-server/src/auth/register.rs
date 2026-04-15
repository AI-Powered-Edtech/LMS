use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::{password::hash_password, session::create_session};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{AuthResponse, RegisterRequest, UserPayload};

pub async fn register_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: RegisterRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // Basic email validation: must have non-empty local part, '@', and domain with '.'
    let email_trimmed = body.email.trim();
    if email_trimmed.is_empty() {
        return Err(VilError::bad_request("Format email tidak valid"));
    }
    let mut email_parts = email_trimmed.splitn(2, '@');
    let local = email_parts.next().unwrap_or("");
    let domain = email_parts.next().unwrap_or("");
    if local.is_empty() || !domain.contains('.') {
        return Err(VilError::bad_request("Format email tidak valid"));
    }
    if body.password.len() < 8 {
        return Err(VilError::bad_request("Password terlalu lemah (minimal 8 karakter)"));
    }
    // Max length guards to prevent oversized inputs reaching the DB
    if body.email.len() > 254 {
        return Err(VilError::bad_request("Format email tidak valid"));
    }
    if body.password.len() > 128 {
        return Err(VilError::bad_request("Password terlalu lemah (minimal 8 karakter)"));
    }

    let mut tx = state.db.begin().await.map_err(|e| {
        tracing::error!(error = ?e, "DB error beginning transaction");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    let exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE email = $1)",
        body.email
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error checking email existence");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .unwrap_or(false);

    if exists {
        return Err(VilError::bad_request("Email sudah terdaftar"));
    }

    let user_id = Uuid::new_v4();
    let hash = hash_password(&body.password)
        .map_err(|e| VilError::internal(format!("Hash error: {e}")))?;
    let full_name = body.full_name.clone().unwrap_or_default();
    let (first_name, last_name) = split_name(&full_name);

    // Insert into auth.users for FK compatibility — non-fatal (profiles is source of truth)
    if let Err(e) = sqlx::query(
        r#"INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
           VALUES ($1, $2, $3, now(), now(), 'authenticated', 'authenticated', false, false)
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()"#
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(&hash)
    .execute(&mut *tx)
    .await
    {
        tracing::warn!(error = %e, "Gagal sinkronisasi auth.users — diabaikan");
    }

    sqlx::query!(
        r#"INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
        user_id, body.email, hash
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error inserting user");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, now(), now())
           ON CONFLICT (id) DO UPDATE SET updated_at = now()"#,
        user_id, body.email, first_name, last_name
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error inserting profile");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    tx.commit().await.map_err(|e| {
        tracing::error!(error = ?e, "DB error committing transaction");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    let role: String = sqlx::query_scalar!(
        "SELECT role::text FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching role");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching tenant_id");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    let tokens = create_session(&state.db, user_id, &body.email, &role, tenant_id, false, &state.jwt_secret)
        .await
        .map_err(VilError::from)?;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: body.email, role, tenant_id },
        memberships: Vec::new(),
    }))
}

fn split_name(full: &str) -> (String, String) {
    let mut parts = full.splitn(2, ' ');
    let first = parts.next().unwrap_or("").to_string();
    let last = parts.next().unwrap_or("").to_string();
    (first, last)
}
