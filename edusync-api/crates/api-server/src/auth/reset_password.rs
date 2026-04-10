use std::sync::Arc;
use axum::{extract::Extension, http::StatusCode, Json};
use edusync_auth::{AuthError, password::hash_password, session::revoke_all_user_sessions};
use crate::state::AppState;
use super::types::{ResetPasswordRequest, UpdatePasswordRequest};

pub async fn reset_password_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<ResetPasswordRequest>,
) -> StatusCode {
    // Always 200 — prevent email enumeration
    let user_id_opt: Option<uuid::Uuid> = sqlx::query_scalar!(
        "SELECT id FROM public.users WHERE email = $1",
        body.email
    )
    .fetch_optional(&state.db)
    .await
    .ok()
    .unwrap_or(None);

    if let Some(user_id) = user_id_opt {
        let token = uuid::Uuid::new_v4().to_string();
        let token_hash = sha256_hex(&token);
        // time::OffsetDateTime — sqlx uses time crate for TIMESTAMPTZ
        let expires_at = time::OffsetDateTime::now_utc() + time::Duration::hours(1);

        let _ = sqlx::query!(
            r#"INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
               VALUES ($1, $2, $3)"#,
            user_id, token_hash, expires_at
        )
        .execute(&state.db)
        .await;

        // In dev: log the reset URL
        let reset_url = format!("http://localhost:5173/#/reset-password?token={}", token);
        tracing::info!(email = %body.email, reset_url = %reset_url, "Password reset requested");
    }

    StatusCode::OK
}

pub async fn update_password_handler(
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<UpdatePasswordRequest>,
) -> Result<StatusCode, AuthError> {
    if body.password.len() < 8 {
        return Err(AuthError::WeakPassword);
    }

    let token_hash = sha256_hex(&body.token);
    let now = time::OffsetDateTime::now_utc();

    let row = sqlx::query!(
        r#"SELECT user_id FROM public.password_reset_tokens
           WHERE token_hash = $1 AND expires_at > $2 AND used_at IS NULL"#,
        token_hash, now
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    let new_hash = hash_password(&body.password)?;

    let mut tx = state.db.begin().await?;
    sqlx::query!(
        "UPDATE public.users SET encrypted_password = $1, updated_at = now() WHERE id = $2",
        new_hash, row.user_id
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        "UPDATE public.password_reset_tokens SET used_at = now() WHERE token_hash = $1",
        token_hash
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    revoke_all_user_sessions(&state.db, row.user_id).await?;

    Ok(StatusCode::OK)
}

fn sha256_hex(input: &str) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(input.as_bytes()))
}
