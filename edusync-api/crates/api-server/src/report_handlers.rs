/// API handlers untuk report exports
///
/// Endpoints:
/// - POST /api/v1/reports/export - Membuat export job baru
/// - GET /api/v1/reports/export/:job_id - Cek status export
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
pub struct ExportReportQuery {
    pub course_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// POST /api/v1/reports/export
/// Membuat export job baru untuk laporan
pub async fn export_report_handler(
    AuthedRequest {
        user_id,
        tenant_id,
        db,
        ..
    }: AuthedRequest,
    State(state): State<Arc<AppState>>,
    Json(req): Json<edusync_services::export_jobs::ExportReportRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    match edusync_services::export_jobs::create_export_job(&db, user_id, tenant_id, req).await {
        Ok(response) => {
            tracing::info!(job_id = %response.data.job_id, user_id = %user_id, "Export job created via API");

            // Job akan diproses oleh background worker (cron job)
            // Tidak spawn task di sini untuk menghindari race condition

            Ok(Json(serde_json::json!({
                "success": true,
                "data": response.data
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create export job");
            Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })),
            ))
        }
    }
}

/// GET /api/v1/reports/export/:job_id
/// Cek status export job
pub async fn get_export_status_handler(
    State(db): State<PgPool>,
    Path(job_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    match edusync_services::export_jobs::get_export_status(&db, job_id).await {
        Ok(response) => Ok(Json(serde_json::json!({
            "success": true,
            "data": response.data
        }))),
        Err(e) => {
            let status_code = if e.to_string().contains("not found") {
                axum::http::StatusCode::NOT_FOUND
            } else {
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            };

            Err((
                status_code,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })),
            ))
        }
    }
}

/// Handler untuk background worker
pub async fn run_export_worker_handler(db: &PgPool, state: &Arc<AppState>) {
    match create_s3_client(state).await {
        Some(s3_client) => {
            // Export worker akan dipanggil dari cron job
            // Implementation ada di services layer
            tracing::debug!("cron:export_worker tick (handled by services)");
        }
        None => {
            tracing::error!("cron:export_worker - failed to create S3 client");
        }
    }
}
