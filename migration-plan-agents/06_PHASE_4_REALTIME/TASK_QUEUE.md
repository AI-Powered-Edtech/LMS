# TASK QUEUE — Phase 4: Realtime Migration

**Weeks 53-60 | ~120 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — Rust workspace pakai `cargo`, frontend pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di synthesized plan
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. **🛠️ Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 4X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`

## Effort Estimate

| Wave | Tasks                  | Jam   | Parallelism |
| ---- | ---------------------- | ----- | ----------- |
| 4A   | WebSocket Server Setup | 25-30 | Serial      |
| 4B   | 9 Realtime Consumers   | 70-80 | Parallel    |
| 4C   | Verification           | 15-20 | Serial      |

## Dependency Map

```
4A-0: WebSocket Server Setup (BLOCKING)
  │
  ├── 4A-1: vil_ws integration
  │     │
  │     ├── 4A-2: pg_notify → LISTEN/NOTIFY forwarding
  │     │
  │     └── 4A-3: Triggers for realtime tables
  │
  └── 4A-4: Reconnection with exponential backoff
        │
        └── 4B-0: Realtime Consumer Migration (PARALLEL)
              │
              ├── 4B-1: useBuilderChannel.ts (Broadcast + presence)
              ├── 4B-2: useBuilderPresence.ts (Presence tracking)
              ├── 4B-3: useNotifications.ts (postgres_changes → pg_notify)
              ├── 4B-4: useAdminNotifications.ts (postgres_changes → pg_notify)
              ├── 4B-5: discussionQueries.ts (postgres_changes)
              ├── 4B-6: useMessages.ts (Broadcast)
              ├── 4B-7: MessageThread.tsx (Broadcast)
              ├── 4B-8: classroomService.ts (postgres_changes)
              └── 4B-9: groupAssignmentService.ts (Broadcast)
                    │
                    └── 4C-0: Verification
```

## Tasks

### 4A: WebSocket Server

#### Task 4A-0: WebSocket Server Planning

```
TASK ID:       4A-0
OWNER TYPE:    Backend Agent
GOAL:          Review realtime requirements, identify all channels
EDIT ONLY:     docs/REALTIME_ARCHITECTURE.md (new)
DEPENDENCY:    Phase 3 complete
```

**Steps:**

1. Document all realtime channels used in app
2. Map each channel to Supabase Postgres Changes pattern
3. Identify presence requirements
4. Document message loss tolerance per channel
5. Define reconnection requirements

**Verify:** `wc -l docs/REALTIME_ARCHITECTURE.md` (>50 lines)

---

#### Task 4A-1: vil_ws Integration

```
TASK ID:       4A-1
OWNER TYPE:    Rust CLI Agent
GOAL:          Integrate vil_ws for WebSocket support
EDIT ONLY:     edusync-api/crates/api-server/src/realtime.rs (new)
DEPENDENCY:    4A-0
```

**Creates:**

- WebSocket handler integrated with VilApp
- Room support for collaborative features
- Presence tracking
- Event broadcasting

**Verify:** `cargo check && cargo clippy`

---

#### Task 4A-2: pg_notify → LISTEN/NOTIFY Forwarding

```
TASK ID:       4A-2
OWNER TYPE:    Rust CLI Agent
GOAL:          Forward PostgreSQL NOTIFY to WebSocket clients
EDIT ONLY:     edusync-api/crates/api-server/src/realtime/pg_notify.rs (new)
DEPENDENCY:    4A-1
```

**Creates:**

- LISTEN handler for PostgreSQL channels
- NOTIFY event forwarding to WebSocket rooms
- Event filtering per channel

**Verify:** `cargo check && cargo test`

---

#### Task 4A-3: Database Triggers

```
TASK ID:       4A-3
OWNER TYPE:    Backend Agent
GOAL:          Add PostgreSQL triggers for realtime tables
EDIT ONLY:     migrations/ (new migration file)
DEPENDENCY:    4A-2
```

**Tables requiring triggers:**

- `notifications` → `notify:notifications`
- `messages` → `notify:messages`
- `discussion_posts` → `notify:discussions`
- `classroom_activities` → `notify:classroom`
- `courses` (for builder) → `notify:builder`

**Verify:** Migration applies cleanly

---

#### Task 4A-4: Reconnection with Exponential Backoff

```
TASK ID:       4A-4
OWNER TYPE:    Frontend Agent
GOAL:          Implement client-side reconnection strategy
EDIT ONLY:     src/services/realtime/vilRealtimeProvider.ts
DEPENDENCY:    4A-1
```

**Implements:**

- Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
- Max retry attempts: 10
- Connection state tracking
- Automatic reconnection on disconnect

**Verify:** Unit test passes for backoff logic

---

### 4B: Port 9 Realtime Consumers

#### Task 4B-1: useBuilderChannel.ts

```
TASK ID:       4B-1
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to VIL WebSocket broadcast + presence
EDIT ONLY:     src/features/course-builder/hooks/useBuilderChannel.ts
DEPENDENCY:    4A-1
```

**Migrate from:** Supabase `channel()` + `track()`

**Verify:** Collaborative editing works with 2+ users

---

#### Task 4B-2: useBuilderPresence.ts

```
TASK ID:       4B-2
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to VIL presence tracking
EDIT ONLY:     src/features/course-builder/hooks/useBuilderPresence.ts
DEPENDENCY:    4A-1
```

**Migrate from:** Supabase `presence` + `track()`

**Verify:** Presence shows correct users

---

#### Task 4B-3: useNotifications.ts

```
TASK ID:       4B-3
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to pg_notify
EDIT ONLY:     src/features/notifications/hooks/useNotifications.ts
DEPENDENCY:    4A-3
```

**Migrate from:** Supabase `postgres_changes` channel

**Verify:** Real-time notifications appear

---

#### Task 4B-4: useAdminNotifications.ts

```
TASK ID:       4B-4
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to pg_notify
EDIT ONLY:     src/features/notifications/hooks/useAdminNotifications.ts
DEPENDENCY:    4A-3
```

**Migrate from:** Supabase `postgres_changes` channel

**Verify:** Admin receives realtime alerts

---

#### Task 4B-5: discussionQueries.ts

```
TASK ID:       4B-5
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to pg_notify
EDIT ONLY:     src/features/discussions/api/discussionQueries.ts
DEPENDENCY:    4A-3
```

**Migrate from:** Supabase `postgres_changes` channel

**Verify:** New discussion posts appear real-time

---

#### Task 4B-6: useMessages.ts

```
TASK ID:       4B-6
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to Broadcast
EDIT ONLY:     src/features/messages/hooks/useMessages.ts
DEPENDENCY:    4A-1
```

**Migrate from:** Supabase `channel()` broadcast

**Verify:** Messages appear instantly

---

#### Task 4B-7: MessageThread.tsx

```
TASK ID:       4B-7
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to Broadcast
EDIT ONLY:     src/features/messages/components/MessageThread.tsx
DEPENDENCY:    4A-1
```

**Migrate from:** Supabase `channel()` broadcast

**Verify:** Thread updates in real-time

---

#### Task 4B-8: classroomService.ts

```
TASK ID:       4B-8
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to pg_notify
EDIT ONLY:     src/features/classroom/api/classroomService.ts
DEPENDENCY:    4A-3
```

**Migrate from:** Supabase `postgres_changes` channel

**Verify:** Classroom activities update live

---

#### Task 4B-9: groupAssignmentService.ts

```
TASK ID:       4B-9
OWNER TYPE:    Frontend Agent
GOAL:          Migrate to Broadcast
EDIT ONLY:     src/features/assignments/api/groupAssignmentService.ts
DEPENDENCY:    4A-1
```

**Migrate from:** Supabase `channel()` broadcast

**Verify:** Group updates propagate

---

### 4C: Verification

#### Task 4C-0: Realtime Verification

```
TASK ID:       4C-0
OWNER TYPE:    QA Agent
GOAL:          Verify all realtime features work
EDIT ONLY:     None
DEPENDENCY:    4B-1 through 4B-9
```

**Verification:**

1. Collaborative builder: 2+ users edit simultaneously
2. Notifications: Real-time delivery <1s
3. Messages: Instant delivery
4. Disconnect/reconnect: Exponential backoff works
5. Message loss: None on reconnect
6. All E2E realtime tests pass

**Gate 5 Criteria:**

- [ ] All 9 realtime consumers migrated
- [ ] Collaborative builder works
- [ ] Realtime notifications work
- [ ] Reconnection with backoff tested
- [ ] No message loss on reconnect

---

## Output Deliverables

After Phase 4:

- [ ] WebSocket server running with vil_ws
- [ ] pg_notify → WebSocket forwarding working
- [ ] All 9 realtime consumers migrated to VIL
- [ ] Reconnection with exponential backoff implemented
- [ ] Gate 5: PASSED (Realtime reliable)

## Rollback

If realtime issues:

1. Switch to Supabase: `VITE_REALTIME_BACKEND=supabase`
2. Verify all realtime features work
3. Investigate VIL issues in staging
4. No data loss — Supabase Realtime unchanged
