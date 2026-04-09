# Phase 4: Realtime Migration

**Timeline:** Weeks 53-60  
**Effort:** ~120 hours

## Overview

Phase 4 implements WebSocket server with vil_ws for real-time features, migrating from Supabase Realtime to VIL WebSocket with PostgreSQL LISTEN/NOTIFY.

## Goals

1. Deploy vil_ws WebSocket server with room support and presence tracking
2. Implement pg_notify → LISTEN/NOTIFY forwarding
3. Migrate 9 realtime consumer hooks
4. Implement reconnection with exponential backoff

## WebSocket Architecture

```
Client → VIL WebSocket Server → PostgreSQL NOTIFY
           ↓
      Room Management
           ↓
    Presence Tracking
```

### Patterns Used

| Pattern   | Use Case                              |
| --------- | ------------------------------------- |
| Broadcast | Messages, group assignments           |
| pg_notify | Notifications, discussions, classroom |
| Presence  | Collaborative editing                 |

### Reconnection Strategy

- Exponential backoff: 1s → 2s → 4s → 8s → 16s → max 30s
- Max retry attempts: 10
- Connection state tracking
- Automatic reconnection

## Realtime Consumers (9 hooks)

| Hook                      | Pattern              | Status  |
| ------------------------- | -------------------- | ------- |
| useBuilderChannel.ts      | Broadcast + presence | Pending |
| useBuilderPresence.ts     | Presence tracking    | Pending |
| useNotifications.ts       | pg_notify            | Pending |
| useAdminNotifications.ts  | pg_notify            | Pending |
| discussionQueries.ts      | pg_notify            | Pending |
| useMessages.ts            | Broadcast            | Pending |
| MessageThread.tsx         | Broadcast            | Pending |
| classroomService.ts       | pg_notify            | Pending |
| groupAssignmentService.ts | Broadcast            | Pending |

## Gate 5 Criteria

- [ ] WebSocket server running
- [ ] pg_notify forwarding working
- [ ] All 9 consumers migrated
- [ ] Reconnection tested
- [ ] No message loss on reconnect
- [ ] Collaborative builder works with 2+ users

## Rollback

If realtime issues: `VITE_REALTIME_BACKEND=supabase`

---

## Artefak

- [x] README.md (dokumen ini)
- [x] TASK_QUEUE.md - Antrian tugas Realtime
- [x] ACCEPTANCE_CRITERIA.md - Kriteria exit
- [x] HANDOFF.md - Handover ke Phase 5
