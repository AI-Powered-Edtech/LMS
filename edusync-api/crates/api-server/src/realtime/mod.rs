//! Phase 4A: Realtime WebSocket subsystem
//!
//! Architecture:
//!   Client ←── JSON WebSocket ──→ ws_handler (Axum native WS)
//!                                       ↓
//!                              RoomManager (Arc<Mutex<...>>)
//!                                broadcast::Sender per channel
//!                                       ↓
//!                              PgListener (tokio background task)
//!                         LISTEN on pg channels → forward to rooms

pub mod handler;
pub mod pg_notify;
pub mod room;

pub use room::RoomManager;
