# CC7: Worker Queue Runtime

**Started:** Phase 2  
**Duration:** Phase 2-6  
**Owner:** Backend

## Tujuan

Menyediakan runtime untuk background job processing dengan Tri-Lane architecture dan scheduled workers.

## Arsitektur Worker

```
┌─────────────────────────────────────────────────────────┐
│                    VIL Backend                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   HTTP      │  │   Tri-Lane  │  │  vil_trigger    │ │
│  │  Handlers   │  │  (Internal) │  │    _cron        │ │
│  │ (Sync)      │  │  (Workers)  │  │  (Scheduled)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                  │          │
│         └────────────────┴──────────────────┘          │
│                          │                              │
│                   ┌──────┴──────┐                       │
│                   │  PostgreSQL │                       │
│                   │  job_queue  │                       │
│                   └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## Job Queue Table

All jobs are stored in PostgreSQL (no external Redis dependency for MVP):

```sql
-- Migration: create job queue
CREATE TYPE job_lane AS ENUM ('high', 'medium', 'low');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'dead');

CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lane job_lane NOT NULL DEFAULT 'medium',
    domain TEXT NOT NULL,              -- 'quiz', 'notification', 'report', 'analytics'
    handler TEXT NOT NULL,             -- function name, e.g. 'grade_quiz', 'send_email_digest'
    payload JSONB NOT NULL DEFAULT '{}',
    idempotency_key TEXT UNIQUE,
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,  -- higher = picked first within lane
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    locked_by TEXT,                     -- worker instance ID
    locked_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- for delayed jobs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL REFERENCES tenants(id)
);

ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Workers use service_role — no user-facing RLS needed
CREATE POLICY "service_role_only" ON job_queue
  USING (true)
  WITH CHECK (true);

-- Index for worker polling: pick next pending job by lane + priority
CREATE INDEX idx_job_queue_pending ON job_queue (lane, priority DESC, scheduled_at)
  WHERE status = 'pending' AND scheduled_at <= NOW();

-- Index for stale lock detection
CREATE INDEX idx_job_queue_locked ON job_queue (locked_at)
  WHERE status = 'running';

-- Atomic job claim: prevents double-pickup across workers
CREATE OR REPLACE FUNCTION claim_next_job(
    p_lane job_lane,
    p_worker_id TEXT
) RETURNS SETOF job_queue
LANGUAGE sql
AS $$
    UPDATE job_queue
    SET status = 'running',
        locked_by = p_worker_id,
        locked_at = NOW()
    WHERE id = (
        SELECT id FROM job_queue
        WHERE lane = p_lane
          AND status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING *;
$$;
```

## Worker Types

### HTTP Handlers (User-Facing, Synchronous)

These run inline during the request. No queue involved.

```rust
// vil-backend/src/handlers/quiz.rs
use axum::{extract::State, Json};

pub async fn submit_quiz(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<QuizSubmitRequest>,
) -> Result<Json<QuizSubmitResponse>, AppError> {
    // Synchronous grading for simple quizzes
    let result = grading::grade_quiz(&state.db, &payload).await?;

    // For essay questions: enqueue async AI grading
    if payload.has_essay_questions {
        enqueue_job(
            &state.db,
            "high",
            "quiz",
            "grade_essay_questions",
            serde_json::json!({ "attempt_id": result.attempt_id }),
            &format!("quiz-essay:{}:{}", result.attempt_id, payload.user_id),
            payload.tenant_id,
        ).await?;
    }

    Ok(Json(result))
}
```

### Tri-Lane Internal Workers

Three priority lanes with dedicated worker loops:

| Lane   | Priority | Examples                       | Timeout | Poll Interval |
| ------ | -------- | ------------------------------ | ------- | ------------- |
| High   | Critical | Quiz grading, auth operations  | 30s     | 100ms         |
| Medium | Normal   | Email notifications, analytics | 5m      | 1s            |
| Low    | Batch    | Report generation, data sync   | 30m     | 5s            |

**File:** `vil-backend/src/workers/mod.rs`

```rust
use sqlx::PgPool;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;

pub mod handlers;

/// Worker instance ID — unique per process.
fn worker_id() -> String {
    format!("worker-{}-{}", hostname::get().unwrap().to_string_lossy(), std::process::id())
}

/// Main worker loop for a single lane.
pub async fn run_lane_worker(db: PgPool, lane: &str, poll_interval: Duration, timeout: Duration) {
    let wid = worker_id();
    tracing::info!(lane, worker = %wid, "lane worker started");

    loop {
        // Claim next job atomically
        let job: Option<JobRow> = sqlx::query_as(
            "SELECT * FROM claim_next_job($1::job_lane, $2)"
        )
        .bind(lane)
        .bind(&wid)
        .fetch_optional(&db)
        .await
        .unwrap_or(None);

        if let Some(job) = job {
            let job_id = job.id;
            tracing::info!(%job_id, handler = %job.handler, "processing job");
            metrics::counter!("worker_jobs_total", "lane" => lane.to_string(), "domain" => job.domain.clone(), "status" => "started").increment(1);

            let start = std::time::Instant::now();

            // Execute with timeout
            let result = tokio::time::timeout(
                timeout,
                handlers::dispatch(&db, &job),
            ).await;

            let elapsed = start.elapsed();
            metrics::histogram!("worker_job_duration_seconds", "lane" => lane.to_string(), "domain" => job.domain.clone()).record(elapsed.as_secs_f64());

            match result {
                Ok(Ok(())) => {
                    // Mark completed
                    sqlx::query("UPDATE job_queue SET status = 'completed', completed_at = NOW(), locked_by = NULL WHERE id = $1")
                        .bind(job_id)
                        .execute(&db)
                        .await
                        .ok();
                    metrics::counter!("worker_jobs_total", "lane" => lane.to_string(), "domain" => job.domain.clone(), "status" => "completed").increment(1);
                }
                Ok(Err(e)) | Err(_) => {
                    let err_msg = match &result {
                        Ok(Err(e)) => e.to_string(),
                        Err(_) => "timeout".to_string(),
                        _ => unreachable!(),
                    };
                    tracing::error!(%job_id, error = %err_msg, "job failed");

                    if job.retry_count + 1 >= job.max_retries {
                        // Move to dead letter
                        sqlx::query(
                            "UPDATE job_queue SET status = 'dead', last_error = $2, locked_by = NULL WHERE id = $1"
                        )
                        .bind(job_id)
                        .bind(&err_msg)
                        .execute(&db)
                        .await
                        .ok();
                        metrics::counter!("worker_dlq_total", "domain" => job.domain.clone()).increment(1);
                    } else {
                        // Re-queue with backoff
                        let backoff_secs = 2_i64.pow(job.retry_count as u32 + 1);
                        sqlx::query(
                            "UPDATE job_queue SET status = 'pending', retry_count = retry_count + 1, last_error = $2, locked_by = NULL, scheduled_at = NOW() + ($3 || ' seconds')::INTERVAL WHERE id = $1"
                        )
                        .bind(job_id)
                        .bind(&err_msg)
                        .bind(backoff_secs.to_string())
                        .execute(&db)
                        .await
                        .ok();
                        metrics::counter!("worker_jobs_total", "lane" => lane.to_string(), "domain" => job.domain.clone(), "status" => "retried").increment(1);
                    }
                }
            }
        } else {
            // No work — sleep before next poll
            sleep(poll_interval).await;
        }
    }
}
```

### Job Dispatch (Handler Registry)

**File:** `vil-backend/src/workers/handlers.rs`

```rust
use sqlx::PgPool;

pub async fn dispatch(db: &PgPool, job: &JobRow) -> Result<(), AppError> {
    match job.handler.as_str() {
        "grade_essay_questions"    => grade_essay_questions(db, &job.payload).await,
        "send_email_digest"        => send_email_digest(db, &job.payload).await,
        "send_push_notification"   => send_push_notification(db, &job.payload).await,
        "generate_daily_report"    => generate_daily_report(db, &job.payload).await,
        "generate_parent_report"   => generate_parent_report(db, &job.payload).await,
        "process_progress_events"  => process_progress_events(db, &job.payload).await,
        "send_parent_digest"       => send_parent_digest(db, &job.payload).await,
        "cleanup_expired_sessions" => cleanup_expired_sessions(db, &job.payload).await,
        other => {
            tracing::error!(handler = other, "unknown job handler");
            Err(AppError::Internal(format!("unknown handler: {other}")))
        }
    }
}
```

### Job Enqueue Helper

**File:** `vil-backend/src/workers/enqueue.rs`

```rust
use sqlx::PgPool;
use uuid::Uuid;

pub async fn enqueue_job(
    db: &PgPool,
    lane: &str,
    domain: &str,
    handler: &str,
    payload: serde_json::Value,
    idempotency_key: &str,
    tenant_id: Uuid,
) -> Result<Uuid, AppError> {
    let row: (Uuid,) = sqlx::query_as(
        "INSERT INTO job_queue (lane, domain, handler, payload, idempotency_key, tenant_id)
         VALUES ($1::job_lane, $2, $3, $4, $5, $6)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id"
    )
    .bind(lane)
    .bind(domain)
    .bind(handler)
    .bind(&payload)
    .bind(idempotency_key)
    .bind(tenant_id)
    .fetch_one(db)
    .await?;

    Ok(row.0)
}
```

### Scheduled Workers (vil_trigger_cron)

Cron-based jobs replacing Supabase `pg_cron`:

**File:** `vil-backend/src/workers/cron.rs`

```rust
use tokio_cron_scheduler::{Job, JobScheduler};
use sqlx::PgPool;

/// Start the cron scheduler. Call once at app startup.
pub async fn start_cron_scheduler(db: PgPool) -> Result<(), AppError> {
    let sched = JobScheduler::new().await?;

    // Process batched progress events — every 5 minutes
    let db1 = db.clone();
    sched.add(Job::new_async("0 */5 * * * *", move |_uuid, _l| {
        let db = db1.clone();
        Box::pin(async move {
            if let Err(e) = process_progress_events(&db).await {
                tracing::error!(error = %e, "cron: process_progress_events failed");
            }
        })
    })?).await?;

    // Daily report generation — 6:00 AM WIB (23:00 UTC previous day)
    let db2 = db.clone();
    sched.add(Job::new_async("0 0 23 * * *", move |_uuid, _l| {
        let db = db2.clone();
        Box::pin(async move {
            if let Err(e) = generate_daily_reports(&db).await {
                tracing::error!(error = %e, "cron: generate_daily_reports failed");
            }
        })
    })?).await?;

    // Parent digest — weekly Monday 7:00 AM WIB (00:00 UTC Monday)
    let db3 = db.clone();
    sched.add(Job::new_async("0 0 0 * * MON", move |_uuid, _l| {
        let db = db3.clone();
        Box::pin(async move {
            if let Err(e) = send_parent_digests(&db).await {
                tracing::error!(error = %e, "cron: send_parent_digests failed");
            }
        })
    })?).await?;

    // Stale job lock cleanup — every 10 minutes
    let db4 = db.clone();
    sched.add(Job::new_async("0 */10 * * * *", move |_uuid, _l| {
        let db = db4.clone();
        Box::pin(async move {
            // Re-queue jobs locked for more than 5 minutes (likely crashed worker)
            let count = sqlx::query(
                "UPDATE job_queue SET status = 'pending', locked_by = NULL, locked_at = NULL, retry_count = retry_count + 1
                 WHERE status = 'running' AND locked_at < NOW() - INTERVAL '5 minutes'"
            )
            .execute(&db)
            .await
            .map(|r| r.rows_affected())
            .unwrap_or(0);
            if count > 0 {
                tracing::warn!(count, "cron: re-queued stale locked jobs");
            }
        })
    })?).await?;

    // Idempotency cache cleanup — daily at 2:00 AM WIB (19:00 UTC previous day)
    let db5 = db.clone();
    sched.add(Job::new_async("0 0 19 * * *", move |_uuid, _l| {
        let db = db5.clone();
        Box::pin(async move {
            sqlx::query("DELETE FROM idempotency_cache WHERE created_at < NOW() - INTERVAL '24 hours'")
                .execute(&db)
                .await
                .ok();
        })
    })?).await?;

    sched.start().await?;
    tracing::info!("cron scheduler started");
    Ok(())
}
```

### Existing Supabase Cron Jobs to Migrate

| Current (pg_cron / Edge Function)  | VIL Cron Schedule     | Handler                    |
| ---------------------------------- | --------------------- | -------------------------- |
| `process-progress-events`          | `0 */5 * * * *`       | `process_progress_events`  |
| `send-email-digest`               | `0 0 23 * * *`        | `send_email_digest`        |
| `send-parent-digest`              | `0 0 0 * * MON`       | `send_parent_digests`      |
| `generate-executive-report`       | `0 0 23 * * SUN`      | `generate_executive_report`|
| `generate-parent-report`          | `0 0 23 * * FRI`      | `generate_parent_report`   |

## Dead Letter Queue Pattern

Jobs that exhaust retries get `status = 'dead'`. Query dead jobs:

```sql
-- View dead jobs by domain
SELECT domain, handler, last_error, count(*)
FROM job_queue
WHERE status = 'dead'
GROUP BY domain, handler, last_error
ORDER BY count(*) DESC;

-- Replay a dead job (reset for retry)
UPDATE job_queue
SET status = 'pending',
    retry_count = 0,
    last_error = NULL,
    locked_by = NULL,
    scheduled_at = NOW()
WHERE id = $1 AND status = 'dead';

-- Bulk replay all dead jobs for a domain
UPDATE job_queue
SET status = 'pending',
    retry_count = 0,
    last_error = NULL,
    locked_by = NULL,
    scheduled_at = NOW()
WHERE status = 'dead' AND domain = $1;
```

## Worker Health Monitoring

**File:** `vil-backend/src/handlers/worker_health.rs`

```rust
use axum::{extract::State, Json};
use sqlx::PgPool;
use serde::Serialize;
use std::sync::Arc;

#[derive(Serialize)]
pub struct WorkerHealth {
    queue_depth: QueueDepth,
    dead_jobs: i64,
    stale_locks: i64,
    oldest_pending_seconds: Option<f64>,
}

#[derive(Serialize)]
pub struct QueueDepth {
    high: i64,
    medium: i64,
    low: i64,
}

pub async fn worker_health(
    State(state): State<Arc<AppState>>,
) -> Result<Json<WorkerHealth>, AppError> {
    let depth: Vec<(String, i64)> = sqlx::query_as(
        "SELECT lane::text, count(*) FROM job_queue WHERE status = 'pending' GROUP BY lane"
    )
    .fetch_all(&state.db)
    .await?;

    let dead: (i64,) = sqlx::query_as(
        "SELECT count(*) FROM job_queue WHERE status = 'dead'"
    )
    .fetch_one(&state.db)
    .await?;

    let stale: (i64,) = sqlx::query_as(
        "SELECT count(*) FROM job_queue WHERE status = 'running' AND locked_at < NOW() - INTERVAL '5 minutes'"
    )
    .fetch_one(&state.db)
    .await?;

    let oldest: Option<(f64,)> = sqlx::query_as(
        "SELECT EXTRACT(EPOCH FROM (NOW() - MIN(scheduled_at))) FROM job_queue WHERE status = 'pending'"
    )
    .fetch_optional(&state.db)
    .await?;

    let mut qd = QueueDepth { high: 0, medium: 0, low: 0 };
    for (lane, count) in &depth {
        match lane.as_str() {
            "high" => qd.high = *count,
            "medium" => qd.medium = *count,
            "low" => qd.low = *count,
            _ => {}
        }
    }

    Ok(Json(WorkerHealth {
        queue_depth: qd,
        dead_jobs: dead.0,
        stale_locks: stale.0,
        oldest_pending_seconds: oldest.map(|o| o.0),
    }))
}
```

### Starting All Workers

**File:** `vil-backend/src/main.rs` (relevant section)

```rust
// Start lane workers as background tasks
let db = pool.clone();
tokio::spawn(workers::run_lane_worker(db.clone(), "high", Duration::from_millis(100), Duration::from_secs(30)));
tokio::spawn(workers::run_lane_worker(db.clone(), "medium", Duration::from_secs(1), Duration::from_secs(300)));
tokio::spawn(workers::run_lane_worker(db.clone(), "low", Duration::from_secs(5), Duration::from_secs(1800)));

// Start cron scheduler
tokio::spawn(workers::cron::start_cron_scheduler(db.clone()));
```

## Prometheus Metrics

```
# HELP worker_jobs_total Total jobs processed by lane, domain, and status
# TYPE worker_jobs_total counter
worker_jobs_total{lane="high",domain="quiz",status="completed"} 1234

# HELP worker_job_duration_seconds Job execution duration
# TYPE worker_job_duration_seconds histogram
worker_job_duration_seconds_bucket{lane="high",domain="quiz",le="1"} 900

# HELP worker_dlq_total Total jobs moved to dead letter
# TYPE worker_dlq_total counter
worker_dlq_total{domain="notification"} 3

# HELP worker_queue_depth Current pending jobs by lane
# TYPE worker_queue_depth gauge
worker_queue_depth{lane="high"} 2
```

## Implementation Steps

### Phase 2 (Week 23-28)

1. Create `job_queue` table with the SQL above
2. Implement `claim_next_job` SQL function
3. Implement `run_lane_worker` loop with job dispatch
4. Add `enqueue_job` helper function
5. Wire workers into `main.rs` startup

### Phase 3 (Week 37-44)

1. Implement all job handlers in `handlers.rs`
2. Add `tokio_cron_scheduler` with the cron jobs listed above
3. Add stale lock cleanup cron job
4. Add `/worker-health` endpoint

### Phase 4-5 (Week 45-58)

1. Migrate all Supabase Edge Function cron jobs to VIL cron
2. Add Prometheus metrics for all worker events
3. Set up Grafana alerts: dead jobs > 10, stale locks > 5, queue depth high > 100

### Phase 6 (Week 59-72)

1. Load test: enqueue 10k jobs, verify all complete within SLA
2. Chaos test: kill worker mid-job, verify stale lock cleanup re-queues
3. Decommission Supabase Edge Functions replaced by workers

## Verification Commands

```bash
# 1. Verify job_queue table exists and has correct schema
psql "$DATABASE_URL" -c "\d job_queue"

# 2. Verify claim_next_job function works
psql "$DATABASE_URL" -c "
  INSERT INTO job_queue (lane, domain, handler, payload, tenant_id)
  VALUES ('medium', 'test', 'noop', '{}', '00000000-0000-0000-0000-000000000001');
  SELECT id, handler FROM claim_next_job('medium', 'test-worker');
"

# 3. Compile worker code
cd vil-backend && cargo check 2>&1 | head -20

# 4. Check worker health endpoint
curl -s http://localhost:3001/worker-health | jq .

# 5. Verify no stale locks
psql "$DATABASE_URL" -c "SELECT count(*) FROM job_queue WHERE status = 'running' AND locked_at < NOW() - INTERVAL '5 minutes';"

# 6. Check dead letter queue
psql "$DATABASE_URL" -c "SELECT domain, handler, count(*) FROM job_queue WHERE status = 'dead' GROUP BY domain, handler;"

# 7. Check Prometheus metrics
curl -s http://localhost:3001/metrics | grep worker_
```

## Exit Criteria

- [ ] `job_queue` table created with indexes and `claim_next_job` function
- [ ] Tri-Lane workers running for high/medium/low lanes
- [ ] Job dispatch routes to correct handler by name
- [ ] Cron scheduler runs all scheduled jobs listed in migration table
- [ ] Dead jobs queryable and replayable via SQL
- [ ] `/worker-health` endpoint returns queue depth, dead count, stale locks
- [ ] Prometheus metrics emitted for jobs processed, duration, and DLQ

## Referensi

- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk queue semantics
- Related: [05_PHASE_3_EDGE_FUNCTIONS/README.md](../05_PHASE_3_EDGE_FUNCTIONS/README.md) untuk Edge Function migration
