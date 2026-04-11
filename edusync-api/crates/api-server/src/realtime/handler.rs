//! WebSocket upgrade handler for the EduSync realtime subsystem.
//!
//! Endpoint: `GET /ws?token=<JWT>`
//!
//! ## Design
//!
//! Each WebSocket connection runs two cooperative halves inside one async task:
//!
//! ```text
//!  ┌─────────────────────────────────────────────────────────┐
//!  │  handle_socket                                           │
//!  │                                                          │
//!  │  ws_receiver ──► [parse ClientMessage] ─────────────┐   │
//!  │                                                      │   │
//!  │  broadcast::Receiver(s) ──► relay task ──► out_tx   │   │
//!  │                                              │       │   │
//!  │  heartbeat tick ──────────────────────► out_tx       │   │
//!  │                                              │       │   │
//!  │                                           out_rx ──► ws_sender
//!  └─────────────────────────────────────────────────────────┘
//! ```
//!
//! ### Broadcast polling strategy
//!
//! Each channel join spawns a lightweight relay task that `recv().await`s on
//! the `broadcast::Receiver` and forwards messages over an `mpsc` channel
//! back to the main loop.  This avoids the O(n·channels) polling overhead of
//! `try_recv` loops and eliminates the 10ms idle spin.
//!
//! When the client sends `leave` the relay task is cancelled by dropping the
//! `JoinHandle`.
//!
//! ## Connection lifecycle
//!
//! 1. Optional JWT auth — invalid tokens are rejected before upgrade.
//! 2. Global connection counter incremented; warning logged if > 1000.
//! 3. `tokio::select!` loop processes incoming frames, outgoing broadcasts,
//!    and server-side heartbeats.
//! 4. On disconnect: presence untracks, relay tasks cancelled, counter decremented.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message as AxumWsMessage, WebSocket, WebSocketUpgrade},
        Extension, Query,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio::time::interval;

use edusync_auth::verify_access_token;

use super::room::{RoomManager, WsMessage};
use crate::state::AppState;

// ── Constants ──────────────────────────────────────────────────────────────────

/// Maximum size of a single incoming WebSocket message in bytes (64 KiB).
const MAX_MESSAGE_BYTES: usize = 64 * 1024;

/// Maximum channels a single connection may join simultaneously.
const MAX_CHANNELS_PER_CONNECTION: usize = 10;

/// Server-side heartbeat interval — also acts as a connection liveness probe.
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);

/// Capacity of the outgoing mpsc queue (socket sender backpressure).
const OUTGOING_BUFFER: usize = 128;

/// Capacity of the relay mpsc queue per joined channel.
const RELAY_BUFFER: usize = 64;

// ── Query params ───────────────────────────────────────────────────────────────

/// Query parameters accepted on the WebSocket upgrade request.
#[derive(Debug, Deserialize)]
pub struct WsConnectQuery {
    /// Optional JWT access token.  Present → authenticated connection.
    pub token: Option<String>,
}

// ── Inbound message schema ─────────────────────────────────────────────────────

/// Messages the client is allowed to send over the WebSocket connection.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientMessage {
    /// Subscribe to a broadcast channel.
    Join { channel: String },
    /// Unsubscribe from a broadcast channel.
    Leave { channel: String },
    /// Broadcast an event payload to all other subscribers of the channel.
    Broadcast {
        channel: String,
        event: String,
        payload: Option<serde_json::Value>,
    },
    /// Register or update presence data for this user in a channel.
    Track {
        channel: String,
        payload: Option<serde_json::Value>,
    },
    /// Remove presence data for this user from a channel.
    Untrack { channel: String },
    /// Application-level ping — server replies with `pong`.
    Ping,
}

// ── Handler entry-point ────────────────────────────────────────────────────────

/// `GET /ws` — Axum WebSocket upgrade endpoint.
///
/// Add to the Axum router in `main.rs`:
/// ```ignore
/// use axum::routing::get;
/// let ws_router = Router::new()
///     .route("/ws", get(ws_handler))
///     .layer(Extension(Arc::clone(&rooms)));
/// ```
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsConnectQuery>,
    Extension(state): Extension<Arc<AppState>>,
    Extension(rooms): Extension<Arc<RoomManager>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, rooms, params.token))
}

// ── Socket handler ─────────────────────────────────────────────────────────────

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    rooms: Arc<RoomManager>,
    token: Option<String>,
) {
    // ── 1. Optional JWT authentication ────────────────────────────────────────
    //
    // If a token is supplied it must be valid.  We reject invalid tokens
    // before touching the connection counter or spawning any tasks.
    let (user_id, _tenant_id): (Option<String>, Option<String>) = match token.as_deref() {
        Some(tok) => match verify_access_token(tok, &state.jwt_secret) {
            Ok(claims) => {
                tracing::debug!(
                    user_id = %claims.sub,
                    tenant_id = ?claims.tenant_id,
                    "Koneksi WebSocket terautentikasi"
                );
                (Some(claims.sub), claims.tenant_id)
            }
            Err(err) => {
                tracing::warn!(error = %err, "Token WebSocket tidak valid — koneksi ditolak");
                // Send an error frame then close without counting this connection.
                let (mut sender, _receiver) = socket.split();
                let msg = WsMessage::error("Token tidak valid atau sudah kedaluwarsa");
                if let Ok(json) = serde_json::to_string(&msg) {
                    let _ = sender.send(AxumWsMessage::Text(json.into())).await;
                }
                let _ = sender.close().await;
                return;
            }
        },
        None => {
            tracing::debug!("Koneksi WebSocket anonim (tanpa token)");
            (None, None)
        }
    };

    // ── 2. Global connection counter ──────────────────────────────────────────
    let conn_count = rooms.increment_connections();
    tracing::info!(
        conn_count,
        user_id = ?user_id,
        "Koneksi WebSocket dibuka"
    );

    // ── 3. Socket I/O split ───────────────────────────────────────────────────
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // All outgoing messages flow through this mpsc channel so the sender task
    // owns exclusive access to `ws_sender`.
    let (out_tx, mut out_rx) = mpsc::channel::<String>(OUTGOING_BUFFER);

    // Relay channel: broadcast::Receiver relay tasks push messages here.
    let (relay_tx, mut relay_rx) =
        mpsc::channel::<WsMessage>(RELAY_BUFFER * MAX_CHANNELS_PER_CONNECTION);

    // Spawn the dedicated sender task.
    let sender_task: JoinHandle<()> = tokio::spawn(async move {
        while let Some(json) = out_rx.recv().await {
            if ws_sender
                .send(AxumWsMessage::Text(json.into()))
                .await
                .is_err()
            {
                break;
            }
        }
        let _ = ws_sender.close().await;
    });

    // ── 4. Per-connection state ───────────────────────────────────────────────
    /// Per-channel relay handle: the JoinHandle allows us to cancel the relay
    /// task when the client leaves a channel.
    struct ChannelHandle {
        relay: JoinHandle<()>,
    }

    let mut joined: HashMap<String, ChannelHandle> = HashMap::new();
    let mut tracked_channels: HashSet<String> = HashSet::new();
    let mut heartbeat = interval(HEARTBEAT_INTERVAL);
    heartbeat.tick().await; // discard the immediate first tick

    // ── Helper macro: serialise + enqueue a WsMessage ─────────────────────────
    macro_rules! send_msg {
        ($msg:expr) => {{
            if let Ok(json) = serde_json::to_string(&$msg) {
                // try_send: if the buffer is full we drop the message rather
                // than blocking — the client is lagging, not us.
                let _ = out_tx.try_send(json);
            }
        }};
    }

    // ── 5. Main event loop ────────────────────────────────────────────────────
    'main: loop {
        tokio::select! {
            // ── A: incoming WebSocket frame ──────────────────────────────────
            frame = ws_receiver.next() => {
                match frame {
                    None => {
                        tracing::debug!(user_id = ?user_id, "WebSocket ditutup oleh klien");
                        break 'main;
                    }
                    Some(Err(err)) => {
                        tracing::warn!(error = %err, user_id = ?user_id, "Error saat membaca frame WebSocket");
                        break 'main;
                    }
                    Some(Ok(AxumWsMessage::Close(_))) => {
                        tracing::debug!(user_id = ?user_id, "Frame Close WS diterima");
                        break 'main;
                    }
                    Some(Ok(AxumWsMessage::Ping(data))) => {
                        // Protocol-level ping — Axum replies automatically, but
                        // we also send an application-level pong for symmetry.
                        drop(data);
                        send_msg!(WsMessage::pong());
                    }
                    Some(Ok(AxumWsMessage::Text(text))) => {
                        if text.len() > MAX_MESSAGE_BYTES {
                            send_msg!(WsMessage::error("Pesan terlalu besar (maksimal 64 KB)"));
                            continue 'main;
                        }

                        match serde_json::from_str::<ClientMessage>(&text) {
                            Err(_) => {
                                send_msg!(WsMessage::error(
                                    "Format pesan tidak valid — gunakan JSON sesuai protokol"
                                ));
                            }

                            Ok(ClientMessage::Ping) => {
                                send_msg!(WsMessage::pong());
                            }

                            Ok(ClientMessage::Join { channel }) => {
                                if joined.len() >= MAX_CHANNELS_PER_CONNECTION {
                                    send_msg!(WsMessage::error(
                                        "Batas maksimum channel tercapai (10 channel per koneksi)"
                                    ));
                                    continue 'main;
                                }

                                if joined.contains_key(&channel) {
                                    // Idempotent — re-acknowledge.
                                    send_msg!(WsMessage::system(&channel, "SUBSCRIBED"));
                                    continue 'main;
                                }

                                // Get a broadcast receiver and spawn a relay task.
                                let rx = rooms.get_or_create(&channel);
                                let relay_tx2 = relay_tx.clone();
                                let relay_task: JoinHandle<()> = tokio::spawn(
                                    relay_broadcast(rx, relay_tx2)
                                );

                                joined.insert(channel.clone(), ChannelHandle { relay: relay_task });

                                tracing::debug!(channel, "Klien bergabung ke channel");
                                send_msg!(WsMessage::system(&channel, "SUBSCRIBED"));
                            }

                            Ok(ClientMessage::Leave { channel }) => {
                                if let Some(handle) = joined.remove(&channel) {
                                    handle.relay.abort(); // cancel relay task
                                    if tracked_channels.remove(&channel) {
                                        if let Some(uid) = user_id.as_deref() {
                                            rooms.untrack_presence(&channel, uid);
                                        }
                                    }
                                    tracing::debug!(channel, "Klien keluar dari channel");
                                    send_msg!(WsMessage::system(&channel, "CLOSED"));
                                }
                            }

                            Ok(ClientMessage::Broadcast { channel, event, payload }) => {
                                if joined.contains_key(&channel) {
                                    let msg = WsMessage {
                                        msg_type: "broadcast".into(),
                                        channel: Some(channel.clone()),
                                        event: Some(event),
                                        payload,
                                        state: None,
                                        message: None,
                                    };
                                    rooms.broadcast(&channel, msg);
                                } else {
                                    send_msg!(WsMessage::error(
                                        "Bergabunglah ke channel terlebih dahulu sebelum mengirim pesan"
                                    ));
                                }
                            }

                            Ok(ClientMessage::Track { channel, payload }) => {
                                if !joined.contains_key(&channel) {
                                    send_msg!(WsMessage::error(
                                        "Bergabunglah ke channel terlebih dahulu sebelum melacak kehadiran"
                                    ));
                                } else if let Some(uid) = user_id.as_deref() {
                                    let data = payload.unwrap_or_else(|| {
                                        serde_json::Value::Object(serde_json::Map::new())
                                    });
                                    rooms.track_presence(&channel, uid, data);
                                    tracked_channels.insert(channel);
                                } else {
                                    send_msg!(WsMessage::error(
                                        "Autentikasi diperlukan untuk melacak kehadiran"
                                    ));
                                }
                            }

                            Ok(ClientMessage::Untrack { channel }) => {
                                if let Some(uid) = user_id.as_deref() {
                                    rooms.untrack_presence(&channel, uid);
                                    tracked_channels.remove(&channel);
                                }
                            }
                        }
                    }

                    Some(Ok(_)) => {
                        // Binary frames and other variants — silently ignored.
                    }
                }
            }

            // ── B: outgoing broadcast from a relay task ──────────────────────
            Some(ws_msg) = relay_rx.recv() => {
                send_msg!(ws_msg);
            }

            // ── C: server-side heartbeat ─────────────────────────────────────
            _ = heartbeat.tick() => {
                send_msg!(WsMessage::pong());
            }
        }
    }

    // ── 6. Cleanup on disconnect ──────────────────────────────────────────────
    // Untrack presence from all channels this connection was tracking.
    if let Some(uid) = user_id.as_deref() {
        for channel in &tracked_channels {
            rooms.untrack_presence(channel, uid);
        }
    }

    // Abort all relay tasks (cancels broadcast::recv().await in each).
    for (channel, handle) in joined {
        handle.relay.abort();
        tracing::debug!(channel, "Relay task dibatalkan saat koneksi ditutup");
    }

    rooms.decrement_connections();
    tracing::info!(user_id = ?user_id, "Koneksi WebSocket dibersihkan");

    // Drop the relay + out channels so the sender task terminates cleanly.
    drop(relay_tx);
    drop(out_tx);
    let _ = sender_task.await;
}

// ── Broadcast relay task ───────────────────────────────────────────────────────

/// Run as a separate Tokio task per joined channel.
///
/// Awaits messages on `rx` (a `broadcast::Receiver`) and forwards them
/// through `relay_tx` to the main connection task.  When the relay task is
/// aborted (via `JoinHandle::abort`) this function's `await` is cancelled
/// and any resources are cleaned up automatically.
async fn relay_broadcast(
    mut rx: tokio::sync::broadcast::Receiver<WsMessage>,
    relay_tx: mpsc::Sender<WsMessage>,
) {
    loop {
        match rx.recv().await {
            Ok(msg) => {
                if relay_tx.send(msg).await.is_err() {
                    // Main task has shut down its receiver — exit relay.
                    break;
                }
            }
            Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                tracing::warn!(
                    missed = n,
                    "Relay task tertinggal — beberapa pesan broadcast dilewati"
                );
                // The receiver is automatically advanced to the current head.
                // Continue receiving.
            }
            Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                // The broadcast channel was dropped — nothing more to relay.
                break;
            }
        }
    }
}
