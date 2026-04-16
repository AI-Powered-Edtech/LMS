use crate::extractors::IntoVilError;
use std::sync::Arc;
use edusync_auth::{AuthError, password::hash_password, session::revoke_all_user_sessions};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{ResetPasswordRequest, UpdatePasswordRequest};
use uuid::Uuid;

pub async fn reset_password_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: ResetPasswordRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // Always 200 — prevent email enumeration
    let user_id_opt: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM public.users WHERE email = $1")
            .bind(&body.email)
    .fetch_optional(&state.db)
    .await
    .ok()
    .unwrap_or(None);

    if let Some(user_id) = user_id_opt {
        let token = Uuid::new_v4().to_string();
        let token_hash = sha256_hex(&token);
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

        let _ = sqlx::query(
            r#"INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
               VALUES ($1, $2, $3)"#,
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&state.db)
        .await;

        // In dev: log the reset URL
        let reset_url = format!("http://localhost:5173/#/reset-password?token={}", token);
        tracing::info!(email = %body.email, reset_url = %reset_url, "Password reset requested");
    }

    Ok(VilResponse::ok(serde_json::json!({ "ok": true })))
}

pub async fn update_password_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: UpdatePasswordRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if body.password.len() < 8 {
        return Err(AuthError::WeakPassword.into_vil_error());
    }

    let token_hash = sha256_hex(&body.token);
    let now = chrono::Utc::now();

    let user_id: Uuid = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT user_id FROM public.password_reset_tokens
           WHERE token_hash = $1 AND expires_at > $2 AND used_at IS NULL"#,
    )
    .bind(&token_hash)
    .bind(now)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?
    .ok_or_else(|| AuthError::InvalidToken.into_vil_error())?;

    let new_hash = hash_password(&body.password).map_err(IntoVilError::into_vil_error)?;

    let mut tx = state.db.begin().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query("UPDATE public.users SET encrypted_password = $1, updated_at = now() WHERE id = $2")
    .bind(&new_hash)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    sqlx::query("UPDATE public.password_reset_tokens SET used_at = now() WHERE token_hash = $1")
    .bind(&token_hash)
    .execute(&mut *tx)
    .await
    .map_err(|e| AuthError::Database(e).into_vil_error())?;

    tx.commit().await
        .map_err(|e| AuthError::Database(e).into_vil_error())?;

    revoke_all_user_sessions(&state.db, user_id).await
        .map_err(IntoVilError::into_vil_error)?;

    Ok(VilResponse::ok(serde_json::json!({ "ok": true })))
}

fn sha256_hex(input: &str) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(input.as_bytes()))
}
