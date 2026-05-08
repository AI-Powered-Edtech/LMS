//! S3-compatible storage HTTP handlers — uses vil_conn_s3 (VIL Way)
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
    extract::{Multipart, Path, Query},
    http::{header, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use vil_server::prelude::*;

use crate::extractors::AuthedRequest;
use crate::state::AppState;

use super::client::{create_s3_client, S3Connector};
use super::url::{build_s3_key, max_bytes_for_bucket, sanitize_path, validate_bucket};

// ── Shared helpers ────────────────────────────────────────────────────────────

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

/// Build an S3Connector from state, returning a VilError 503 if not configured.
async fn require_s3(state: &AppState) -> Result<S3Connector, VilError> {
    create_s3_client(state).await.ok_or_else(|| {
        VilError::service_unavailable("Layanan penyimpanan tidak dikonfigurasi")
    })
}

/// Derive the public URL for an S3 key from state config.
///
/// Priority: `s3_public_url` env var → fallback to `{endpoint}/{bucket}/{key}`.
fn public_url_for(state: &AppState, s3_key: &str) -> String {
    if let Some(base) = &state.s3_public_url {
        format!("{}/{}", base.trim_end_matches('/'), s3_key)
    } else if let Some(endpoint) = &state.s3_endpoint {
        format!("{}/{}/{}", endpoint.trim_end_matches('/'), state.s3_bucket, s3_key)
    } else {
        s3_key.to_string()
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
/// Uses raw Axum Multipart extractor (no ShmSlice — body is multipart, not JSON).
pub async fn upload_handler(
    AuthedRequest(auth): AuthedRequest,
    vil_ctx: ServiceCtx,
    Query(query): Query<UploadQuery>,
    mut multipart: Multipart,
) -> HandlerResult<VilResponse<UploadResponse>> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let s3 = require_s3(state.as_ref()).await?;

    // Validate bucket.
    if !validate_bucket(&query.bucket) {
        return Err(VilError::bad_request("Nama bucket tidak valid"));
    }

    // Validate path.
    let clean_path = sanitize_path(&query.path).ok_or_else(|| {
        VilError::bad_request(
            "Path tidak valid: tidak boleh mengandung '..' atau dimulai dengan '/'",
        )
    })?;

    let max_size = max_bytes_for_bucket(&query.bucket);

    // Read multipart field named "file".
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut content_type = String::from("application/octet-stream");

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(e) => {
                return Err(VilError::bad_request(&format!(
                    "Kesalahan membaca multipart: {}",
                    e
                )));
            }
        };

        if field.name() == Some("file") {
            if let Some(fn_val) = field.file_name() {
                content_type = guess_content_type(fn_val).to_string();
            }
            if let Some(ct) = field.content_type() {
                content_type = ct.to_string();
            }
            let data = match field.bytes().await {
                Ok(b) => b.to_vec(),
                Err(e) => {
                    return Err(VilError::bad_request(&format!(
                        "Kesalahan membaca data file: {}",
                        e
                    )));
                }
            };
            if data.len() as u64 > max_size {
                return Err(VilError::bad_request(
                    "Ukuran file melebihi batas yang diizinkan",
                ));
            }
            file_bytes = Some(data);
            break; // only process the first "file" field
        }
    }

    let bytes = file_bytes
        .ok_or_else(|| VilError::bad_request("Field 'file' tidak ditemukan"))?;

    let size = bytes.len() as u64;
    let s3_key = build_s3_key(&query.bucket, &auth.tenant_id, &clean_path);

    s3.put(&s3_key, bytes.into(), Some(&content_type))
        .await
        .map_err(|e| VilError::internal(&format!("Gagal mengunggah file: {}", e)))?;

    let public_url = public_url_for(state.as_ref(), &s3_key);
    Ok(VilResponse::created(UploadResponse {
        path: s3_key,
        public_url,
        size,
        content_type,
    }))
}

// ── Download handler ──────────────────────────────────────────────────────────

/// `GET /api/v1/storage/object/{bucket}/{*path}`
///
/// Streams the object bytes back to the client with the appropriate
/// Content-Type header derived from the key extension.
/// Returns raw bytes — kept as `-> impl IntoResponse` since it is not a JSON response.
pub async fn download_handler(
    AuthedRequest(auth): AuthedRequest,
    vil_ctx: ServiceCtx,
    Path((bucket, path)): Path<(String, String)>,
) -> HandlerResult<impl IntoResponse> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;

    let s3 = match create_s3_client(state.as_ref()).await {
        Some(c) => c,
        None => {
            return Ok((
                StatusCode::SERVICE_UNAVAILABLE,
                "Layanan penyimpanan tidak dikonfigurasi",
            )
                .into_response())
        }
    };

    if !validate_bucket(&bucket) {
        return Ok((StatusCode::BAD_REQUEST, "Nama bucket tidak valid").into_response());
    }

    let clean_path = match sanitize_path(&path) {
        Some(p) => p,
        None => return Ok((StatusCode::BAD_REQUEST, "Path tidak valid").into_response()),
    };

    let s3_key = build_s3_key(&bucket, &auth.tenant_id, &clean_path);
    let content_type = guess_content_type(&clean_path);

    match s3.get(&s3_key).await {
        Ok(bytes) => Ok((
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, content_type),
                (header::CACHE_CONTROL, "private, max-age=3600"),
            ],
            bytes,
        )
            .into_response()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("tidak ditemukan") || msg.contains("NoSuchKey") || msg.contains("404") {
                Ok((StatusCode::NOT_FOUND, "Objek tidak ditemukan").into_response())
            } else {
                Ok((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Gagal mengunduh file: {}", e),
                )
                    .into_response())
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
    AuthedRequest(auth): AuthedRequest,
    ctx: ServiceCtx,
    Path(bucket): Path<String>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let s3 = require_s3(state.as_ref()).await?;
    let body: RemoveRequest =
        body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if !validate_bucket(&bucket) {
        return Err(VilError::bad_request("Nama bucket tidak valid"));
    }

    if body.paths.is_empty() {
        return Err(VilError::bad_request("Daftar path tidak boleh kosong"));
    }

    // Build S3 keys; reject any traversal attempt.
    let mut keys: Vec<String> = Vec::with_capacity(body.paths.len());
    for raw_path in &body.paths {
        match sanitize_path(raw_path) {
            Some(p) => keys.push(build_s3_key(&bucket, &auth.tenant_id, &p)),
            None => {
                return Err(VilError::bad_request(&format!(
                    "Path tidak valid: {}",
                    raw_path
                )));
            }
        }
    }

    // vil_conn_s3 exposes delete (single); delete them sequentially.
    let total = keys.len();
    let mut errors: Vec<String> = Vec::new();
    for key in &keys {
        if let Err(e) = s3.delete(key).await {
            errors.push(format!("{}: {}", key, e));
        }
    }

    if errors.is_empty() {
        Ok(VilResponse::ok(serde_json::json!({ "deleted": total })))
    } else {
        Err(VilError::internal(&format!(
            "Gagal menghapus {} file: {}",
            errors.len(),
            errors.join("; ")
        )))
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
    vil_ctx: ServiceCtx,
    Path((bucket, path)): Path<(String, String)>,
) -> HandlerResult<VilResponse<PublicUrlResponse>> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;

    if !state.s3_endpoint.is_some() {
        return Err(VilError::service_unavailable(
            "Layanan penyimpanan tidak dikonfigurasi",
        ));
    }

    if !validate_bucket(&bucket) {
        return Err(VilError::bad_request("Nama bucket tidak valid"));
    }

    let clean_path = sanitize_path(&path)
        .ok_or_else(|| VilError::bad_request("Path tidak valid"))?;

    // For public-url we don't have tenant context (unauthenticated call).
    // The caller must supply the full path including the tenant prefix.
    let s3_key = format!("{}/{}", bucket, clean_path);
    let public_url = public_url_for(state.as_ref(), &s3_key);

    Ok(VilResponse::ok(PublicUrlResponse { public_url }))
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
    AuthedRequest(auth): AuthedRequest,
    ctx: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<SignedUrlResponse>> {
    let state = ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let s3 = require_s3(state.as_ref()).await?;
    let body: SignedUrlRequest =
        body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if !validate_bucket(&body.bucket) {
        return Err(VilError::bad_request("Nama bucket tidak valid"));
    }

    let clean_path = sanitize_path(&body.path)
        .ok_or_else(|| VilError::bad_request("Path tidak valid"))?;

    let expires_in = body.expires_in.unwrap_or(3_600).min(604_800); // cap at 7 days
    let s3_key = build_s3_key(&body.bucket, &auth.tenant_id, &clean_path);

    let signed_url = s3
        .presign_get(&s3_key, Duration::from_secs(expires_in))
        .await
        .map_err(|e| VilError::internal(&format!("Gagal membuat signed URL: {}", e)))?;

    Ok(VilResponse::ok(SignedUrlResponse { signed_url, expires_in }))
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
    AuthedRequest(auth): AuthedRequest,
    ctx: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<PresignUploadResponse>> {
    let state = ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let s3 = require_s3(state.as_ref()).await?;
    let body: PresignUploadRequest =
        body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    if !validate_bucket(&body.bucket) {
        return Err(VilError::bad_request("Nama bucket tidak valid"));
    }

    let clean_path = sanitize_path(&body.path)
        .ok_or_else(|| VilError::bad_request("Path tidak valid"))?;

    let expires_in = body.expires_in.unwrap_or(3_600).min(604_800);
    let s3_key = build_s3_key(&body.bucket, &auth.tenant_id, &clean_path);
    let public_url = public_url_for(state.as_ref(), &s3_key);

    let upload_url = s3
        .presign_put(&s3_key, Duration::from_secs(expires_in))
        .await
        .map_err(|e| {
            VilError::internal(&format!("Gagal membuat presigned upload URL: {}", e))
        })?;

    Ok(VilResponse::ok(PresignUploadResponse {
        upload_url,
        public_url,
        key: s3_key,
        expires_in,
    }))
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

/// `GET /api/v1/storage/list/{bucket}`
///
/// Lists objects visible to the authenticated tenant within the bucket.
/// `vil_conn_s3::S3Connector::list` returns `Vec<String>` (keys only).
pub async fn list_handler(
    AuthedRequest(auth): AuthedRequest,
    vil_ctx: ServiceCtx,
    Path(bucket): Path<String>,
    Query(params): Query<ListParams>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let s3 = require_s3(&state).await?;

    if !validate_bucket(&bucket) {
        return Err(VilError::bad_request("Nama bucket não válido"));
    }

    // Base prefix always scopes to tenant.
    let base_prefix = format!("{}/{}/", bucket, auth.tenant_id);
    let full_prefix = match &params.prefix {
        Some(p) => match sanitize_path(p) {
            Some(clean) => format!("{}{}", base_prefix, clean),
            None => return Err(VilError::bad_request("Prefix tidak valid")),
        },
        None => base_prefix,
    };

    let _limit = params.limit.unwrap_or(100).clamp(1, 1_000) as u32;

    let keys: Vec<String> = s3
        .list(&full_prefix)
        .await
        .map_err(|e| VilError::internal(&format!("Gagal membuat daftar file: {}", e)))?;

    let count = keys.len();
    Ok(VilResponse::ok(serde_json::json!({ "items": keys, "count": count })))
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

#[derive(sqlx::FromRow)]
struct StorageMigrationAgg {
    pending: i64,
    migrating: i64,
    completed: i64,
    failed: i64,
    skipped: i64,
    total: i64,
}

/// `GET /api/v1/storage/migration-status`
///
/// Returns the current storage migration state read from `storage_file_migrations`.
/// Requires any authenticated user.
pub async fn migration_status_handler(
    AuthedRequest(_auth): AuthedRequest,
    vil_ctx: ServiceCtx,
) -> HandlerResult<VilResponse<MigrationStatusResponse>> {
    let state = vil_ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let storage_configured = state.s3_endpoint.is_some();
    let bucket = if storage_configured {
        Some(state.s3_bucket.clone())
    } else {
        None
    };

    if !storage_configured {
        return Ok(VilResponse::ok(MigrationStatusResponse {
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
        }));
    }

    // Query aggregate counts from storage_file_migrations
    let row: Result<StorageMigrationAgg, sqlx::Error> = sqlx::query_as::<_, StorageMigrationAgg>(
        r#"
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
            COUNT(*) FILTER (WHERE status = 'migrating') AS migrating,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
            COUNT(*) FILTER (WHERE status = 'skipped')   AS skipped,
            COUNT(*)                                     AS total
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

    Ok(VilResponse::ok(MigrationStatusResponse {
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
    }))
}
