//! RoomManager: manages WebSocket broadcast channels and presence state.
//!
//! Each "channel" (e.g. `"builder:course-123"`) has a `broadcast::Sender<WsMessage>`.
//! Clients subscribe by calling `get_or_create()` which returns a `Receiver`.
//! The sender is retained in `channels` so any holder can call `broadcast()`.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

/// Capacity of each per-channel broadcast ring buffer.
/// Lagging receivers are dropped messages (not backpressured).
const CHANNEL_CAPACITY: usize = 64;

/// A message broadcast to all subscribers of a WebSocket channel.
///
/// Fields are `Option` so that the same struct can represent all message
/// types without per-type newtypes. Serde skips `None` fields.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    /// Message type discriminant (e.g. `"broadcast"`, `"presence_sync"`, …)
    #[serde(rename = "type")]
    pub msg_type: String,

    /// The WebSocket channel this message belongs to, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,

    /// Event name carried inside the message, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event: Option<String>,

    /// Arbitrary JSON payload, if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,

    /// Presence state map (`{ user_id: [presence_data] }`), if applicable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<serde_json::Value>,

    /// Human-readable error / info text for `"error"` messages.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl WsMessage {
    /// Construct a `system` event (SUBSCRIBED / CLOSED / …).
    pub fn system(channel: impl Into<String>, event: impl Into<String>) -> Self {
        Self {
            msg_type: "system".into(),
            channel: Some(channel.into()),
            event: Some(event.into()),
            payload: None,
            state: None,
            message: None,
        }
    }

    /// Construct a `pong` message.
    pub fn pong() -> Self {
        Self {
            msg_type: "pong".into(),
            channel: None,
            event: None,
            payload: None,
            state: None,
            message: None,
        }
    }

    /// Construct an `error` message with a Bahasa Indonesia message string.
    pub fn error(msg: impl Into<String>) -> Self {
        Self {
            msg_type: "error".into(),
            channel: None,
            event: None,
            payload: None,
            state: None,
            message: Some(msg.into()),
        }
    }

    /// Construct a `presence_sync` message for the given channel.
    pub fn presence_sync(channel: impl Into<String>, state: serde_json::Value) -> Self {
        Self {
            msg_type: "presence_sync".into(),
            channel: Some(channel.into()),
            event: None,
            payload: None,
            state: Some(state),
            message: None,
        }
    }

    /// Construct a `postgres_changes` message.
    pub fn postgres_changes(channel: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            msg_type: "postgres_changes".into(),
            channel: Some(channel.into()),
            event: None,
            payload: Some(payload),
            state: None,
            message: None,
        }
    }
}

/// Manages WebSocket broadcast channels and per-channel presence state.
///
/// Designed to be held behind `Arc<RoomManager>` and shared across Axum
/// handlers and the background PgListener task.
pub struct RoomManager {
    /// channel name → broadcast sender (retained so we can send from any task).
    channels: Mutex<HashMap<String, broadcast::Sender<WsMessage>>>,

    /// channel name → { user_id → presence_data }
    presence: Mutex<HashMap<String, HashMap<String, serde_json::Value>>>,

    /// Total live connection counter for monitoring / alerting.
    connection_count: std::sync::atomic::AtomicUsize,
}

impl RoomManager {
    /// Create a new `RoomManager` wrapped in `Arc`.
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            channels: Mutex::new(HashMap::new()),
            presence: Mutex::new(HashMap::new()),
            connection_count: std::sync::atomic::AtomicUsize::new(0),
        })
    }

    // ── Connection tracking ────────────────────────────────────────────────────

    /// Increment and return the current connection count.
    pub fn increment_connections(&self) -> usize {
        let count = self
            .connection_count
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
            + 1;
        if count > 1000 {
            tracing::warn!(
                count,
                "Jumlah koneksi WebSocket melebihi batas 1000 — pertimbangkan untuk scale-out"
            );
        }
        count
    }

    /// Decrement the connection count.
    pub fn decrement_connections(&self) {
        self.connection_count
            .fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    }

    // ── Channel management ─────────────────────────────────────────────────────

    /// Get or create the broadcast channel for `channel`, returning a fresh `Receiver`.
    ///
    /// Stale channels with no active senders are pruned on next access.
    pub fn get_or_create(&self, channel: &str) -> broadcast::Receiver<WsMessage> {
        let mut channels = self
            .channels
            .lock()
            .expect("RoomManager::channels mutex poisoned");

        // Prune channels that have no active subscribers.
        // `receiver_count()` returns the number of live Receivers currently
        // subscribed to this sender.  When it reaches 0 the channel is dead.
        channels.retain(|_, tx| tx.receiver_count() > 0);

        if let Some(tx) = channels.get(channel) {
            tx.subscribe()
        } else {
            let (tx, rx) = broadcast::channel(CHANNEL_CAPACITY);
            channels.insert(channel.to_owned(), tx);
            rx
        }
    }

    /// Broadcast `msg` to all current subscribers of `channel`.
    ///
    /// Returns silently if no subscribers are present (lagged receivers
    /// lose old messages; that is acceptable behaviour here).
    pub fn broadcast(&self, channel: &str, msg: WsMessage) {
        let channels = self
            .channels
            .lock()
            .expect("RoomManager::channels mutex poisoned");

        if let Some(tx) = channels.get(channel) {
            // Ignore send error — it just means no subscribers are alive right now.
            let _ = tx.send(msg);
        }
    }

    // ── Presence ───────────────────────────────────────────────────────────────

    /// Record `data` as the presence entry for `user_id` in `channel`.
    ///
    /// After recording, broadcasts a `presence_sync` to all channel subscribers.
    pub fn track_presence(&self, channel: &str, user_id: &str, data: serde_json::Value) {
        {
            let mut presence = self
                .presence
                .lock()
                .expect("RoomManager::presence mutex poisoned");
            presence
                .entry(channel.to_owned())
                .or_default()
                .insert(user_id.to_owned(), data);
        }
        self.broadcast_presence_sync(channel);
    }

    /// Remove the presence entry for `user_id` from `channel`.
    ///
    /// After removing, broadcasts a `presence_sync` to all channel subscribers.
    pub fn untrack_presence(&self, channel: &str, user_id: &str) {
        {
            let mut presence = self
                .presence
                .lock()
                .expect("RoomManager::presence mutex poisoned");
            if let Some(chan_map) = presence.get_mut(channel) {
                chan_map.remove(user_id);
                if chan_map.is_empty() {
                    presence.remove(channel);
                }
            }
        }
        self.broadcast_presence_sync(channel);
    }

    /// Return the current presence state for `channel` as
    /// `{ user_id: [presence_data] }` (Supabase Realtime–compatible format).
    pub fn presence_state(&self, channel: &str) -> HashMap<String, Vec<serde_json::Value>> {
        let presence = self
            .presence
            .lock()
            .expect("RoomManager::presence mutex poisoned");

        presence
            .get(channel)
            .map(|map| {
                map.iter()
                    .map(|(uid, data)| (uid.clone(), vec![data.clone()]))
                    .collect()
            })
            .unwrap_or_default()
    }

    // ── PostgreSQL NOTIFY forwarding ───────────────────────────────────────────

    /// Forward a PostgreSQL NOTIFY payload to all subscribers of `pg_channel`.
    ///
    /// The `pg_channel` here is the **WebSocket** channel name (already mapped
    /// by `pg_notify::route_pg_notification`), e.g. `"notifications:user-uuid"`.
    pub fn forward_pg_notify(&self, ws_channel: &str, payload: serde_json::Value) {
        let msg = WsMessage::postgres_changes(ws_channel, payload);
        self.broadcast(ws_channel, msg);
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    /// Broadcast the current presence state for `channel` to all subscribers.
    fn broadcast_presence_sync(&self, channel: &str) {
        let state_map = self.presence_state(channel);
        let state_json = serde_json::to_value(&state_map).unwrap_or(serde_json::Value::Null);
        let msg = WsMessage::presence_sync(channel, state_json);
        self.broadcast(channel, msg);
    }
}
