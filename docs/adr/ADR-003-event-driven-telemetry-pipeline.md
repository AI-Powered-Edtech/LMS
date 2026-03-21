# ADR-003: Event-Driven Telemetry Pipeline for High-Frequency Learning Events

**Status:** Accepted
**Date:** 2026-01-15
**Deciders:** Engineering Team

---

## Context

EduSync tracks detailed learning behavior: video watch positions, pause/resume events, lesson completion signals, quiz interactions, and AI tutor queries. These events can occur hundreds of times per session per student.

The naive approach — writing each event synchronously to the database as it occurs — creates problems at scale:

- A single student watching a video generates a write every few seconds
- At 1,000 concurrent students, this is thousands of writes per second
- Each synchronous write adds latency to the user's session
- PostgreSQL write amplification on high-frequency small writes degrades overall DB performance

Options considered:

- **Option A:** Synchronous per-event database writes (one `INSERT` per event)
- **Option B:** Client-side batching with Edge Function ingestion
- **Option C:** External time-series database (InfluxDB, TimescaleDB)
- **Option D:** Supabase Realtime as an event bus

---

## Decision

We chose **Option B: Client-side batching with Edge Function ingestion**.

Architecture:

```
Browser (Smart Player)
  → collects events in-memory buffer (max 20 events or 10s flush interval)
  → flushes batch to Edge Function: POST /smart-player/ingest
  → Edge Function validates, aggregates, writes to:
      - learning_events (raw append-only log)
      - student_lesson_signals (aggregated per student/lesson)
```

The `student_lesson_signals` table is the materialized aggregate that the frontend reads. It is updated by the Edge Function (or a trigger) on every batch ingest, not by the frontend directly.

---

## Rationale

**Why batching over Option A (per-event writes):**
- Reduces write frequency by 10-20x (batch of 20 events = 1 DB round-trip)
- Client buffer absorbs network jitter — events are not lost if one request fails (retry with backoff)
- Edge Function can validate the entire batch and reject malformed payloads atomically

**Why Edge Function over direct Supabase client writes:**
- The `learning_events` table is append-only; its RLS INSERT policy is permissive for the student's own data, but we want server-side validation before writing
- Edge Function can enforce rate limits per student
- Edge Function is the correct place for business logic (e.g., detecting lesson completion threshold, triggering `LESSON_COMPLETED` event)

**Why not Option C (external time-series DB):**
- Adds operational complexity (another managed service)
- PostgreSQL with proper indexing handles our scale (millions of events/day)
- TimescaleDB extension is available on Supabase if needed in the future

**Why not Option D (Supabase Realtime as bus):**
- Realtime is designed for broadcasting FROM server TO clients, not for client event ingestion
- No batching, no server-side aggregation capability

---

## Event Schema

All events must conform to the canonical event envelope:

```typescript
interface LearningEvent {
  event_id: string;        // UUID v4, generated client-side
  event_version: number;   // Schema version (current: 1)
  event_type: string;      // e.g., LESSON_COMPLETED, QUIZ_COMPLETED
  tenant_id: string;       // UUID — validated server-side against JWT
  user_id: string;         // UUID — taken from JWT, not client payload
  timestamp: string;       // ISO 8601
  payload: Record<string, unknown>;
}
```

**Rules:**
- `user_id` and `tenant_id` are ALWAYS taken from the server-side JWT, never trusted from the client payload
- `event_id` must be deduplicated on ingest (idempotent writes)
- `event_version` allows backward-compatible schema evolution

---

## Consequences

**Positive:**
- Write load is 10-20x lower than per-event approach
- User sessions are not blocked on DB writes
- Edge Function validates and normalizes events before persistence
- Aggregation tables (`student_lesson_signals`) remain consistent without frontend needing to compute them

**Negative:**
- Up to 10 seconds of event data can be lost if the browser closes before the next flush (acceptable trade-off)
- Edge Function becomes a critical path — it must have error alerting and dead-letter queue for failed batches
- Client-side buffer requires careful memory management to avoid leaks in long sessions

**Monitoring requirements:**
- Edge Function must log: batch size, processing latency, error rate
- Queue depth alert if processing falls behind
- `student_lesson_signals.last_accessed_at` staleness alert (> 5 minutes during active session)
