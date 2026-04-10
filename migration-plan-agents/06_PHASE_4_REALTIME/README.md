# Phase 4: Realtime Migration

**Timeline:** Weeks 53-60
**Effort:** ~120 hours

## Overview

Phase 4 migrates all real-time features from Supabase Realtime (postgres_changes, broadcast, presence) to a VIL WebSocket server backed by PostgreSQL LISTEN/NOTIFY.

## Architecture

```
Browser  ──WebSocket──►  VIL WS Server  ──LISTEN──►  PostgreSQL
                              │
                         Room Manager
                              │
                      Presence Tracker
```

Three patterns replace Supabase Realtime:

| Pattern   | Replaces                    | Use Case                                      |
| --------- | --------------------------- | --------------------------------------------- |
| pg_notify | `postgres_changes` channels | DB-driven events (notifications, discussions)  |
| Broadcast | `channel().send()`          | Peer messages (parent chat, group assignments) |
| Presence  | `channel().track()`         | Who-is-online (collaborative builder)          |

## Realtime Consumers (8 files)

| #  | File (relative to `src/`)                                | Current Supabase Pattern   | Target VIL Pattern   |
| -- | -------------------------------------------------------- | -------------------------- | -------------------- |
| 1  | `features/course-builder/useBuilderChannel.ts`           | broadcast + presence       | Broadcast + Presence |
| 2  | `features/course-builder/useBuilderPresence.ts`          | presence                   | Presence             |
| 3  | `features/notifications/hooks/useNotifications.ts`       | postgres_changes           | pg_notify            |
| 4  | `features/notifications/hooks/useAdminNotifications.ts`  | postgres_changes           | pg_notify            |
| 5  | `features/discussions/queries/discussionQueries.ts`      | postgres_changes           | pg_notify            |
| 6  | `features/parent/hooks/useMessages.ts`                   | channel (broadcast)        | Broadcast            |
| 7  | `features/classroom/api/classroomService.ts`             | channel (postgres_changes) | pg_notify            |
| 8  | `features/assignments/api/groupAssignmentService.ts`     | channel (broadcast)        | Broadcast            |

## Reconnection Strategy

- Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
- Max retry attempts: 10
- Connection state exposed to UI via hook
- Automatic reconnection on disconnect

## Gate 5 Criteria

- [ ] WebSocket server running and healthy
- [ ] pg_notify forwarding working for all 5 trigger tables
- [ ] All 8 consumers migrated
- [ ] Reconnection with exponential backoff tested
- [ ] No message loss on reconnect
- [ ] Collaborative builder works with 2+ users

## Rollback

Set `VITE_REALTIME_BACKEND=supabase` to revert all consumers to Supabase Realtime. No data loss; Supabase channels remain unchanged.

---

## Artefacts

- [x] README.md (this document)
- [x] TASK_QUEUE.md - Task queue with concrete code and verify commands
- [x] ACCEPTANCE_CRITERIA.md - Bash-executable acceptance tests
- [x] HANDOFF.md - Entry/exit criteria and file paths for Phase 5
