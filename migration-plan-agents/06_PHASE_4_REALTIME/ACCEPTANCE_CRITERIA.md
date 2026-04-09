# Phase 4 Acceptance Criteria

**Verification checklist for Phase 4 (Realtime) completion**

---

## Gate 5: Realtime Must Be Reliable

### Criteria

- [ ] All 9 realtime consumers migrated
- [ ] Collaborative builder works with 2+ users
- [ ] Notifications real-time (<1s latency)
- [ ] Reconnection with exponential backoff works
- [ ] No message loss on reconnect
- [ ] All E2E realtime tests pass

---

## 1. WebSocket Server Operational

### Criteria

- [ ] vil_ws integrated with VilApp
- [ ] Room support functioning
- [ ] Presence tracking working
- [ ] pg_notify forwarding to WebSocket clients

### Verification

```bash
# Test WebSocket connection
wscat -c ws://localhost:8080/ws

# Send test message
{"type": "ping"}

# Should receive pong response
```

---

## 2. Database Triggers Active

### Criteria

- [ ] NOTIFY triggers on notifications table
- [ ] NOTIFY triggers on messages table
- [ ] NOTIFY triggers on discussion_posts table
- [ ] NOTIFY triggers on classroom_activities table
- [ ] NOTIFY triggers on courses table (builder)

### Verification

```sql
-- Test trigger fires
NOTIFY test_channel, 'test';
-- Should forward to WebSocket
```

---

## 3. Realtime Consumers Migrated

### Criteria

| Hook/File                 | Status                           |
| ------------------------- | -------------------------------- |
| useBuilderChannel.ts      | Migrated to Broadcast + presence |
| useBuilderPresence.ts     | Migrated to presence tracking    |
| useNotifications.ts       | Migrated to pg_notify            |
| useAdminNotifications.ts  | Migrated to pg_notify            |
| discussionQueries.ts      | Migrated to pg_notify            |
| useMessages.ts            | Migrated to Broadcast            |
| MessageThread.tsx         | Migrated to Broadcast            |
| classroomService.ts       | Migrated to pg_notify            |
| groupAssignmentService.ts | Migrated to Broadcast            |

### Verification

```bash
# Check all hooks use vilRealtimeProvider
grep -l "vilRealtimeProvider" src/features/*/hooks/*.ts
# Expected: 9 files
```

---

## 4. Reconnection Strategy Works

### Criteria

- [ ] Exponential backoff: 1s → 2s → 4s → 8s → 16s → max 30s
- [ ] Max retry attempts: 10
- [ ] Connection state tracking visible
- [ ] Automatic reconnection on disconnect

### Verification

```bash
# Test reconnection logic
node -e "
const backoff = [1, 2, 4, 8, 16, 30];
console.log('Backoff sequence:', backoff);
console.log('Max retries:', 10);
"
```

---

## 5. End-to-End Realtime Tests

### Criteria

- [ ] Collaborative builder E2E passes
- [ ] Notifications E2E passes
- [ ] Messages E2E passes
- [ ] Disconnect/reconnect E2E passes
- [ ] No message loss test passes

### Verification

```bash
pnpm test:e2e -- --grep "realtime"
# All realtime tests pass
```

---

## 6. Performance

### Criteria

- [ ] Latency < 1s for pg_notify events
- [ ] Latency < 500ms for broadcast messages
- [ ] WebSocket connection stable for 1 hour+
- [ ] Memory usage stable under load

### Verification

```bash
# Load test with multiple clients
# Monitor latency metrics in dashboard
```

---

## Verification Commands

```bash
#!/bin/bash
set -e

echo "=== Phase 4 Acceptance Verification ==="
echo ""

echo "1. WebSocket server running"
curl -s http://localhost:8080/health | grep -q "ok" && echo "   ✅ Server healthy" || echo "   ❌ Server down"
echo ""

echo "2. Database triggers exist"
psql -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%notify%'" | wc -l
echo ""

echo "3. Realtime consumers migrated"
COUNT=$(grep -rl "vilRealtimeProvider" src/features/*/hooks/*.ts 2>/dev/null | wc -l)
echo "   Found: $COUNT consumers"
[ "$COUNT" -ge "9" ] && echo "   ✅ All migrated" || echo "   ❌ Missing consumers"
echo ""

echo "4. E2E tests"
pnpm test:e2e -- --grep "realtime" 2>&1 | tail -5
echo ""

echo "=== Summary ==="
echo "Phase 4 complete when all criteria ✅"
```

---

## Sign-Off Checklist

| #   | Criteria                     | Status | Evidence            |
| --- | ---------------------------- | ------ | ------------------- |
| 1   | WebSocket server operational | [ ]    | Health check passes |
| 2   | Database triggers active     | [ ]    | pg_trigger check    |
| 3   | All 9 consumers migrated     | [ ]    | File audit          |
| 4   | Reconnection works           | [ ]    | Unit test + manual  |
| 5   | E2E tests pass               | [ ]    | Test suite green    |
| 6   | Performance acceptable       | [ ]    | Latency <1s         |

**All criteria must be ✅ before Phase 4 is complete.**

---

## Phase 4 → Phase 5 Handoff

Phase 4 complete means:

- ✅ All realtime features use VIL WebSocket
- ✅ Supabase Realtime can be disabled
- ✅ Gate 5 PASSED

Phase 5 starts with:

- 🆕 Storage migration (MinIO/S3/R2)
- 🆕 Dual-write period
- 🆕 URL rewriting
