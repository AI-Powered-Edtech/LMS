//! Report-export HTTP handlers — VIL-style migration (post-audit §11, 2026-05-08).
//!
//! Sebelum migrasi: handler axum-style (State<Arc<AppState>>, Json<T>, Path<Uuid>)
//! tidak compatible dengan VIL .endpoint() — file orphan dan tidak ter-compile.
//!
//! Setelah migrasi: signature VIL (AuthedRequest, ServiceCtx, ShmSlice, Path)
//! match «.endpoint(Method::X, path, post(handler))» di main.rs.
//!
//! Endpoints:
//! - POST /api/v1/reports/export   → export_report_handler
//! - GET  /api/v1/reports/export/:id → get_export_status_handler

use axum::extract::Path;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{extractors::AuthedRequest, state::AppState};

/// POST /api/v1/reports/export
///
/// Membuat export job baru. Job akan diproses oleh background worker (cron).
pub async fn export_report_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let req: edusync_services::reports::ExportReportRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    let state = svc.state::<AppState>()?.clone();
    let db = state.db.clone();
    let user_id = ctx.user_id;
    let tenant_id = ctx.tenant_id;

    match edusync_services::reports::create_export_job(&db, user_id, tenant_id, req).await {
        Ok(response) => {
            tracing::info!(
                job_id = %response.data.job_id,
                user_id = %user_id,
                "Export job created via API"
            );
            Ok(VilResponse::ok(serde_json::json!({
                "success": true,
                "data": response.data
            })))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create export job");
            Err(VilError::bad_request(e.to_string()))
        }
    }
}

/// GET /api/v1/reports/export/:id
///
/// Cek status export job. Returns 404 kalau job_id tidak ditemukan.
pub async fn get_export_status_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(job_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?.clone();
    let db = state.db.clone();

    match edusync_services::reports::get_export_status(&db, job_id).await {
        Ok(response) => Ok(VilResponse::ok(serde_json::json!({
            "success": true,
            "data": response.data
        }))),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") {
                Err(VilError::not_found(msg))
            } else {
                Err(VilError::internal(msg))
            }
        }
    }
}
