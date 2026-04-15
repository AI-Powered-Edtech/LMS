use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::{password::{verify_password, maybe_rehash}, session::create_session};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{LoginRequest, AuthResponse, UserPayload};

pub async fn login_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: LoginRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // Brute force check before any DB query
    if state.brute_force.is_locked(&body.email) {
        return Err(VilError::bad_request("Terlalu banyak percobaan, coba lagi nanti"));
    }

    let user = sqlx::query!(
        r#"SELECT id, email, encrypted_password,
                  banned_until,
                  email_confirmed_at
           FROM public.users WHERE email = $1"#,
        body.email
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error in login");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .ok_or_else(|| {
        state.brute_force.record_failure(&body.email);
        VilError::bad_request("Email atau password salah")
    })?;

    // Cek banned
    if let Some(banned_until) = user.banned_until {
        let now_utc = time::OffsetDateTime::now_utc();
        if banned_until > now_utc {
            return Err(VilError::forbidden("Akun diblokir"));
        }
    }

    let hash = user.encrypted_password.as_deref().unwrap_or("");
    if !verify_password(&body.password, hash)
        .map_err(|e| VilError::internal(format!("Password verify error: {e}")))?
    {
        state.brute_force.record_failure(&body.email);
        return Err(VilError::bad_request("Email atau password salah"));
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
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching role");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .flatten()
    .unwrap_or_else(|| "STUDENT".to_string());

    let tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.user_roles WHERE user_id = $1 LIMIT 1",
        user.id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching tenant_id");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    // Check MFA enrollment
    let mfa_enrolled: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.mfa_factors WHERE user_id = $1 AND status = 'verified')",
        user.id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error checking MFA");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .unwrap_or(false);

    let tokens = create_session(
        &state.db, user.id, &user.email, &role, tenant_id,
        !mfa_enrolled,  // mfa_verified = true if no MFA enrolled
        &state.jwt_secret,
    )
    .await
    .map_err(VilError::from)?;

    // Successful login — clear brute force counter
    state.brute_force.record_success(&body.email);

    // Update last_sign_in_at
    let _ = sqlx::query!(
        "UPDATE public.users SET last_sign_in_at = now() WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload { id: user.id, email: user.email, role, tenant_id },
    }))
}
