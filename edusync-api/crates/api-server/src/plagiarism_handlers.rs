//! Plagiarism-check HTTP handler — VIL-style migration (post-audit §11, 2026-05-08).
//!
//! Sebelum migrasi: handler axum-style tidak compatible dengan VIL — orphan file.
//! Setelah migrasi: signature VIL match «.endpoint(...post(handler))» di main.rs.
//!
//! Endpoint:
//! - POST /api/v1/plagiarism/check → check_plagiarism_handler

use serde::Deserialize;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{extractors::AuthedRequest, state::AppState};

#[derive(Debug, Deserialize)]
pub struct CheckPlagiarismRequest {
    pub submission_id: Uuid,
    pub content: String,
    pub assignment_id: Uuid,
}

/// POST /api/v1/plagiarism/check
///
/// Cek similarity teks submisi siswa terhadap referensi internal.
pub async fn check_plagiarism_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let req: CheckPlagiarismRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    let state = svc.state::<AppState>()?.clone();
    let db = state.db.clone();
    let user_id = ctx.user_id;
    let tenant_id = ctx.tenant_id;

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
            Ok(VilResponse::ok(serde_json::json!({
                "success": true,
                "data": response.data
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Plagiarism check failed");
            Err(VilError::bad_request(e.to_string()))
        }
    }
}
