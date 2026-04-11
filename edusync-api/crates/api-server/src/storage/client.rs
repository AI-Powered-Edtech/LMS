//! Phase 5A — S3-compatible storage client.
//!
//! Wraps `aws-sdk-s3` with a thin, error-mapped API that works against both
//! Cloudflare R2 (production) and MinIO (local development).
//!
//! ## Required dependencies (add to workspace Cargo.toml + api-server Cargo.toml)
//!
//! ```toml
//! # DEPENDENCY: aws-sdk-s3 = "1"
//! # DEPENDENCY: aws-config = "1"
//! # DEPENDENCY: aws-credential-types = "1"
//! ```

// DEPENDENCY: aws-sdk-s3 = "1"
// DEPENDENCY: aws-config = "1"
// DEPENDENCY: aws-credential-types = "1"

use aws_credential_types::Credentials;
use aws_sdk_s3::{
    config::{Region, SharedCredentialsProvider},
    operation::get_object::GetObjectError,
    presigning::PresigningConfig,
    primitives::ByteStream,
    Client, Config,
};
use std::time::Duration;
use thiserror::Error;

// DEPENDENCY: thiserror = "1"  (workspace)
// DEPENDENCY: chrono = { version = "0.4", features = ["serde"] }  (workspace)

/// Lightweight metadata for a single S3 object returned by [`S3StorageClient::list_objects`].
#[derive(Debug, Clone)]
pub struct S3Object {
    /// Full S3 key (includes bucket prefix and tenant prefix).
    pub key: String,
    /// Object size in bytes.
    pub size: i64,
    /// Last-modified timestamp, if available.
    pub last_modified: Option<chrono::DateTime<chrono::Utc>>,
}

/// Errors that can occur in storage operations.
///
/// All messages are in Bahasa Indonesia so they can be forwarded to the client.
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Objek tidak ditemukan")]
    NotFound,

    #[error("Kesalahan klien S3: {0}")]
    S3(String),

    #[error("Kesalahan I/O: {0}")]
    Io(String),

    #[error("Ukuran file melebihi batas yang diizinkan")]
    FileTooLarge,

    #[error("Tipe file tidak diizinkan")]
    InvalidContentType,

    #[error("Konfigurasi presigned URL tidak valid: {0}")]
    PresignConfig(String),
}

/// S3-compatible storage client.
///
/// Constructed once at startup via [`S3StorageClient::from_env`] and stored
/// behind an `Arc<Option<S3StorageClient>>` in `AppState`.
pub struct S3StorageClient {
    /// Underlying AWS SDK S3 client.
    client: Client,
    /// Name of the single S3/R2 bucket.
    bucket: String,
    /// Public CDN base URL (no trailing slash).
    /// Example: `https://cdn.edusync.dev` or `http://localhost:9000/edusync`
    pub_url: String,
}

impl S3StorageClient {
    /// Initialise from environment variables.
    ///
    /// Returns `None` when `S3_ENDPOINT` or `S3_ACCESS_KEY_ID` is absent so
    /// the server can start without S3 configured (handlers will return 503).
    ///
    /// | Variable             | Default                            |
    /// |----------------------|------------------------------------|
    /// | `S3_ENDPOINT`        | *(required)*                       |
    /// | `S3_ACCESS_KEY_ID`   | *(required)*                       |
    /// | `S3_SECRET_ACCESS_KEY` | `""` (empty — MinIO allows this) |
    /// | `S3_REGION`          | `auto`                             |
    /// | `S3_BUCKET`          | `edusync`                          |
    /// | `S3_PUBLIC_URL`      | `{S3_ENDPOINT}/{S3_BUCKET}`        |
    pub async fn from_env() -> Option<Self> {
        let endpoint = std::env::var("S3_ENDPOINT").ok()?;
        let access_key = std::env::var("S3_ACCESS_KEY_ID").ok()?;
        let secret_key = std::env::var("S3_SECRET_ACCESS_KEY").unwrap_or_default();
        let region = std::env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string());
        let bucket = std::env::var("S3_BUCKET").unwrap_or_else(|_| "edusync".to_string());
        let pub_url = std::env::var("S3_PUBLIC_URL")
            .unwrap_or_else(|_| format!("{}/{}", endpoint, bucket));

        let creds = Credentials::new(
            access_key,
            secret_key,
            None,  // session_token
            None,  // expiry
            "env", // provider_name
        );

        let config = Config::builder()
            .credentials_provider(SharedCredentialsProvider::new(creds))
            .region(Region::new(region))
            .endpoint_url(endpoint)
            // `force_path_style` is required for MinIO; R2 ignores it.
            .force_path_style(true)
            .behavior_version_latest()
            .build();

        let client = Client::from_conf(config);

        Some(S3StorageClient {
            client,
            bucket,
            pub_url,
        })
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Return the configured bucket name.
    pub fn bucket(&self) -> &str {
        &self.bucket
    }

    /// Return the full public URL for an object key.
    ///
    /// `key` is the **full S3 key** (e.g. `course-images/{tenant}/{file}.jpg`).
    pub fn public_url(&self, key: &str) -> String {
        format!("{}/{}", self.pub_url, key)
    }

    // ── Core operations ───────────────────────────────────────────────────────

    /// Upload bytes to S3.
    ///
    /// `key` — full object key (e.g. `course-images/{tenant}/{name}.jpg`)
    pub async fn put_object(
        &self,
        key: &str,
        data: Vec<u8>,
        content_type: &str,
    ) -> Result<(), StorageError> {
        let body = ByteStream::from(data);
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .content_type(content_type)
            .body(body)
            .send()
            .await
            .map_err(|e| StorageError::S3(e.to_string()))?;
        Ok(())
    }

    /// Download object bytes from S3.
    ///
    /// Returns [`StorageError::NotFound`] when the object does not exist.
    pub async fn get_object(&self, key: &str) -> Result<Vec<u8>, StorageError> {
        let resp = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| {
                // Distinguish 404 from other errors.
                if let Some(service_err) = e.as_service_error() {
                    if matches!(service_err, GetObjectError::NoSuchKey(_)) {
                        return StorageError::NotFound;
                    }
                }
                StorageError::S3(e.to_string())
            })?;

        let bytes = resp
            .body
            .collect()
            .await
            .map_err(|e| StorageError::Io(e.to_string()))?
            .into_bytes()
            .to_vec();

        Ok(bytes)
    }

    /// Delete one or more objects.
    ///
    /// Uses the S3 batch-delete API when more than one key is supplied.
    /// Individual 404s are silently ignored (idempotent delete).
    pub async fn delete_objects(&self, keys: &[String]) -> Result<(), StorageError> {
        if keys.is_empty() {
            return Ok(());
        }

        use aws_sdk_s3::types::{Delete, ObjectIdentifier};

        let object_ids: Vec<ObjectIdentifier> = keys
            .iter()
            .filter_map(|k| {
                ObjectIdentifier::builder()
                    .key(k)
                    .build()
                    .ok()
            })
            .collect();

        let delete = Delete::builder()
            .set_objects(Some(object_ids))
            .quiet(true)
            .build()
            .map_err(|e| StorageError::S3(e.to_string()))?;

        self.client
            .delete_objects()
            .bucket(&self.bucket)
            .delete(delete)
            .send()
            .await
            .map_err(|e| StorageError::S3(e.to_string()))?;

        Ok(())
    }

    /// List objects with a given prefix, returning up to `max_keys` results.
    pub async fn list_objects(
        &self,
        prefix: &str,
        max_keys: i32,
    ) -> Result<Vec<S3Object>, StorageError> {
        let resp = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(prefix)
            .max_keys(max_keys)
            .send()
            .await
            .map_err(|e| StorageError::S3(e.to_string()))?;

        let objects = resp
            .contents()
            .iter()
            .map(|obj| {
                let last_modified = obj.last_modified().and_then(|dt| {
                    // aws_sdk_s3 uses `aws_smithy_types::DateTime` — convert to chrono.
                    let secs = dt.secs();
                    chrono::DateTime::from_timestamp(secs, 0)
                });
                S3Object {
                    key: obj.key().unwrap_or("").to_string(),
                    size: obj.size().unwrap_or(0),
                    last_modified,
                }
            })
            .collect();

        Ok(objects)
    }

    // ── Presigned URLs ────────────────────────────────────────────────────────

    /// Generate a presigned PUT URL for large client-side uploads (e.g. videos).
    ///
    /// The URL expires after `expires_secs` seconds (max enforced by S3 is
    /// 604 800 s / 7 days).
    pub async fn presigned_put_url(
        &self,
        key: &str,
        expires_secs: u64,
    ) -> Result<String, StorageError> {
        let presign_cfg = PresigningConfig::expires_in(Duration::from_secs(expires_secs))
            .map_err(|e| StorageError::PresignConfig(e.to_string()))?;

        let presigned = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presign_cfg)
            .await
            .map_err(|e| StorageError::S3(e.to_string()))?;

        Ok(presigned.uri().to_string())
    }

    /// Generate a presigned GET URL for time-limited access to private objects.
    pub async fn presigned_get_url(
        &self,
        key: &str,
        expires_secs: u64,
    ) -> Result<String, StorageError> {
        let presign_cfg = PresigningConfig::expires_in(Duration::from_secs(expires_secs))
            .map_err(|e| StorageError::PresignConfig(e.to_string()))?;

        let presigned = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presign_cfg)
            .await
            .map_err(|e| StorageError::S3(e.to_string()))?;

        Ok(presigned.uri().to_string())
    }
}
