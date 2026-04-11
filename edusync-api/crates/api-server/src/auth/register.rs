use std::sync::Arc;
use axum::{extract::Extension, Json};
use uuid::Uuid;
use edusync_auth::{AuthError, password::hash_password, session::create_session};
use crate::state::AppState;
use super::types::{RegisterRequest, AuthResponse, UserPayload};

pub async fn register_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    // Basic email validation: must have non-empty local part, '@', and domain with '.'
    let email_trimmed = body.email.trim();
    if email_trimmed.is_empty() {
        return Err(AuthError::InvalidEmail);
    }
    let mut email_parts = email_trimmed.splitn(2, '@');
    let local = email_parts.next().unwrap_or("");
    let domain = email_parts.next().unwrap_or("");
    if local.is_empty() || !domain.contains('.') {
        return Err(AuthError::InvalidEmail);
    }
    if body.password.len() < 8 {
        return Err(AuthError::WeakPassword);
    }
    // Max length guards to prevent oversized inputs reaching the DB
    if body.email.len() > 254 {
        return Err(AuthError::InvalidEmail);
    }
    if body.password.len() > 128 {
        return Err(AuthError::WeakPassword);
    }

    let mut tx = state.db.begin().await?;

    let exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE email = $1)",
        body.email
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(false);

    if exists {
        return Err(AuthError::EmailAlreadyExists);
    }

    let user_id = Uuid::new_v4();
    let hash = hash_password(&body.password)?;
    let full_name = body.full_name.clone().unwrap_or_default();
    let (first_name, last_name) = split_name(&full_name);

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
    .await?;

    sqlx::query!(
        r#"INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())"#,
        user_id, body.email, hash
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, now(), now())
           ON CONFLICT (id) DO UPDATE SET updated_at = now()"#,
        user_id, body.email, first_name, last_name
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let role: String = sqlx::query_scalar!(
        "SELECT role::text FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?;

    let tokens = create_session(&state.db, user_id, &body.email, &role, tenant_id, false, &state.jwt_secret).await?;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user_id, email: body.email, role, tenant_id },
    }))
}

fn split_name(full: &str) -> (String, String) {
    let mut parts = full.splitn(2, ' ');
    let first = parts.next().unwrap_or("").to_string();
    let last = parts.next().unwrap_or("").to_string();
    (first, last)
}
