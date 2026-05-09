/// API handlers untuk video transcoding
///
/// Endpoint:
/// - GET /api/v1/storage/transcode-status/:video_id
/// - POST /api/v1/storage/transcode
use axum::extract::Path;
use serde::Deserialize;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{extractors::AuthedRequest, state::AppState, storage::client::create_s3_client};

#[derive(Debug, Deserialize)]
pub struct CreateTranscodeRequest {
    pub video_id: Uuid,
    pub s3_key: String,
    pub filename: String,
}

/// GET /api/v1/storage/transcode-status/:video_id
/// Mengambil status transcoding untuk video tertentu.
///
/// Response includes snake_case and camelCase aliases so the current FE hook
/// can consume it directly while older callers remain stable.
pub async fn get_transcode_status_handler(
    AuthedRequest(_auth): AuthedRequest,
    svc: ServiceCtx,
    Path(video_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;

    match edusync_services::video::transcode::get_transcoding_status(&state.db, video_id).await {
        Ok(Some(status)) => Ok(VilResponse::ok(serde_json::json!({
            "video_id": status.video_id,
            "videoId": status.video_id,
            "status": status.status,
            "progress_percent": status.progress_percent,
            "progressPercent": status.progress_percent,
            "hls_manifest_url": status.hls_manifest_url,
            "hlsManifestUrl": status.hls_manifest_url,
            "thumbnail_url": status.thumbnail_url,
            "thumbnailUrl": status.thumbnail_url,
            "duration_seconds": status.duration_seconds,
            "durationSeconds": status.duration_seconds,
            "error_message": status.error_message,
            "errorMessage": status.error_message,
        }))),
        Ok(None) => Err(VilError::not_found("Transcoding job tidak ditemukan")),
        Err(e) => {
            tracing::error!(error = %e, video_id = %video_id, "Failed to get transcoding status");
            Err(VilError::internal("Gagal mengambil status transcoding"))
        }
    }
}

/// POST /api/v1/storage/transcode
/// Membuat transcoding job baru.
pub async fn create_transcode_handler(
    AuthedRequest(auth): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;
    let req: CreateTranscodeRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let create_req = edusync_services::video::transcode::CreateTranscodingJobRequest {
        video_id: req.video_id,
        s3_key: req.s3_key.clone(),
        original_filename: req.filename.clone(),
    };

    match edusync_services::video::transcode::create_transcoding_job(&state.db, create_req, auth.user_id).await
    {
        Ok(job) => {
            tracing::info!(job_id = %job.id, user_id = %auth.user_id, "Transcoding job created via API");
            Ok(VilResponse::created(serde_json::json!({
                "job_id": job.id,
                "jobId": job.id,
                "status": job.status,
                "message": "Transcoding job dibuat dan masuk antrean background processing"
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create transcoding job");
            Err(VilError::internal("Gagal membuat transcoding job"))
        }
    }
}

/// Handler untuk background worker - dipanggil dari scheduler.
pub async fn run_transcoding_worker_handler(db: &PgPool, state: &Arc<AppState>) {
    match create_s3_client(state.as_ref()).await {
        Some(s3_client) => {
            match edusync_services::video::transcode::run_transcoding_worker(db, &s3_client, 5)
                .await
            {
                Ok(processed) if processed > 0 => {
                    tracing::info!(processed, "cron:transcoding_worker selesai");
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::error!(error = %e, "cron:transcoding_worker gagal");
                }
            }
        }
        None => {
            tracing::error!("cron:transcoding_worker - failed to create S3 client");
        }
    }
}
