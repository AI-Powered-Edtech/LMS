//! S3 storage client — uses vil_conn_s3 (VIL Way)
//!
//! Replaces the prior `aws-sdk-s3` / `vil_storage_s3` wrapper with `vil_conn_s3`.
//! The client is constructed per-handler (or lazily) from `AppState` config.
//! `vil_conn_s3` handles connection pooling internally.

pub use vil_conn_s3::{S3Config, S3Connector};
use crate::state::AppState;

/// Initialize an S3Connector from `AppState` config values.
///
/// Returns `None` when `S3_ENDPOINT` or `S3_ACCESS_KEY_ID` is absent so
/// handlers can return 503 without panicking.
pub async fn create_s3_client(state: &AppState) -> Option<S3Connector> {
    let endpoint = state.s3_endpoint.as_ref()?.clone();
    let access_key = std::env::var("S3_ACCESS_KEY_ID").ok()?;
    let secret_key = std::env::var("S3_SECRET_ACCESS_KEY").unwrap_or_default();
    let region = std::env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string());

    S3Connector::new(S3Config {
        bucket: state.s3_bucket.clone(),
        region,
        access_key,
        secret_key,
        endpoint: Some(endpoint),
        path_style: true, // required for MinIO; R2 ignores it
        ..Default::default()
    })
    .await
    .ok()
}


