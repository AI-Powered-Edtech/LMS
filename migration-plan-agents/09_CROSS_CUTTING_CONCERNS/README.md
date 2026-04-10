# 09_CROSS_CUTTING_CONCERNS

Cross-cutting concerns yang melintasi semua fase migrasi dari Supabase ke VIL Backend.

## Execution Order Summary

Use this table to determine WHEN to start each concern. Concerns marked CRITICAL must be completed before their phase gate.

| ID  | Concern                  | Applies At                | Priority | Gate Blocker? |
| --- | ------------------------ | ------------------------- | -------- | ------------- |
| CC8 | Frontend Compatibility   | Phase 0A (start)          | CRITICAL | Yes — Phase 0 |
| CC2 | Database Migration       | Phase 1A (setup)          | CRITICAL | Yes — Phase 1 |
| CC1 | Monitoring               | Phase 1A (setup)          | HIGH     | Yes — Phase 1 |
| CC3 | Staging Environment      | Phase 1A (setup)          | HIGH     | Yes — Phase 1 |
| CC4 | Rate Limiting            | Phase 1B (auth)           | MEDIUM   | No            |
| CC7 | Worker Queue Runtime     | Phase 3 (edge functions)  | HIGH     | Yes — Phase 3 |
| CC5 | Graceful Degradation     | Phase 2+ (services)       | MEDIUM   | No            |
| CC6 | Offline Queue Semantics  | Phase 4 (frontend)        | LOW      | No            |

**Read order for agents:** Start with CC8, then CC2, then CC1+CC3 in parallel, then the rest as their phase arrives.

## Daftar Concern (Cross-References)

| ID  | File                                                                     | Deskripsi Singkat                                                      |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| CC1 | [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md)       | VIL Observer Dashboard, Prometheus, Grafana, OpenTelemetry, vil_log    |
| CC2 | [02_DATABASE_MIGRATION_STRATEGY.md](./02_DATABASE_MIGRATION_STRATEGY.md) | Supabase CLI as source of truth, sqlx at Phase 2+, backward-compat    |
| CC3 | [03_STAGING_ENVIRONMENT.md](./03_STAGING_ENVIRONMENT.md)                 | Staging VIL server, preview deploys, E2E isolated, parity tests       |
| CC4 | [04_RATE_LIMITING.md](./04_RATE_LIMITING.md)                             | Per-tenant, per-user rate limiting, special limits for uploads/AI/quiz |
| CC5 | [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md)               | Circuit breaker for AI, fallback when VIL down, frontend error handling|
| CC6 | [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md)         | Idempotency keys, delivery semantics, retry policy, DLQ strategy      |
| CC7 | [07_WORKER_QUEUE_RUNTIME.md](./07_WORKER_QUEUE_RUNTIME.md)               | HTTP handlers, Tri-Lane for internal, vil_trigger_cron for scheduled   |
| CC8 | [08_FRONTEND_RUNTIME_COMPATIBILITY.md](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) | Per-flow cutover matrix, React Query parity, PWA migration       |

## Dokumen Utama

- [HANDOFF.md](./HANDOFF.md) — Cross-cutting handoff ke Phase 1

## Execution Order Detail

### Phase 0A — Before Any Backend Work

1. **CC8 (Frontend Compatibility)** — Must be first. The API Client abstraction layer and feature flags must exist before any backend endpoint is created. Without this, frontend cannot switch between Supabase and VIL.

### Phase 1A — Infrastructure Setup

2. **CC2 (Database Migration)** — Migration strategy must be locked. Supabase CLI remains source of truth. All new tables use backward-compatible migrations.
3. **CC1 (Monitoring)** — Deploy VIL Observer Dashboard, Prometheus endpoint, structured logging. Required to detect issues during auth migration.
4. **CC3 (Staging)** — Staging VIL server must be operational for parallel testing before any production cutover.

### Phase 1B — Auth Migration

5. **CC4 (Rate Limiting)** — Apply rate limits to auth endpoints first (login, signup, password reset). Expand to other endpoints in later phases.

### Phase 2+ — Service Migration

6. **CC5 (Graceful Degradation)** — Circuit breakers for AI services, fallback paths when VIL is unavailable. Becomes important as more services move to VIL.

### Phase 3 — Edge Function Migration

7. **CC7 (Worker Queue)** — Background job infrastructure must be ready before migrating Edge Functions that use async processing (quiz grading, email digests, push notifications).

### Phase 4 — Frontend Finalization

8. **CC6 (Offline Queue)** — Offline queue semantics finalized after all backend endpoints are stable. Requires stable idempotency key formats.

## Kontrak Kritis

### Contract 4: Offline Delivery Contract

| Entity            | Delivery        | Idempotency Key                                | Replay Response |
| ----------------- | --------------- | ---------------------------------------------- | --------------- |
| xAPI Statement    | At-least-once   | `xapi:{verb}:{objectType}:{objectId}:{userId}` | 200 OK          |
| Quiz Submit       | Exactly-once    | `quiz:{attempt_id}:{user_id}`                  | 200 OK          |
| Progress Event    | Last-write-wins | `progress:{lesson_id}:{user_id}`               | 200 OK          |
| Assignment Upload | At-least-once   | `assignment:{submission_id}`                   | 200 OK          |

### Contract 5: Realtime Decision Matrix

| Channel             | Mechanism           | Loss Tolerance | Reconnect Budget |
| ------------------- | ------------------- | -------------- | ---------------- |
| Notifications       | pg_notify           | Acceptable     | 30s max          |
| Discussions         | pg_notify           | Acceptable     | 30s max          |
| Classroom           | pg_notify           | Acceptable     | 30s max          |
| Builder Presence    | pg_notify           | Acceptable     | 5s max           |
| Builder Content     | Outbox pattern      | No loss        | 5s max           |
| Parent Messaging    | Outbox pattern      | No loss        | 30s max          |
| Group Assignment    | pg_notify           | Acceptable     | 30s max          |
| Admin Notifications | React Query polling | N/A            | N/A              |

### Contract 6: Cutover Rehearsal Playbook

Before each gate:

1. Seeded staging (`supabase db reset` + `seed.sql`)
2. Dual-run verification
3. Per-flow cutover test
4. Rollback rehearsal
5. Load comparison (k6)
6. Auth cycle test
7. Offline replay test

## Exit Criteria per Concern

Setiap concern memiliki acceptance criteria tersendiri yang harus dipenuhi sebelum proceeding ke fase berikutnya. See individual concern files for details.
