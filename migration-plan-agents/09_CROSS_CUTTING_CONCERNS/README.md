# 09_CROSS_CUTTING_CONCERNS

Cross-cutting concerns yang melintasi semua fase migrasi dari Supabase ke VIL Backend.

## Daftar Concern

| ID  | Nama                                                                     | Dimulai | Berkaitan dengan                                                                       |
| --- | ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------- |
| CC1 | [Monitoring & Observability](./01_MONITORING_OBSERVABILITY.md)           | Phase 1 | VIL Observer Dashboard, Prometheus, Grafana, OpenTelemetry, vil_log                    |
| CC2 | [Database Migration Strategy](./02_DATABASE_MIGRATION_STRATEGY.md)       | Phase 0 | Supabase CLI sebagai source of truth, sqlx di Phase 2+, backward-compatible migrations |
| CC3 | [Staging Environment](./03_STAGING_ENVIRONMENT.md)                       | Phase 1 | Staging VIL server, preview deployments, E2E isolated, parity tests                    |
| CC4 | [Rate Limiting](./04_RATE_LIMITING.md)                                   | Phase 2 | Per-tenant, per-user rate limiting, special limits untuk uploads/AI/quiz               |
| CC5 | [Graceful Degradation](./05_GRACEFUL_DEGRADATION.md)                     | Phase 3 | Circuit breaker for AI, fallback when VIL down, frontend error handling                |
| CC6 | [Offline Queue Semantics](./06_OFFLINE_QUEUE_SEMANTICS.md)               | Phase 1 | Idempotency keys, delivery semantics, retry policy, DLQ strategy                       |
| CC7 | [Worker Queue Runtime](./07_WORKER_QUEUE_RUNTIME.md)                     | Phase 2 | HTTP handlers, Tri-Lane for internal, vil_trigger_cron for scheduled                   |
| CC8 | [Frontend Runtime Compatibility](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) | Phase 1 | Per-flow cutover matrix, React Query parity, privileged operations, PWA migration      |

## Dokumen Utama

- [HANDOFF.md](./HANDOFF.md) — Cross-cutting handoff ke Phase 1

## Overview

Cross-cutting concerns ini mempengaruhi multiple fase migrasi dan memerlukan koordinasi khusus:

1. **CC1 (Monitoring)** — Dimulai di Phase 1 untuk memastikan VIL server memiliki observability yang memadai
2. **CC2 (Database)** — Dimulai di Phase 0, Supabase CLI sebagai source of truth sampai Phase 2+
3. **CC3 (Staging)** — Dimulai di Phase 1 untuk parallel testing dengan production
4. **CC4 (Rate Limiting)** — Dimulai di Phase 2 ketika volume traffic meningkat
5. **CC5 (Graceful Degradation)** — Dimulai di Phase 3 ketika fitur baru ditambahkan
6. **CC6 (Offline Queue)** — Dimulai di Phase 1 untuk queue semantics parity
7. **CC7 (Worker Runtime)** — Dimulai di Phase 2 untuk background job migration
8. **CC8 (Frontend Compatibility)** — Dimulai di Phase 1 untuk memastikan frontend compatibility

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

Setiap concern memiliki acceptance criteria tersendiri yang harus dipenuhi sebelum proceeding ke fase berikutnya.
