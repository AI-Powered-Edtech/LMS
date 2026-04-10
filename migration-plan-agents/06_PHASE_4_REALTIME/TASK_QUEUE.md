# TASK QUEUE -- Phase 4: Realtime Migration

**Weeks 53-60 | ~120 hours**

## Rules for Agents

1. Do NOT edit files outside the scope of your task.
2. Do NOT use `npm` or `yarn`. Rust workspace uses `cargo`, frontend uses `pnpm`.
3. Run the verify command after every task.
4. Do NOT edit `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`.
5. Do NOT make new architecture decisions -- everything is locked in this plan.
6. If you hit unexpected coupling, mark yourself BLOCKED. Do not improvise.
7. Commit before starting each task: `git add -A && git commit -m "checkpoint: before task 4X-XX"`. If verify fails: `git stash` or `git checkout -- <files>`.

## Effort Estimate

| Wave | Tasks                    | Hours | Parallelism |
| ---- | ------------------------ | ----- | ----------- |
| 4A   | WebSocket Server Setup   | 25-30 | Serial      |
| 4B   | 8 Realtime Consumers     | 70-80 | Parallel    |
| 4C   | Verification             | 15-20 | Serial      |

## Dependency Map

```
4A-0: Planning doc (BLOCKING)
  |
  +-- 4A-1: vil_ws WebSocket handler (Rust)
  |     |
  |     +-- 4A-2: pg_notify forwarder (Rust)
  |     |
  |     +-- 4A-3: DB triggers (SQL migration)
  |     |
  |     +-- 4A-4: Client reconnection (TypeScript)
  |
  +-- (after 4A-1 + 4A-3 + 4A-4 all done)
        |
        +-- 4B-1 through 4B-8 (PARALLEL)
              |
              +-- 4C-0: Full verification
```

---

## Wave 4A: WebSocket Server

### Task 4A-0: Architecture Document

```
TASK ID:    4A-0
OWNER:      Backend Agent
GOAL:       Write realtime architecture doc listing all channels, patterns, loss tolerance
CREATES:    docs/REALTIME_ARCHITECTURE.md
DEPENDENCY: Phase 3 complete
```

**Steps:**

1. List every realtime channel used in the app (see 8-file table in README.md).
2. Map each to its Supabase pattern (postgres_changes, broadcast, presence).
3. Document message-loss tolerance per channel.
4. Define reconnection requirements.

**Verify:**

```bash
test -f docs/REALTIME_ARCHITECTURE.md && wc -l docs/REALTIME_ARCHITECTURE.md | awk '{print ($1 > 50) ? "PASS" : "FAIL: file too short"}'
```

---

### Task 4A-1: WebSocket Handler (Rust/Axum)

```
TASK ID:    4A-1
OWNER:      Rust CLI Agent
GOAL:       Create WebSocket upgrade endpoint with room support and presence
CREATES:    edusync-api/crates/api-server/src/realtime/mod.rs
            edusync-api/crates/api-server/src/realtime/handler.rs
            edusync-api/crates/api-server/src/realtime/room.rs
DEPENDENCY: 4A-0
```

**Reference implementation -- WebSocket handler skeleton:**

```rust
// edusync-api/crates/api-server/src/realtime/handler.rs
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;

pub struct AppState {
    pub tx: broadcast::Sender<String>,
}

pub fn realtime_router() -> Router<Arc<AppState>> {
    Router::new().route("/ws", get(ws_handler))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();

    let (mut sender, mut receiver) = socket.split();

    // Forward broadcast messages to this client
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Read messages from client, broadcast to others
    while let Some(Ok(Message::Text(text))) = receiver.next().await {
        let _ = state.tx.send(text);
    }

    send_task.abort();
}
```

**Reference implementation -- room module skeleton:**

```rust
// edusync-api/crates/api-server/src/realtime/room.rs
use std::collections::{HashMap, HashSet};
use tokio::sync::RwLock;

pub type RoomId = String;
pub type UserId = String;

pub struct RoomManager {
    rooms: RwLock<HashMap<RoomId, HashSet<UserId>>>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: RwLock::new(HashMap::new()),
        }
    }

    pub async fn join(&self, room: &str, user: &str) {
        let mut rooms = self.rooms.write().await;
        rooms
            .entry(room.to_string())
            .or_default()
            .insert(user.to_string());
    }

    pub async fn leave(&self, room: &str, user: &str) {
        let mut rooms = self.rooms.write().await;
        if let Some(members) = rooms.get_mut(room) {
            members.remove(user);
            if members.is_empty() {
                rooms.remove(room);
            }
        }
    }

    pub async fn members(&self, room: &str) -> Vec<String> {
        let rooms = self.rooms.read().await;
        rooms
            .get(room)
            .map(|m| m.iter().cloned().collect())
            .unwrap_or_default()
    }
}
```

**Verify:**

```bash
cd edusync-api && cargo check 2>&1 | tail -1 | grep -q "could not compile" && echo "FAIL" || echo "PASS"
cd edusync-api && cargo clippy -- -D warnings 2>&1 | tail -1 | grep -q "error" && echo "FAIL" || echo "PASS"
```

---

### Task 4A-2: pg_notify Forwarder (Rust)

```
TASK ID:    4A-2
OWNER:      Rust CLI Agent
GOAL:       Listen to PostgreSQL NOTIFY channels and forward events to WebSocket rooms
CREATES:    edusync-api/crates/api-server/src/realtime/pg_notify.rs
DEPENDENCY: 4A-1
```

**Reference implementation:**

```rust
// edusync-api/crates/api-server/src/realtime/pg_notify.rs
use sqlx::postgres::PgListener;
use tokio::sync::broadcast;

pub async fn listen_pg_notify(
    database_url: &str,
    tx: broadcast::Sender<String>,
) -> Result<(), sqlx::Error> {
    let mut listener = PgListener::connect(database_url).await?;

    // Subscribe to all application channels
    listener.listen("table_changes").await?;

    loop {
        let notification = listener.recv().await?;
        let payload = notification.payload().to_string();
        // Broadcast to all connected WebSocket clients
        // The client filters by tenant_id + table name
        let _ = tx.send(payload);
    }
}
```

**Verify:**

```bash
cd edusync-api && cargo check 2>&1 | tail -1 | grep -q "could not compile" && echo "FAIL" || echo "PASS"
grep -q "PgListener" edusync-api/crates/api-server/src/realtime/pg_notify.rs && echo "PASS" || echo "FAIL"
```

---

### Task 4A-3: Database Triggers (SQL Migration)

```
TASK ID:    4A-3
OWNER:      Backend Agent
GOAL:       Create pg_notify triggers on 5 tables
CREATES:    migrations/004_add_realtime_triggers.sql
DEPENDENCY: 4A-2
```

**Exact SQL to use:**

```sql
-- migrations/004_add_realtime_triggers.sql
-- Realtime triggers: fire pg_notify on INSERT/UPDATE for tables that need live updates

CREATE OR REPLACE FUNCTION notify_table_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('table_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'tenant_id', NEW.tenant_id,
    'id', NEW.id
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. notifications
CREATE TRIGGER notifications_change
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- 2. messages
CREATE TRIGGER messages_change
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- 3. discussion_posts
CREATE TRIGGER discussion_posts_change
  AFTER INSERT OR UPDATE ON discussion_posts
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- 4. classroom_activities
CREATE TRIGGER classroom_activities_change
  AFTER INSERT OR UPDATE ON classroom_activities
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- 5. courses (for collaborative builder)
CREATE TRIGGER courses_change
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();
```

**Verify:**

```bash
# Check migration file exists and has all 5 triggers
test -f migrations/004_add_realtime_triggers.sql && echo "PASS: file exists" || echo "FAIL: file missing"
grep -c "CREATE TRIGGER" migrations/004_add_realtime_triggers.sql | xargs -I{} bash -c '[ {} -eq 5 ] && echo "PASS: 5 triggers" || echo "FAIL: expected 5 triggers, got {}"'
```

---

### Task 4A-4: Client Reconnection (TypeScript)

```
TASK ID:    4A-4
OWNER:      Frontend Agent
GOAL:       Implement WebSocket client with exponential backoff reconnection
CREATES:    src/services/realtime/vilRealtimeProvider.ts
DEPENDENCY: 4A-1
```

**Exact TypeScript to use:**

```typescript
// src/services/realtime/vilRealtimeProvider.ts

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeMessage {
  type: 'subscribe' | 'unsubscribe' | 'broadcast' | 'presence' | 'pong';
  channel?: string;
  payload?: unknown;
}

type MessageHandler = (msg: RealtimeMessage) => void;

export class VilRealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private retryCount = 0;
  private maxRetries = 10;
  private maxDelay = 30000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private state: ConnectionState = 'disconnected';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.setState('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.setState('connected');
      this.reconnectDelay = 1000;
      this.retryCount = 0;
    };

    this.ws.onmessage = (event) => {
      const msg: RealtimeMessage = JSON.parse(event.data);
      const channelHandlers = this.handlers.get(msg.channel ?? '__global');
      if (channelHandlers) {
        channelHandlers.forEach((handler) => handler(msg));
      }
    };

    this.ws.onclose = () => {
      this.setState('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      return;
    }
    this.retryCount++;
    this.setState('reconnecting');
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
    this.send({ type: 'subscribe', channel });

    return () => {
      this.handlers.get(channel)?.delete(handler);
      if (this.handlers.get(channel)?.size === 0) {
        this.handlers.delete(channel);
        this.send({ type: 'unsubscribe', channel });
      }
    };
  }

  send(msg: RealtimeMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getState(): ConnectionState {
    return this.state;
  }

  disconnect(): void {
    this.maxRetries = 0; // prevent reconnect
    this.ws?.close();
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}
```

**Verify:**

```bash
test -f src/services/realtime/vilRealtimeProvider.ts && echo "PASS: file exists" || echo "FAIL: file missing"
grep -q "scheduleReconnect" src/services/realtime/vilRealtimeProvider.ts && echo "PASS: reconnect logic" || echo "FAIL: no reconnect"
grep -q "Math.min" src/services/realtime/vilRealtimeProvider.ts && echo "PASS: backoff cap" || echo "FAIL: no backoff cap"
```

---

## Wave 4B: Migrate 8 Realtime Consumers

All 4B tasks depend on 4A-1 + 4A-3 + 4A-4 being complete. All 4B tasks can run in parallel.

### Task 4B-1: useBuilderChannel.ts (Broadcast + Presence)

```
TASK ID:    4B-1
OWNER:      Frontend Agent
GOAL:       Replace Supabase channel().send() and track() with VilRealtimeClient
EDITS:      src/features/course-builder/useBuilderChannel.ts
DEPENDENCY: 4A-1, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
const channel = supabase.channel('builder:' + courseId);
channel.on('broadcast', { event: 'update' }, handler);
channel.subscribe();
channel.track({ user_id, name });
```

With:
```typescript
// NEW: VIL
import { vilRealtime } from '@/services/realtime/vilRealtimeProvider';

const unsubscribe = vilRealtime.subscribe('builder:' + courseId, (msg) => {
  if (msg.type === 'broadcast') handler(msg.payload);
  if (msg.type === 'presence') presenceHandler(msg.payload);
});
```

**Verify:**

```bash
grep -q "supabase" src/features/course-builder/useBuilderChannel.ts && echo "FAIL: still uses supabase" || echo "PASS"
grep -q "vilRealtime\|VilRealtimeClient" src/features/course-builder/useBuilderChannel.ts && echo "PASS: uses VIL" || echo "FAIL"
```

---

### Task 4B-2: useBuilderPresence.ts (Presence)

```
TASK ID:    4B-2
OWNER:      Frontend Agent
GOAL:       Replace Supabase presence tracking with VIL presence
EDITS:      src/features/course-builder/useBuilderPresence.ts
DEPENDENCY: 4A-1, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
});
channel.track({ user_id, name, color });
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('presence:builder:' + courseId, (msg) => {
  if (msg.type === 'presence') setPresenceState(msg.payload);
});
vilRealtime.send({ type: 'presence', channel: 'presence:builder:' + courseId, payload: { user_id, name, color } });
```

**Verify:**

```bash
grep -q "supabase" src/features/course-builder/useBuilderPresence.ts && echo "FAIL: still uses supabase" || echo "PASS"
grep -q "vilRealtime\|VilRealtimeClient" src/features/course-builder/useBuilderPresence.ts && echo "PASS: uses VIL" || echo "FAIL"
```

---

### Task 4B-3: useNotifications.ts (pg_notify)

```
TASK ID:    4B-3
OWNER:      Frontend Agent
GOAL:       Replace Supabase postgres_changes with pg_notify via WebSocket
EDITS:      src/features/notifications/hooks/useNotifications.ts
DEPENDENCY: 4A-3, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
supabase.channel('notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, handler)
  .subscribe();
```

With:
```typescript
// NEW: VIL -- server forwards pg_notify('table_changes') events
const unsubscribe = vilRealtime.subscribe('table_changes', (msg) => {
  const payload = msg.payload as { table: string; op: string; tenant_id: string; id: string };
  if (payload.table === 'notifications' && payload.tenant_id === tenantId) {
    refetchNotifications();
  }
});
```

**Verify:**

```bash
grep -q "postgres_changes" src/features/notifications/hooks/useNotifications.ts && echo "FAIL: still uses postgres_changes" || echo "PASS"
grep -q "table_changes" src/features/notifications/hooks/useNotifications.ts && echo "PASS: uses pg_notify" || echo "FAIL"
```

---

### Task 4B-4: useAdminNotifications.ts (pg_notify)

```
TASK ID:    4B-4
OWNER:      Frontend Agent
GOAL:       Replace Supabase postgres_changes with pg_notify via WebSocket
EDITS:      src/features/notifications/hooks/useAdminNotifications.ts
DEPENDENCY: 4A-3, 4A-4
```

**Migration pattern:** Same as 4B-3, but filter for admin-relevant notification types.

Replace:
```typescript
// OLD: Supabase
supabase.channel('admin-notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, handler)
  .subscribe();
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('table_changes', (msg) => {
  const payload = msg.payload as { table: string; op: string; tenant_id: string; id: string };
  if (payload.table === 'notifications' && payload.tenant_id === tenantId) {
    refetchAdminNotifications();
  }
});
```

**Verify:**

```bash
grep -q "postgres_changes" src/features/notifications/hooks/useAdminNotifications.ts && echo "FAIL: still uses postgres_changes" || echo "PASS"
grep -q "table_changes" src/features/notifications/hooks/useAdminNotifications.ts && echo "PASS: uses pg_notify" || echo "FAIL"
```

---

### Task 4B-5: discussionQueries.ts (pg_notify)

```
TASK ID:    4B-5
OWNER:      Frontend Agent
GOAL:       Replace Supabase postgres_changes with pg_notify for discussion posts
EDITS:      src/features/discussions/queries/discussionQueries.ts
DEPENDENCY: 4A-3, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
supabase.channel('discussions')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discussion_posts' }, handler)
  .subscribe();
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('table_changes', (msg) => {
  const payload = msg.payload as { table: string; op: string; tenant_id: string; id: string };
  if (payload.table === 'discussion_posts' && payload.tenant_id === tenantId) {
    refetchDiscussions();
  }
});
```

**Verify:**

```bash
grep -q "postgres_changes" src/features/discussions/queries/discussionQueries.ts && echo "FAIL: still uses postgres_changes" || echo "PASS"
grep -q "table_changes" src/features/discussions/queries/discussionQueries.ts && echo "PASS: uses pg_notify" || echo "FAIL"
```

---

### Task 4B-6: useMessages.ts (Broadcast)

```
TASK ID:    4B-6
OWNER:      Frontend Agent
GOAL:       Replace Supabase channel broadcast with VIL broadcast
EDITS:      src/features/parent/hooks/useMessages.ts
DEPENDENCY: 4A-1, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
const channel = supabase.channel('messages:' + threadId);
channel.on('broadcast', { event: 'new_message' }, handler);
channel.subscribe();
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('messages:' + threadId, (msg) => {
  if (msg.type === 'broadcast') handleNewMessage(msg.payload);
});
```

**Verify:**

```bash
grep -q "supabase" src/features/parent/hooks/useMessages.ts && echo "FAIL: still uses supabase" || echo "PASS"
grep -q "vilRealtime\|VilRealtimeClient" src/features/parent/hooks/useMessages.ts && echo "PASS: uses VIL" || echo "FAIL"
```

---

### Task 4B-7: classroomService.ts (pg_notify)

```
TASK ID:    4B-7
OWNER:      Frontend Agent
GOAL:       Replace Supabase channel with pg_notify for classroom activity updates
EDITS:      src/features/classroom/api/classroomService.ts
DEPENDENCY: 4A-3, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
supabase.channel('classroom')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_activities' }, handler)
  .subscribe();
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('table_changes', (msg) => {
  const payload = msg.payload as { table: string; op: string; tenant_id: string; id: string };
  if (payload.table === 'classroom_activities' && payload.tenant_id === tenantId) {
    refetchClassroom();
  }
});
```

**Verify:**

```bash
grep -q "postgres_changes" src/features/classroom/api/classroomService.ts && echo "FAIL: still uses postgres_changes" || echo "PASS"
grep -q "table_changes" src/features/classroom/api/classroomService.ts && echo "PASS: uses pg_notify" || echo "FAIL"
```

---

### Task 4B-8: groupAssignmentService.ts (Broadcast)

```
TASK ID:    4B-8
OWNER:      Frontend Agent
GOAL:       Replace Supabase channel broadcast with VIL broadcast
EDITS:      src/features/assignments/api/groupAssignmentService.ts
DEPENDENCY: 4A-1, 4A-4
```

**Migration pattern:**

Replace:
```typescript
// OLD: Supabase
const channel = supabase.channel('group:' + groupId);
channel.on('broadcast', { event: 'update' }, handler);
channel.subscribe();
```

With:
```typescript
// NEW: VIL
const unsubscribe = vilRealtime.subscribe('group:' + groupId, (msg) => {
  if (msg.type === 'broadcast') handleGroupUpdate(msg.payload);
});
```

**Verify:**

```bash
grep -q "supabase" src/features/assignments/api/groupAssignmentService.ts && echo "FAIL: still uses supabase" || echo "PASS"
grep -q "vilRealtime\|VilRealtimeClient" src/features/assignments/api/groupAssignmentService.ts && echo "PASS: uses VIL" || echo "FAIL"
```

---

## Wave 4C: Verification

### Task 4C-0: Full Realtime Verification

```
TASK ID:    4C-0
OWNER:      QA Agent
GOAL:       Verify all realtime features work end-to-end
EDITS:      None (read-only verification)
DEPENDENCY: 4B-1 through 4B-8
```

**Run these commands in order:**

```bash
# 1. WebSocket server health
curl -sf http://localhost:8080/health | grep -q "ok" && echo "PASS: server healthy" || echo "FAIL: server down"

# 2. All 5 triggers exist
TRIGGER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_trigger WHERE tgname IN ('notifications_change','messages_change','discussion_posts_change','classroom_activities_change','courses_change')")
[ "$(echo $TRIGGER_COUNT | tr -d ' ')" -eq 5 ] && echo "PASS: 5 triggers" || echo "FAIL: expected 5 triggers, got $TRIGGER_COUNT"

# 3. No consumer still imports supabase realtime
SUPA_COUNT=$(grep -rl "postgres_changes\|supabase\.channel\|\.on('broadcast'" \
  src/features/course-builder/useBuilderChannel.ts \
  src/features/course-builder/useBuilderPresence.ts \
  src/features/notifications/hooks/useNotifications.ts \
  src/features/notifications/hooks/useAdminNotifications.ts \
  src/features/discussions/queries/discussionQueries.ts \
  src/features/parent/hooks/useMessages.ts \
  src/features/classroom/api/classroomService.ts \
  src/features/assignments/api/groupAssignmentService.ts \
  2>/dev/null | wc -l)
[ "$SUPA_COUNT" -eq 0 ] && echo "PASS: no supabase realtime imports" || echo "FAIL: $SUPA_COUNT files still use supabase"

# 4. All consumers reference VIL
VIL_COUNT=$(grep -rl "vilRealtime\|VilRealtimeClient" \
  src/features/course-builder/useBuilderChannel.ts \
  src/features/course-builder/useBuilderPresence.ts \
  src/features/notifications/hooks/useNotifications.ts \
  src/features/notifications/hooks/useAdminNotifications.ts \
  src/features/discussions/queries/discussionQueries.ts \
  src/features/parent/hooks/useMessages.ts \
  src/features/classroom/api/classroomService.ts \
  src/features/assignments/api/groupAssignmentService.ts \
  2>/dev/null | wc -l)
[ "$VIL_COUNT" -eq 8 ] && echo "PASS: all 8 consumers use VIL" || echo "FAIL: only $VIL_COUNT of 8 use VIL"

# 5. Reconnection provider exists with backoff
grep -q "scheduleReconnect" src/services/realtime/vilRealtimeProvider.ts && echo "PASS: reconnect logic" || echo "FAIL: no reconnect"

# 6. WebSocket connects (requires wscat: npm i -g wscat)
echo '{"type":"ping"}' | timeout 5 wscat -c ws://localhost:8080/ws 2>/dev/null | grep -q "pong" && echo "PASS: ws ping/pong" || echo "FAIL: ws not responding"
```

**Gate 5 sign-off:** All 6 checks must print PASS.

---

## Output Deliverables

After Phase 4 is complete:

- [ ] WebSocket server running with vil_ws
- [ ] pg_notify forwarding working (5 triggers active)
- [ ] All 8 realtime consumers migrated to VIL
- [ ] Reconnection with exponential backoff implemented
- [ ] Gate 5: PASSED

## Rollback

If realtime issues occur:

1. Set `VITE_REALTIME_BACKEND=supabase` in `.env`
2. Restart frontend: `pnpm dev`
3. Verify notifications and messaging work via Supabase
4. No data loss -- Supabase Realtime channels remain unchanged
