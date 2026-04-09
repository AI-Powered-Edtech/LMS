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
│                   │ Queue Store │                       │
│                   │  (Redis/PG)  │                       │
│                   └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## Worker Types

### HTTP Handlers (User-Facing)

Synchronous, user-facing endpoints:

```rust
// Example HTTP handler
async fn submit_quiz(
    State(db): State<DbPool>,
    Json(payload): Json<QuizSubmit>,
) -> Result<Json<QuizResult>, AppError> {
    // Process synchronously
    let result = grading::grade_quiz(&db, payload).await?;
    Ok(Json(result))
}
```

Use cases:

- Quiz submission and grading
- xAPI statement processing
- Real-time calculations

### Tri-Lane Internal Workers

Three priority lanes:

| Lane   | Priority | Examples                       | Timeout |
| ------ | -------- | ------------------------------ | ------- |
| High   | Critical | Quiz grading, auth operations  | 30s     |
| Medium | Normal   | Email notifications, analytics | 5m      |
| Low    | Batch    | Report generation, data sync   | 30m     |

```rust
// Tri-Lane worker implementation
async fn process_queue(lane: Lane) -> Result<(), Error> {
    loop {
        if let Some(job) = get_next_job(lane).await {
            process_job(job).await;
        } else {
            sleep(Duration::from_secs(1)).await;
        }
    }
}
```

### Scheduled Workers (vil_trigger_cron)

Cron-based scheduled jobs replacing Supabase pg_cron:

```rust
// Example scheduled job
#[cronjob("0 6 * * *")] // Daily at 6 AM
async fn generate_daily_reports(ctx: CronContext) {
    let tenants = get_active_tenants().await;
    for tenant in tenants {
        generate_report(&tenant).await;
    }
}
```

Existing scheduled jobs to migrate:

- Daily attendance summary
- Quiz deadline notifications
- Weekly progress reports
- Parent digest emails

## Domain-Specific DLQ

Separate DLQ per domain for better handling:

| Domain       | DLQ Table        | Retry Strategy             |
| ------------ | ---------------- | -------------------------- |
| Quiz         | quiz_dlq         | Auto-retry 3x, then manual |
| Notification | notification_dlq | Re-queue with delay        |
| Report       | report_dlq       | Restart from beginning     |
| Analytics    | analytics_dlq    | Aggregate and skip         |

## Implementation Steps

### Phase 2 (Week 23-28)

1. Setup Redis for queue storage
2. Implement basic worker infrastructure
3. Create job queue tables in database

### Phase 3 (Week 37-44)

1. Implement Tri-Lane workers
2. Migrate quiz grading to async workers
3. Add scheduled job runner (vil_trigger_cron)

### Phase 4-5 (Week 45-58)

1. Migrate all pg_cron jobs
2. Implement domain-specific DLQ
3. Add monitoring and alerting for workers

### Phase 6 (Week 59-72)

1. Full worker monitoring
2. Performance optimization
3. Decommission Supabase Edge Functions (replace with workers)

## Job Definition

```rust
// Job struct
struct Job {
    id: Uuid,
    lane: Lane,
    domain: Domain,
    payload: serde_json::Value,
    idempotency_key: String,
    retry_count: u32,
    created_at: DateTime,
}
```

## Monitoring

Metrics to track:

- `worker_jobs_total{lane, domain, status}`
- `worker_job_duration_seconds{lane, domain}`
- `worker_dlq_total{domain}`
- `worker_active_lanes{lane}`

## Exit Criteria

- [ ] HTTP handlers functional for user-facing operations
- [ ] Tri-Lane workers implemented with priority queuing
- [ ] vil_trigger_cron replacing pg_cron
- [ ] Domain-specific DLQ functional
- [ ] All Supabase Edge Functions migrated to workers (Phase 6)

## Referensi

- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk queue semantics
- Related: [05_PHASE_3_EDGE_FUNCTIONS/README.md](../05_PHASE_3_EDGE_FUNCTIONS/README.md) untuk Edge Function migration
