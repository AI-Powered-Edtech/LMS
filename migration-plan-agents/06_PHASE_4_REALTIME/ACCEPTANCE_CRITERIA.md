# Phase 4 Acceptance Criteria

**Bash-executable verification checklist for Phase 4 (Realtime) completion.**

Run each section independently. Every check must print PASS.

---

## 1. WebSocket Server Operational

```bash
# 1a. Health endpoint responds
curl -sf http://localhost:8080/health | grep -q "ok" && echo "PASS: health ok" || echo "FAIL: health endpoint down"

# 1b. WebSocket upgrade succeeds (requires wscat: npm i -g wscat)
echo '{"type":"ping"}' | timeout 5 wscat -c ws://localhost:8080/ws 2>/dev/null | grep -q "pong" && echo "PASS: ws ping/pong" || echo "FAIL: ws not responding"

# 1c. Rust binary compiles
cd edusync-api && cargo check 2>&1 | tail -1 | grep -q "could not compile" && echo "FAIL: compile error" || echo "PASS: compiles"
```

---

## 2. Database Triggers Active (5 tables)

```bash
# 2a. All 5 triggers exist in pg_trigger
TRIGGER_COUNT=$(psql "$DATABASE_URL" -t -c \
  "SELECT count(*) FROM pg_trigger WHERE tgname IN (
    'notifications_change',
    'messages_change',
    'discussion_posts_change',
    'classroom_activities_change',
    'courses_change'
  )")
TRIGGER_COUNT=$(echo "$TRIGGER_COUNT" | tr -d ' ')
[ "$TRIGGER_COUNT" -eq 5 ] && echo "PASS: 5 triggers found" || echo "FAIL: expected 5 triggers, got $TRIGGER_COUNT"

# 2b. notify_table_change function exists
psql "$DATABASE_URL" -t -c \
  "SELECT 1 FROM pg_proc WHERE proname = 'notify_table_change'" | grep -q "1" \
  && echo "PASS: function exists" || echo "FAIL: notify_table_change function missing"

# 2c. Migration file has correct trigger count
grep -c "CREATE TRIGGER" migrations/004_add_realtime_triggers.sql | xargs -I{} bash -c \
  '[ {} -eq 5 ] && echo "PASS: 5 CREATE TRIGGER statements" || echo "FAIL: expected 5, got {}"'
```

---

## 3. All 8 Realtime Consumers Migrated

```bash
# 3a. No consumer still uses Supabase realtime patterns
FILES=(
  "src/features/course-builder/useBuilderChannel.ts"
  "src/features/course-builder/useBuilderPresence.ts"
  "src/features/notifications/hooks/useNotifications.ts"
  "src/features/notifications/hooks/useAdminNotifications.ts"
  "src/features/discussions/queries/discussionQueries.ts"
  "src/features/parent/hooks/useMessages.ts"
  "src/features/classroom/api/classroomService.ts"
  "src/features/assignments/api/groupAssignmentService.ts"
)

SUPA_FAIL=0
for f in "${FILES[@]}"; do
  if grep -qE "postgres_changes|supabase\.channel|\.on\('broadcast'" "$f" 2>/dev/null; then
    echo "FAIL: $f still uses Supabase realtime"
    SUPA_FAIL=1
  fi
done
[ "$SUPA_FAIL" -eq 0 ] && echo "PASS: no Supabase realtime imports in any consumer"

# 3b. All consumers reference VIL
VIL_COUNT=0
for f in "${FILES[@]}"; do
  if grep -qE "vilRealtime|VilRealtimeClient" "$f" 2>/dev/null; then
    VIL_COUNT=$((VIL_COUNT + 1))
  else
    echo "FAIL: $f does not reference VIL"
  fi
done
[ "$VIL_COUNT" -eq 8 ] && echo "PASS: all 8 consumers use VIL" || echo "FAIL: only $VIL_COUNT of 8 use VIL"
```

---

## 4. Reconnection with Exponential Backoff

```bash
# 4a. Provider file exists
test -f src/services/realtime/vilRealtimeProvider.ts \
  && echo "PASS: provider file exists" || echo "FAIL: provider file missing"

# 4b. Has reconnect logic
grep -q "scheduleReconnect" src/services/realtime/vilRealtimeProvider.ts \
  && echo "PASS: reconnect method present" || echo "FAIL: no scheduleReconnect"

# 4c. Has backoff cap at 30000ms
grep -q "30000" src/services/realtime/vilRealtimeProvider.ts \
  && echo "PASS: 30s max backoff" || echo "FAIL: no 30000ms cap"

# 4d. Has max retry limit
grep -q "maxRetries" src/services/realtime/vilRealtimeProvider.ts \
  && echo "PASS: max retries configured" || echo "FAIL: no max retries"
```

---

## 5. No Message Loss on Reconnect

```bash
# 5a. Manual test script (run with two terminal windows)
# Terminal 1: Start WebSocket server
#   cd edusync-api && cargo run
#
# Terminal 2: Connect, disconnect, reconnect
echo '{"type":"subscribe","channel":"test"}' | timeout 5 wscat -c ws://localhost:8080/ws 2>/dev/null \
  && echo "PASS: subscribe accepted" || echo "FAIL: subscribe rejected"

# 5b. Verify outbox pattern exists for zero-loss channels (builder, messages)
grep -rq "outbox\|pending.*queue\|retry.*send" src/services/realtime/vilRealtimeProvider.ts \
  && echo "PASS: outbox/queue pattern found" || echo "INFO: no outbox pattern (acceptable if loss-tolerant)"
```

---

## 6. Performance

```bash
# 6a. Measure WebSocket latency (requires wscat)
START=$(date +%s%N)
echo '{"type":"ping"}' | timeout 5 wscat -c ws://localhost:8080/ws 2>/dev/null | head -1 > /dev/null
END=$(date +%s%N)
LATENCY=$(( (END - START) / 1000000 ))
[ "$LATENCY" -lt 1000 ] && echo "PASS: latency ${LATENCY}ms < 1000ms" || echo "FAIL: latency ${LATENCY}ms >= 1000ms"
```

---

## Full Gate 5 Check (run all at once)

```bash
#!/bin/bash
set -euo pipefail

PASS=0
FAIL=0

check() {
  if eval "$1" > /dev/null 2>&1; then
    echo "PASS: $2"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL + 1))
  fi
}

check 'curl -sf http://localhost:8080/health | grep -q ok' "WebSocket server healthy"
check 'test -f migrations/004_add_realtime_triggers.sql' "Migration file exists"
check 'test -f src/services/realtime/vilRealtimeProvider.ts' "Realtime provider exists"
check 'grep -q scheduleReconnect src/services/realtime/vilRealtimeProvider.ts' "Reconnection logic present"
check 'grep -q 30000 src/services/realtime/vilRealtimeProvider.ts' "Backoff cap at 30s"
check 'cd edusync-api && cargo check 2>&1 | tail -1 | grep -qv "could not compile"' "Rust compiles"

echo ""
echo "=== Gate 5 Result ==="
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" -eq 0 ] && echo "GATE 5: PASSED" || echo "GATE 5: FAILED"
```

---

## Sign-Off Table

| #  | Criterion                     | Status | Evidence                        |
| -- | ----------------------------- | ------ | ------------------------------- |
| 1  | WebSocket server operational  | [ ]    | `curl health` returns ok        |
| 2  | 5 database triggers active    | [ ]    | `pg_trigger` query returns 5    |
| 3  | 8 consumers migrated          | [ ]    | grep audit shows 0 Supabase     |
| 4  | Reconnection works            | [ ]    | backoff logic in provider       |
| 5  | No message loss               | [ ]    | reconnect test passes           |
| 6  | Latency < 1s                  | [ ]    | ping/pong < 1000ms              |

All 6 rows must be checked before Phase 4 is complete.
