/// API handlers untuk video transcoding
///
/// Endpoint:
/// - GET /api/v1/storage/transcode-status/:video_id
/// - POST /api/v1/storage/transcode
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::{extractors::AuthedRequest, state::AppState, storage::client::create_s3_client};

#[derive(Debug, Deserialize)]
pub struct CreateTranscodeRequest {
    pub video_id: Uuid,
    pub s3_key: String,
    pub filename: String,
}

/// GET /api/v1/storage/transcode-status/:video_id
/// Mengambil status transcoding untuk video tertentu
pub async fn get_transcode_status_handler(
    State(db): State<PgPool>,
    Path(video_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    match edusync_services::video::transcode::get_transcoding_status(&db, video_id).await {
        Ok(Some(status)) => Ok(Json(serde_json::json!({
            "success": true,
            "data": status
        }))),
        Ok(None) => Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "error": "Transcoding job not found"
            })),
        )),
        Err(e) => {
            tracing::error!(error = %e, "Failed to get transcoding status");
            Err((
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": "Failed to retrieve transcoding status"
                })),
            ))
        }
    }
}

/// POST /api/v1/storage/transcode
/// Membuat transcoding job baru
pub async fn create_transcode_handler(
    AuthedRequest { user_id, db, .. }: AuthedRequest,
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateTranscodeRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Validasi bahwa user memiliki akses ke video
    // TODO: Implementasi validasi ownership

    let create_req = edusync_services::video::transcode::CreateTranscodingJobRequest {
        video_id: req.video_id,
        s3_key: req.s3_key.clone(),
        original_filename: req.filename.clone(),
    };

    match edusync_services::video::transcode::create_transcoding_job(&db, create_req, user_id).await
    {
        Ok(job) => {
            tracing::info!(job_id = %job.id, user_id = %user_id, "Transcoding job created via API");

            // Job akan diproses oleh background worker (cron job setiap 30 detik)
            // Tidak spawn task di sini untuk menghindari race condition

            Ok(Json(serde_json::json!({
                "success": true,
                "data": {
                    "job_id": job.id,
                    "status": job.status.to_string(),
                    "message": "Transcoding job created and queued for background processing"
                }
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create transcoding job");
            Err((
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "error": "Failed to create transcoding job"
                })),
            ))
        }
    }
}

/// Handler untuk background worker - dipanggil dari scheduler
pub async fn run_transcoding_worker_handler(db: &PgPool, state: &Arc<AppState>) {
    match create_s3_client(state) {
        Ok(s3_client) => {
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
        Err(e) => {
            tracing::error!(error = %e, "cron:transcoding_worker - failed to create S3 client");
        }
    }
}
