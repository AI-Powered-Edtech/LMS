# Phase 4 → Phase 5 Handoff

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Executive Summary

Phase 4 completed the migration of all realtime features from Supabase Realtime to VIL WebSocket server. The system now handles collaborative editing, notifications, and messaging without Supabase dependency.

## Deliverables Completed

### 4A: WebSocket Server ✅

- vil_ws integrated with VilApp
- Room support for collaborative features
- Presence tracking implemented
- pg_notify → WebSocket forwarding working
- Database triggers on 5 tables (notifications, messages, discussions, classroom, courses)

### 4B: 9 Realtime Consumers Migrated ✅

| Hook/File                 | Pattern              | Status      |
| ------------------------- | -------------------- | ----------- |
| useBuilderChannel.ts      | Broadcast + presence | ✅ Migrated |
| useBuilderPresence.ts     | Presence tracking    | ✅ Migrated |
| useNotifications.ts       | pg_notify            | ✅ Migrated |
| useAdminNotifications.ts  | pg_notify            | ✅ Migrated |
| discussionQueries.ts      | pg_notify            | ✅ Migrated |
| useMessages.ts            | Broadcast            | ✅ Migrated |
| MessageThread.tsx         | Broadcast            | ✅ Migrated |
| classroomService.ts       | pg_notify            | ✅ Migrated |
| groupAssignmentService.ts | Broadcast            | ✅ Migrated |

### 4C: Verification ✅

- Collaborative builder works with 2+ users
- Notifications real-time (<1s latency)
- Reconnection with exponential backoff tested
- No message loss on reconnect
- All E2E realtime tests pass

## Gate 5 Status: PASSED

All criteria met:

- [x] WebSocket server running with vil_ws
- [x] pg_notify forwarding working
- [x] All 9 realtime consumers migrated
- [x] Reconnection with exponential backoff (1s-30s, 10 retries)
- [x] No message loss on reconnect verified
- [x] Collaborative builder verified with 2+ users
- [x] Realtime notifications <1s latency
- [x] All E2E tests pass

## Architecture Decisions Made

### Realtime Stack

- VIL WebSocket (vil_ws) for all real-time features
- PostgreSQL LISTEN/NOTIFY for database events
- Broadcast for peer-to-peer messaging
- Presence for collaborative editing

### Channel Patterns

| Channel          | Mechanism      | Loss Tolerance                 |
| ---------------- | -------------- | ------------------------------ |
| Notifications    | pg_notify      | Acceptable (30s max reconnect) |
| Discussions      | pg_notify      | Acceptable                     |
| Classroom        | pg_notify      | Acceptable                     |
| Builder Presence | pg_notify      | Acceptable (5s max reconnect)  |
| Builder Content  | Outbox pattern | No loss (handled by save)      |
| Parent Messaging | Outbox pattern | No loss                        |
| Group Assignment | pg_notify      | Acceptable                     |

### Reconnection Strategy

- Exponential backoff: 1s → 2s → 4s → 8s → 16s → max 30s
- Max 10 retry attempts
- Connection state tracking in Redux/Zustand
- Automatic reconnection on disconnect

## Files Created/Modified

### Backend (`edusync-api/`)

```
crates/api-server/src/
├── realtime/
│   ├── mod.rs
│   ├── handler.rs          # WebSocket handler
│   ├── room.rs              # Room management
│   └── pg_notify.rs         # PostgreSQL notification forwarding
```

### Database Migrations

```
migrations/
├── 004_add_realtime_triggers.sql
│   -- notifications: notify_notifications
│   -- messages: notify_messages
│   -- discussion_posts: notify_discussions
│   -- classroom_activities: notify_classroom
│   -- courses: notify_builder
```

### Frontend

```
src/services/realtime/
├── vilRealtimeProvider.ts    # VIL WebSocket implementation
├── types.ts                 # Realtime event types

src/features/course-builder/hooks/
├── useBuilderChannel.ts     # Migrated
├── useBuilderPresence.ts    # Migrated

src/features/notifications/hooks/
├── useNotifications.ts      # Migrated
├── useAdminNotifications.ts  # Migrated

src/features/discussions/api/
├── discussionQueries.ts      # Migrated

src/features/messages/
├── hooks/useMessages.ts     # Migrated
├── components/MessageThread.tsx  # Migrated

src/features/classroom/api/
└── classroomService.ts       # Migrated

src/features/assignments/api/
└── groupAssignmentService.ts # Migrated
```

### Tests

```
tests/
├── realtime/
│   ├── builder_e2e.rs       # Collaborative builder
│   ├── notifications_e2e.rs # Real-time notifications
│   ├── messages_e2e.rs     # Messaging
│   ├── reconnect_e2e.ts    # Reconnection logic
│   └── message_loss_e2e.ts # No message loss
```

## Environment Variables Required

```bash
# Required for Phase 5
VITE_API_BACKEND=vil
VITE_WS_URL=ws://localhost:8080/ws

# Optional (fallback)
VITE_REALTIME_BACKEND=supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_REALTIME_URL=ws://localhost:54321/realtime/v1
```

## Test Accounts

| Email               | Password    | Test Scenario           |
| ------------------- | ----------- | ----------------------- |
| teacher@edusync.dev | password123 | Builder collaboration   |
| student@edusync.dev | password123 | Notifications, messages |
| admin@edusync.dev   | password123 | Admin notifications     |

## Phase 5 Entry Points

### Backend Routes

```
/api/v1/auth/*          → VIL Auth
/rest/v1/*             → VIL PostgREST
/ws                    → VIL WebSocket (realtime)
/realtime/*            → SUPABASE (fallback)
/storage/v1/*          → SUPABASE Storage
```

### Switchover Commands

```bash
# Cutover to VIL Realtime (default after Phase 4)
export VITE_REALTIME_BACKEND=vil

# Rollback to Supabase Realtime (if needed)
export VITE_REALTIME_BACKEND=supabase
```

## Rollback Procedure

If realtime issues detected:

1. Set `VITE_REALTIME_BACKEND=supabase` in frontend
2. Verify: Notifications appear via Supabase
3. Investigate VIL issues in staging
4. No data loss — Supabase Realtime unchanged

## Phase 5 Scope

### Storage Migration

1. Deploy MinIO/S3/R2
2. Configure vil_storage_s3
3. Dual-write period (Supabase + S3)
4. Background migration: copy all files
5. Switch reads to S3
6. URL rewriting

### Cross-Cutting

- CSP update for S3 domains
- CDN integration
- Backup verification

## Sign-offs

| Role            | Name | Date | Status     |
| --------------- | ---- | ---- | ---------- |
| Tech Lead       |      |      | ⬜ Pending |
| Security Review |      |      | ⬜ Pending |
| QA              |      |      | ⬜ Pending |
| Product Owner   |      |      | ⬜ Pending |

---

**Phase 4 Status: COMPLETE ✅**  
**Gate 5: PASSED ✅**  
**Ready for Phase 5: YES ✅**
