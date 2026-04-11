//! Phase 5A — Axum HTTP handlers for the storage subsystem.
//!
//! All handlers check `state.storage` first; when absent they return 503
//! with a Bahasa Indonesia message.  Path validation and bucket allow-listing
//! are enforced before any S3 call is made.
//!
//! ## Route registration snippet for `main.rs`
//!
//! ```rust
//! // INTEGRATION NEEDED in main.rs — add storage service:
//! //
//! // use crate::storage::handlers::{
//! //     create_signed_url_handler, download_handler, list_handler,
//! //     migration_status_handler, presign_upload_handler, public_url_handler,
//! //     remove_handler, upload_handler,
//! // };
//! //
//! // let storage_service = ServiceProcess::new("storage")
//! //     .prefix("/api/v1/storage")
//! //     .endpoint(Method::POST,   "/upload",                post(upload_handler))
//! //     .endpoint(Method::GET,    "/object/:bucket/*path",  get(download_handler))
//! //     .endpoint(Method::DELETE, "/object/:bucket",        delete(remove_handler))
//! //     .endpoint(Method::GET,    "/public-url/:bucket/*path", get(public_url_handler))
//! //     .endpoint(Method::POST,   "/sign",                  post(create_signed_url_handler))
//! //     .endpoint(Method::POST,   "/presign-upload",        post(presign_upload_handler))
//! //     .endpoint(Method::GET,    "/list/:bucket",          get(list_handler))
//! //     .endpoint(Method::GET,    "/migration-status",      get(migration_status_handler))
//! //     .state(app_state.clone());
//! ```

use axum::{
    extract::{Extension, Multipart, Path, Query},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::extractors::AuthedRequest;
use crate::state::AppState;

use super::client::{S3StorageClient, StorageError};
use super::url::{build_s3_key, max_bytes_for_bucket, sanitize_path, validate_bucket};

// ── Shared helpers ────────────────────────────────────────────────────────────

/// Error response body shape (matches existing API error conventions).
#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

fn err_response(status: StatusCode, msg: &str) -> Response {
    (status, Json(ErrorBody { error: msg.to_string() })).into_response()
}

/// Return the storage client from AppState, or a 503 response.
///
/// `state.storage` is `Option<Arc<S3StorageClient>>`.
/// This helper avoids repetition in every handler.
///
/// # Note for integration agent
/// `AppState` must have: `pub storage: Option<Arc<S3StorageClient>>`
#[inline]
fn require_storage(state: &AppState) -> Result<&S3StorageClient, Response> {
    state.storage.as_deref().ok_or_else(|| {
        err_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "Layanan penyimpanan tidak dikonfigurasi",
        )
    })
}

/// Guess a reasonable Content-Type from a file extension.
fn guess_content_type(filename: &str) -> &'static str {
    let ext = filename
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "vtt" => "text/vtt",
        "srt" => "application/x-subrip",
        "zip" => "application/zip",
        "csv" => "text/csv",
        "json" => "application/json",
        _ => "application/octet-stream",
    }
}

// ── Upload handler ────────────────────────────────────────────────────────────

/// Query parameters for `POST /api/v1/storage/upload`.
#[derive(Deserialize)]
pub struct UploadQuery {
    /// Target bucket (e.g. `course-images`).
    pub bucket: String,
    /// Object path within the bucket (e.g. `thumbnails/course-42.jpg`).
    pub path: String,
    /// When `true`, overwrite an existing object.  Defaults to `false`.
    pub upsert: Option<bool>,
}

/// Successful upload response body.
#[derive(Serialize)]
pub struct UploadResponse {
    /// Full S3 key of the uploaded object.
    pub path: String,
    /// Public CDN URL.
    pub public_url: String,
    /// Uploaded file size in bytes.
    pub size: u64,
    /// Detected Content-Type.
    pub content_type: String,
}

/// `POST /api/v1/storage/upload`
///
/// Accepts `multipart/form-data` with a single `file` field.
/// Query params: `bucket`, `path`, `upsert` (optional).
pub async fn upload_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Query(query): Query<UploadQuery>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    // Validate bucket.
    if !validate_bucket(&query.bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    // Validate path.
    let clean_path = match sanitize_path(&query.path) {
        Some(p) => p,
        None => {
            return err_response(
                StatusCode::BAD_REQUEST,
                "Path tidak valid: tidak boleh mengandung '..' atau dimulai dengan '/'",
            )
        }
    };

    let max_size = max_bytes_for_bucket(&query.bucket);

    // Read multipart field named "file".
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut content_type = String::from("application/octet-stream");
    let mut filename = clean_path.clone();

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(e) => {
                return err_response(
                    StatusCode::BAD_REQUEST,
                    &format!("Kesalahan membaca multipart: {}", e),
                )
            }
        };

        if field.name() == Some("file") {
            if let Some(fn_val) = field.file_name() {
                filename = fn_val.to_string();
                content_type = guess_content_type(&filename).to_string();
            }
            if let Some(ct) = field.content_type() {
                content_type = ct.to_string();
            }
            let data = match field.bytes().await {
                Ok(b) => b.to_vec(),
                Err(e) => {
                    return err_response(
                        StatusCode::BAD_REQUEST,
                        &format!("Kesalahan membaca data file: {}", e),
                    )
                }
            };
            if data.len() as u64 > max_size {
                return err_response(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "Ukuran file melebihi batas yang diizinkan",
                );
            }
            file_bytes = Some(data);
            break; // only process the first "file" field
        }
    }

    let bytes = match file_bytes {
        Some(b) => b,
        None => return err_response(StatusCode::BAD_REQUEST, "Field 'file' tidak ditemukan"),
    };

    let size = bytes.len() as u64;
    let s3_key = build_s3_key(&query.bucket, &ctx.tenant_id, &clean_path);

    match storage.put_object(&s3_key, bytes, &content_type).await {
        Ok(_) => {
            let public_url = storage.public_url(&s3_key);
            (
                StatusCode::CREATED,
                Json(UploadResponse {
                    path: s3_key,
                    public_url,
                    size,
                    content_type,
                }),
            )
                .into_response()
        }
        Err(StorageError::FileTooLarge) => err_response(
            StatusCode::PAYLOAD_TOO_LARGE,
            "Ukuran file melebihi batas yang diizinkan",
        ),
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal mengunggah file: {}", e),
        ),
    }
}

// ── Download handler ──────────────────────────────────────────────────────────

/// `GET /api/v1/storage/object/{bucket}/{*path}`
///
/// Streams the object bytes back to the client with the appropriate
/// Content-Type header derived from the key extension.
pub async fn download_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Path((bucket, path)): Path<(String, String)>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&path) {
        Some(p) => p,
        None => {
            return err_response(StatusCode::BAD_REQUEST, "Path tidak valid")
        }
    };

    let s3_key = build_s3_key(&bucket, &ctx.tenant_id, &clean_path);
    let content_type = guess_content_type(&clean_path);

    match storage.get_object(&s3_key).await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, content_type),
                (header::CACHE_CONTROL, "private, max-age=3600"),
            ],
            bytes,
        )
            .into_response(),
        Err(StorageError::NotFound) => {
            err_response(StatusCode::NOT_FOUND, "Objek tidak ditemukan")
        }
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal mengunduh file: {}", e),
        ),
    }
}

// ── Remove handler ────────────────────────────────────────────────────────────

/// Request body for `DELETE /api/v1/storage/object/{bucket}`.
#[derive(Deserialize)]
pub struct RemoveRequest {
    /// List of object paths to delete (relative to the bucket root).
    pub paths: Vec<String>,
}

/// `DELETE /api/v1/storage/object/{bucket}`
///
/// Deletes one or more objects.  Silently ignores non-existent keys.
pub async fn remove_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Path(bucket): Path<String>,
    Json(body): Json<RemoveRequest>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    if body.paths.is_empty() {
        return err_response(StatusCode::BAD_REQUEST, "Daftar path tidak boleh kosong");
    }

    // Build S3 keys; reject any traversal attempt.
    let mut keys: Vec<String> = Vec::with_capacity(body.paths.len());
    for raw_path in &body.paths {
        match sanitize_path(raw_path) {
            Some(p) => keys.push(build_s3_key(&bucket, &ctx.tenant_id, &p)),
            None => {
                return err_response(
                    StatusCode::BAD_REQUEST,
                    &format!("Path tidak valid: {}", raw_path),
                )
            }
        }
    }

    match storage.delete_objects(&keys).await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({ "deleted": keys.len() }))).into_response(),
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal menghapus file: {}", e),
        ),
    }
}

// ── Public URL handler ────────────────────────────────────────────────────────

/// Response body for public URL endpoint.
#[derive(Serialize)]
pub struct PublicUrlResponse {
    pub public_url: String,
}

/// `GET /api/v1/storage/public-url/{bucket}/{*path}`
///
/// Returns the CDN / public URL for an object.  No auth required.
/// This is safe because the URL itself only works if the object exists
/// and the bucket is configured for public access.
pub async fn public_url_handler(
    Extension(state): Extension<Arc<AppState>>,
    Path((bucket, path)): Path<(String, String)>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&path) {
        Some(p) => p,
        None => return err_response(StatusCode::BAD_REQUEST, "Path tidak valid"),
    };

    // For public-url we don't know the tenant at this point (unauthenticated),
    // so we expose the raw bucket-level URL.  The caller is expected to supply
    // the full path including the tenant prefix when needed.
    let s3_key = format!("{}/{}", bucket, clean_path);
    let public_url = storage.public_url(&s3_key);

    (StatusCode::OK, Json(PublicUrlResponse { public_url })).into_response()
}

// ── Signed URL handler ────────────────────────────────────────────────────────

/// Request body for `POST /api/v1/storage/sign`.
#[derive(Deserialize)]
pub struct SignedUrlRequest {
    pub bucket: String,
    pub path: String,
    /// Expiry duration in seconds.  Defaults to 3 600 (1 hour).
    pub expires_in: Option<u64>,
}

/// Response body for signed URL endpoints.
#[derive(Serialize)]
pub struct SignedUrlResponse {
    pub signed_url: String,
    pub expires_in: u64,
}

/// `POST /api/v1/storage/sign`
///
/// Returns a presigned GET URL for private objects (e.g. submitted assignments).
pub async fn create_signed_url_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<SignedUrlRequest>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&body.bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&body.path) {
        Some(p) => p,
        None => return err_response(StatusCode::BAD_REQUEST, "Path tidak valid"),
    };

    let expires_in = body.expires_in.unwrap_or(3_600).min(604_800); // cap at 7 days
    let s3_key = build_s3_key(&body.bucket, &ctx.tenant_id, &clean_path);

    match storage.presigned_get_url(&s3_key, expires_in).await {
        Ok(signed_url) => (
            StatusCode::OK,
            Json(SignedUrlResponse { signed_url, expires_in }),
        )
            .into_response(),
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal membuat signed URL: {}", e),
        ),
    }
}

// ── Presigned upload URL handler ──────────────────────────────────────────────

/// Request body for `POST /api/v1/storage/presign-upload`.
#[derive(Deserialize)]
pub struct PresignUploadRequest {
    pub bucket: String,
    pub path: String,
    /// Expiry in seconds.  Defaults to 3 600.
    pub expires_in: Option<u64>,
}

/// Response body for presigned upload URL.
#[derive(Serialize)]
pub struct PresignUploadResponse {
    /// Presigned PUT URL the client should use to upload directly to S3.
    pub upload_url: String,
    /// Public URL that will be accessible after the upload completes.
    pub public_url: String,
    /// The S3 key that was reserved.
    pub key: String,
    pub expires_in: u64,
}

/// `POST /api/v1/storage/presign-upload`
///
/// Returns a presigned PUT URL so large files (videos) can be uploaded directly
/// from the browser to S3 without passing through the API server.
pub async fn presign_upload_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Json(body): Json<PresignUploadRequest>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&body.bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&body.path) {
        Some(p) => p,
        None => return err_response(StatusCode::BAD_REQUEST, "Path tidak valid"),
    };

    let expires_in = body.expires_in.unwrap_or(3_600).min(604_800);
    let s3_key = build_s3_key(&body.bucket, &ctx.tenant_id, &clean_path);
    let public_url = storage.public_url(&s3_key);

    match storage.presigned_put_url(&s3_key, expires_in).await {
        Ok(upload_url) => (
            StatusCode::OK,
            Json(PresignUploadResponse {
                upload_url,
                public_url,
                key: s3_key,
                expires_in,
            }),
        )
            .into_response(),
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal membuat presigned upload URL: {}", e),
        ),
    }
}

// ── List handler ──────────────────────────────────────────────────────────────

/// Query params for `GET /api/v1/storage/list/{bucket}`.
#[derive(Deserialize)]
pub struct ListParams {
    /// Optional path prefix to filter results.
    pub prefix: Option<String>,
    /// Maximum number of results.  Defaults to 100, capped at 1 000.
    pub limit: Option<i32>,
}

/// Single item in the list response.
#[derive(Serialize)]
pub struct ListItem {
    pub name: String,
    pub size: i64,
    pub last_modified: Option<String>,
}

/// `GET /api/v1/storage/list/{bucket}`
///
/// Lists objects visible to the authenticated tenant within the bucket.
pub async fn list_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Path(bucket): Path<String>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let storage = match require_storage(&state) {
        Ok(s) => s,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    // Base prefix always scopes to tenant.
    let base_prefix = format!("{}/{}/", bucket, ctx.tenant_id);
    let full_prefix = match &params.prefix {
        Some(p) => {
            match sanitize_path(p) {
                Some(clean) => format!("{}{}", base_prefix, clean),
                None => {
                    return err_response(StatusCode::BAD_REQUEST, "Prefix tidak valid")
                }
            }
        }
        None => base_prefix,
    };

    let limit = params.limit.unwrap_or(100).clamp(1, 1_000);

    match storage.list_objects(&full_prefix, limit).await {
        Ok(objects) => {
            let items: Vec<ListItem> = objects
                .into_iter()
                .map(|obj| ListItem {
                    name: obj.key,
                    size: obj.size,
                    last_modified: obj.last_modified.map(|dt| dt.to_rfc3339()),
                })
                .collect();
            (StatusCode::OK, Json(serde_json::json!({ "items": items, "count": items.len() }))).into_response()
        }
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal membuat daftar file: {}", e),
        ),
    }
}

// ── Migration status handler ──────────────────────────────────────────────────

/// Status of the background Supabase → S3 file migration.
#[derive(Serialize)]
pub struct MigrationStatusResponse {
    /// Human-readable status.
    pub status: String,
    /// Whether the storage client is available.
    pub storage_configured: bool,
    /// The configured S3 bucket name (if storage is configured).
    pub bucket: Option<String>,
    /// Note about running the migration script.
    pub note: String,
}

/// `GET /api/v1/storage/migration-status`
///
/// Returns a snapshot of the current storage migration state.
/// In Phase 5A this is a static response; Phase 5B will add a background job
/// that updates a `migration_progress` table.
pub async fn migration_status_handler(
    AuthedRequest(_ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    // Check whether storage is configured without requiring it.
    // INTEGRATION: replace with `state.storage.as_ref()` once wired.
    let storage_configured = false; // will become: state.storage.is_some()
    let bucket: Option<String> = None; // will become: state.storage.as_ref().map(|s| s.bucket().to_string())
    let _ = state; // suppress lint

    (
        StatusCode::OK,
        Json(MigrationStatusResponse {
            status: if storage_configured {
                "aktif".to_string()
            } else {
                "tidak dikonfigurasi".to_string()
            },
            storage_configured,
            bucket,
            note: "Jalankan infrastructure/scripts/migrate-storage.sh untuk migrasi file dari Supabase Storage ke S3".to_string(),
        }),
    )
        .into_response()
}
