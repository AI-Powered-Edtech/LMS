//! AI rate-limit gate — Workstream G3.
//!
//! Per-user + per-tenant daily quotas for AI endpoints. Counters live in
//! `public.ai_usage_counters` (migration 071) and are charged atomically by
//! `public.charge_ai_usage()`. Caller behaviour:
//!
//! ```ignore
//! let charge = AiCharge { requests: 1, tokens_estimate: 1500 };
//! ai_rate_limit::enforce(pool, tenant_id, user_id, &charge).await?;
//! // ... call upstream LLM ...
//! ai_rate_limit::reconcile_tokens(pool, tenant_id, user_id, actual - estimate).await;
//! ```
//!
//! Defaults are conservative; operators raise per-tenant via
//! `ai_quota_overrides`. We charge optimistically with an estimate, then
//! reconcile after the response arrives so a runaway tutor stream doesn't
//! drain a whole day's tokens before being noticed.

use sqlx::PgPool;
use uuid::Uuid;

const DEFAULT_USER_REQUESTS: i32 = 500;
const DEFAULT_USER_TOKENS: i64 = 200_000;
const DEFAULT_TENANT_REQUESTS: i32 = 5_000;
const DEFAULT_TENANT_TOKENS: i64 = 5_000_000;

#[derive(Debug, Clone)]
pub struct AiCharge {
    pub requests: i32,
    pub tokens_estimate: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum AiRateLimitError {
    #[error("ai quota exceeded; retry after midnight UTC")]
    QuotaExceeded,
    #[error("ai rate limit DB error: {0}")]
    Db(#[from] sqlx::Error),
}

pub async fn enforce(
    pool: &PgPool,
    tenant_id: Uuid,
    user_id: Uuid,
    charge: &AiCharge,
) -> Result<(), AiRateLimitError> {
    let row: Option<(i32, i64, i32, i64)> = sqlx::query_as(
        "SELECT user_requests, user_tokens, tenant_requests, tenant_tokens \
         FROM public.charge_ai_usage($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(charge.requests)
    .bind(charge.tokens_estimate)
    .bind(DEFAULT_USER_REQUESTS)
    .bind(DEFAULT_USER_TOKENS)
    .bind(DEFAULT_TENANT_REQUESTS)
    .bind(DEFAULT_TENANT_TOKENS)
    .fetch_optional(pool)
    .await?;

    match row {
        Some(_) => Ok(()),
        None => Err(AiRateLimitError::QuotaExceeded),
    }
}

/// After the LLM responds, adjust the token counter by the delta between the
/// estimate and the actual usage. `delta` may be negative (over-estimate).
pub async fn reconcile_tokens(
    pool: &PgPool,
    tenant_id: Uuid,
    user_id: Uuid,
    delta: i64,
) {
    if delta == 0 {
        return;
    }
    let _ = sqlx::query(
        "UPDATE public.ai_usage_counters \
            SET tokens = GREATEST(tokens + $3, 0), updated_at = now() \
          WHERE tenant_id = $1 AND user_id = $2 \
            AND date_utc = (now() AT TIME ZONE 'UTC')::date",
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(delta)
    .execute(pool)
    .await;
}
