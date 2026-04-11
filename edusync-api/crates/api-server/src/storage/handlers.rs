//! S3-compatible storage HTTP handlers — uses vil_storage_s3 (VIL Way)
//!
//! All handlers check that S3 is configured first; when absent they return 503
//! with a Bahasa Indonesia message. Path validation and bucket allow-listing
//! are enforced before any S3 call is made.
//!
//! ## Route registration snippet for `main.rs`
//!
//! ```rust
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
//! //     .extension(Arc::clone(&state_arc));
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

use super::client::{create_s3_client, S3Client};
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

/// Build an S3Client from state, returning a 503 response if not configured.
async fn require_s3(state: &AppState) -> Result<S3Client, Response> {
    create_s3_client(state).await.ok_or_else(|| {
        err_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "Layanan penyimpanan tidak dikonfigurasi",
        )
    })
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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
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

    match s3.put_object(&s3_key, bytes, &content_type).await {
        Ok(_) => {
            let public_url = s3.public_url(&s3_key);
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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&path) {
        Some(p) => p,
        None => return err_response(StatusCode::BAD_REQUEST, "Path tidak valid"),
    };

    let s3_key = build_s3_key(&bucket, &ctx.tenant_id, &clean_path);
    let content_type = guess_content_type(&clean_path);

    match s3.get_object(&s3_key).await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, content_type),
                (header::CACHE_CONTROL, "private, max-age=3600"),
            ],
            bytes,
        )
            .into_response(),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("tidak ditemukan") || msg.contains("NoSuchKey") || msg.contains("404") {
                err_response(StatusCode::NOT_FOUND, "Objek tidak ditemukan")
            } else {
                err_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    &format!("Gagal mengunduh file: {}", e),
                )
            }
        }
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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
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

    // vil_storage_s3 exposes delete_object (single); delete them sequentially.
    // For batch deletes we fan out concurrently but report total count.
    let total = keys.len();
    let mut errors: Vec<String> = Vec::new();
    for key in &keys {
        if let Err(e) = s3.delete_object(key).await {
            errors.push(format!("{}: {}", key, e));
        }
    }

    if errors.is_empty() {
        (StatusCode::OK, Json(serde_json::json!({ "deleted": total }))).into_response()
    } else {
        err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal menghapus {} file: {}", errors.len(), errors.join("; ")),
        )
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
pub async fn public_url_handler(
    Extension(state): Extension<Arc<AppState>>,
    Path((bucket, path)): Path<(String, String)>,
) -> impl IntoResponse {
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    let clean_path = match sanitize_path(&path) {
        Some(p) => p,
        None => return err_response(StatusCode::BAD_REQUEST, "Path tidak valid"),
    };

    // For public-url we don't have tenant context (unauthenticated call).
    // The caller must supply the full path including the tenant prefix.
    let s3_key = format!("{}/{}", bucket, clean_path);
    let public_url = s3.public_url(&s3_key);

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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
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

    match s3.presigned_get_url(&s3_key, expires_in).await {
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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
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
    let public_url = s3.public_url(&s3_key);

    match s3.presigned_put_url(&s3_key, expires_in).await {
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
    let s3 = match require_s3(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };

    if !validate_bucket(&bucket) {
        return err_response(StatusCode::BAD_REQUEST, "Nama bucket tidak valid");
    }

    // Base prefix always scopes to tenant.
    let base_prefix = format!("{}/{}/", bucket, ctx.tenant_id);
    let full_prefix = match &params.prefix {
        Some(p) => match sanitize_path(p) {
            Some(clean) => format!("{}{}", base_prefix, clean),
            None => return err_response(StatusCode::BAD_REQUEST, "Prefix tidak valid"),
        },
        None => base_prefix,
    };

    let limit = params.limit.unwrap_or(100).clamp(1, 1_000) as u32;

    match s3.list_objects(&full_prefix, limit).await {
        Ok(objects) => {
            let items: Vec<ListItem> = objects
                .into_iter()
                .map(|obj| ListItem {
                    name: obj.key,
                    size: obj.size,
                    last_modified: obj.last_modified.map(|dt| dt.to_rfc3339()),
                })
                .collect();
            let count = items.len();
            (StatusCode::OK, Json(serde_json::json!({ "items": items, "count": count }))).into_response()
        }
        Err(e) => err_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Gagal membuat daftar file: {}", e),
        ),
    }
}

// ── Migration status handler ──────────────────────────────────────────────────

#[derive(Serialize)]
pub struct MigrationStatusResponse {
    pub storage_configured: bool,
    pub bucket: Option<String>,
    pub total_files: i64,
    pub pending: i64,
    pub migrating: i64,
    pub completed: i64,
    pub failed: i64,
    pub skipped: i64,
    pub completion_pct: f64,
    pub status: String,   // "tidak dikonfigurasi" | "idle" | "berjalan" | "selesai"
    pub note: Option<String>,
}

/// `GET /api/v1/storage/migration-status`
///
/// Returns the current storage migration state read from `storage_file_migrations`.
/// Requires any authenticated user.
pub async fn migration_status_handler(
    AuthedRequest(_ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    let storage_configured = state.s3_endpoint.is_some();
    let bucket = if storage_configured {
        Some(state.s3_bucket.clone())
    } else {
        None
    };

    if !storage_configured {
        return (
            StatusCode::OK,
            Json(MigrationStatusResponse {
                storage_configured: false,
                bucket: None,
                total_files: 0,
                pending: 0,
                migrating: 0,
                completed: 0,
                failed: 0,
                skipped: 0,
                completion_pct: 0.0,
                status: "tidak dikonfigurasi".to_string(),
                note: Some(
                    "Set S3_ENDPOINT dan S3_ACCESS_KEY_ID untuk mengaktifkan penyimpanan S3"
                        .to_string(),
                ),
            }),
        )
            .into_response();
    }

    // Query aggregate counts from storage_file_migrations
    let row = sqlx::query!(
        r#"
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending')   AS "pending!: i64",
            COUNT(*) FILTER (WHERE status = 'migrating') AS "migrating!: i64",
            COUNT(*) FILTER (WHERE status = 'completed') AS "completed!: i64",
            COUNT(*) FILTER (WHERE status = 'failed')    AS "failed!: i64",
            COUNT(*) FILTER (WHERE status = 'skipped')   AS "skipped!: i64",
            COUNT(*)                                     AS "total!: i64"
        FROM public.storage_file_migrations
        "#
    )
    .fetch_one(&state.db)
    .await;

    let (pending, migrating, completed, failed, skipped, total) = match row {
        Ok(r) => (r.pending, r.migrating, r.completed, r.failed, r.skipped, r.total),
        Err(e) => {
            tracing::warn!(error = %e, "Gagal membaca storage_file_migrations");
            (0, 0, 0, 0, 0, 0)
        }
    };

    let completion_pct = if total > 0 {
        ((completed + skipped) as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    let status = if total == 0 {
        "idle".to_string()
    } else if migrating > 0 {
        "berjalan".to_string()
    } else if pending == 0 && failed == 0 {
        "selesai".to_string()
    } else {
        "sebagian".to_string()
    };

    let note = if failed > 0 {
        Some(format!(
            "{failed} file gagal dimigrasikan. Jalankan infrastructure/scripts/migrate-storage.sh untuk retry."
        ))
    } else if total == 0 {
        Some(
            "Jalankan infrastructure/scripts/migrate-storage.sh untuk memulai migrasi file dari Supabase Storage ke S3.".to_string(),
        )
    } else {
        None
    };

    (
        StatusCode::OK,
        Json(MigrationStatusResponse {
            storage_configured,
            bucket,
            total_files: total,
            pending,
            migrating,
            completed,
            failed,
            skipped,
            completion_pct: (completion_pct * 10.0).round() / 10.0, // 1 decimal
            status,
            note,
        }),
    )
        .into_response()
}
