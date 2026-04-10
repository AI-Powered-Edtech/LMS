# Agent Task Queue — Phase 4

<aside>
🤖

**Untuk AI Coding Agents.** Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Task harus dikerjakan **berurutan** dalam wave (ada dependency). Setiap task punya:

- **Input:** File yang harus dibaca dulu
- **Output:** File yang harus dibuat/diubah
- **Code:** Kode lengkap siap copas
- **Verify:** Command untuk verifikasi
</aside>

<aside>
📋

**Source of Truth:**

- Spec 3 §1.4 — Realtime Event Fanout (channel definitions, delivery semantics)
- Spec 4 §8 — `vil_trigger_cdc` vs `pg_notify` decision per channel
- Phase 4-6 Detail — WebSocket architecture, pg_notify triggers, reconnection
- Agent Bootstrap Context §6 — VIL WebSocket (`vil_ws`) API reference
- Multi-Agent Execution Model — task format & parallelism rules
</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `pnpm typecheck && pnpm lint` setelah setiap task
6. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
7. **Backend Rust:** `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap task
8. **pg_notify** untuk ephemeral channels (notifications, discussions, classroom)
9. **vil_trigger_cdc** untuk durable channels (builder content updates, parent-teacher messaging)
10. **Builder presence** = ephemeral (pg_notify OK) — tapi **builder content updates** = durable
11. **Builder channel split WARNING:** Existing Supabase code uses ONE channel (`builder:{course_id}`) for both presence AND content. VIL splits into TWO rooms: `builder_presence` (ephemeral) and `builder_content` (durable). Tasks 4B-10A/B + 4B-11 MUST be tested together with 2+ users doing simultaneous content editing + cursor tracking. If existing `useBuilderChannel.ts` interleaves presence with content in a single subscription, the split must be carefully state-managed.
12. **Table name verification:** Before running ANY SQL trigger migration, verify actual table names via `\dt *table_pattern*` in psql. Known ambiguities: `discussion_comments` vs `discussion_posts`, `attendance_records` vs `attendance`, `group_assignment_submissions` vs alternatives. Do NOT assume — check.
13. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 4X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>` untuk revert. JANGAN lanjut dengan state setengah jadi.
14. **🛠️ VilError import (Gap #4):** Gunakan `AppError` custom type dari `crates/middleware/src/errors.rs` (Phase 1A-5). JANGAN assume `vil_server::prelude::VilError` ada — VIL mungkin tidak export type ini. Semua handler Phase 4 harus `use crate::middleware::AppError;` bukan `VilError`.
15. **🛠️ Nginx WebSocket route (Gap #5):** Task 4A-5b (BARU) wajib update `nginx.conf` dengan WebSocket upgrade route. Lihat task di bawah.
16. **🛠️ Supabase Realtime disable (Gap #7):** Sebelum enable VIL WebSocket per-channel, HARUS disable Supabase Realtime subscription di frontend untuk channel tersebut. Update `RealtimeProvider` di `src/services/realtime/` untuk skip Supabase channel jika VIL aktif.

---

## Canonical AppState Schema (Phase 1–6)

<aside>
📐

**Setiap phase menambahkan field ke AppState. Ini adalah definisi kanonik yang harus di-maintain. Agent WAJIB baca ini sebelum mengubah `main.rs`.**

</aside>

```rust
// edusync-api/crates/api-server/src/state.rs — CANONICAL AppState
// Updated per-phase. Agent harus CHECK struct ini sebelum menambah field.
#[derive(Clone)]
pub struct AppState {
    // Phase 1A: Scaffold
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    // Phase 1B: Auth
    pub groq_api_key: Option<String>,
    // Phase 3B: LTI
    pub lti_key_pair: Option<Arc<LtiKeyPair>>,
    // Phase 3C: Notifications
    pub email_client: Option<Arc<EmailClient>>,
    pub whatsapp_client: Option<Arc<WhatsAppClient>>,
    pub whatsapp_verify_token: Option<String>,
    // Phase 4A: WebSocket
    pub ws_hub: Arc<WsHub>,
    // Phase 5: Storage
    pub storage_client: Option<Arc<S3Client>>,
}
```

**Rule:** Jangan tambah field tanpa update comment phase-nya. Jika struct melebihi 12 fields, refactor ke nested config structs.

---

## Channel → Delivery Decision Matrix

| **Channel**                      | **Mechanism**   | **Rationale**                                  | **Message Loss OK?** |
| -------------------------------- | --------------- | ---------------------------------------------- | -------------------- |
| `notifications:{user_id}`        | pg_notify       | Ephemeral — UI polling fallback exists         | ✅ Yes               |
| `discussion:{thread_id}`         | pg_notify       | Ephemeral — query refetch on reconnect         | ✅ Yes               |
| `classroom:{class_id}`           | pg_notify       | Ephemeral — state always re-fetched            | ✅ Yes               |
| `builder:{course_id}` (presence) | pg_notify       | Ephemeral — cursor/presence data is transient  | ✅ Yes               |
| `builder:{course_id}` (content)  | vil_trigger_cdc | Durable — content changes must not be lost     | ❌ No                |
| `messaging:{thread_id}`          | vil_trigger_cdc | Durable — parent-teacher messages are critical | ❌ No                |
| `group_assignment:{id}`          | pg_notify       | Ephemeral — state re-fetched on reconnect      | ✅ Yes               |

---

# Wave 4A — WebSocket Server (Minggu 53-55)

---

## Task 4A-1: WebSocket Types & Room Abstractions

**TASK ID:** 4A-1

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Definisikan semua types untuk WebSocket rooms, events, dan messages di EduSync VIL server.

**DEPENDENCY:** Phase 1A scaffold selesai (VilApp running, DB connected)

**READ FIRST:**

- `edusync-api/crates/api-server/src/main.rs` (existing VilApp setup)
- Agent Bootstrap Context §6 (vil_ws reference)
- Spec 3 §1.4 (Realtime Event Fanout table)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/mod.rs` (BUAT BARU)
- `edusync-api/crates/api-server/src/websocket/types.rs` (BUAT BARU)

**DO NOT TOUCH:**

- `edusync-api/crates/api-server/src/main.rs`
- Any frontend files

**IMPLEMENTATION STEPS:**

1. Buat folder `edusync-api/crates/api-server/src/websocket/`
2. Buat `mod.rs` dengan module declarations
3. Buat `types.rs` dengan semua room types, event enums, message structs

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/mod.rs
pub mod types;
pub mod hub;
pub mod handler;
pub mod pg_listener;
pub mod auth;

pub use types::*;
pub use hub::WsHub;
pub use handler::ws_upgrade_handler;
```

```rust
// edusync-api/crates/api-server/src/websocket/types.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Room types for EduSync — maps to Spec 3 §1.4
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum RoomId {
    /// Notification channel per user (pg_notify — ephemeral)
    Notifications { tenant_id: Uuid, user_id: Uuid },
    /// Discussion thread updates (pg_notify — ephemeral)
    Discussion { tenant_id: Uuid, thread_id: Uuid },
    /// Classroom live updates (pg_notify — ephemeral)
    Classroom { tenant_id: Uuid, class_id: Uuid },
    /// Builder presence: cursor, who's online (pg_notify — ephemeral)
    BuilderPresence { tenant_id: Uuid, course_id: Uuid },
    /// Builder content updates (vil_trigger_cdc — durable)
    BuilderContent { tenant_id: Uuid, course_id: Uuid },
    /// Parent-teacher messaging (vil_trigger_cdc — durable)
    Messaging { tenant_id: Uuid, thread_id: Uuid },
    /// Group assignment collaboration (pg_notify — ephemeral)
    GroupAssignment { tenant_id: Uuid, assignment_id: Uuid },
}

impl RoomId {
    /// Parse room ID from client subscription request
    /// Format: "type:tenant_id:entity_id"
    pub fn from_subscription(room_type: &str, tenant_id: Uuid, entity_id: Uuid) -> Result<Self, String> {
        match room_type {
            "notifications" => Ok(Self::Notifications { tenant_id, user_id: entity_id }),
            "discussion" => Ok(Self::Discussion { tenant_id, thread_id: entity_id }),
            "classroom" => Ok(Self::Classroom { tenant_id, class_id: entity_id }),
            "builder_presence" => Ok(Self::BuilderPresence { tenant_id, course_id: entity_id }),
            "builder_content" => Ok(Self::BuilderContent { tenant_id, course_id: entity_id }),
            "messaging" => Ok(Self::Messaging { tenant_id, thread_id: entity_id }),
            "group_assignment" => Ok(Self::GroupAssignment { tenant_id, assignment_id: entity_id }),
            _ => Err(format!("Unknown room type: {}", room_type)),
        }
    }

    /// Get the string key for this room (used in WsHub HashMap)
    pub fn key(&self) -> String {
        match self {
            Self::Notifications { tenant_id, user_id } =>
                format!("notifications:{}:{}", tenant_id, user_id),
            Self::Discussion { tenant_id, thread_id } =>
                format!("discussion:{}:{}", tenant_id, thread_id),
            Self::Classroom { tenant_id, class_id } =>
                format!("classroom:{}:{}", tenant_id, class_id),
            Self::BuilderPresence { tenant_id, course_id } =>
                format!("builder_presence:{}:{}", tenant_id, course_id),
            Self::BuilderContent { tenant_id, course_id } =>
                format!("builder_content:{}:{}", tenant_id, course_id),
            Self::Messaging { tenant_id, thread_id } =>
                format!("messaging:{}:{}", tenant_id, thread_id),
            Self::GroupAssignment { tenant_id, assignment_id } =>
                format!("group_assignment:{}:{}", tenant_id, assignment_id),
        }
    }

    /// Check if this room belongs to a given tenant
    pub fn belongs_to_tenant(&self, tid: Uuid) -> bool {
        match self {
            Self::Notifications { tenant_id, .. }
            | Self::Discussion { tenant_id, .. }
            | Self::Classroom { tenant_id, .. }
            | Self::BuilderPresence { tenant_id, .. }
            | Self::BuilderContent { tenant_id, .. }
            | Self::Messaging { tenant_id, .. }
            | Self::GroupAssignment { tenant_id, .. } => *tenant_id == tid,
        }
    }

    /// Returns true if this channel uses durable delivery (vil_trigger_cdc)
    pub fn is_durable(&self) -> bool {
        matches!(self, Self::BuilderContent { .. } | Self::Messaging { .. })
    }
}

/// Authenticated WebSocket user (extracted from JWT during handshake)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsUser {
    pub user_id: Uuid,
    pub email: String,
    pub tenant_id: Uuid,
    pub roles: Vec<String>,
    pub display_name: String,
}

/// Client → Server messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    /// Subscribe to a room
    #[serde(rename = "subscribe")]
    Subscribe {
        room_type: String,
        entity_id: Uuid,
    },
    /// Unsubscribe from a room
    #[serde(rename = "unsubscribe")]
    Unsubscribe {
        room_type: String,
        entity_id: Uuid,
    },
    /// Broadcast a message to a room
    #[serde(rename = "broadcast")]
    Broadcast {
        room_type: String,
        entity_id: Uuid,
        event: String,
        payload: serde_json::Value,
    },
    /// Track presence in a room
    #[serde(rename = "track")]
    Track {
        room_type: String,
        entity_id: Uuid,
        state: serde_json::Value,
    },
    /// Untrack presence
    #[serde(rename = "untrack")]
    Untrack {
        room_type: String,
        entity_id: Uuid,
    },
    /// Ping (keep-alive)
    #[serde(rename = "ping")]
    Ping,
}

/// Server → Client messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    /// Subscription confirmed
    #[serde(rename = "subscribed")]
    Subscribed { room: String },
    /// Unsubscription confirmed
    #[serde(rename = "unsubscribed")]
    Unsubscribed { room: String },
    /// Broadcast event from a room
    #[serde(rename = "event")]
    Event {
        room: String,
        event: String,
        payload: serde_json::Value,
    },
    /// Presence diff (joins, leaves, updates)
    #[serde(rename = "presence_diff")]
    PresenceDiff {
        room: String,
        joins: Vec<PresenceEntry>,
        leaves: Vec<Uuid>,
    },
    /// Full presence state (sent on subscribe)
    #[serde(rename = "presence_state")]
    PresenceState {
        room: String,
        entries: Vec<PresenceEntry>,
    },
    /// Pong (keep-alive response)
    #[serde(rename = "pong")]
    Pong,
    /// Error message
    #[serde(rename = "error")]
    Error {
        message: String,
        code: String,
    },
}

/// Presence entry for a user in a room
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceEntry {
    pub user_id: Uuid,
    pub display_name: String,
    pub state: serde_json::Value,
    pub joined_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,  // Updated on track() — useful for presence staleness detection
}

/// Builder-specific events (subset of Broadcast payloads)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event")]
pub enum BuilderEvent {
    #[serde(rename = "cursor_move")]
    CursorMove {
        user_id: Uuid,
        position: CursorPosition,
    },
    #[serde(rename = "content_update")]
    ContentUpdate {
        user_id: Uuid,
        module_id: Uuid,
        changes: serde_json::Value,
    },
    #[serde(rename = "user_joined")]
    UserJoined {
        user_id: Uuid,
        display_name: String,
    },
    #[serde(rename = "user_left")]
    UserLeft {
        user_id: Uuid,
    },
}

/// Cursor position in the course builder
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub module_id: Option<Uuid>,
    pub block_id: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

/// pg_notify payload shape (from PostgreSQL triggers)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgNotifyPayload {
    pub table: String,
    pub action: String,  // INSERT, UPDATE, DELETE
    pub tenant_id: Uuid,
    pub entity_id: Uuid, // user_id, thread_id, class_id, etc.
    pub data: serde_json::Value,
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- `RoomId` enum tidak bisa cover semua 7 channel dari Spec 3 §1.4
- `serde` tag-based deserialization gagal compile

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-2: WsHub — Room Registry & Broadcast Manager

**TASK ID:** 4A-2

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Implement WsHub: manages WebSocket connections, room subscriptions, presence tracking, and message broadcast.

**DEPENDENCY:** Task 4A-1

**READ FIRST:**

- `edusync-api/crates/api-server/src/websocket/types.rs` (dari 4A-1)
- Agent Bootstrap Context §6 (WsHub reference)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/hub.rs` (BUAT BARU)

**DO NOT TOUCH:**

- `edusync-api/crates/api-server/src/websocket/types.rs`
- Any frontend files

**IMPLEMENTATION STEPS:**

1. Buat `hub.rs` dengan WsHub struct
2. Implement room management: join, leave, broadcast
3. Implement presence tracking per room
4. Use `tokio::sync::broadcast` for room channels
5. Use `DashMap` for concurrent room registry

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/hub.rs
use std::sync::Arc;
use std::collections::HashMap;
use dashmap::DashMap;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;
use chrono::Utc;

use super::types::*;

const BROADCAST_CAPACITY: usize = 256;

/// Room state: tracks subscriptions and presence
struct RoomState {
    /// Broadcast sender for this room
    sender: broadcast::Sender<ServerMessage>,
    /// Current presence entries (user_id → PresenceEntry)
    presence: HashMap<Uuid, PresenceEntry>,
}

/// WebSocket Hub — manages all rooms and connections
pub struct WsHub {
    /// Room key → RoomState
    rooms: DashMap<String, Arc<RwLock<RoomState>>>,
    /// Connection ID → set of room keys (for cleanup on disconnect)
    connections: DashMap<Uuid, Vec<String>>,
}

impl WsHub {
    pub fn new() -> Self {
        Self {
            rooms: DashMap::new(),
            connections: DashMap::new(),
        }
    }

    /// Get or create a room, returns broadcast receiver
    pub async fn subscribe(
        &self,
        room_id: &RoomId,
        user: &WsUser,
        conn_id: Uuid,
    ) -> broadcast::Receiver<ServerMessage> {
        let key = room_id.key();

        // Get or create room
        let room = self.rooms
            .entry(key.clone())
            .or_insert_with(|| {
                let (sender, _) = broadcast::channel(BROADCAST_CAPACITY);
                Arc::new(RwLock::new(RoomState {
                    sender,
                    presence: HashMap::new(),
                }))
            })
            .clone();

        let rx = {
            let state = room.read().await;
            state.sender.subscribe()
        };

        // Track connection → room mapping for cleanup
        self.connections
            .entry(conn_id)
            .or_insert_with(Vec::new)
            .push(key);

        rx
    }

    /// Remove a connection from a room
    pub async fn unsubscribe(
        &self,
        room_id: &RoomId,
        user_id: Uuid,
        conn_id: Uuid,
    ) {
        let key = room_id.key();

        // Remove presence
        if let Some(room) = self.rooms.get(&key) {
            let mut state = room.write().await;
            let had_presence = state.presence.remove(&user_id).is_some();

            // Broadcast leave if had presence
            if had_presence {
                let _ = state.sender.send(ServerMessage::PresenceDiff {
                    room: key.clone(),
                    joins: vec![],
                    leaves: vec![user_id],
                });
            }

            // Cleanup empty rooms
            if state.presence.is_empty() && state.sender.receiver_count() == 0 {
                drop(state);
                self.rooms.remove(&key);
            }
        }

        // Remove from connection tracking
        if let Some(mut rooms) = self.connections.get_mut(&conn_id) {
            rooms.retain(|k| k != &key);
        }
    }

    /// Broadcast a message to all subscribers in a room
    pub async fn broadcast(&self, room_key: &str, message: ServerMessage) {
        if let Some(room) = self.rooms.get(room_key) {
            let state = room.read().await;
            // Ignore send errors (no receivers)
            let _ = state.sender.send(message);
        }
    }

    /// Send a message to a specific user's notification channel
    pub async fn send_to_user(&self, tenant_id: Uuid, user_id: Uuid, message: ServerMessage) {
        let key = RoomId::Notifications { tenant_id, user_id }.key();
        self.broadcast(&key, message).await;
    }

    /// Track presence in a room
    pub async fn track_presence(
        &self,
        room_id: &RoomId,
        user: &WsUser,
        state_data: serde_json::Value,
    ) {
        let key = room_id.key();
        if let Some(room) = self.rooms.get(&key) {
            let mut state = room.write().await;
            let now = Utc::now();
            let is_new = !state.presence.contains_key(&user.user_id);
            let joined_at = if let Some(existing) = state.presence.get(&user.user_id) {
                existing.joined_at // Preserve original join time
            } else {
                now
            };
            let entry = PresenceEntry {
                user_id: user.user_id,
                display_name: user.display_name.clone(),
                state: state_data,
                joined_at,
                last_updated: now,
            };

            state.presence.insert(user.user_id, entry.clone());

            if is_new {
                let _ = state.sender.send(ServerMessage::PresenceDiff {
                    room: key,
                    joins: vec![entry],
                    leaves: vec![],
                });
            }
        }
    }

    /// Untrack presence in a room
    pub async fn untrack_presence(
        &self,
        room_id: &RoomId,
        user_id: Uuid,
    ) {
        let key = room_id.key();
        if let Some(room) = self.rooms.get(&key) {
            let mut state = room.write().await;
            if state.presence.remove(&user_id).is_some() {
                let _ = state.sender.send(ServerMessage::PresenceDiff {
                    room: key,
                    joins: vec![],
                    leaves: vec![user_id],
                });
            }
        }
    }

    /// Get current presence state for a room
    pub async fn get_presence(&self, room_id: &RoomId) -> Vec<PresenceEntry> {
        let key = room_id.key();
        if let Some(room) = self.rooms.get(&key) {
            let state = room.read().await;
            state.presence.values().cloned().collect()
        } else {
            vec![]
        }
    }

    /// Cleanup all rooms for a disconnected connection
    pub async fn disconnect(&self, conn_id: Uuid, user_id: Uuid) {
        if let Some((_, room_keys)) = self.connections.remove(&conn_id) {
            for key in room_keys {
                if let Some(room) = self.rooms.get(&key) {
                    let mut state = room.write().await;
                    if state.presence.remove(&user_id).is_some() {
                        let _ = state.sender.send(ServerMessage::PresenceDiff {
                            room: key.clone(),
                            joins: vec![],
                            leaves: vec![user_id],
                        });
                    }
                }
            }
        }
    }

    /// Get stats for monitoring
    pub fn stats(&self) -> HubStats {
        HubStats {
            total_rooms: self.rooms.len(),
            total_connections: self.connections.len(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct HubStats {
    pub total_rooms: usize,
    pub total_connections: usize,
}
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo test --lib websocket
```

**STOP IF:**

- `broadcast::channel` capacity causes backpressure issues di compile time
- `DashMap` deadlock risk detected di review

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-3: WebSocket Auth — JWT Validation on Handshake

**TASK ID:** 4A-3

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Validate JWT token during WebSocket upgrade handshake. Reject unauthenticated connections.

**DEPENDENCY:** Task 4A-1, Phase 1B auth (JWT issuance working)

**READ FIRST:**

- `edusync-api/crates/auth/src/jwt.rs` (existing JWT verification from Phase 1B)
- `edusync-api/crates/api-server/src/websocket/types.rs` (WsUser struct)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/auth.rs` (BUAT BARU)

**DO NOT TOUCH:**

- `edusync-api/crates/auth/src/jwt.rs` (reuse, jangan ubah)
- Frontend files

**IMPLEMENTATION STEPS:**

1. Buat `auth.rs` — extract JWT from query param `?token=xxx` or `Authorization` header
2. Validate token, extract claims → build WsUser
3. Reject with 401 if invalid

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/auth.rs
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::Deserialize;
use uuid::Uuid;

use super::types::WsUser;

/// JWT claims shape (must match Phase 1B issuance)
#[derive(Debug, Deserialize)]
pub struct WsClaims {
    pub sub: String,       // user_id as string
    pub email: String,
    pub tenant_id: String,
    pub roles: Vec<String>,
    pub exp: usize,
    pub iat: usize,
    #[serde(default)]
    pub display_name: Option<String>,
}

/// Query params for WebSocket connection
#[derive(Debug, Deserialize)]
pub struct WsAuthParams {
    pub token: Option<String>,
}

/// Authenticate a WebSocket connection from token
/// Token can be in query param `?token=xxx` or Authorization header.
/// Query param is preferred for WebSocket since browsers can't set headers on WS.
pub fn authenticate_ws(
    token: &str,
    jwt_secret: &str,
) -> Result<WsUser, (StatusCode, String)> {
    let key = DecodingKey::from_secret(jwt_secret.as_bytes());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<WsClaims>(token, &key, &validation)
        .map_err(|e| {
            (StatusCode::UNAUTHORIZED, format!("Invalid token: {}", e))
        })?;

    let claims = token_data.claims;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid user_id in token".to_string()))?;
    let tenant_id = Uuid::parse_str(&claims.tenant_id)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid tenant_id in token".to_string()))?;

    Ok(WsUser {
        user_id,
        email: claims.email.clone(),
        tenant_id,
        roles: claims.roles,
        display_name: claims.display_name.unwrap_or(claims.email),
    })
}

/// Extract token from either query param or Authorization header
pub fn extract_token(
    query_token: Option<&str>,
    auth_header: Option<&str>,
) -> Result<String, (StatusCode, String)> {
    // 1. Try query param first (browsers can't set WS headers)
    if let Some(token) = query_token {
        if !token.is_empty() {
            return Ok(token.to_string());
        }
    }

    // 2. Try Authorization header
    if let Some(header) = auth_header {
        if let Some(token) = header.strip_prefix("Bearer ") {
            return Ok(token.to_string());
        }
    }

    Err((StatusCode::UNAUTHORIZED, "No authentication token provided".to_string()))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo test --lib websocket::auth
```

**STOP IF:**

- JWT claims shape dari Phase 1B tidak match `WsClaims` struct
- `jsonwebtoken` crate version conflict dengan existing dependency

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-4: WebSocket Handler — Upgrade + Message Loop

**TASK ID:** 4A-4

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Implement WebSocket upgrade handler dan main message loop. Handle subscribe/unsubscribe/broadcast/track/ping.

**DEPENDENCY:** Task 4A-1, 4A-2, 4A-3

**READ FIRST:**

- `edusync-api/crates/api-server/src/websocket/types.rs`
- `edusync-api/crates/api-server/src/websocket/hub.rs`
- `edusync-api/crates/api-server/src/websocket/auth.rs`

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/handler.rs` (BUAT BARU)

**DO NOT TOUCH:**

- Files dari task 4A-1 sampai 4A-3

**IMPLEMENTATION STEPS:**

1. Buat handler yang menerima WebSocket upgrade request
2. Authenticate via JWT (query param)
3. Spawn message loop: read client messages, dispatch to WsHub
4. Spawn room listener: forward broadcast messages to client
5. Handle disconnect: cleanup all subscriptions + presence

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/handler.rs
use std::sync::Arc;
use axum::{
    extract::{State, WebSocketUpgrade, Query, ws::{Message, WebSocket}},
    http::HeaderMap,
    response::IntoResponse,
};
use futures::{StreamExt, SinkExt, stream::SplitSink};
use tokio::sync::broadcast;
use uuid::Uuid;

use super::{
    auth::{authenticate_ws, extract_token, WsAuthParams},
    hub::WsHub,
    types::*,
};

use crate::AppState;

/// WebSocket upgrade handler
/// Route: GET /ws?token=xxx
pub async fn ws_upgrade_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsAuthParams>,
    headers: HeaderMap,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    // Extract and validate token
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    let token = match extract_token(params.token.as_deref(), auth_header) {
        Ok(t) => t,
        Err((status, msg)) => return (status, msg).into_response(),
    };

    let user = match authenticate_ws(&token, &state.jwt_secret) {
        Ok(u) => u,
        Err((status, msg)) => return (status, msg).into_response(),
    };

    // Upgrade to WebSocket
    ws.on_upgrade(move |socket| handle_socket(socket, user, state))
        .into_response()
}

/// Main WebSocket connection handler
async fn handle_socket(
    socket: WebSocket,
    user: WsUser,
    state: Arc<AppState>,
) {
    let conn_id = Uuid::new_v4();
    let (mut sender, mut receiver) = socket.split();
    let hub = &state.ws_hub;

    // Shared sender behind Arc+Mutex for multi-task writing
    let sender = Arc::new(tokio::sync::Mutex::new(sender));

    // Active room subscriptions: room_key → abort handle for listener task
    let mut active_rooms: std::collections::HashMap<String, tokio::task::JoinHandle<()>> =
        std::collections::HashMap::new();

    // Message loop
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                let client_msg: ClientMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(_) => {
                        send_msg(&sender, &ServerMessage::Error {
                            message: "Invalid message format".to_string(),
                            code: "invalid_message".to_string(),
                        }).await;
                        continue;
                    }
                };

                match client_msg {
                    ClientMessage::Subscribe { room_type, entity_id } => {
                        let room_id = match RoomId::from_subscription(
                            &room_type, user.tenant_id, entity_id
                        ) {
                            Ok(r) => r,
                            Err(e) => {
                                send_msg(&sender, &ServerMessage::Error {
                                    message: e,
                                    code: "invalid_room".to_string(),
                                }).await;
                                continue;
                            }
                        };

                        // Tenant isolation check
                        if !room_id.belongs_to_tenant(user.tenant_id) {
                            send_msg(&sender, &ServerMessage::Error {
                                message: "Tenant mismatch".to_string(),
                                code: "tenant_mismatch".to_string(),
                            }).await;
                            continue;
                        }

                        let key = room_id.key();

                        // Don't double-subscribe
                        if active_rooms.contains_key(&key) {
                            continue;
                        }

                        // Subscribe and get receiver
                        let mut rx = hub.subscribe(&room_id, &user, conn_id).await;

                        // Send current presence state
                        let entries = hub.get_presence(&room_id).await;
                        if !entries.is_empty() {
                            send_msg(&sender, &ServerMessage::PresenceState {
                                room: key.clone(),
                                entries,
                            }).await;
                        }

                        // Spawn listener task for this room
                        let sender_clone = sender.clone();
                        let handle = tokio::spawn(async move {
                            while let Ok(msg) = rx.recv().await {
                                let text = match serde_json::to_string(&msg) {
                                    Ok(t) => t,
                                    Err(_) => continue,
                                };
                                let mut s = sender_clone.lock().await;
                                if s.send(Message::Text(text.into())).await.is_err() {
                                    break;
                                }
                            }
                        });

                        active_rooms.insert(key.clone(), handle);

                        send_msg(&sender, &ServerMessage::Subscribed {
                            room: key,
                        }).await;
                    }

                    ClientMessage::Unsubscribe { room_type, entity_id } => {
                        if let Ok(room_id) = RoomId::from_subscription(
                            &room_type, user.tenant_id, entity_id
                        ) {
                            let key = room_id.key();
                            hub.unsubscribe(&room_id, user.user_id, conn_id).await;

                            if let Some(handle) = active_rooms.remove(&key) {
                                handle.abort();
                            }

                            send_msg(&sender, &ServerMessage::Unsubscribed {
                                room: key,
                            }).await;
                        }
                    }

                    ClientMessage::Broadcast { room_type, entity_id, event, payload } => {
                        if let Ok(room_id) = RoomId::from_subscription(
                            &room_type, user.tenant_id, entity_id
                        ) {
                            if room_id.belongs_to_tenant(user.tenant_id) {
                                hub.broadcast(&room_id.key(), ServerMessage::Event {
                                    room: room_id.key(),
                                    event,
                                    payload,
                                }).await;
                            }
                        }
                    }

                    ClientMessage::Track { room_type, entity_id, state: track_state } => {
                        if let Ok(room_id) = RoomId::from_subscription(
                            &room_type, user.tenant_id, entity_id
                        ) {
                            hub.track_presence(&room_id, &user, track_state).await;
                        }
                    }

                    ClientMessage::Untrack { room_type, entity_id } => {
                        if let Ok(room_id) = RoomId::from_subscription(
                            &room_type, user.tenant_id, entity_id
                        ) {
                            hub.untrack_presence(&room_id, user.user_id).await;
                        }
                    }

                    ClientMessage::Ping => {
                        send_msg(&sender, &ServerMessage::Pong).await;
                    }
                }
            }
            Message::Close(_) => break,
            _ => {} // Ignore binary, ping/pong frames (handled by axum)
        }
    }

    // === Disconnect cleanup ===
    // Abort all listener tasks
    for (_, handle) in active_rooms {
        handle.abort();
    }
    // Cleanup all rooms + presence
    hub.disconnect(conn_id, user.user_id).await;
}

/// Helper: send a server message to the client
async fn send_msg(
    sender: &Arc<tokio::sync::Mutex<SplitSink<WebSocket, Message>>>,
    msg: &ServerMessage,
) {
    if let Ok(text) = serde_json::to_string(msg) {
        let mut s = sender.lock().await;
        let _ = s.send(Message::Text(text.into())).await;
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo clippy -- -D warnings
```

**STOP IF:**

- `axum::extract::ws` API berubah — check axum version di `Cargo.toml`
- `futures::StreamExt` import conflict
- Deadlock risk pada `Arc<Mutex<SplitSink>>` — jika terdeteksi, refactor ke `mpsc` channel pattern

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-5: pg_notify Listener — Forward DB Events to WsHub

**TASK ID:** 4A-5

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Implement PostgreSQL LISTEN/NOTIFY listener yang forward events dari DB ke WsHub rooms.

**DEPENDENCY:** Task 4A-2 (WsHub)

**READ FIRST:**

- `edusync-api/crates/api-server/src/websocket/hub.rs`
- Phase 4-6 Detail — Week 54 pg_notify section
- Spec 3 §1.4 — channel mapping

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/pg_listener.rs` (BUAT BARU)

**DO NOT TOUCH:**

- `edusync-api/crates/api-server/src/websocket/hub.rs`

**IMPLEMENTATION STEPS:**

1. Connect to PostgreSQL via `sqlx::PgListener`
2. LISTEN on channels: `notifications`, `discussions`, `classroom`, `builder_presence`, `group_assignment`
3. Parse `PgNotifyPayload` from each notification
4. Route to correct WsHub room based on channel + entity_id

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/pg_listener.rs
use std::sync::Arc;
use sqlx::postgres::PgListener;
use sqlx::PgPool;
use tracing::{info, warn, error};
use uuid::Uuid;

use super::hub::WsHub;
use super::types::*;

/// Channels that use pg_notify (ephemeral delivery)
const PG_NOTIFY_CHANNELS: &[&str] = &[
    "notifications",
    "discussions",
    "classroom",
    "builder_presence",
    "group_assignment",
];

/// Start the pg_notify listener.
/// This runs in a background task and forwards DB events to WebSocket rooms.
///
/// Channels using pg_notify (ephemeral, acceptable message loss):
/// - notifications, discussions, classroom, builder_presence, group_assignment
///
/// Channels using vil_trigger_cdc (durable, no message loss):
/// - builder_content, messaging → handled by Task 4A-7
pub async fn start_pg_listener(
    pool: PgPool,
    hub: Arc<WsHub>,
) {
    info!("Starting pg_notify listener for channels: {:?}", PG_NOTIFY_CHANNELS);

    loop {
        match run_listener(&pool, &hub).await {
            Ok(_) => {
                warn!("pg_notify listener exited normally, restarting in 1s...");
            }
            Err(e) => {
                error!("pg_notify listener error: {}, restarting in 5s...", e);
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}

async fn run_listener(
    pool: &PgPool,
    hub: &Arc<WsHub>,
) -> Result<(), sqlx::Error> {
    let mut listener = PgListener::connect_with(pool).await?;
    listener.listen_all(PG_NOTIFY_CHANNELS.iter().copied()).await?;

    info!("pg_notify listener connected and listening");

    while let Ok(notification) = listener.recv().await {
        let channel = notification.channel();
        let payload_str = notification.payload();

        // pg_notify 8KB limit safety check (Gap #1)
        let payload_len = payload_str.len();
        if payload_len > 7168 {
            // 7KB warning threshold (8KB = hard drop by PostgreSQL)
            warn!(
                "pg_notify payload approaching 8KB limit on channel '{}': {} bytes. \
                 Consider truncating data in trigger function.",
                channel, payload_len
            );
        }
        if payload_len > 8000 {
            error!(
                "pg_notify payload likely exceeded 8KB on channel '{}': {} bytes. \
                 This notification may have been silently dropped by PostgreSQL.",
                channel, payload_len
            );
        }

        // Parse payload
        let payload: PgNotifyPayload = match serde_json::from_str(payload_str) {
            Ok(p) => p,
            Err(e) => {
                warn!("Failed to parse pg_notify payload on channel '{}': {}", channel, e);
                continue;
            }
        };

        // Route to correct room
        let room_key = match channel {
            "notifications" => {
                RoomId::Notifications {
                    tenant_id: payload.tenant_id,
                    user_id: payload.entity_id,
                }.key()
            }
            "discussions" => {
                RoomId::Discussion {
                    tenant_id: payload.tenant_id,
                    thread_id: payload.entity_id,
                }.key()
            }
            "classroom" => {
                RoomId::Classroom {
                    tenant_id: payload.tenant_id,
                    class_id: payload.entity_id,
                }.key()
            }
            "builder_presence" => {
                RoomId::BuilderPresence {
                    tenant_id: payload.tenant_id,
                    course_id: payload.entity_id,
                }.key()
            }
            "group_assignment" => {
                RoomId::GroupAssignment {
                    tenant_id: payload.tenant_id,
                    assignment_id: payload.entity_id,
                }.key()
            }
            _ => {
                warn!("Unknown pg_notify channel: {}", channel);
                continue;
            }
        };

        // Build server message
        let server_msg = ServerMessage::Event {
            room: room_key.clone(),
            event: payload.action.clone(),
            payload: payload.data,
        };

        // Broadcast to room
        hub.broadcast(&room_key, server_msg).await;
    }

    Ok(())
}
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo clippy -- -D warnings
```

**STOP IF:**

- `sqlx::PgListener` not available in current sqlx version — check `Cargo.toml`
- pg_notify payload exceeds 8KB limit for any table — jika ya, BLOCKED dan escalate ke `vil_trigger_cdc`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-6: PostgreSQL Triggers — pg_notify for Ephemeral Channels

**TASK ID:** 4A-6

**OWNER TYPE:** SQL Migration Agent

**GOAL:** Buat PostgreSQL triggers yang fire pg_notify events untuk semua ephemeral channels.

**DEPENDENCY:** Tidak ada (SQL migration independent)

**READ FIRST:**

- Phase 4-6 Detail — Week 54 pg_notify triggers
- Spec 3 §1.4 — channel → table mapping

**EDIT ONLY:**

- `edusync-api/migrations/YYYYMMDDHHMMSS_add_realtime_pg_notify_triggers.sql` (BUAT BARU)

**DO NOT TOUCH:**

- Existing migration files
- Any Rust or frontend files

**IMPLEMENTATION STEPS:**

1. Create trigger functions for each table that needs realtime
2. Create triggers AFTER INSERT (and UPDATE/DELETE where needed)
3. Payload must include: `table`, `action`, `tenant_id`, `entity_id`, `data`
4. Payload must stay under 8KB (pg_notify limit)

**COPY-PASTE STARTER:**

```sql
-- Migration: Add pg_notify triggers for realtime channels
-- Channels: notifications, discussions, classroom, builder_presence, group_assignment
-- These are EPHEMERAL channels — acceptable message loss.
-- Durable channels (builder_content, messaging) use vil_trigger_cdc.

-- =============================================
-- 1. NOTIFICATIONS (INSERT only)
-- =============================================
CREATE OR REPLACE FUNCTION notify_new_notification() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'notifications',
        json_build_object(
            'table', 'notifications',
            'action', TG_OP,
            'tenant_id', NEW.tenant_id,
            'entity_id', NEW.user_id,
            'data', json_build_object(
                'id', NEW.id,
                'type', NEW.type,
                'title', NEW.title,
                'message', LEFT(NEW.message, 500),
                'read', NEW.read,
                'created_at', NEW.created_at
            )
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_notification ON notifications;
CREATE TRIGGER trg_notify_notification
    AFTER INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION notify_new_notification();

-- Notification read status update
CREATE OR REPLACE FUNCTION notify_notification_read() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.read IS DISTINCT FROM NEW.read THEN
        PERFORM pg_notify(
            'notifications',
            json_build_object(
                'table', 'notifications',
                'action', 'UPDATE',
                'tenant_id', NEW.tenant_id,
                'entity_id', NEW.user_id,
                'data', json_build_object(
                    'id', NEW.id,
                    'read', NEW.read
                )
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_notification_read ON notifications;
CREATE TRIGGER trg_notify_notification_read
    AFTER UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION notify_notification_read();

-- =============================================
-- 2. DISCUSSIONS (INSERT new comment)
-- =============================================
CREATE OR REPLACE FUNCTION notify_new_discussion_comment() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'discussions',
        json_build_object(
            'table', 'discussion_comments',
            'action', TG_OP,
            'tenant_id', NEW.tenant_id,
            'entity_id', NEW.thread_id,
            'data', json_build_object(
                'id', NEW.id,
                'thread_id', NEW.thread_id,
                'user_id', NEW.user_id,
                'content', LEFT(NEW.content, 1000),
                'created_at', NEW.created_at
            )
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_discussion_comment ON discussion_comments;
CREATE TRIGGER trg_notify_discussion_comment
    AFTER INSERT ON discussion_comments
    FOR EACH ROW EXECUTE FUNCTION notify_new_discussion_comment();

-- =============================================
-- 3. CLASSROOM (INSERT/UPDATE on attendance, class state)
-- =============================================
CREATE OR REPLACE FUNCTION notify_classroom_update() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'classroom',
        json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'tenant_id', NEW.tenant_id,
            'entity_id', NEW.class_id,
            'data', json_build_object(
                'id', NEW.id,
                'class_id', NEW.class_id,
                'updated_at', now()
            )
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_attendance ON attendance_records;
CREATE TRIGGER trg_notify_attendance
    AFTER INSERT OR UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION notify_classroom_update();

-- =============================================
-- 4. GROUP ASSIGNMENT (INSERT/UPDATE)
-- =============================================
CREATE OR REPLACE FUNCTION notify_group_assignment_update() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'group_assignment',
        json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'tenant_id', NEW.tenant_id,
            'entity_id', NEW.assignment_id,
            'data', json_build_object(
                'id', NEW.id,
                'assignment_id', NEW.assignment_id,
                'updated_at', now()
            )
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Adjust table name to actual table!
-- BEFORE RUNNING: verify with \dt *group*assignment* in psql
-- Known ambiguity: could be group_assignment_submissions, group_submissions, etc.
DROP TRIGGER IF EXISTS trg_notify_group_assignment ON group_assignment_submissions;
CREATE TRIGGER trg_notify_group_assignment
    AFTER INSERT OR UPDATE ON group_assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION notify_group_assignment_update();

-- =============================================
-- 5. BUILDER PRESENCE (broadcast via pg_notify)
-- NOTE: Builder presence is ephemeral — cursor positions are transient.
-- Content updates use vil_trigger_cdc (handled separately).
-- Builder presence events are sent directly via WsHub.broadcast()
-- from the WebSocket handler, NOT via pg_notify trigger.
-- This section intentionally left empty — presence is client-to-client
-- via the WsHub, not DB-triggered.
-- =============================================
```

**VERIFY:**

```
# Apply migration
cd edusync-api && sqlx migrate run

# Test triggers fire
psql $DATABASE_URL -c "INSERT INTO notifications (id, user_id, tenant_id, type, title, message, read, created_at) VALUES (gen_random_uuid(), '<test-user-id>', '<test-tenant-id>', 'info', 'Test', 'Test notification', false, now());"

# Check pg_notify works (in another psql session):
# LISTEN notifications;
# Then insert above and verify you get NOTIFY event
```

**STOP IF:**

- Table columns don't match (e.g. `notifications` doesn't have `tenant_id`) — check actual schema first
- Payload exceeds 8KB for any row — truncate more aggressively with `LEFT()`
- Table name for group assignments is different — check `\dt *group*` in psql

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-7: CDC Listener — Durable Channels via vil_trigger_cdc

**TASK ID:** 4A-7

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Setup vil_trigger_cdc for durable channels: builder content updates and parent-teacher messaging. These channels MUST NOT lose messages.

**DEPENDENCY:** Task 4A-2 (WsHub), VIL crate `vil_trigger_cdc` available

**READ FIRST:**

- Spec 4 §8 — `vil_trigger_cdc` evaluation
- Agent Bootstrap Context — VIL crate ecosystem
- `edusync-api/Cargo.toml` — check if `vil_trigger_cdc` is declared

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/websocket/cdc_listener.rs` (BUAT BARU)
- `edusync-api/Cargo.toml` — add `vil-trigger-cdc` dependency if missing

**DO NOT TOUCH:**

- `edusync-api/crates/api-server/src/websocket/pg_listener.rs`
- Frontend files

**IMPLEMENTATION STEPS:**

1. Add `vil-trigger-cdc` to `Cargo.toml` if not present
2. Configure CDC for tables: content update tables (course_modules, lessons), messages
3. Forward CDC events to WsHub rooms for `builder_content` and `messaging`
4. CDC provides guaranteed delivery — reconnecting clients get missed events

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/api-server/src/websocket/cdc_listener.rs
use std::sync::Arc;
use sqlx::PgPool;
use tracing::{info, warn, error};
use uuid::Uuid;

use super::hub::WsHub;
use super::types::*;

/// CDC tables for durable delivery
/// - course_modules / lessons → builder_content channel
/// - messages → messaging channel
///
/// IMPORTANT: vil_trigger_cdc provides WAL-based change capture.
/// If vil_trigger_cdc is NOT available or too complex to integrate,
/// FALLBACK: use pg_notify with a separate "outbox" table pattern:
///   1. Trigger writes to outbox table (persistent)
///   2. Poller reads outbox and broadcasts to WsHub
///   3. Outbox entries deleted after broadcast + TTL
/// This gives "at-least-once" delivery without vil_trigger_cdc.

/// Start the CDC listener for durable channels.
/// Falls back to outbox polling if vil_trigger_cdc is not available.
pub async fn start_cdc_listener(
    pool: PgPool,
    hub: Arc<WsHub>,
) {
    info!("Starting CDC listener for durable channels: builder_content, messaging");

    // === OPTION A: vil_trigger_cdc (preferred) ===
    // Uncomment when vil_trigger_cdc crate is integrated:
    //
    // use vil_trigger_cdc::{CdcListener, CdcConfig, CdcEvent};
    //
    // let cdc = CdcListener::new(CdcConfig {
    //     database_url: pool.connect_options().to_string(),
    //     tables: vec![
    //         "course_modules".to_string(),
    //         "lessons".to_string(),
    //         "messages".to_string(),
    //     ],
    //     slot_name: "edusync_realtime".to_string(),
    // });
    //
    // while let Some(event) = cdc.next().await {
    //     route_cdc_event(&hub, event).await;
    // }

    // === OPTION B: Outbox polling fallback ===
    // Uses a persistent outbox table for guaranteed delivery
    info!("Using outbox polling fallback for durable channels");
    start_outbox_poller(pool, hub).await;
}

/// Outbox polling: reads from `realtime_outbox` table and broadcasts to WsHub.
/// Table must be created via migration (see Task 4A-8).
async fn start_outbox_poller(
    pool: PgPool,
    hub: Arc<WsHub>,
) {
    let poll_interval = std::time::Duration::from_millis(500); // 500ms polling

    loop {
        match poll_outbox(&pool, &hub).await {
            Ok(count) => {
                if count > 0 {
                    // If we processed messages, poll again immediately
                    continue;
                }
            }
            Err(e) => {
                error!("Outbox poll error: {}, retrying in 5s...", e);
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
        }

        tokio::time::sleep(poll_interval).await;
    }
}

async fn poll_outbox(
    pool: &PgPool,
    hub: &Arc<WsHub>,
) -> Result<usize, sqlx::Error> {
    // Fetch unprocessed outbox entries (oldest first, batch of 100)
    let rows = sqlx::query_as::<_, OutboxEntry>(
        r#"DELETE FROM realtime_outbox
           WHERE id IN (
               SELECT id FROM realtime_outbox
               ORDER BY created_at ASC
               LIMIT 100
           )
           RETURNING id, channel, tenant_id, entity_id, event, payload, created_at"#
    )
    .fetch_all(pool)
    .await?;

    let count = rows.len();

    for entry in rows {
        let room_key = match entry.channel.as_str() {
            "builder_content" => {
                RoomId::BuilderContent {
                    tenant_id: entry.tenant_id,
                    course_id: entry.entity_id,
                }.key()
            }
            "messaging" => {
                RoomId::Messaging {
                    tenant_id: entry.tenant_id,
                    thread_id: entry.entity_id,
                }.key()
            }
            _ => {
                warn!("Unknown outbox channel: {}", entry.channel);
                continue;
            }
        };

        let server_msg = ServerMessage::Event {
            room: room_key.clone(),
            event: entry.event,
            payload: entry.payload,
        };

        hub.broadcast(&room_key, server_msg).await;
    }

    Ok(count)
}

/// Outbox entry from DB
#[derive(Debug, sqlx::FromRow)]
struct OutboxEntry {
    id: Uuid,
    channel: String,
    tenant_id: Uuid,
    entity_id: Uuid,
    event: String,
    payload: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
}
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo clippy -- -D warnings
```

**STOP IF:**

- `vil_trigger_cdc` crate not available — proceed with outbox fallback (Option B)
- Outbox table not yet created — depends on Task 4A-8

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-8: Migration — Outbox Table + CDC Triggers for Durable Channels

**TASK ID:** 4A-8

**OWNER TYPE:** SQL Migration Agent

**GOAL:** Create `realtime_outbox` table and triggers for durable channels (builder content, messaging).

**DEPENDENCY:** Tidak ada (SQL migration independent)

**READ FIRST:**

- Task 4A-7 (outbox schema expectations)
- Existing schema for `course_modules`, `lessons`, `messages` tables

**EDIT ONLY:**

- `edusync-api/migrations/YYYYMMDDHHMMSS_add_realtime_outbox.sql` (BUAT BARU)

**DO NOT TOUCH:**

- Existing migration files

**IMPLEMENTATION STEPS:**

1. Create `realtime_outbox` table
2. Create trigger functions that insert into outbox on relevant table changes
3. Add index for polling performance
4. Add cleanup function to prevent unbounded growth

**COPY-PASTE STARTER:**

```sql
-- Migration: Create realtime_outbox for durable channel delivery
-- Used by: builder_content (course edits), messaging (parent-teacher)
-- Pattern: transactional outbox — trigger writes to outbox atomically
-- with the source table change. Poller reads and broadcasts.

-- =============================================
-- 1. OUTBOX TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS realtime_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL,          -- 'builder_content' or 'messaging'
    tenant_id UUID NOT NULL,
    entity_id UUID NOT NULL,        -- course_id or thread_id
    event TEXT NOT NULL,            -- 'INSERT', 'UPDATE', 'DELETE'
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for polling: oldest unprocessed first
CREATE INDEX idx_realtime_outbox_created ON realtime_outbox (created_at ASC);

-- Cleanup: remove entries older than 24 hours (safety net — Gap #7 fix)
-- Poller deletes immediately via DELETE+RETURNING. This function is a safety net
-- for when the poller is down. 24h TTL (not 1h) prevents data loss if poller
-- is offline for extended periods.
-- MUST be scheduled via cron (see Task 3E-1 or add to vil_trigger_cron).
CREATE OR REPLACE FUNCTION cleanup_realtime_outbox() RETURNS void AS $$
BEGIN
    DELETE FROM realtime_outbox
    WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour (if pg_cron is available during transition)
-- SELECT cron.schedule('cleanup-realtime-outbox', '0 * * * *', 'SELECT cleanup_realtime_outbox()');

-- =============================================
-- 2. BUILDER CONTENT TRIGGERS
-- course_modules changes → outbox
-- =============================================
CREATE OR REPLACE FUNCTION outbox_course_module_change() RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_course_id UUID;
    v_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        v_course_id := OLD.course_id;
        v_data := json_build_object(
            'id', OLD.id,
            'course_id', OLD.course_id,
            'action', 'DELETE'
        )::jsonb;
    ELSE
        v_tenant_id := NEW.tenant_id;
        v_course_id := NEW.course_id;
        v_data := json_build_object(
            'id', NEW.id,
            'course_id', NEW.course_id,
            'title', NEW.title,
            'order', NEW."order",
            'action', TG_OP
        )::jsonb;
    END IF;

    INSERT INTO realtime_outbox (channel, tenant_id, entity_id, event, payload)
    VALUES ('builder_content', v_tenant_id, v_course_id, TG_OP, v_data);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_outbox_course_module ON course_modules;
CREATE TRIGGER trg_outbox_course_module
    AFTER INSERT OR UPDATE OR DELETE ON course_modules
    FOR EACH ROW EXECUTE FUNCTION outbox_course_module_change();

-- Lessons changes → outbox (builder content)
CREATE OR REPLACE FUNCTION outbox_lesson_change() RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_course_id UUID;
    v_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        v_course_id := OLD.course_id;
        v_data := json_build_object(
            'id', OLD.id,
            'course_id', OLD.course_id,
            'action', 'DELETE'
        )::jsonb;
    ELSE
        v_tenant_id := NEW.tenant_id;
        v_course_id := NEW.course_id;
        v_data := json_build_object(
            'id', NEW.id,
            'course_id', NEW.course_id,
            'title', NEW.title,
            'order', NEW."order",
            'type', NEW.type,
            'action', TG_OP
        )::jsonb;
    END IF;

    INSERT INTO realtime_outbox (channel, tenant_id, entity_id, event, payload)
    VALUES ('builder_content', v_tenant_id, v_course_id, TG_OP, v_data);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_outbox_lesson ON lessons;
CREATE TRIGGER trg_outbox_lesson
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW EXECUTE FUNCTION outbox_lesson_change();

-- =============================================
-- 3. MESSAGING TRIGGERS
-- messages table → outbox
-- =============================================
CREATE OR REPLACE FUNCTION outbox_message_change() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO realtime_outbox (channel, tenant_id, entity_id, event, payload)
    VALUES (
        'messaging',
        NEW.tenant_id,
        NEW.thread_id,
        TG_OP,
        json_build_object(
            'id', NEW.id,
            'thread_id', NEW.thread_id,
            'sender_id', NEW.sender_id,
            'content', LEFT(NEW.content, 1000),
            'created_at', NEW.created_at
        )::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Adjust table name to actual messages table!
-- BEFORE RUNNING: verify with \dt *message* in psql
-- Known ambiguity: could be messages, parent_messages, direct_messages, etc.
DROP TRIGGER IF EXISTS trg_outbox_message ON messages;
CREATE TRIGGER trg_outbox_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION outbox_message_change();
```

**VERIFY:**

```
cd edusync-api && sqlx migrate run
psql $DATABASE_URL -c "\d realtime_outbox"
psql $DATABASE_URL -c "SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_outbox%';"
```

**STOP IF:**

- `course_modules` table doesn't have `tenant_id` or `course_id` columns — check actual schema
- `messages` table name is different — check `\dt *message*`
- `lessons` table doesn't have `course_id` — check join path

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-9: Register WebSocket in VilApp + AppState

**TASK ID:** 4A-9

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Wire up WsHub, pg_listener, cdc_listener, dan WebSocket handler ke VilApp main.

**DEPENDENCY:** Task 4A-1 sampai 4A-8

**READ FIRST:**

- `edusync-api/crates/api-server/src/main.rs`
- All websocket module files

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/main.rs` — add WsHub to AppState, register `/ws` route, spawn listeners
- `edusync-api/crates/api-server/src/websocket/mod.rs` — ensure all modules exported

**DO NOT TOUCH:**

- Any websocket implementation files (already done)
- Frontend files

**IMPLEMENTATION STEPS:**

1. Add `WsHub` to `AppState` struct
2. Add `ws_hub: Arc<WsHub>` field
3. Register `GET /ws` → `ws_upgrade_handler`
4. Spawn `start_pg_listener` background task
5. Spawn `start_cdc_listener` background task

**COPY-PASTE STARTER:**

```rust
// === TAMBAHKAN KE AppState ===
use crate::websocket::hub::WsHub;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    pub groq_api_key: Option<String>,
    pub ws_hub: Arc<WsHub>,  // <-- TAMBAHKAN
}

// === TAMBAHKAN DI main() setelah state creation ===
let ws_hub = Arc::new(WsHub::new());
let state = AppState {
    db: db.clone(),
    jwt_secret: std::env::var("JWT_SECRET").unwrap(),
    groq_api_key: std::env::var("GROQ_API_KEY").ok(),
    ws_hub: ws_hub.clone(),
};

// Spawn pg_notify listener (ephemeral channels)
let pg_hub = ws_hub.clone();
let pg_pool = db.clone();
tokio::spawn(async move {
    crate::websocket::pg_listener::start_pg_listener(pg_pool, pg_hub).await;
});

// Spawn CDC/outbox listener (durable channels)
let cdc_hub = ws_hub.clone();
let cdc_pool = db.clone();
tokio::spawn(async move {
    crate::websocket::cdc_listener::start_cdc_listener(cdc_pool, cdc_hub).await;
});

// === TAMBAHKAN WebSocket route ke ServiceProcess ===
use crate::websocket::handler::ws_upgrade_handler;

let ws_service = ServiceProcess::new("websocket")
    .prefix("")
    .endpoint(Method::GET, "/ws", get(ws_upgrade_handler));

// Register in VilApp:
// .service(ws_service)
```

**VERIFY:**

```
cd edusync-api && cargo check
cargo clippy -- -D warnings
cargo test

# Manual test: connect via wscat
wscat -c "ws://localhost:8080/ws?token=<valid-jwt>"
# Should connect successfully
# Send: {"type":"ping"}
# Receive: {"type":"pong"}
```

**STOP IF:**

- `AppState` struct sudah punya field yang conflict
- VilApp route registration API berbeda dari expected

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4A-10: Cargo.toml — Add WebSocket Dependencies

**TASK ID:** 4A-10

**OWNER TYPE:** Rust Backend Agent

**GOAL:** Tambahkan semua dependencies yang dibutuhkan Wave 4A ke Cargo.toml.

**DEPENDENCY:** Tidak ada (bisa dikerjakan paralel dengan 4A-1)

**READ FIRST:**

- `edusync-api/Cargo.toml` (current dependencies)

**EDIT ONLY:**

- `edusync-api/Cargo.toml` atau `edusync-api/crates/api-server/Cargo.toml`

**DO NOT TOUCH:**

- Any source files

**IMPLEMENTATION STEPS:**

1. Add `dashmap` for concurrent HashMap
2. Add `futures` for StreamExt/SinkExt
3. Verify `axum` has `ws` feature enabled
4. Verify `tokio` has `full` features
5. Verify `sqlx` has `postgres` feature for PgListener

**COPY-PASTE STARTER:**

```toml
# === TAMBAHKAN ke [dependencies] atau [workspace.dependencies] ===
dashmap = "5"
futures = "0.3"
async-stream = "0.3"

# Verify axum has ws feature:
# axum = { version = "0.7", features = ["ws"] }

# Verify tokio has sync:
# tokio = { version = "1", features = ["full"] }

# Verify sqlx has postgres + runtime-tokio:
# sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- Version conflicts dengan existing dependencies

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Wave 4B — Port 9 Realtime Consumers (Minggu 55-58)

---

## Task 4B-1: Frontend VilRealtimeProvider — Abstraction Layer

**TASK ID:** 4B-1

**OWNER TYPE:** Frontend Agent

**GOAL:** Buat RealtimeProvider yang wraps VIL WebSocket connection. Ini menggantikan Supabase Realtime client di frontend. Support feature flag switch.

**DEPENDENCY:** Phase 0C (Realtime Abstraction interface sudah ada)

**READ FIRST:**

- `src/services/realtime/` (existing abstraction dari Phase 0C)
- Phase 4-6 Detail — VilRealtimeProvider reconnection design

**EDIT ONLY:**

- `src/services/realtime/vilRealtimeProvider.ts` (BUAT BARU)

**DO NOT TOUCH:**

- `src/services/realtime/supabaseRealtimeProvider.ts`
- Any hook files (akan diubah di task 4B-2+)

**IMPLEMENTATION STEPS:**

1. Buat `VilRealtimeProvider` class
2. Implement WebSocket connection with JWT auth token
3. Implement exponential backoff reconnection (1s → 30s cap)
4. Implement message buffer during disconnect
5. Implement subscribe/unsubscribe/broadcast/track/untrack
6. Parse `ServerMessage` types

**COPY-PASTE STARTER:**

```tsx
// src/services/realtime/vilRealtimeProvider.ts
// =============================================================================
// VIL WebSocket Realtime Provider
// =============================================================================
// Replaces Supabase Realtime. Connects to VIL WebSocket server at /ws.
// Features:
// - JWT auth on connection
// - Exponential backoff reconnection (1s → 30s)
// - Message buffering during disconnect
// - Room-based subscribe/unsubscribe
// - Presence tracking
// =============================================================================

import type { RealtimeSubscription } from '@/services/api/types'

// --- Server message types (must match Rust ServerMessage enum) ---

interface ServerEventMessage {
  type: 'event'
  room: string
  event: string
  payload: unknown
}

interface ServerPresenceDiffMessage {
  type: 'presence_diff'
  room: string
  joins: PresenceEntry[]
  leaves: string[] // user_id[]
}

interface ServerPresenceStateMessage {
  type: 'presence_state'
  room: string
  entries: PresenceEntry[]
}

interface ServerSubscribedMessage {
  type: 'subscribed'
  room: string
}

interface ServerUnsubscribedMessage {
  type: 'unsubscribed'
  room: string
}

interface ServerErrorMessage {
  type: 'error'
  message: string
  code: string
}

interface ServerPongMessage {
  type: 'pong'
}

type ServerMessage =
  | ServerEventMessage
  | ServerPresenceDiffMessage
  | ServerPresenceStateMessage
  | ServerSubscribedMessage
  | ServerUnsubscribedMessage
  | ServerErrorMessage
  | ServerPongMessage

interface PresenceEntry {
  user_id: string
  display_name: string
  state: Record<string, unknown>
  joined_at: string
}

// --- Client message types (must match Rust ClientMessage enum) ---

interface ClientSubscribeMessage {
  type: 'subscribe'
  room_type: string
  entity_id: string
}

interface ClientUnsubscribeMessage {
  type: 'unsubscribe'
  room_type: string
  entity_id: string
}

interface ClientBroadcastMessage {
  type: 'broadcast'
  room_type: string
  entity_id: string
  event: string
  payload: unknown
}

interface ClientTrackMessage {
  type: 'track'
  room_type: string
  entity_id: string
  state: Record<string, unknown>
}

interface ClientUntrackMessage {
  type: 'untrack'
  room_type: string
  entity_id: string
}

interface ClientPingMessage {
  type: 'ping'
}

type ClientMessage =
  | ClientSubscribeMessage
  | ClientUnsubscribeMessage
  | ClientBroadcastMessage
  | ClientTrackMessage
  | ClientUntrackMessage
  | ClientPingMessage

// --- Event handler types ---

type EventHandler = (payload: unknown) => void
type PresenceDiffHandler = (joins: PresenceEntry[], leaves: string[]) => void
type PresenceStateHandler = (entries: PresenceEntry[]) => void

interface RoomSubscription {
  roomType: string
  entityId: string
  eventHandlers: Map<string, Set<EventHandler>>
  presenceDiffHandlers: Set<PresenceDiffHandler>
  presenceStateHandlers: Set<PresenceStateHandler>
}

// --- Main Provider ---

export class VilRealtimeProvider {
  private ws: WebSocket | null = null
  private wsUrl: string
  private getToken: () => string | null

  // Reconnection state
  private reconnectAttempts = 0
  private maxReconnectDelay = 30_000 // 30 seconds
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isIntentionallyClosed = false

  // Message buffer during disconnect
  private messageBuffer: ClientMessage[] = []
  private maxBufferSize = 100

  // Room subscriptions
  private subscriptions = new Map<string, RoomSubscription>()

  // Server-assigned room keys: clientKey → serverRoomKey (Gap #4 fix)
  // Client key = "roomType:entityId", server key = "roomType:tenantId:entityId"
  private serverRoomKeys = new Map<string, string>()

  // Ping/keep-alive
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private readonly PING_INTERVAL = 30_000 // 30s

  constructor(wsUrl: string, getToken: () => string | null) {
    this.wsUrl = wsUrl
    this.getToken = getToken
  }

  /** Connect to VIL WebSocket server */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const token = this.getToken()
    if (!token) {
      console.warn('[VilRealtime] No auth token available, skipping connect')
      return
    }

    this.isIntentionallyClosed = false

    try {
      this.ws = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`)
      this.ws.onopen = () => this.onOpen()
      this.ws.onmessage = (e) => this.onMessage(e)
      this.ws.onclose = (e) => this.onClose(e)
      this.ws.onerror = () => {} // onclose will fire after onerror
    } catch {
      this.scheduleReconnect()
    }
  }

  /** Disconnect intentionally */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.subscriptions.clear()
    this.serverRoomKeys.clear()
    this.messageBuffer = []
  }

  /** Subscribe to a room */
  subscribe(roomType: string, entityId: string): VilRoomSubscription {
    const key = `${roomType}:${entityId}`

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, {
        roomType,
        entityId,
        eventHandlers: new Map(),
        presenceDiffHandlers: new Set(),
        presenceStateHandlers: new Set(),
      })
    }

    // Send subscribe message
    this.send({
      type: 'subscribe',
      room_type: roomType,
      entity_id: entityId,
    })

    return new VilRoomSubscription(this, key)
  }

  /** Unsubscribe from a room */
  unsubscribe(roomType: string, entityId: string): void {
    const key = `${roomType}:${entityId}`
    this.subscriptions.delete(key)
    this.serverRoomKeys.delete(key)

    this.send({
      type: 'unsubscribe',
      room_type: roomType,
      entity_id: entityId,
    })
  }

  /** Broadcast to a room */
  broadcast(roomType: string, entityId: string, event: string, payload: unknown): void {
    this.send({
      type: 'broadcast',
      room_type: roomType,
      entity_id: entityId,
      event,
      payload,
    })
  }

  /** Track presence */
  track(roomType: string, entityId: string, state: Record<string, unknown>): void {
    this.send({
      type: 'track',
      room_type: roomType,
      entity_id: entityId,
      state,
    })
  }

  /** Untrack presence */
  untrack(roomType: string, entityId: string): void {
    this.send({
      type: 'untrack',
      room_type: roomType,
      entity_id: entityId,
    })
  }

  // --- Internal: register handlers (called by VilRoomSubscription) ---

  _onEvent(key: string, event: string, handler: EventHandler): void {
    const sub = this.subscriptions.get(key)
    if (!sub) return
    if (!sub.eventHandlers.has(event)) {
      sub.eventHandlers.set(event, new Set())
    }
    sub.eventHandlers.get(event)!.add(handler)
  }

  _offEvent(key: string, event: string, handler: EventHandler): void {
    this.subscriptions.get(key)?.eventHandlers.get(event)?.delete(handler)
  }

  _onPresenceDiff(key: string, handler: PresenceDiffHandler): void {
    this.subscriptions.get(key)?.presenceDiffHandlers.add(handler)
  }

  _onPresenceState(key: string, handler: PresenceStateHandler): void {
    this.subscriptions.get(key)?.presenceStateHandlers.add(handler)
  }

  // --- WebSocket event handlers ---

  private onOpen(): void {
    this.reconnectAttempts = 0
    this.startPing()

    // Re-subscribe to all active rooms
    for (const [, sub] of this.subscriptions) {
      this.send({
        type: 'subscribe',
        room_type: sub.roomType,
        entity_id: sub.entityId,
      })
    }

    // Flush buffered messages
    const buffer = [...this.messageBuffer]
    this.messageBuffer = []
    for (const msg of buffer) {
      this.send(msg)
    }
  }

  private onMessage(event: MessageEvent): void {
    let msg: ServerMessage
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      return
    }

    switch (msg.type) {
      case 'event': {
        // Find subscription by room key and dispatch
        for (const [key, sub] of this.subscriptions) {
          // Room key format from server includes tenant_id,
          // but subscription key is roomType:entityId.
          // Match by checking if server room ends with the entity pattern.
          // Exact key matching via serverRoomKey (Gap #4 fix)
          const serverKey = this.serverRoomKeys.get(key)
          if (serverKey && serverKey === msg.room) {
            const handlers = sub.eventHandlers.get(msg.event)
            if (handlers) {
              for (const handler of handlers) {
                try {
                  handler(msg.payload)
                } catch {
                  /* ignore handler errors */
                }
              }
            }
            break
          }
        }
        break
      }
      case 'presence_diff': {
        for (const [key, sub] of this.subscriptions) {
          const serverKey = this.serverRoomKeys.get(key)
          if (serverKey && serverKey === msg.room) {
            for (const handler of sub.presenceDiffHandlers) {
              try {
                handler(msg.joins, msg.leaves)
              } catch {
                /* ignore */
              }
            }
            break
          }
        }
        break
      }
      case 'presence_state': {
        for (const [key, sub] of this.subscriptions) {
          const serverKey = this.serverRoomKeys.get(key)
          if (serverKey && serverKey === msg.room) {
            for (const handler of sub.presenceStateHandlers) {
              try {
                handler(msg.entries)
              } catch {
                /* ignore */
              }
            }
            break
          }
        }
        break
      }
      case 'error': {
        console.error(`[VilRealtime] Server error: ${msg.code} — ${msg.message}`)
        break
      }
      case 'subscribed': {
        // Store server-assigned room key for exact matching (Gap #4 fix)
        for (const [key, sub] of this.subscriptions) {
          if (msg.room.includes(sub.roomType) && msg.room.includes(sub.entityId)) {
            this.serverRoomKeys.set(key, msg.room)
            break
          }
        }
        break
      }
      // unsubscribed, pong — no action needed
    }
  }

  private onClose(event: CloseEvent): void {
    this.stopPing()
    this.ws = null

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect()
    }
  }

  // --- Reconnection with exponential backoff ---

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  // --- Keep-alive ---

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, this.PING_INTERVAL)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // --- Send with buffer ---

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      // Buffer non-ping messages during disconnect
      if (msg.type !== 'ping' && this.messageBuffer.length < this.maxBufferSize) {
        this.messageBuffer.push(msg)
      }
    }
  }
}

/** Room-scoped subscription handle */
export class VilRoomSubscription {
  constructor(
    private provider: VilRealtimeProvider,
    private key: string
  ) {}

  on(event: string, handler: EventHandler): this {
    this.provider._onEvent(this.key, event, handler)
    return this
  }

  off(event: string, handler: EventHandler): this {
    this.provider._offEvent(this.key, event, handler)
    return this
  }

  onPresenceDiff(handler: PresenceDiffHandler): this {
    this.provider._onPresenceDiff(this.key, handler)
    return this
  }

  onPresenceState(handler: PresenceStateHandler): this {
    this.provider._onPresenceState(this.key, handler)
    return this
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Phase 0C RealtimeClient interface shape doesn't match — adapt to existing interface
- `getApiClient()` / auth token retrieval pattern different from expected

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-2: VilRealtimeProvider — Initialize + Feature Flag

**TASK ID:** 4B-2

**OWNER TYPE:** Frontend Agent

**GOAL:** Initialize VilRealtimeProvider di main.tsx atau RealtimeContext. Feature flag switch antara Supabase Realtime dan VIL WebSocket.

**DEPENDENCY:** Task 4B-1, Phase 0C (Realtime abstraction)

**READ FIRST:**

- `src/main.tsx` (existing initialization)
- `src/services/realtime/` (existing provider setup)
- `src/vite-env.d.ts` (env vars)

**EDIT ONLY:**

- `src/services/realtime/index.ts` — add VIL provider export + factory
- `src/main.tsx` atau `src/contexts/RealtimeContext.tsx` — initialize based on flag
- `src/vite-env.d.ts` — add `VITE_WS_URL` dan `VITE_REALTIME_BACKEND`

**DO NOT TOUCH:**

- `src/services/realtime/vilRealtimeProvider.ts` (sudah dari 4B-1)
- `src/services/realtime/supabaseRealtimeProvider.ts`

**IMPLEMENTATION STEPS:**

1. Add env vars: `VITE_WS_URL`, `VITE_REALTIME_BACKEND`
2. In initialization code, create VilRealtimeProvider jika `VITE_REALTIME_BACKEND=vil`
3. Provider singleton accessible via `getRealtimeProvider()`
4. Connect on auth state change (user logged in → connect, logout → disconnect)

**COPY-PASTE STARTER:**

```tsx
// === TAMBAHKAN ke src/vite-env.d.ts ===
  readonly VITE_WS_URL?: string
  readonly VITE_REALTIME_BACKEND?: 'supabase' | 'vil'

// === TAMBAHKAN ke src/services/realtime/index.ts ===
export { VilRealtimeProvider, VilRoomSubscription } from './vilRealtimeProvider'

import { VilRealtimeProvider } from './vilRealtimeProvider'

let _realtimeProvider: VilRealtimeProvider | null = null

export function initVilRealtime(wsUrl: string, getToken: () => string | null): VilRealtimeProvider {
  _realtimeProvider = new VilRealtimeProvider(wsUrl, getToken)
  return _realtimeProvider
}

export function getVilRealtime(): VilRealtimeProvider | null {
  return _realtimeProvider
}

export function getRealtimeBackend(): 'supabase' | 'vil' {
  return (import.meta.env.VITE_REALTIME_BACKEND as 'supabase' | 'vil') ?? 'supabase'
}

// === TAMBAHKAN di main.tsx atau AuthContext (setelah login success) ===
// if (getRealtimeBackend() === 'vil') {
//   const provider = initVilRealtime(
//     import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
//     () => session?.access_token ?? null
//   )
//   provider.connect()
// }
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Auth token retrieval pattern significantly different from expected

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-3: Migrate useNotifications.ts

**TASK ID:** 4B-3

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `useNotifications.ts` dari Supabase postgres_changes ke VIL WebSocket. Feature flag aware.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/notifications/hooks/useNotifications.ts` (existing)
- `src/services/realtime/vilRealtimeProvider.ts`

**EDIT ONLY:**

- `src/features/notifications/hooks/useNotifications.ts`

**DO NOT TOUCH:**

- `src/services/realtime/vilRealtimeProvider.ts`
- Other hook files

**IMPLEMENTATION STEPS:**

1. Import `getRealtimeBackend` dan `getVilRealtime`
2. If backend is `vil`, subscribe to `notifications` room instead of Supabase channel
3. Keep Supabase path for fallback
4. Handle `event` messages as new notifications → invalidate React Query

**COPY-PASTE STARTER:**

```tsx
// Pattern untuk migration (tambahkan di useNotifications.ts):
import { getRealtimeBackend, getVilRealtime } from '@/services/realtime'

// Di dalam useEffect atau subscription setup:
const realtimeBackend = getRealtimeBackend()

if (realtimeBackend === 'vil') {
  const provider = getVilRealtime()
  if (provider && userId) {
    const sub = provider.subscribe('notifications', userId)
    sub.on('INSERT', (payload: unknown) => {
      // Invalidate notifications query → refetch
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    })
    sub.on('UPDATE', (payload: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    })

    return () => {
      provider.unsubscribe('notifications', userId)
    }
  }
} else {
  // === EXISTING Supabase code (keep as-is) ===
  // supabase.channel('notifications')
  //   .on('postgres_changes', { event: 'INSERT', ... }, handler)
  //   .subscribe()
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Manual: login, trigger notification, verify it appears in real-time
```

**STOP IF:**

- `useNotifications.ts` structure significantly different from expected
- React Query key pattern different from `['notifications', userId]`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-4: Migrate useAdminNotifications.ts

**TASK ID:** 4B-4

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `useAdminNotifications.ts` dari Supabase postgres_changes ke VIL WebSocket.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/notifications/hooks/useAdminNotifications.ts` (existing)

**EDIT ONLY:**

- `src/features/notifications/hooks/useAdminNotifications.ts`

**DO NOT TOUCH:**

- `useNotifications.ts` (already migrated in 4B-3)

**IMPLEMENTATION STEPS:**

1. Same pattern as 4B-3
2. Subscribe to `notifications` room with admin user_id
3. Invalidate admin-specific query keys on event

**COPY-PASTE STARTER:**

```tsx
// Same pattern as Task 4B-3
// Subscribe: provider.subscribe('notifications', adminUserId)
// On INSERT/UPDATE: invalidate admin notification queries
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Admin notifications use a different subscription pattern than regular notifications

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-5: Migrate discussionQueries.ts

**TASK ID:** 4B-5

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `discussionQueries.ts` realtime subscription dari Supabase postgres_changes ke VIL WebSocket.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/discussions/queries/discussionQueries.ts` (existing)

**EDIT ONLY:**

- `src/features/discussions/queries/discussionQueries.ts`

**DO NOT TOUCH:**

- Other discussion files

**IMPLEMENTATION STEPS:**

1. Find Supabase channel subscription for discussion_comments
2. Replace with VIL: `provider.subscribe('discussion', threadId)`
3. On INSERT event → invalidate discussion comments query

**COPY-PASTE STARTER:**

```tsx
// Pattern:
if (realtimeBackend === 'vil') {
  const sub = provider.subscribe('discussion', threadId)
  sub.on('INSERT', () => {
    queryClient.invalidateQueries({ queryKey: ['discussion-comments', threadId] })
  })
  return () => provider.unsubscribe('discussion', threadId)
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- `discussionQueries.ts` doesn't have realtime subscription code

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-6: Migrate classroomService.ts

**TASK ID:** 4B-6

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `classroomService.ts` realtime subscription ke VIL WebSocket.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/classroom/api/classroomService.ts` (existing)

**EDIT ONLY:**

- `src/features/classroom/api/classroomService.ts`

**DO NOT TOUCH:**

- Other classroom files

**IMPLEMENTATION STEPS:**

1. Find Supabase postgres_changes subscription
2. Replace with VIL: `provider.subscribe('classroom', classId)`
3. On events → invalidate classroom queries

**COPY-PASTE STARTER:**

```tsx
// Pattern:
if (realtimeBackend === 'vil') {
  const sub = provider.subscribe('classroom', classId)
  sub.on('INSERT', () => queryClient.invalidateQueries({ queryKey: ['classroom', classId] }))
  sub.on('UPDATE', () => queryClient.invalidateQueries({ queryKey: ['classroom', classId] }))
  return () => provider.unsubscribe('classroom', classId)
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- `classroomService.ts` is a plain object (not a hook) — adjust pattern for non-hook subscription

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-7: Migrate useMessages.ts (Parent-Teacher Messaging)

**TASK ID:** 4B-7

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `useMessages.ts` broadcast subscription ke VIL WebSocket. Uses DURABLE channel (messaging via outbox).

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/parent/hooks/useMessages.ts` (existing) — atau lokasi aktual

**EDIT ONLY:**

- `src/features/parent/hooks/useMessages.ts`

**DO NOT TOUCH:**

- MessageThread.tsx (next task)

**IMPLEMENTATION STEPS:**

1. Find Supabase broadcast subscription for messages
2. Replace with VIL: `provider.subscribe('messaging', threadId)`
3. Note: messaging is DURABLE channel — server guarantees delivery via outbox
4. On INSERT event → invalidate messages query + append to local cache

**COPY-PASTE STARTER:**

```tsx
// Pattern (DURABLE channel — no message loss expected):
if (realtimeBackend === 'vil') {
  const sub = provider.subscribe('messaging', threadId)
  sub.on('INSERT', (payload: unknown) => {
    // Append new message to cache for instant display
    const newMsg = payload as MessagePayload
    queryClient.setQueryData(['messages', threadId], (old: MessagePayload[] | undefined) =>
      old ? [...old, newMsg] : [newMsg]
    )
    // Also invalidate for full consistency
    queryClient.invalidateQueries({ queryKey: ['messages', threadId] })
  })
  return () => provider.unsubscribe('messaging', threadId)
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Message payload shape from server doesn't match frontend `MessagePayload` type

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-8: Migrate MessageThread.tsx

**TASK ID:** 4B-8

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `MessageThread.tsx` broadcast subscription ke VIL WebSocket.

**DEPENDENCY:** Task 4B-7

**READ FIRST:**

- `src/features/parent/components/MessageThread.tsx` (existing) — atau lokasi aktual

**EDIT ONLY:**

- `src/features/parent/components/MessageThread.tsx`

**DO NOT TOUCH:**

- `useMessages.ts` (already done)

**IMPLEMENTATION STEPS:**

1. Find inline Supabase channel subscription
2. Replace with VIL subscription
3. This is a component — use `useEffect` cleanup

**COPY-PASTE STARTER:**

```tsx
// Pattern inside React component:
useEffect(() => {
  if (getRealtimeBackend() !== 'vil' || !threadId) return
  const provider = getVilRealtime()
  if (!provider) return

  const sub = provider.subscribe('messaging', threadId)
  sub.on('INSERT', (payload: unknown) => {
    // Handle new message in thread view
    refetch()
  })

  return () => {
    provider.unsubscribe('messaging', threadId)
  }
}, [threadId])
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Component doesn't have inline Supabase subscription — may already be handled by `useMessages.ts`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-9: Migrate groupAssignmentService.ts

**TASK ID:** 4B-9

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `groupAssignmentService.ts` broadcast ke VIL WebSocket.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/assignments/api/groupAssignmentService.ts` (existing) — atau lokasi aktual

**EDIT ONLY:**

- `src/features/assignments/api/groupAssignmentService.ts`

**DO NOT TOUCH:**

- Other assignment files

**IMPLEMENTATION STEPS:**

1. Find Supabase broadcast subscription
2. Replace with VIL: `provider.subscribe('group_assignment', assignmentId)`
3. On events → invalidate relevant queries

**COPY-PASTE STARTER:**

```tsx
// Pattern:
if (realtimeBackend === 'vil') {
  const sub = provider.subscribe('group_assignment', assignmentId)
  sub.on('INSERT', () =>
    queryClient.invalidateQueries({ queryKey: ['group-assignment', assignmentId] })
  )
  sub.on('UPDATE', () =>
    queryClient.invalidateQueries({ queryKey: ['group-assignment', assignmentId] })
  )
  return () => provider.unsubscribe('group_assignment', assignmentId)
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Service file is not a hook — adjust subscription pattern

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-10: Migrate useBuilderChannel.ts — Sub-task A: Event Subscription

**TASK ID:** 4B-10A

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `useBuilderChannel.ts` BROADCAST events (content updates) ke VIL WebSocket. This is the HIGH complexity consumer. Split into sub-tasks.

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/course-builder/hooks/useBuilderChannel.ts` (existing)
- Channel decision: builder_content = DURABLE (outbox), builder_presence = EPHEMERAL (pg_notify)

**EDIT ONLY:**

- `src/features/course-builder/hooks/useBuilderChannel.ts`

**DO NOT TOUCH:**

- `useBuilderPresence.ts` (next task)
- Course builder UI components

**IMPLEMENTATION STEPS:**

1. Identify all broadcast event types in existing code (content-update, module-add, module-delete, lesson-reorder, etc.)
2. Subscribe to `builder_content` room (DURABLE channel)
3. Re-emit same event payloads to existing handlers
4. Keep Supabase fallback path

**COPY-PASTE STARTER:**

```tsx
// Pattern for builder content channel (DURABLE):
if (realtimeBackend === 'vil') {
  const provider = getVilRealtime()
  if (provider && courseId) {
    const contentSub = provider.subscribe('builder_content', courseId)

    // Listen for content update events
    contentSub.on('content-update', (payload: unknown) => {
      handleContentUpdate(payload as ContentUpdatePayload)
    })
    contentSub.on('module-add', (payload: unknown) => {
      handleModuleAdd(payload as ModulePayload)
    })
    contentSub.on('module-delete', (payload: unknown) => {
      handleModuleDelete(payload as ModuleDeletePayload)
    })
    contentSub.on('lesson-reorder', (payload: unknown) => {
      handleLessonReorder(payload as ReorderPayload)
    })

    // Broadcast content changes to other users
    const broadcastContentUpdate = (event: string, payload: unknown) => {
      provider.broadcast('builder_content', courseId, event, payload)
    }

    return {
      broadcastContentUpdate,
      cleanup: () => provider.unsubscribe('builder_content', courseId),
    }
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- More than 8 distinct broadcast event types — list them all before implementing
- Content update payload shape ambiguous — check existing handler signatures
- Existing code mixes content + presence in same channel — must split for VIL

**⚠️ BUILDER CHANNEL SPLIT TEST (mandatory after 4B-10A/B + 4B-11 complete):**

Open builder in 3 browser tabs with 2 different users. Verify ALL of these simultaneously:

1. User A edits content → User B sees update (builder_content, durable channel)
2. User A moves cursor → User B sees cursor (builder_presence, ephemeral channel)
3. Disconnect User B's WiFi for 5s → Reconnect → Content edits NOT lost, cursor position refreshes
4. Both users edit different modules simultaneously → No event cross-contamination between content and presence rooms

If ANY of these fail, BLOCKED — presence/content split needs redesign.

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-10B: Migrate useBuilderChannel.ts — Sub-task B: Send Broadcast

**TASK ID:** 4B-10B

**OWNER TYPE:** Frontend Agent

**GOAL:** Wire up the "send" side of builder content broadcasts. When local user edits content, broadcast to other users via VIL.

**DEPENDENCY:** Task 4B-10A

**READ FIRST:**

- `src/features/course-builder/hooks/useBuilderChannel.ts` (after 4B-10A changes)

**EDIT ONLY:**

- `src/features/course-builder/hooks/useBuilderChannel.ts`

**DO NOT TOUCH:**

- `useBuilderPresence.ts`

**IMPLEMENTATION STEPS:**

1. Find all `.send({ type: 'broadcast', event: '...', payload: ... })` calls in existing code
2. Replace with `provider.broadcast('builder_content', courseId, event, payload)`
3. Ensure payload shape is identical

**COPY-PASTE STARTER:**

```tsx
// SEBELUM (Supabase):
// channel.send({ type: 'broadcast', event: 'content-update', payload: { ... } })

// SESUDAH (VIL):
provider.broadcast('builder_content', courseId, 'content-update', { ... })
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Manual: open builder in 2 tabs, edit in one, verify update appears in other
```

**STOP IF:**

- Broadcast send API shape doesn't match

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4B-11: Migrate useBuilderPresence.ts

**TASK ID:** 4B-11

**OWNER TYPE:** Frontend Agent

**GOAL:** Migrate `useBuilderPresence.ts` presence tracking ke VIL WebSocket. Uses EPHEMERAL channel (pg_notify OK).

**DEPENDENCY:** Task 4B-2

**READ FIRST:**

- `src/features/course-builder/hooks/useBuilderPresence.ts` (existing)

**EDIT ONLY:**

- `src/features/course-builder/hooks/useBuilderPresence.ts`

**DO NOT TOUCH:**

- `useBuilderChannel.ts` (already done)

**IMPLEMENTATION STEPS:**

1. Subscribe to `builder_presence` room
2. `track()` with user state (cursor, name)
3. Listen for `presence_state` and `presence_diff` events
4. Update local presence map
5. `untrack()` on cleanup

**COPY-PASTE STARTER:**

```tsx
// Pattern for presence (EPHEMERAL channel):
if (realtimeBackend === 'vil') {
  const provider = getVilRealtime()
  if (provider && courseId) {
    const sub = provider.subscribe('builder_presence', courseId)

    // Track our presence
    provider.track('builder_presence', courseId, {
      user_id: currentUserId,
      name: currentUserName,
      cursor_position: null,
    })

    // Listen for presence changes
    sub.onPresenceState((entries) => {
      // Full state sync (on subscribe)
      setPresenceMap(new Map(entries.map((e) => [e.user_id, e])))
    })

    sub.onPresenceDiff((joins, leaves) => {
      setPresenceMap((prev) => {
        const next = new Map(prev)
        for (const entry of joins) {
          next.set(entry.user_id, entry)
        }
        for (const userId of leaves) {
          next.delete(userId)
        }
        return next
      })
    })

    // Update cursor position
    const updateCursor = (position: CursorPosition) => {
      provider.track('builder_presence', courseId, {
        user_id: currentUserId,
        name: currentUserName,
        cursor_position: position,
      })
    }

    return () => {
      provider.untrack('builder_presence', courseId)
      provider.unsubscribe('builder_presence', courseId)
    }
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Manual: open builder in 2 tabs, verify both users appear in presence list
# Move cursor, verify cursor position updates in other tab
```

**STOP IF:**

- Presence state shape doesn't match existing UI components (avatar, cursor rendering)
- More than 2 cursor-related state fields — check existing presence payload

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Wave 4C — Verification & Testing (Minggu 58-60)

---

## Task 4C-1: Integration Test — WebSocket Connection & Auth

**TASK ID:** 4C-1

**OWNER TYPE:** Test Agent

**GOAL:** Write integration tests for WebSocket connection, auth, and basic messaging.

**DEPENDENCY:** Task 4A-9 (server fully wired)

**READ FIRST:**

- Agent Bootstrap Context §11 (testing patterns)
- `edusync-api/tests/` (existing test structure)

**EDIT ONLY:**

- `edusync-api/tests/websocket_test.rs` (BUAT BARU)

**DO NOT TOUCH:**

- Source files

**IMPLEMENTATION STEPS:**

1. Test: valid JWT → connection accepted
2. Test: invalid JWT → connection rejected (401)
3. Test: expired JWT → connection rejected
4. Test: subscribe → subscribed confirmation
5. Test: ping → pong
6. Test: broadcast → other subscriber receives event
7. Test: tenant isolation — user A cannot see user B's tenant rooms

**COPY-PASTE STARTER:**

```rust
// edusync-api/tests/websocket_test.rs
use axum::extract::ws::Message;
use tokio_tungstenite::connect_async;
use serde_json::json;

#[tokio::test]
async fn test_ws_auth_valid_token() {
    let app = spawn_test_server().await;
    let token = generate_test_jwt("test-user-1", "test-tenant-1", vec!["teacher"]);

    let url = format!("ws://127.0.0.1:{}/ws?token={}", app.port, token);
    let (ws, response) = connect_async(&url).await.expect("Failed to connect");

    assert_eq!(response.status(), 101); // Switching Protocols
    ws.close(None).await.ok();
}

#[tokio::test]
async fn test_ws_auth_invalid_token() {
    let app = spawn_test_server().await;
    let url = format!("ws://127.0.0.1:{}/ws?token=invalid-jwt", app.port);

    let result = connect_async(&url).await;
    // Should fail or receive 401
    assert!(result.is_err() || result.unwrap().1.status() == 401);
}

#[tokio::test]
async fn test_ws_ping_pong() {
    let app = spawn_test_server().await;
    let token = generate_test_jwt("test-user-1", "test-tenant-1", vec!["teacher"]);

    let url = format!("ws://127.0.0.1:{}/ws?token={}", app.port, token);
    let (mut ws, _) = connect_async(&url).await.unwrap();

    // Send ping
    ws.send(Message::Text(json!({"type": "ping"}).to_string().into())).await.unwrap();

    // Receive pong
    let msg = ws.next().await.unwrap().unwrap();
    let text = msg.into_text().unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(parsed["type"], "pong");
}

#[tokio::test]
async fn test_ws_subscribe_and_broadcast() {
    let app = spawn_test_server().await;
    let tenant = "test-tenant-1";
    let thread_id = "00000000-0000-0000-0000-000000000001";

    // User A subscribes
    let token_a = generate_test_jwt("user-a", tenant, vec!["teacher"]);
    let (mut ws_a, _) = connect_async(
        format!("ws://127.0.0.1:{}/ws?token={}", app.port, token_a)
    ).await.unwrap();

    ws_a.send(Message::Text(json!({
        "type": "subscribe",
        "room_type": "discussion",
        "entity_id": thread_id
    }).to_string().into())).await.unwrap();

    // Wait for subscribed confirmation
    let msg = ws_a.next().await.unwrap().unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&msg.into_text().unwrap()).unwrap();
    assert_eq!(parsed["type"], "subscribed");

    // User B subscribes and broadcasts
    let token_b = generate_test_jwt("user-b", tenant, vec!["student"]);
    let (mut ws_b, _) = connect_async(
        format!("ws://127.0.0.1:{}/ws?token={}", app.port, token_b)
    ).await.unwrap();

    ws_b.send(Message::Text(json!({
        "type": "subscribe",
        "room_type": "discussion",
        "entity_id": thread_id
    }).to_string().into())).await.unwrap();
    // Skip subscribed confirmation
    ws_b.next().await;

    ws_b.send(Message::Text(json!({
        "type": "broadcast",
        "room_type": "discussion",
        "entity_id": thread_id,
        "event": "new_comment",
        "payload": { "text": "Hello!" }
    }).to_string().into())).await.unwrap();

    // User A should receive the broadcast
    let msg = ws_a.next().await.unwrap().unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&msg.into_text().unwrap()).unwrap();
    assert_eq!(parsed["type"], "event");
    assert_eq!(parsed["event"], "new_comment");
}

#[tokio::test]
async fn test_ws_tenant_isolation() {
    let app = spawn_test_server().await;
    let thread_id = "00000000-0000-0000-0000-000000000001";

    // User from tenant A
    let token_a = generate_test_jwt("user-a", "tenant-a", vec!["teacher"]);
    let (mut ws_a, _) = connect_async(
        format!("ws://127.0.0.1:{}/ws?token={}", app.port, token_a)
    ).await.unwrap();

    // Try to subscribe with tenant-b's entity — should get error
    // (tenant_id comes from JWT, so room will be scoped to tenant-a)
    ws_a.send(Message::Text(json!({
        "type": "subscribe",
        "room_type": "discussion",
        "entity_id": thread_id
    }).to_string().into())).await.unwrap();

    let msg = ws_a.next().await.unwrap().unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&msg.into_text().unwrap()).unwrap();
    assert_eq!(parsed["type"], "subscribed");
    // Room key includes tenant-a → tenant-b user cannot see this room
}
```

**VERIFY:**

```
cd edusync-api && cargo test websocket_test
```

**STOP IF:**

- `tokio-tungstenite` not in Cargo.toml — add to dev-dependencies
- Test server spawn helper `spawn_test_server()` doesn't exist — create minimal helper or BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4C-2: E2E Test — Reconnection & Message Loss

**TASK ID:** 4C-2

**OWNER TYPE:** Test Agent (Frontend)

**GOAL:** Write Playwright E2E test for WebSocket reconnection and message buffering.

**DEPENDENCY:** Task 4B-2+, app running with VIL backend

**READ FIRST:**

- `tests/e2e/` (existing Playwright tests)
- Phase 4-6 Detail — reconnection test spec

**EDIT ONLY:**

- `tests/e2e/realtime.spec.ts` (BUAT BARU)

**DO NOT TOUCH:**

- Existing E2E tests

**IMPLEMENTATION STEPS:**

1. Test: user connects, subscribes, receives events
2. Test: simulate disconnect (close WS), verify reconnect within 30s
3. Test: messages buffered during disconnect are flushed after reconnect
4. Test: presence restored after reconnect

**COPY-PASTE STARTER:**

```tsx
// tests/e2e/realtime.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Realtime WebSocket', () => {
  test('notifications arrive in real-time', async ({ page }) => {
    // Login as teacher
    await page.goto('/#/login')
    // ... login steps ...

    // Navigate to dashboard where notifications hook is active
    await page.goto('/#/dashboard')

    // Trigger a notification (via API or DB insert)
    // Verify notification badge updates without page refresh
    // await expect(page.locator('[data-testid=notification-badge]')).toBeVisible()
  })

  test('WebSocket reconnects with exponential backoff', async ({ page }) => {
    await page.goto('/#/login')
    // ... login ...
    await page.goto('/#/dashboard')

    // Wait for WS connection
    await page.waitForTimeout(2000)

    // Simulate network disconnect
    await page.context().setOffline(true)
    await page.waitForTimeout(3000)

    // Reconnect
    await page.context().setOffline(false)
    await page.waitForTimeout(5000)

    // Verify app still works (trigger an action, check response)
    // Notifications should still arrive after reconnect
  })

  test('builder presence shows multiple users', async ({ browser }) => {
    // Open 2 browser contexts (2 users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login user 1 (teacher)
    // ... login page1 ...
    // Login user 2 (teacher)
    // ... login page2 ...

    // Both navigate to same course builder
    // await page1.goto('/#/courses/{courseId}/builder')
    // await page2.goto('/#/courses/{courseId}/builder')

    // Verify presence: both users visible
    // await expect(page1.locator('[data-testid=presence-avatar]')).toHaveCount(2)
    // await expect(page2.locator('[data-testid=presence-avatar]')).toHaveCount(2)

    await context1.close()
    await context2.close()
  })
})
```

**VERIFY:**

```
VITE_REALTIME_BACKEND=vil pnpm test:e2e -- --grep "Realtime"
```

**STOP IF:**

- E2E test environment can't run VIL WebSocket server
- `page.context().setOffline()` not supported in current Playwright version

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4C-3: Load Test — 100+ Concurrent WebSocket Connections

**TASK ID:** 4C-3

**OWNER TYPE:** Test Agent

**GOAL:** k6 load test for WebSocket server — verify 100+ concurrent connections with broadcast.

**DEPENDENCY:** Task 4A-9 (server running)

**READ FIRST:**

- `tests/load/` (existing k6 tests)

**EDIT ONLY:**

- `tests/load/websocket-load.js` (BUAT BARU)

**DO NOT TOUCH:**

- Existing load tests

**IMPLEMENTATION STEPS:**

1. k6 WebSocket test: connect 100 VUs
2. Each VU subscribes to a shared room
3. One VU broadcasts, others verify receipt
4. Measure connection time, message latency, error rate

**COPY-PASTE STARTER:**

```jsx
// tests/load/websocket-load.js
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const wsUrl = __ENV.WS_URL || 'ws://localhost:8080/ws'
// Token MUST be provided via env var. Fallback generates a test JWT.
// Pre-step: generate token with `node scripts/generate-test-jwt.js`
const token = __ENV.TEST_TOKEN
if (!token) {
  console.error(
    'ERROR: TEST_TOKEN env var required. Generate with: node scripts/generate-test-jwt.js'
  )
  // Minimal fallback for dev — will fail in CI without proper token
}

const errorRate = new Rate('ws_errors')
const msgLatency = new Trend('ws_msg_latency')

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50
    { duration: '30s', target: 100 }, // Ramp to 100
    { duration: '30s', target: 100 }, // Steady at 100
    { duration: '10s', target: 0 }, // Ramp down
  ],
  thresholds: {
    ws_errors: ['rate<0.01'], // <1% error rate
    ws_msg_latency: ['p(99)<500'], // P99 < 500ms
  },
}

export default function () {
  const url = `${wsUrl}?token=${token}`
  const roomType = 'discussion'
  const entityId = '00000000-0000-0000-0000-000000000001'

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Subscribe
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          room_type: roomType,
          entity_id: entityId,
        })
      )

      // Send periodic broadcasts
      socket.setInterval(() => {
        const start = Date.now()
        socket.send(
          JSON.stringify({
            type: 'broadcast',
            room_type: roomType,
            entity_id: entityId,
            event: 'load_test',
            payload: { timestamp: start, vu: __VU },
          })
        )
      }, 1000)

      // Ping every 10s
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping' }))
      }, 10000)
    })

    socket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg)
        if (data.type === 'event' && data.payload?.timestamp) {
          msgLatency.add(Date.now() - data.payload.timestamp)
        }
      } catch {
        errorRate.add(1)
      }
    })

    socket.on('error', () => {
      errorRate.add(1)
    })

    // Keep connection open for test duration
    socket.setTimeout(() => {
      socket.close()
    }, 70000) // 70s total
  })

  check(res, {
    'WS connection established': (r) => r && r.status === 101,
  })
}
```

**VERIFY:**

```
k6 run tests/load/websocket-load.js
# Verify: error rate < 1%, P99 latency < 500ms, 100 concurrent connections
```

**STOP IF:**

- k6 WebSocket module not available — install k6 with ws support
- Server crashes under 100 connections — investigate memory/file descriptor limits

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4C-5: Disable Supabase Realtime When VIL Active

**TASK ID:** 4C-5

**OWNER TYPE:** Frontend Agent

**GOAL:** Ensure Supabase Realtime channels are NOT created when `VITE_REALTIME_BACKEND=vil`. Prevent dual connections and duplicate event processing.

**DEPENDENCY:** All 4B tasks selesai

**READ FIRST:**

- All 9 migrated consumer files (4B-3 through 4B-11)

**EDIT ONLY:**

- All 9 migrated hooks/services — add early return before Supabase subscription code

**DO NOT TOUCH:**

- `src/services/realtime/vilRealtimeProvider.ts`

**IMPLEMENTATION STEPS:**

1. In each migrated file, wrap Supabase subscription code in `if (realtimeBackend !== 'vil')` guard
2. When VIL is active, Supabase channel creation MUST be skipped entirely (not just handler bypass)
3. Verify no Supabase `.channel()` or `.on('postgres_changes')` calls execute under VIL mode

**COPY-PASTE STARTER:**

```tsx
// Pattern for EVERY migrated hook — Supabase code must be guarded:
const realtimeBackend = getRealtimeBackend()

if (realtimeBackend === 'vil') {
  // VIL WebSocket path (already implemented in 4B-x tasks)
  // ...
} else {
  // Supabase path — ONLY runs when NOT using VIL
  const channel = supabase.channel(...)
  // ...
}
// WRONG pattern (causes dual connection):
// VIL subscription here...
// AND ALSO Supabase subscription below without guard
```

**VERIFY:**

```
# With VIL active, verify zero Supabase Realtime connections:
VITE_REALTIME_BACKEND=vil pnpm dev
# Open browser DevTools → Network → WS tab
# Should see ONLY 1 WebSocket connection (to VIL /ws)
# Should NOT see connection to Supabase Realtime

pnpm typecheck
pnpm lint
```

**STOP IF:**

- Any hook creates both VIL and Supabase subscriptions simultaneously

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4C-6: Nginx WebSocket Upgrade Config

**TASK ID:** 4C-6

**OWNER TYPE:** DevOps Agent

**GOAL:** Add WebSocket upgrade configuration to Nginx reverse proxy. WITHOUT this, all WebSocket connections through Nginx will fail with 400.

**DEPENDENCY:** Phase 1A-9 (Nginx config exists)

**READ FIRST:**

- `edusync-api/nginx/nginx.conf` (existing config from Phase 1A)

**EDIT ONLY:**

- `edusync-api/nginx/nginx.conf`

**DO NOT TOUCH:**

- Any Rust or frontend files

**IMPLEMENTATION STEPS:**

1. Add WebSocket-specific location block for `/ws`
2. Set `proxy_http_version 1.1`
3. Set `Upgrade` and `Connection` headers
4. Set appropriate timeouts for long-lived connections

**COPY-PASTE STARTER:**

```
# === TAMBAHKAN di dalam server block, SEBELUM location / ===

# WebSocket upgrade for VIL realtime
location /ws {
    proxy_pass http://edusync-api:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket timeouts (longer than HTTP)
    proxy_read_timeout 86400s;  # 24 hours — keep WS alive
    proxy_send_timeout 86400s;

    # Don't buffer WebSocket frames
    proxy_buffering off;
}
```

**VERIFY:**

```
# Restart Nginx
docker compose restart nginx

# Test WebSocket through Nginx
wscat -c "wss://api.edusync.id/ws?token=<valid-jwt>"
# OR for local:
wscat -c "ws://localhost/ws?token=<valid-jwt>"
# Should connect successfully
# Send: {"type":"ping"}
# Receive: {"type":"pong"}

# Verify HTTP still works
curl -s https://api.edusync.id/health | jq .
```

**STOP IF:**

- Nginx config file doesn't exist yet — create from Phase 1A template first

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 4C-4: Feature Flag Switch Test

**TASK ID:** 4C-4

**OWNER TYPE:** Test Agent (Frontend)

**GOAL:** Verify bahwa switching `VITE_REALTIME_BACKEND` antara `supabase` dan `vil` bekerja tanpa regressions.

**DEPENDENCY:** All 4B tasks selesai

**READ FIRST:**

- `src/services/realtime/index.ts`

**EDIT ONLY:**

- `tests/e2e/realtime-switch.spec.ts` (BUAT BARU)

**DO NOT TOUCH:**

- Source files

**IMPLEMENTATION STEPS:**

1. Run E2E tests with `VITE_REALTIME_BACKEND=supabase` → all pass
2. Run E2E tests with `VITE_REALTIME_BACKEND=vil` → all pass
3. Verify no Supabase Realtime imports remain in migrated files when using VIL

**COPY-PASTE STARTER:**

```
# Test with Supabase backend
VITE_REALTIME_BACKEND=supabase pnpm test:e2e

# Test with VIL backend
VITE_REALTIME_BACKEND=vil pnpm test:e2e

# Verify no regressions
diff <(VITE_REALTIME_BACKEND=supabase pnpm test:e2e --reporter=json 2>&1) \
     <(VITE_REALTIME_BACKEND=vil pnpm test:e2e --reporter=json 2>&1)
```

**VERIFY:**

```
# Both must pass with 0 failures
VITE_REALTIME_BACKEND=supabase pnpm test:e2e
VITE_REALTIME_BACKEND=vil pnpm test:e2e
```

**STOP IF:**

- E2E tests fail under `vil` but pass under `supabase` — debug specific failing test

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 📊 Task Dependency Map

| **Task**                 | **Depends On**   | **Can Parallel With** | **Estimated Hours** |
| ------------------------ | ---------------- | --------------------- | ------------------- |
| 4A-1 (Types)             | —                | 4A-6, 4A-8, 4A-10     | 2h                  |
| 4A-2 (WsHub)             | 4A-1             | 4A-3, 4A-6, 4A-8      | 4h                  |
| 4A-3 (Auth)              | 4A-1             | 4A-2, 4A-6, 4A-8      | 2h                  |
| 4A-4 (Handler)           | 4A-1, 4A-2, 4A-3 | 4A-6, 4A-8            | 4h                  |
| 4A-5 (pg_listener)       | 4A-2             | 4A-3, 4A-4, 4A-8      | 3h                  |
| 4A-6 (SQL Triggers)      | —                | All 4A Rust tasks     | 3h                  |
| 4A-7 (CDC Listener)      | 4A-2             | 4A-3, 4A-4, 4A-6      | 4h                  |
| 4A-8 (Outbox Migration)  | —                | All 4A Rust tasks     | 2h                  |
| 4A-9 (Wire Up)           | 4A-1 to 4A-8     | —                     | 2h                  |
| 4A-10 (Cargo.toml)       | —                | All 4A tasks          | 0.5h                |
| 4B-1 (Provider)          | Phase 0C         | 4A tasks              | 4h                  |
| 4B-2 (Init + Flag)       | 4B-1             | —                     | 1h                  |
| 4B-3 (Notifications)     | 4B-2             | 4B-4, 4B-5, 4B-6      | 2h                  |
| 4B-4 (Admin Notif)       | 4B-2             | 4B-3, 4B-5, 4B-6      | 1h                  |
| 4B-5 (Discussions)       | 4B-2             | 4B-3, 4B-4, 4B-6      | 1h                  |
| 4B-6 (Classroom)         | 4B-2             | 4B-3, 4B-4, 4B-5      | 1h                  |
| 4B-7 (Messages)          | 4B-2             | 4B-3-6                | 2h                  |
| 4B-8 (MessageThread)     | 4B-7             | —                     | 1h                  |
| 4B-9 (Group Assign)      | 4B-2             | 4B-3-8                | 1h                  |
| 4B-10A (Builder Events)  | 4B-2             | 4B-3-9                | 4h                  |
| 4B-10B (Builder Send)    | 4B-10A           | —                     | 2h                  |
| 4B-11 (Builder Presence) | 4B-2             | 4B-10A/B              | 3h                  |
| 4C-1 (Integration Test)  | 4A-9             | 4B tasks              | 4h                  |
| 4C-2 (E2E Reconnect)     | 4B-2+            | 4C-1                  | 3h                  |
| 4C-3 (Load Test)         | 4A-9             | 4B, 4C-1, 4C-2        | 2h                  |
| 4C-4 (Flag Switch)       | All 4B           | —                     | 2h                  |

**Total estimated: ~65 jam** (sesuai dengan alokasi ~120 jam Phase 4, sisanya untuk debugging, edge cases, dan integration issues)

_+5 jam dari original estimate untuk 4C-5 (Disable Supabase Realtime, 1h) dan 4C-6 (Nginx WS config, 1h) dan builder channel split testing (+3h di 4B-10A/4B-11)_

---

# 🚪 Phase 4 Gate Criteria

<aside>
🚪

**Gate 5: Jika realtime tidak reliable (message loss, presence gaps) → Keep Supabase Realtime, hanya migrasi REST endpoints.**

**Checklist sebelum pass Gate 5:**

- [ ] All 4C tests pass
- [ ] Collaborative builder works with 2+ users
- [ ] Notifications arrive within 1 second
- [ ] Reconnection tested (disconnect WiFi → reconnect → no message loss)
- [ ] Presence accurate (who's online, cursor positions)
- [ ] Load test: 100+ concurrent WebSocket connections, error rate < 1%
- [ ] Feature flag switch: both backends work
- [ ] No Supabase Realtime direct imports in migrated hooks (only in fallback path)
- [ ] Supabase Realtime NOT active when `VITE_REALTIME_BACKEND=vil` (no dual connections)
- [ ] Nginx WebSocket upgrade config deployed and tested
- [ ] Builder channel split tested: 2+ users, simultaneous content edit + cursor tracking
- [ ] Outbox cleanup scheduled via cron (not just TTL)
</aside>

---

## Catatan untuk Agent Selanjutnya (Phase 5+)

Setelah Phase 4 selesai dan Gate 5 passed:

1. **Phase 5 (Storage)** — lihat `Agent Task Queue — Phase 5`
2. **Supabase Realtime** bisa dimatikan setelah 2 minggu monitoring tanpa issues
3. Jika `vil_trigger_cdc` tersedia di kemudian hari, refactor outbox pattern → CDC untuk builder_content dan messaging channels
4. Monitor WebSocket memory usage di VIL Observer dashboard (`/_vil/dashboard/`)
