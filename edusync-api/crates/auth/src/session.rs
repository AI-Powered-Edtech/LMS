use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row, FromRow};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::{
   error::AuthError,
   jwt::{issue_access_token, issue_refresh_token},
};

pub struct SessionTokens {
   pub access_token: String,
   pub refresh_token: String,
   pub expires_at: i64,
}

#[derive(FromRow, serde::Serialize)]
pub struct SessionInfo {
   pub session_id: Uuid,
   pub created_at: DateTime<Utc>,
   pub last_used_at: DateTime<Utc>,
   pub ip_address: Option<String>,
   pub user_agent: Option<String>,
   pub is_current: bool,
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
) -> Result<SessionTokens, AuthError> {
   create_session_with_meta(pool, user_id, email, role, tenant_id, mfa_verified, None, None).await
}

pub async fn create_session_with_meta(
   pool: &PgPool,
   user_id: Uuid,
   email: &str,
   role: &str,
   tenant_id: Option<Uuid>,
   mfa_verified: bool,
   ip_address: Option<String>,
   user_agent: Option<String>,
) -> Result<SessionTokens, AuthError> {
   let access_token =
         issue_access_token(user_id, email, role, tenant_id, mfa_verified)?;
   let (refresh_token, jti) = issue_refresh_token(user_id)?;
   let token_hash = token_hash(&refresh_token);
   let session_id = Uuid::parse_str(&jti).unwrap_or_else(|_| Uuid::new_v4());
   let expires_at = chrono::Utc::now().timestamp() + 30 * 24 * 3600;

   sqlx::query(
         r#"INSERT INTO public.refresh_tokens (user_id, token_hash, session_id, revoked, ip_address, user_agent, created_at, last_used_at)
            VALUES ($1, $2, $3, false, $4, $5, now(), now())"#,
   )
   .bind(user_id)
   .bind(&token_hash)
   .bind(session_id)
   .bind(ip_address)
   .bind(user_agent)
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
) -> Result<SessionTokens, AuthError> {
   refresh_session_with_meta(pool, refresh_token, user_id, email, role, tenant_id, mfa_verified, None, None).await
}

pub async fn refresh_session_with_meta(
   pool: &PgPool,
   refresh_token: &str,
   user_id: Uuid,
   email: &str,
   role: &str,
   tenant_id: Option<Uuid>,
   mfa_verified: bool,
   ip_address: Option<String>,
   user_agent: Option<String>,
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

   create_session_with_meta(
         pool,
         user_id,
         email,
         role,
         tenant_id,
         mfa_verified,
         ip_address,
         user_agent
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

pub async fn revoke_session_by_id(pool: &PgPool, session_id: Uuid, user_id: Uuid) -> Result<(), AuthError> {
   sqlx::query("UPDATE public.refresh_tokens SET revoked = true WHERE session_id = $1 AND user_id = $2")
         .bind(session_id)
         .bind(user_id)
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

pub async fn get_user_sessions(pool: &PgPool, user_id: Uuid, current_refresh_token: Option<&str>) -> Result<Vec<SessionInfo>, AuthError> {
   let current_token_hash = current_refresh_token.map(token_hash);

   let rows = sqlx::query(
         r#"
         SELECT DISTINCT ON (session_id)
            session_id,
            created_at,
            last_used_at,
            ip_address,
            user_agent,
            token_hash
         FROM public.refresh_tokens
         WHERE user_id = $1 AND revoked = false
         ORDER BY session_id, created_at DESC
         "#
   )
   .bind(user_id)
   .fetch_all(pool)
   .await?;

   let mut sessions = Vec::new();
   for row in rows {
         let session_id: Uuid = row.try_get("session_id")?;
         let created_at: DateTime<Utc> = row.try_get("created_at")?;
         let last_used_at: DateTime<Utc> = row.try_get("last_used_at").unwrap_or(created_at);
         let ip_address: Option<String> = row.try_get("ip_address")?;
         let user_agent: Option<String> = row.try_get("user_agent")?;
         let hash: String = row.try_get("token_hash")?;

         let is_current = current_token_hash.as_ref().map_or(false, |h| h == &hash);

         sessions.push(SessionInfo {
            session_id,
            created_at,
            last_used_at,
            ip_address,
            user_agent,
            is_current,
         });
   }

   sessions.sort_by(|a, b| b.last_used_at.cmp(&a.last_used_at));

   Ok(sessions)
}