use std::sync::Arc;
use axum::{extract::Extension, Json};
use uuid::Uuid;
use edusync_auth::{AuthError, password::{verify_password, maybe_rehash}, session::create_session};
use crate::state::AppState;
use super::types::{LoginRequest, AuthResponse, UserPayload};

pub async fn login_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    // Brute force check before any DB query
    if state.brute_force.is_locked(&body.email) {
        return Err(AuthError::TooManyRequests);
    }

    let user = sqlx::query!(
        r#"SELECT id, email, encrypted_password,
                  banned_until,
                  email_confirmed_at
           FROM public.users WHERE email = $1"#,
        body.email
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| {
        state.brute_force.record_failure(&body.email);
        AuthError::InvalidCredentials
    })?;

    // Cek banned
    if let Some(banned_until) = user.banned_until {
        let now_utc = time::OffsetDateTime::now_utc();
        if banned_until > now_utc {
            return Err(AuthError::UserBanned);
        }
    }

    let hash = user.encrypted_password.as_deref().unwrap_or("");
    if !verify_password(&body.password, hash)? {
        state.brute_force.record_failure(&body.email);
        return Err(AuthError::InvalidCredentials);
    }

    // Rehash bcrypt → argon2 async (don't block response)
    let pool = state.db.clone();
    let user_id = user.id;
    let plain = body.password.clone();
    let hash_clone = hash.to_string();
    tokio::spawn(async move {
        let _ = maybe_rehash(&pool, user_id, &plain, &hash_clone).await;
    });

    let role: String = sqlx::query_scalar!(
        "SELECT role::text FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user.id
    )
    .fetch_optional(&state.db)
    .await?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user.id
    )
    .fetch_optional(&state.db)
    .await?;

    // Check MFA enrollment
    let mfa_enrolled: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.mfa_factors WHERE user_id = $1 AND status = 'verified')",
        user.id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    let tokens = create_session(
        &state.db, user.id, &user.email, &role, tenant_id,
        !mfa_enrolled,  // mfa_verified = true if no MFA enrolled
        &state.jwt_secret,
    ).await?;

    // Successful login — clear brute force counter
    state.brute_force.record_success(&body.email);

    // Update last_sign_in_at
    let _ = sqlx::query!(
        "UPDATE public.users SET last_sign_in_at = now() WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await;

    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user.id, email: user.email, role, tenant_id },
    }))
}
