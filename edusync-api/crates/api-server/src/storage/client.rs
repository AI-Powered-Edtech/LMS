//! S3 storage client — uses vil_storage_s3 (VIL Way)
//!
//! Replaces the prior `aws-sdk-s3` wrapper with `vil_storage_s3`.
//! The client is constructed per-handler (or lazily) from `AppState` config.
//! `vil_storage_s3` handles connection pooling internally.

use vil_storage_s3::{S3Client, S3Config};
use crate::state::AppState;

/// Initialize an S3 client from `AppState` config values.
///
/// Returns `None` when `S3_ENDPOINT` or `S3_ACCESS_KEY_ID` is absent so
/// handlers can return 503 without panicking.
pub async fn create_s3_client(state: &AppState) -> Option<S3Client> {
    let endpoint = state.s3_endpoint.as_ref()?.clone();
    let access_key = std::env::var("S3_ACCESS_KEY_ID").ok()?;
    let secret_key = std::env::var("S3_SECRET_ACCESS_KEY").unwrap_or_default();
    let region = std::env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string());

    S3Client::new(S3Config {
        endpoint: endpoint.clone(),
        region,
        access_key_id: access_key,
        secret_access_key: secret_key,
        bucket: state.s3_bucket.clone(),
        public_url: state
            .s3_public_url
            .clone()
            .unwrap_or_else(|| format!("{}/{}", endpoint, &state.s3_bucket)),
        force_path_style: true, // required for MinIO; R2 ignores it
    })
    .await
    .ok()
}

// Re-export for handlers
pub use vil_storage_s3::S3Client;
