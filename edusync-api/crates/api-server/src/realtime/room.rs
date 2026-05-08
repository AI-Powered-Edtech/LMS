//! Room management — replaced by VIL WsHub (VIL Way)
//!
//! The manual `RoomManager` (broadcast::Sender per channel + presence Mutex)
//! has been superseded by `vil_server::prelude::WsHub`, which provides the
//! same broadcast, presence-tracking, and channel-management primitives as
//! a first-class VIL primitive.
//!
//! `WsMessage` is kept here because it is shared by `handler.rs` and
//! `pg_notify.rs` as the over-the-wire JSON envelope.

use serde::{Deserialize, Serialize};

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

// ---------------------------------------------------------------------------
// Compatibility shim: WsHub is the VIL replacement for RoomManager.
// Injected in main.rs via `.extension(Arc::new(WsHub::new()))` and accessed
// in handlers via `svc.state::<Arc<WsHub>>()`.
// ---------------------------------------------------------------------------
