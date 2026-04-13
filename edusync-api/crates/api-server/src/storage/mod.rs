//! S3-compatible object storage backend — uses vil_storage_s3 (VIL Way)
//!
//! The `S3Client` (from `vil_storage_s3`) is created per-handler via
//! `client::create_s3_client(&state)`.  vil_storage_s3 handles connection
//! pooling internally so constructing the client per-request is cheap.

pub mod client;
pub mod handlers;
pub mod transcode_handlers;
pub mod url;

// Re-export the VIL S3 client type for other crates that might need it.
pub use vil_storage_s3::S3Client;
