//! Phase 5A — S3-compatible object storage backend.
//!
//! Provides an `S3StorageClient` that works with both Cloudflare R2 (production)
//! and MinIO (local development) via endpoint override.
//!
//! ## Integration note for `state.rs` / `main.rs`
//!
//! ```rust
//! // INTEGRATION NEEDED in state.rs:
//! // use crate::storage::client::S3StorageClient;
//! // pub storage: Option<Arc<S3StorageClient>>,
//!
//! // INTEGRATION NEEDED in main.rs:
//! // let storage = S3StorageClient::from_env().await;
//! // if storage.is_none() {
//! //     tracing::warn!("S3_ENDPOINT tidak dikonfigurasi — endpoint storage tidak akan berfungsi");
//! // }
//! // // Add to AppState: storage: storage.map(Arc::new),
//! ```

pub mod client;
pub mod handlers;
pub mod url;

pub use client::S3StorageClient;
