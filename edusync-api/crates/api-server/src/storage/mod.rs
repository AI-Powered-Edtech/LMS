//! S3-compatible object storage backend — uses vil_conn_s3 (VIL Way)
//!
//! The `S3Connector` (from `vil_conn_s3`) is created per-handler via
//! `client::create_s3_client(&state)`.  vil_conn_s3 handles connection
//! pooling internally so constructing the client per-request is cheap.

pub mod client;
pub mod handlers;
pub mod transcode_handlers;
pub mod url;

pub use vil_conn_s3::S3Connector;
