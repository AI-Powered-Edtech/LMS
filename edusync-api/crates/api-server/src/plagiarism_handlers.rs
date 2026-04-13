/// API handlers untuk plagiarism checking
///
/// Endpoints:
/// - POST /api/v1/ai/check-plagiarism - Cek plagiarism untuk submission
/// - GET /api/v1/ai/plagiarism-report/:report_id - Ambil laporan plagiarism
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::extractors::AuthedRequest;

#[derive(Debug, Deserialize)]
pub struct CheckPlagiarismRequest {
    pub submission_id: Uuid,
    pub content: String,
    pub assignment_id: Uuid,
}

/// POST /api/v1/ai/check-plagiarism
/// Cek plagiarism untuk submission siswa
pub async fn check_plagiarism_handler(
    AuthedRequest {
        user_id,
        tenant_id,
        db,
        ..
    }: AuthedRequest,
    State(_state): State<Arc<crate::state::AppState>>,
    Json(req): Json<CheckPlagiarismRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let plagiarism_req = edusync_services::plagiarism::CheckPlagiarismRequest {
        submission_id: req.submission_id,
        content: req.content,
        assignment_id: req.assignment_id,
    };

    match edusync_services::plagiarism::check_plagiarism(&db, user_id, tenant_id, plagiarism_req)
        .await
    {
        Ok(response) => {
            tracing::info!(
                report_id = %response.data.report_id,
                similarity = response.data.overall_similarity,
                status = %response.data.status,
                "Plagiarism check completed"
            );

            Ok(Json(serde_json::json!({
                "success": true,
                "data": response.data
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Plagiarism check failed");
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

/// GET /api/v1/ai/plagiarism-report/:report_id
/// Ambil laporan plagiarism
pub async fn get_plagiarism_report_handler(
    State(db): State<PgPool>,
    Path(report_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    match edusync_services::plagiarism::get_plagiarism_report(&db, report_id).await {
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
