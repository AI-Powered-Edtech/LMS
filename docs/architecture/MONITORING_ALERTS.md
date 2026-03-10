# EduSync Production Monitoring & Alert Rules

This document defines the monitoring metrics and alert thresholds for the Smart Player telemetry pipeline.

## Data Sources

All metrics are emitted as structured JSON logs from Edge Functions and can be consumed by:
- **Supabase Logs** (built-in, zero config)
- **Grafana** (via Supabase log drain)
- **Sentry** (error tracking)

## Key Metrics

| Metric | Source | Description |
|---|---|---|
| `queue_depth` | `process-progress-events` | Number of messages in pgmq queue |
| `oldest_event_age` | `process-progress-events` | Age of the oldest unprocessed event |
| `events_processed` | `process-progress-events` | Events processed per invocation |
| `events_received` | `progress-events` | Events ingested per request |
| `queue_latency_ms` | `progress-events` | Time to validate + enqueue a batch |
| `db_write_latency_ms` | `process-progress-events` | Time to upsert aggregated progress |
| `iterations` | `process-progress-events` | Processing loop iterations per invocation |

## Alert Rules

### 🔴 Critical

| Alert | Condition | Action |
|---|---|---|
| Queue Explosion | `queue_depth > 100,000` | Investigate processor failures. Check advisory lock status. Consider temporarily increasing batch size. |
| Processor Dead | `events_processed = 0` for > 2 minutes | Check `pg_cron` job status. Verify `process-progress-events` deployment. Check Postgres connection limits. |
| DB Write Failure | `process-progress-events` returns 500 | Check Postgres health. Verify `lesson_progress` table exists and RLS policies pass for service role. |

### 🟡 Warning

| Alert | Condition | Action |
|---|---|---|
| Queue Lag | `oldest_event_age > 30s` | System is falling behind. Monitor trend. May resolve after traffic spike passes. |
| High Ingestion Rejection | `events_skipped / events_received > 20%` | Clients sending malformed events. Check frontend `ProgressReporter` version. |
| Backpressure Active | `progress-events` returns 429 | Queue is > 50k. Processor may be struggling. Check processor logs. |
| AI Tutor Slow | `ai-tutor latency_ms > 4000` | LLM response time too high. Check API quotas or switch to faster model. |

### 🟢 Info

| Alert | Condition | Purpose |
|---|---|---|
| Catch-Up Mode | `batchSize = 500` (adaptive) | Queue depth > 10k — processor is using larger batches to catch up. |
| Lock Skipped | `skipped: true` from processor | Another processor is already running. Normal behavior — no action needed. |

## SQL Queries for Manual Monitoring

### Queue Depth
```sql
SELECT count(*)::int AS queue_depth FROM pgmq.q_progress_events;
```

### Oldest Event Age
```sql
SELECT (now() - min(enqueued_at))::text AS oldest_event_age FROM pgmq.q_progress_events;
```

### Queue Processing Rate (last hour)
```sql
SELECT 
  date_trunc('minute', updated_at) AS minute,
  count(*) AS updates
FROM lesson_progress
WHERE updated_at > now() - interval '1 hour'
GROUP BY 1
ORDER BY 1 DESC;
```

### Cron Job Status
```sql
SELECT * FROM cron.job WHERE jobname = 'process-progress-events-safety';
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```
