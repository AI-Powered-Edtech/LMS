//! PostgreSQL LISTEN/NOTIFY → WebSocket forwarding — uses VIL WsHub (VIL Way)
//!
//! Starts a background Tokio task that maintains a `PgListener` connected to
//! five PostgreSQL notification channels.  When a trigger fires `NOTIFY` on
//! one of those channels the payload is parsed and routed to the appropriate
//! WebSocket broadcast channel via `WsHub::broadcast`.
//!
//! ## Routing table
//!
//! | PostgreSQL channel      | WS channel pattern              | Discriminating field |
//! |-------------------------|---------------------------------|----------------------|
//! | `notify_notifications`  | `notifications:{user_id}`       | `record.user_id`     |
//! | `notify_messages`       | `messages:{room_id}`            | `record.room_id`     |
//! | `notify_discussions`    | `discussions:tenant:{tenant_id}`| `tenant_id`          |
//! | `notify_classroom`      | `classroom:{class_id}`          | `record.class_id`    |
//! | `notify_builder`        | `builder:{course_id}`           | `record.id`          |
//!
//! ## Payload format from PostgreSQL triggers
//!
//! ```json
//! {
//!   "table":     "notifications",
//!   "event":     "INSERT",
//!   "tenant_id": "uuid",
//!   "record":    { "id": "uuid", "user_id": "uuid", … },
//!   "old":       null
//! }
//! ```

use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgListener;
use sqlx::PgPool;
use vil_server::prelude::WsHub;

use super::room::WsMessage;

/// PostgreSQL channels to listen on.
const PG_CHANNELS: &[&str] = &[
    "notify_notifications",
    "notify_messages",
    "notify_discussions",
    "notify_classroom",
    "notify_builder",
];

/// Retry delay when the listener fails to connect or receives an error.
const RETRY_DELAY: Duration = Duration::from_secs(5);

// ── Public API ─────────────────────────────────────────────────────────────────

/// Spawn a background Tokio task that forwards PostgreSQL NOTIFY events to
/// the VIL `WsHub`.
///
/// The task never returns normally; it retries indefinitely on failure with
/// a 5-second back-off.  It is designed to run for the lifetime of the process.
pub fn start_pg_listener(db: PgPool, hub: Arc<WsHub>) {
    tokio::spawn(async move {
        loop {
            match run_listener(&db, &hub).await {
                Ok(()) => {
                    tracing::info!("pg_notify listener selesai, memulai ulang…");
                }
                Err(err) => {
                    tracing::error!(
                        error = %err,
                        "pg_notify listener gagal, mencoba ulang dalam {} detik",
                        RETRY_DELAY.as_secs()
                    );
                }
            }
            tokio::time::sleep(RETRY_DELAY).await;
        }
    });
}

// ── Internal implementation ────────────────────────────────────────────────────

/// Connect a `PgListener`, subscribe to all channels, and forward notifications
/// until an error occurs.
async fn run_listener(db: &PgPool, hub: &Arc<WsHub>) -> Result<(), sqlx::Error> {
    let mut listener = PgListener::connect_with(db).await?;

    listener.listen_all(PG_CHANNELS).await?;

    tracing::info!(
        channels = ?PG_CHANNELS,
        "pg_notify listener aktif pada {} channel",
        PG_CHANNELS.len()
    );

    loop {
        let notification = listener.recv().await?;
        let pg_channel = notification.channel();
        let payload_str = notification.payload();

        tracing::debug!(
            pg_channel,
            payload_len = payload_str.len(),
            "Notifikasi PostgreSQL diterima"
        );

        match serde_json::from_str::<serde_json::Value>(payload_str) {
            Ok(payload) => route_pg_notification(pg_channel, payload, hub),
            Err(err) => {
                tracing::warn!(
                    pg_channel,
                    error = %err,
                    raw_payload = payload_str,
                    "Gagal mem-parse payload NOTIFY sebagai JSON — dilewati"
                );
            }
        }
    }
}

/// Route a parsed NOTIFY payload to the correct WebSocket broadcast channel.
///
/// Each branch extracts the discriminating field from `payload`, constructs
/// the WS channel name, serialises a `WsMessage::postgres_changes` envelope,
/// and calls `hub.broadcast(ws_channel, json_string)`.
fn route_pg_notification(pg_channel: &str, payload: serde_json::Value, hub: &Arc<WsHub>) {
    match pg_channel {
        // ── notifications:{user_id} ───────────────────────────────────────────
        "notify_notifications" => {
            let user_id = payload
                .get("record")
                .and_then(|r| r.get("user_id"))
                .and_then(|v| v.as_str());

            match user_id {
                Some(uid) => {
                    let ws_channel = format!("notifications:{uid}");
                    forward_to_hub(hub, &ws_channel, &payload);
                }
                None => {
                    tracing::warn!(
                        pg_channel,
                        "notify_notifications: field record.user_id tidak ditemukan dalam payload"
                    );
                }
            }
        }

        // ── messages:{room_id} ────────────────────────────────────────────────
        "notify_messages" => {
            let room_id = payload
                .get("record")
                .and_then(|r| r.get("room_id"))
                .and_then(|v| v.as_str());

            match room_id {
                Some(rid) => {
                    let ws_channel = format!("messages:{rid}");
                    forward_to_hub(hub, &ws_channel, &payload);
                }
                None => {
                    tracing::warn!(
                        pg_channel,
                        "notify_messages: field record.room_id tidak ditemukan dalam payload"
                    );
                }
            }
        }

        // ── discussions:tenant:{tenant_id} ────────────────────────────────────
        "notify_discussions" => {
            let tenant_id = payload.get("tenant_id").and_then(|v| v.as_str());

            match tenant_id {
                Some(tid) => {
                    let ws_channel = format!("discussions:tenant:{tid}");
                    forward_to_hub(hub, &ws_channel, &payload);
                }
                None => {
                    tracing::warn!(
                        pg_channel,
                        "notify_discussions: field tenant_id tidak ditemukan dalam payload"
                    );
                }
            }
        }

        // ── classroom:{class_id} ──────────────────────────────────────────────
        "notify_classroom" => {
            let class_id = payload
                .get("record")
                .and_then(|r| r.get("class_id").or_else(|| r.get("id")))
                .and_then(|v| v.as_str());

            match class_id {
                Some(cid) => {
                    let ws_channel = format!("classroom:{cid}");
                    forward_to_hub(hub, &ws_channel, &payload);
                }
                None => {
                    tracing::warn!(
                        pg_channel,
                        "notify_classroom: field record.class_id/id tidak ditemukan dalam payload"
                    );
                }
            }
        }

        // ── builder:{course_id} ───────────────────────────────────────────────
        "notify_builder" => {
            let course_id = payload
                .get("record")
                .and_then(|r| r.get("id"))
                .and_then(|v| v.as_str());

            match course_id {
                Some(cid) => {
                    let ws_channel = format!("builder:{cid}");
                    forward_to_hub(hub, &ws_channel, &payload);
                }
                None => {
                    tracing::warn!(
                        pg_channel,
                        "notify_builder: field record.id tidak ditemukan dalam payload"
                    );
                }
            }
        }

        other => {
            tracing::warn!(
                pg_channel = other,
                "pg_notify: channel tidak dikenal, payload diabaikan"
            );
        }
    }
}

/// Serialise a `postgres_changes` WsMessage envelope and broadcast it via
/// `WsHub::broadcast(ws_channel, json_string)`.
fn forward_to_hub(hub: &Arc<WsHub>, ws_channel: &str, pg_payload: &serde_json::Value) {
    let ws_payload = build_ws_payload(pg_payload);
    let msg = WsMessage::postgres_changes(ws_channel, ws_payload);
    match serde_json::to_string(&msg) {
        Ok(json) => {
            tracing::debug!(ws_channel, "Meneruskan notifikasi ke WsHub channel");
            hub.broadcast(ws_channel, json);
        }
        Err(e) => {
            tracing::warn!(
                ws_channel,
                error = %e,
                "Gagal serialisasi WsMessage untuk broadcast"
            );
        }
    }
}

/// Build the `postgres_changes`-style payload that the client expects:
///
/// ```json
/// {
///   "eventType": "INSERT",
///   "table": "notifications",
///   "new": { … },
///   "old": null
/// }
/// ```
fn build_ws_payload(pg_payload: &serde_json::Value) -> serde_json::Value {
    let event_type = pg_payload
        .get("event")
        .and_then(|v| v.as_str())
        .unwrap_or("UNKNOWN");

    let table = pg_payload
        .get("table")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let new_record = pg_payload
        .get("record")
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let old_record = pg_payload
        .get("old")
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    serde_json::json!({
        "eventType": event_type,
        "table":     table,
        "new":       new_record,
        "old":       old_record,
    })
}
