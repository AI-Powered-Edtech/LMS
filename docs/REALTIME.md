# EduSync — Realtime Architecture

## Overview

EduSync uses native WebSocket connections for real-time features. A single WebSocket connection per client is multiplexed across multiple named channels. The backend (`vilRealtimeProvider.ts`) handles reconnection, channel join/leave, broadcast, and presence tracking.

There is no Supabase Realtime in use.

## Connection

```
ws://localhost:8080/ws?token=<access_token>   (dev)
wss://api.edusync.id/ws?token=<access_token>  (prod, via nginx)
```

The JWT access token is passed as a query parameter. The server validates it before upgrading the connection.

nginx is configured with:

```nginx
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## Architecture

```
Client (browser)
│
│  One WebSocket connection
│  Multiple logical channels (multiplexed)
│
└─> VIL WebSocket Handler (ws_handler)
       │
       └─> RoomManager
              ├─> Room: notifications:{user_id}
              ├─> Room: builder:{course_id}
              ├─> Room: discussions:tenant:{tenant_id}
              ├─> Room: messages:{room_id}
              └─> Room: classroom:{class_id}
                     │
                     └─> pg_notify listener (start_pg_listener)
                            │  Listens on 5 PostgreSQL NOTIFY channels
                            └─> PostgreSQL 16
```

## Channel Patterns

| Channel                          | Type                 | Trigger                      | Use Case                     |
| -------------------------------- | -------------------- | ---------------------------- | ---------------------------- |
| `notifications:{user_id}`        | pg_notify            | DB INSERT on `notifications` | In-app notification delivery |
| `builder:{course_id}`            | broadcast + presence | Client action                | Collaborative course builder |
| `discussions:tenant:{tenant_id}` | pg_notify            | DB INSERT on `discussions`   | Forum activity               |
| `messages:{room_id}`             | broadcast            | Client action                | Direct/group chat            |
| `classroom:{class_id}`           | pg_notify            | DB events                    | Live classroom events        |

## Message Protocol

All messages are JSON. Client-to-server messages:

### Join a channel

```json
{ "type": "join", "channel": "notifications:uuid-user-id" }
```

### Leave a channel

```json
{ "type": "leave", "channel": "notifications:uuid-user-id" }
```

### Broadcast an event

```json
{
  "type": "broadcast",
  "channel": "builder:uuid-course-id",
  "event": "cursor-move",
  "payload": { "x": 120, "y": 45, "user_id": "..." }
}
```

### Presence track

```json
{
  "type": "track",
  "channel": "builder:uuid-course-id",
  "payload": { "user_id": "...", "name": "Budi", "avatar": "..." }
}
```

### Presence untrack

```json
{ "type": "untrack", "channel": "builder:uuid-course-id" }
```

### Ping (keepalive)

```json
{ "type": "ping" }
```

Server-to-client messages:

### Pong

```json
{ "type": "pong" }
```

### Broadcast event received

```json
{
  "type": "broadcast",
  "channel": "builder:uuid-course-id",
  "event": "cursor-move",
  "payload": { ... }
}
```

### Presence state

```json
{
  "type": "presence",
  "channel": "builder:uuid-course-id",
  "event": "sync",
  "payload": { "presences": [{ "user_id": "...", "name": "Budi" }] }
}
```

### Presence join/leave diff

```json
{
  "type": "presence",
  "channel": "builder:uuid-course-id",
  "event": "join",
  "payload": { "user_id": "...", "name": "Sari" }
}
```

### Server notification (pg_notify)

```json
{
  "type": "broadcast",
  "channel": "notifications:uuid-user-id",
  "event": "new_notification",
  "payload": { "title": "Tugas baru", "body": "..." }
}
```

## pg_notify Integration

The server runs a background PostgreSQL listener (`start_pg_listener`) that listens on 5 NOTIFY channels:

| PostgreSQL NOTIFY Channel | Routes to WebSocket Channel      |
| ------------------------- | -------------------------------- |
| `notifications`           | `notifications:{user_id}`        |
| `discussions`             | `discussions:tenant:{tenant_id}` |
| `classroom_events`        | `classroom:{class_id}`           |
| `course_builder`          | `builder:{course_id}`            |
| `messages`                | `messages:{room_id}`             |

Database triggers fire `NOTIFY` on relevant table changes. The listener receives the payload and routes it to the correct WebSocket room via the `RoomManager`.

## Reconnection

The client (`vilRealtimeProvider.ts`) handles disconnection automatically:

- **Max retries**: 10
- **Backoff base**: 1 000 ms
- **Backoff max**: 30 000 ms
- **Formula**: `min(base * 2^attempt, max)` with jitter
- On reconnect, the client automatically rejoins all previously joined channels

## Frontend Usage

### Provider selection

Set `VITE_REALTIME_BACKEND=vil` (default). The factory in `src/services/realtime/index.ts` returns `VilRealtimeProvider`.

### WebSocket URL

Configured via `VITE_WS_URL` env var. Defaults to `ws://localhost:8080/ws`.

### Example: subscribe to notifications

```tsx
import { db } from '@/services/db'

const channel = db.channel(`notifications:${user.id}`)

channel
  .on('broadcast', { event: 'new_notification' }, (payload) => {
    console.log('New notification:', payload)
  })
  .subscribe()

// Cleanup:
return () => db.removeChannel(channel)
```

### Example: presence in course builder

```tsx
const channel = db.channel(`builder:${courseId}`)

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setCollaborators(Object.values(state).flat())
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: user.id, name: profile.full_name })
    }
  })
```

## Environment Variables

| Variable                | Default                  | Description                 |
| ----------------------- | ------------------------ | --------------------------- |
| `VITE_WS_URL`           | `ws://localhost:8080/ws` | WebSocket endpoint URL      |
| `VITE_REALTIME_BACKEND` | `vil`                    | Realtime provider selection |
