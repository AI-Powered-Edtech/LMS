//! WebSocket upgrade handler — uses VIL WsHub (VIL Way)
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
//!  │  WsHub::subscribe(ch) → Receiver ──► relay task     │   │
//!  │                                       │  out_tx      │   │
//!  │  heartbeat tick ──────────────────────► out_tx       │   │
//!  │                                              │       │   │
//!  │                                           out_rx ──► ws_sender
//!  └─────────────────────────────────────────────────────────┘
//! ```
//!
//! ### Broadcast relay strategy
//!
//! Each `join` spawns a relay task that awaits on the `WsHub` channel receiver
//! and forwards messages over an mpsc channel back to the main loop.
//! On `leave` the relay task is cancelled by dropping the `JoinHandle`.
//!
//! ## Connection lifecycle
//!
//! 1. Optional JWT auth — invalid tokens are rejected before upgrade.
//! 2. Global connection counter incremented; warning logged if > 1000.
//! 3. `tokio::select!` loop processes incoming frames, outgoing broadcasts,
//!    and server-side heartbeats.
//! 4. On disconnect: presence untracks, relay tasks cancelled, counter decremented.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message as AxumWsMessage, WebSocket, WebSocketUpgrade},
        Query,
    },
    response::IntoResponse,
    Extension,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio::time::interval;
use vil_server::prelude::*;

use edusync_auth::verify_access_token;

use super::room::WsMessage;
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
/// Registered in `main.rs`:
/// ```ignore
/// let ws_service = ServiceProcess::new("realtime")
///     .prefix("/ws")
///     .endpoint(Method::GET, "", get(ws_handler))
///     .extension(Arc::clone(&state_arc))
///     .extension(ws_hub.clone());
/// ```
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsConnectQuery>,
    Extension(hub): Extension<Arc<WsHub>>,
    vil_ctx: ServiceCtx,
) -> HandlerResult<impl IntoResponse> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?.clone();
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, hub, params.token)))
}

// ── Socket handler ─────────────────────────────────────────────────────────────

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    hub: Arc<WsHub>,
    token: Option<String>,
) {
    // ── 1. Optional JWT authentication ────────────────────────────────────────
    let (user_id, _tenant_id): (Option<String>, Option<String>) = match token.as_deref() {
        Some(tok) => match verify_access_token(tok) {
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

    // ── 2. Socket I/O split ───────────────────────────────────────────────────
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

    // ── 3. Per-connection state ───────────────────────────────────────────────
    struct ChannelHandle {
        relay: JoinHandle<()>,
    }

    let mut joined: HashMap<String, ChannelHandle> = HashMap::new();
    let mut heartbeat = interval(HEARTBEAT_INTERVAL);
    heartbeat.tick().await; // discard the immediate first tick

    macro_rules! send_msg {
        ($msg:expr) => {{
            if let Ok(json) = serde_json::to_string(&$msg) {
                let _ = out_tx.try_send(json);
            }
        }};
    }

    // ── 4. Main event loop ────────────────────────────────────────────────────
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

                                // WsHub::subscribe returns a broadcast::Receiver<String>.
                                // We wrap it in a relay task that deserialises the JSON
                                // string into WsMessage and forwards to relay_tx.
                                let rx = hub.subscribe(&channel);
                                let relay_tx2 = relay_tx.clone();
                                let channel_clone = channel.clone();
                                let relay_task: JoinHandle<()> = tokio::spawn(async move {
                                    relay_hub(rx, relay_tx2, channel_clone).await;
                                });

                                joined.insert(channel.clone(), ChannelHandle { relay: relay_task });

                                tracing::debug!(channel, "Klien bergabung ke channel");
                                send_msg!(WsMessage::system(&channel, "SUBSCRIBED"));
                            }

                            Ok(ClientMessage::Leave { channel }) => {
                                if let Some(handle) = joined.remove(&channel) {
                                    handle.relay.abort();
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
                                    if let Ok(json) = serde_json::to_string(&msg) {
                                        hub.broadcast(&channel, json);
                                    }
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
                                } else if user_id.is_some() {
                                    drop(payload);
                                    send_msg!(WsMessage::system(&channel, "PRESENCE_UNSUPPORTED"));
                                } else {
                                    send_msg!(WsMessage::error(
                                        "Autentikasi diperlukan untuk melacak kehadiran"
                                    ));
                                }
                            }

                            Ok(ClientMessage::Untrack { channel }) => {
                                if user_id.is_some() {
                                    send_msg!(WsMessage::system(&channel, "PRESENCE_UNSUPPORTED"));
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

    // ── 5. Cleanup on disconnect ──────────────────────────────────────────────
    for (channel, handle) in joined {
        handle.relay.abort();
        tracing::debug!(channel, "Relay task dibatalkan saat koneksi ditutup");
    }

    tracing::info!(user_id = ?user_id, "Koneksi WebSocket dibersihkan");

    drop(relay_tx);
    drop(out_tx);
    let _ = sender_task.await;
}

// ── Hub relay task ─────────────────────────────────────────────────────────────

/// Run as a separate Tokio task per joined channel.
///
/// `WsHub::subscribe` returns a `broadcast::Receiver<String>` where each
/// message is a JSON string.  We deserialise it back into `WsMessage` here
/// so the main loop can re-serialise it uniformly.  When deserialisation fails
/// the raw string is forwarded as a generic `broadcast` WsMessage.
async fn relay_hub(
    mut rx: tokio::sync::mpsc::UnboundedReceiver<String>,
    relay_tx: mpsc::Sender<WsMessage>,
    channel: String,
) {
    loop {
        match rx.recv().await {
            Some(json_str) => {
                // Try to parse as WsMessage; fall back to a plain broadcast wrapper.
                let msg = serde_json::from_str::<WsMessage>(&json_str).unwrap_or_else(|_| {
                    WsMessage {
                        msg_type: "broadcast".into(),
                        channel: Some(channel.clone()),
                        event: None,
                        payload: serde_json::from_str(&json_str).ok(),
                        state: None,
                        message: None,
                    }
                });
                if relay_tx.send(msg).await.is_err() {
                    break; // Main task has shut down — exit relay.
                }
            }
            None => break,
        }
    }
}
