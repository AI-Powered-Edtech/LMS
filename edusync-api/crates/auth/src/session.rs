use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    error::AuthError,
    jwt::{issue_access_token, issue_refresh_token},
};

pub struct SessionTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

fn token_hash(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

pub async fn create_session(
    pool: &PgPool,
    user_id: Uuid,
    email: &str,
    role: &str,
    tenant_id: Option<Uuid>,
    mfa_verified: bool,
    jwt_secret: &str,
) -> Result<SessionTokens, AuthError> {
    let access_token =
        issue_access_token(user_id, email, role, tenant_id, mfa_verified, jwt_secret)?;
    let (refresh_token, jti) = issue_refresh_token(user_id, jwt_secret)?;
    let token_hash = token_hash(&refresh_token);
    let session_id = Uuid::parse_str(&jti).unwrap_or_else(|_| Uuid::new_v4());
    let expires_at = chrono::Utc::now().timestamp() + 30 * 24 * 3600;

    sqlx::query(
        r#"INSERT INTO public.refresh_tokens (user_id, token_hash, session_id, revoked)
           VALUES ($1, $2, $3, false)"#,
    )
    .bind(user_id)
    .bind(&token_hash)
    .bind(session_id)
    .execute(pool)
    .await?;

    Ok(SessionTokens {
        access_token,
        refresh_token,
        expires_at,
    })
}

pub async fn refresh_session(
    pool: &PgPool,
    refresh_token: &str,
    user_id: Uuid,
    email: &str,
    role: &str,
    tenant_id: Option<Uuid>,
    mfa_verified: bool,
    jwt_secret: &str,
) -> Result<SessionTokens, AuthError> {
    let token_hash = token_hash(refresh_token);
    let row = sqlx::query(
        "SELECT id, COALESCE(revoked, false) AS revoked FROM public.refresh_tokens WHERE token_hash = $1 AND user_id = $2",
    )
    .bind(&token_hash)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AuthError::InvalidToken)?;

    let revoked: bool = row.try_get("revoked")?;
    if revoked {
        revoke_all_user_sessions(pool, user_id).await?;
        return Err(AuthError::InvalidToken);
    }

    sqlx::query("UPDATE public.refresh_tokens SET revoked = true WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(pool)
        .await?;

    create_session(
        pool,
        user_id,
        email,
        role,
        tenant_id,
        mfa_verified,
        jwt_secret,
    )
    .await
}

pub async fn revoke_session(pool: &PgPool, refresh_token: &str) -> Result<(), AuthError> {
    let token_hash = token_hash(refresh_token);

    sqlx::query("UPDATE public.refresh_tokens SET revoked = true WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn revoke_all_user_sessions(pool: &PgPool, user_id: Uuid) -> Result<(), AuthError> {
    sqlx::query("UPDATE public.refresh_tokens SET revoked = true WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}
