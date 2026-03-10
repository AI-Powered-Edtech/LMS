# EduSync Smart Player v2 Data Architecture

This document describes the data architecture for the Smart Player in EduSync LMS. It is designed to handle high concurrency (10,000+ students) using a **fully serverless** event-driven telemetry pipeline, enabling robust Learning Analytics and AI capabilities.

> **Architecture Rule:** EduSync backend is fully serverless. Only Browser, Supabase Edge Functions, and Supabase Postgres are used. No VPS, background workers, or long-running processes.

## The Concurrency Problem

A traditional LMS (v1 architecture) writes student progress (e.g., video position) directly to the database via synchronous APIs:
`Smart Player -> API -> UPDATE lesson_progress (PostgreSQL)`

At 10,000 concurrent users updating every 5 seconds, this generates ~120,000 writes/minute. This leads to connection pool exhaustion, high CPU spikes, and degraded general query performance in the OLTP database.

## Smart Player v2 Architecture (Fully Serverless)

```text
Students
   │
   ▼
Smart Player (ProgressReporter — event batching)
   │
   ▼
Edge Function: progress-events (validate + enqueue)
   │
   ▼
pgmq queue: progress_events
   │
   ▼
Edge Function: process-progress-events (aggregate + upsert)
   │
   ▼
Postgres: lesson_progress
```

### 1. Frontend Event Batching (`src/services/progressReporter.ts`)

The Smart Player uses a `ProgressReporter` class that collects telemetry events in memory and flushes them in batches.

**Event Schema v1:**
```json
{
  "event_id": "uuid",
  "event_version": 1,
  "tenant_id": "uuid",
  "user_id": "uuid",
  "lesson_id": "uuid",
  "event_type": "video_progress",
  "position": 120,
  "timestamp": 1709900000000
}
```

**Flush Triggers:**
| Trigger | Condition |
|---|---|
| Timer | 15 seconds elapsed |
| Threshold | 10 events collected |
| Completion | `lesson_completed` event pushed |
| Pause | `video_paused` event pushed |
| Unload | `beforeunload` (uses `sendBeacon`) |
| Visibility | Tab hidden (`visibilitychange`) |

**Client-Side Deduplication:**
Before each flush, `video_progress` events are grouped by `lesson_id` and only the event with `max(position)` is kept. Non-progress events (e.g., `lesson_completed`, `video_paused`) are always preserved. This reduces payload size by ~80%.

### 2. Ingestion Edge Function (`progress-events`)

Validates incoming batches and pushes valid events to the `pgmq` queue.

**Validation Rules:**
- Max **100 events** per request
- Max **100KB** payload size
- Required fields: `event_id`, `event_version`, `tenant_id`, `user_id`, `lesson_id`, `event_type`, `timestamp`
- Event version must be `1`

**Backpressure:**
If the queue exceeds **50,000 events**, the function returns `429 Too Many Requests` with a `Retry-After: 10` header. The frontend re-queues the events for retry.

**Trigger:**
After enqueuing, the function makes a **fire-and-forget** call to `process-progress-events` to ensure near-immediate processing without blocking the response.

**Observability Logs:**
`tenant_id`, `events_received`, `events_enqueued`, `queue_latency_ms`

### 3. Processing Edge Function (`process-progress-events`)

Reads from the pgmq queue, aggregates events, and upserts progress.

**Stability Features:**

| Feature | Mechanism | Purpose |
|---|---|---|
| Anti-Stampede | `pg_try_advisory_lock(hashtext('progress_events'))` | Only 1 processor runs at a time, even if called 1000x |
| Time Cap | 3-second max processing time | Prevents cold start burst from exhausting Postgres connections |
| Adaptive Batch | 100 normal / 500 when queue > 10k | Faster catch-up after traffic spikes |
| Graceful Exit | `pg_advisory_unlock` in `finally` | Lock always released, even on error |

**Processing Steps:**
1. Acquire advisory lock — exit immediately if another processor is running
2. Read up to **100 messages** from `pgmq.read('progress_events', 30, 100)`
3. Group events by `(user_id, lesson_id)`
4. Compute `max(position)` per group
5. **Upsert** to `lesson_progress` using `ON CONFLICT (user_id, lesson_id)` with `GREATEST()` for idempotency
6. **Delete** processed messages from queue within a transaction
7. **Loop** until queue is empty or 3-second time cap is reached
8. Release advisory lock

**Idempotency Guarantees:**
- `event_id` ensures deduplication at the event level
- `GREATEST()` ensures position only moves forward
- `ON CONFLICT` makes repeated processing safe
- `is_completed` is OR-ed to never lose completion state

**Observability Logs:**
`events_processed`, `iterations`, `aggregation_time_ms`, `db_write_latency_ms`, `total_duration_ms`, `queue_depth`, `oldest_event_age`

### 3b. Scheduled Safety Processor (`07_scheduled_processor.sql`)

A `pg_cron` job runs every **30 seconds**, calling `process-progress-events` via `pg_net` as a **fail-safe**. If the fire-and-forget trigger from `progress-events` misses (e.g., Edge Function crash), the cron ensures the queue is still drained. The advisory lock inside the processor prevents double-processing — this is purely a safety net.

### 4. OLTP/OLAP Separation

| Layer | Purpose | Store |
|---|---|---|
| OLTP | Real-time progress state | Supabase Postgres `lesson_progress` |
| OLAP | Analytics, AI training data | Data Warehouse (future: ClickHouse/BigQuery) |

Supabase Postgres is the **transactional database only**. Analytics and AI queries run against a separate OLAP store.

## AI and Learning Analytics

### Batch Analytics & Feature Tables
The Data Warehouse aggregates raw telemetry into materialized feature tables:
- `lesson_engagement`: Average watch time, drop-off timestamps, completion rates
- `student_learning_profile`: Struggle concepts, learning velocity, scores

### AI Tutor Recommendation Engine
- **Real-time**: Uses OLTP state for immediate hints and feedback
- **Predictive**: Uses OLAP feature tables for Adaptive Learning Paths

### Dashboard Insights
Teachers get actionable data like identifying exact moments where students abandon a video lecture.
