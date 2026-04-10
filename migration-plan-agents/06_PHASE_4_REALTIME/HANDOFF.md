# Phase 4 -> Phase 5 Handoff

**EduSync LMS -- Supabase to VIL Backend Migration**

---

## Entry Criteria (Phase 4 can start when)

- [ ] Phase 3 (PostgREST Migration) Gate 4 PASSED
- [ ] VIL API server running and serving REST endpoints
- [ ] All Phase 3 consumers migrated (no Supabase PostgREST dependency for core flows)
- [ ] These files exist and are stable:
  - `edusync-api/crates/api-server/src/main.rs` (VIL app entrypoint)
  - `edusync-api/Cargo.toml` (workspace root)

## Exit Criteria (Phase 4 is done when)

- [ ] Gate 5 script (see ACCEPTANCE_CRITERIA.md "Full Gate 5 Check") prints `GATE 5: PASSED`
- [ ] All 8 consumer files import from VIL, zero Supabase realtime references
- [ ] WebSocket server health check returns ok at `/health`
- [ ] 5 PostgreSQL NOTIFY triggers active
- [ ] Reconnection with exponential backoff (1s-30s, 10 retries) implemented
- [ ] Rollback verified: setting `VITE_REALTIME_BACKEND=supabase` restores all realtime features

---

## Deliverables Produced by Phase 4

### Backend (Rust)

| File                                                          | Purpose                    |
| ------------------------------------------------------------- | -------------------------- |
| `edusync-api/crates/api-server/src/realtime/mod.rs`           | Module root                |
| `edusync-api/crates/api-server/src/realtime/handler.rs`       | WebSocket upgrade + handler|
| `edusync-api/crates/api-server/src/realtime/room.rs`          | Room join/leave/members    |
| `edusync-api/crates/api-server/src/realtime/pg_notify.rs`     | LISTEN/NOTIFY forwarder    |

### Database

| File                                      | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `migrations/004_add_realtime_triggers.sql` | 5 NOTIFY triggers + `notify_table_change()` function |

### Frontend

| File                                                           | Pattern              |
| -------------------------------------------------------------- | -------------------- |
| `src/services/realtime/vilRealtimeProvider.ts`                  | Client + reconnection|
| `src/features/course-builder/useBuilderChannel.ts`              | Broadcast + Presence |
| `src/features/course-builder/useBuilderPresence.ts`             | Presence             |
| `src/features/notifications/hooks/useNotifications.ts`          | pg_notify            |
| `src/features/notifications/hooks/useAdminNotifications.ts`     | pg_notify            |
| `src/features/discussions/queries/discussionQueries.ts`         | pg_notify            |
| `src/features/parent/hooks/useMessages.ts`                      | Broadcast            |
| `src/features/classroom/api/classroomService.ts`                | pg_notify            |
| `src/features/assignments/api/groupAssignmentService.ts`        | Broadcast            |

---

## Architecture Decisions (locked)

| Decision                    | Choice                               | Rationale                              |
| --------------------------- | ------------------------------------ | -------------------------------------- |
| WebSocket framework         | Axum `extract::ws`                   | Already in stack from Phase 2-3        |
| DB event mechanism          | PostgreSQL LISTEN/NOTIFY via pg_notify | No external broker needed             |
| Broadcast delivery          | In-process `tokio::sync::broadcast`  | Single-server MVP; shard later         |
| Presence tracking           | In-memory `RoomManager`              | Simple; no Redis needed at this scale  |
| Reconnection                | Client-side exponential backoff      | 1s-30s, 10 retries                     |
| Message loss for pg_notify  | Acceptable (refetch on reconnect)    | Notifications/discussions are idempotent|
| Message loss for chat       | Outbox pattern (zero loss)           | Messages persisted to DB first         |

---

## Environment Variables

```bash
# Required after Phase 4
VITE_API_BACKEND=vil
VITE_WS_URL=ws://localhost:8080/ws

# Rollback (optional)
VITE_REALTIME_BACKEND=supabase
```

---

## Route Map After Phase 4

```
/api/v1/auth/*     -> VIL Auth        (Phase 2)
/rest/v1/*         -> VIL PostgREST   (Phase 3)
/ws                -> VIL WebSocket   (Phase 4)  <-- NEW
/storage/v1/*      -> Supabase        (Phase 5 will migrate)
```

---

## Rollback Procedure

1. Set `VITE_REALTIME_BACKEND=supabase` in `.env`
2. Restart frontend: `pnpm dev`
3. Verify: notifications, discussions, messaging all work via Supabase
4. No data loss -- Supabase Realtime channels are unchanged; DB triggers are harmless (NOTIFY with no listener is a no-op)

---

## Phase 5 Scope (Storage Migration)

Phase 5 starts with these prerequisites met:

- VIL serves Auth (Phase 2), REST (Phase 3), and WebSocket (Phase 4)
- Only Supabase Storage remains

Phase 5 tasks:

1. Deploy object storage (MinIO / S3 / R2)
2. Dual-write period: uploads go to both Supabase Storage and S3
3. Background migration: copy existing files from Supabase to S3
4. Switch reads to S3
5. URL rewriting for existing references
6. CSP and CDN updates

---

## Test Accounts

| Email                 | Password      | Role    | Phase 4 Test Scenario           |
| --------------------- | ------------- | ------- | ------------------------------- |
| `teacher@edusync.dev` | `password123` | TEACHER | Collaborative builder presence  |
| `student@edusync.dev` | `password123` | STUDENT | Notifications, discussions      |
| `admin@edusync.dev`   | `password123` | ADMIN   | Admin notifications             |

---

## Sign-offs

| Role            | Name | Date | Status     |
| --------------- | ---- | ---- | ---------- |
| Tech Lead       |      |      | Pending    |
| Security Review |      |      | Pending    |
| QA              |      |      | Pending    |
| Product Owner   |      |      | Pending    |
