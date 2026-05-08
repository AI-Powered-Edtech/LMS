//! Report-export HTTP handlers — VIL-style migration v2 (post-audit §11, 2026-05-08).
//!
//! v2 corrects v1 (commit fe6a44472) which assumed wrong service signatures.
//! Real signatures (verified from edusync_services::reports::mod.rs):
//!   - create_export_job -> Result<ExportReportResponse, anyhow::Error>
//!   - get_export_status -> Result<Option<ExportJobStatus>, anyhow::Error>
//!
//! Endpoints:
//! - POST /api/v1/reports/export    → export_report_handler
//! - GET  /api/v1/reports/export/:id → get_export_status_handler

use axum::extract::Path;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use edusync_services::reports::{
    ExportJobStatus, ExportReportRequest, ExportReportResponse, create_export_job,
    get_export_status,
};

use crate::{extractors::AuthedRequest, state::AppState};

/// POST /api/v1/reports/export
///
/// Membuat export job baru. Job akan diproses oleh background worker.
pub async fn export_report_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<ExportReportResponse>> {
    let req: ExportReportRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    let state = svc.state::<AppState>()?.clone();
    let user_id = ctx.user_id;
    let tenant_id = ctx.tenant_id;

    let resp = create_export_job(&state.db, user_id, tenant_id, req)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to create export job");
            VilError::bad_request(e.to_string())
        })?;

    tracing::info!(
        job_id = %resp.job_id,
        user_id = %user_id,
        "Export job created via API"
    );
    Ok(VilResponse::ok(resp))
}

/// GET /api/v1/reports/export/:id
///
/// Cek status export job. Returns 404 kalau job_id tidak ditemukan.
pub async fn get_export_status_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(job_id): Path<Uuid>,
) -> HandlerResult<VilResponse<ExportJobStatus>> {
    let state = svc.state::<AppState>()?.clone();

    match get_export_status(&state.db, job_id).await {
        Ok(Some(status)) => Ok(VilResponse::ok(status)),
        Ok(None) => Err(VilError::not_found(format!(
            "Export job {job_id} not found"
        ))),
        Err(e) => {
            tracing::error!(error = %e, %job_id, "Failed to fetch export status");
            Err(VilError::internal(e.to_string()))
        }
    }
}
