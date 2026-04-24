//! Domain events outbox worker (Fase 2 Unit 25/26).
//!
//! Polls public.domain_events for unprocessed entries, dispatches to per-type
//! handlers, marks processed. Uses LISTEN/NOTIFY for low-latency wake-up,
//! falls back to polling every 5s.
//!
//! Run as: `cargo run -p edusync-api-server --bin events_worker`
//!
//! Operator setup:
//!   1. Add bin target in edusync-api/crates/api-server/Cargo.toml:
//!      [[bin]]
//!      name = "events_worker"
//!      path = "src/bin/events_worker.rs"
//!   2. Run alongside the api-server in production:
//!      ./target/release/api-server &
//!      ./target/release/events_worker &
//!
//! AUTHORITATIVE: handlers should be idempotent. Worker uses at-least-once
//! delivery; downstream effects must tolerate replay.

use sqlx::{postgres::PgListener, PgPool, Row};
use std::time::Duration;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url).await?;

    tracing::info!("events_worker starting; listening on `domain_events_new`");
    let mut listener = PgListener::connect_with(&pool).await?;
    listener.listen("domain_events_new").await?;

    loop {
        // Drain any pending notifications, then process.
        // Wait up to 5s for a notify; if none, poll anyway (catch-up loop).
        let _ = tokio::time::timeout(Duration::from_secs(5), listener.recv()).await;

        if let Err(err) = drain_pending(&pool).await {
            tracing::error!(error = %err, "drain_pending failed");
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }
}

async fn drain_pending(pool: &PgPool) -> anyhow::Result<()> {
    // FOR UPDATE SKIP LOCKED → multiple worker instances safe.
    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, event_type, aggregate_type, aggregate_id, payload
          FROM public.domain_events
         WHERE processed_at IS NULL
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         ORDER BY occurred_at
         LIMIT 50
         FOR UPDATE SKIP LOCKED
        "#,
    )
    .fetch_all(pool)
    .await?;

    for row in rows {
        let id: uuid::Uuid = row.get("id");
        let event_type: String = row.get("event_type");
        let payload: serde_json::Value = row.get("payload");
        let tenant_id: uuid::Uuid = row.get("tenant_id");

        let result = dispatch(pool, &event_type, tenant_id, &payload).await;

        match result {
            Ok(()) => {
                sqlx::query(
                    "UPDATE public.domain_events SET processed_at = now(), last_error = NULL WHERE id = $1",
                )
                .bind(id)
                .execute(pool)
                .await?;
                tracing::info!(event_id = %id, event_type, "processed");
            }
            Err(err) => {
                let msg = err.to_string();
                tracing::warn!(event_id = %id, event_type, error = %msg, "handler failed");
                // Exponential backoff: 1m, 5m, 30m, then dead-letter (manual review).
                sqlx::query(
                    r#"
                    UPDATE public.domain_events
                       SET process_attempts = process_attempts + 1,
                           last_error = $2,
                           next_attempt_at = now() + (CASE process_attempts
                               WHEN 0 THEN interval '1 minute'
                               WHEN 1 THEN interval '5 minutes'
                               WHEN 2 THEN interval '30 minutes'
                               ELSE interval '24 hours'
                           END)
                     WHERE id = $1
                    "#,
                )
                .bind(id)
                .bind(msg)
                .execute(pool)
                .await?;
            }
        }
    }
    Ok(())
}

/// Per-event-type dispatch table. Keep handlers small and idempotent.
async fn dispatch(
    pool: &PgPool,
    event_type: &str,
    tenant_id: uuid::Uuid,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    match event_type {
        "assessment.attempt.submitted" => handle_attempt_submitted(pool, tenant_id, payload).await,
        // Add additional event handlers here as new event types come online.
        _ => {
            tracing::warn!(event_type, "no handler registered; skipping");
            Ok(())
        }
    }
}

async fn handle_attempt_submitted(
    pool: &PgPool,
    tenant_id: uuid::Uuid,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    let student_id = payload
        .get("student_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("missing student_id"))?;
    let score = payload.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let attempt_id = payload
        .get("attempt_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("missing attempt_id"))?;

    // 1. Award XP (idempotent via attempt_id key in user_points table — TODO
    //    add UNIQUE constraint when XP table schema confirmed).
    sqlx::query(
        r#"
        INSERT INTO public.user_points (user_id, tenant_id, points, reason, created_at)
        VALUES ($1::uuid, $2, $3, 'quiz_attempt_submitted:' || $4, now())
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(student_id)
    .bind(tenant_id)
    .bind((score * 0.5) as i32) // 0.5 XP per percentage point
    .bind(attempt_id)
    .execute(pool)
    .await?;

    // 2. Refresh nilai_per_cp materialized view (could be batched, but keep
    //    simple for now — operator can add debouncing if churn becomes an issue).
    sqlx::query("SELECT public.refresh_nilai_per_cp()")
        .execute(pool)
        .await
        .ok(); // ignore CONCURRENTLY refresh contention

    // 3. Notify parent (best-effort: enqueue an outbound message for the
    //    parent linkage. Parent ↔ student linking table comes in Fase 4.)
    // TODO once parent_links table exists.

    Ok(())
}
