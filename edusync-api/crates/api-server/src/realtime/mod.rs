//! Realtime WebSocket subsystem — uses VIL WsHub (VIL Way)
//!
//! Architecture:
//!   Client ←── JSON WebSocket ──→ ws_handler (Axum native WS)
//!                                       ↓
//!                              WsHub (vil_server::prelude::WsHub)
//!                                broadcast per channel
//!                                       ↓
//!                              PgListener (tokio background task)
//!                         LISTEN on pg channels → hub.broadcast(channel, json)

pub mod handler;
pub mod pg_notify;
pub mod room;

// WsHub is the VIL replacement for the old RoomManager.
pub use vil_server::prelude::WsHub;
