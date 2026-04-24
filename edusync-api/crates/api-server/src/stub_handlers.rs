//! Stub handlers untuk endpoint FE yang sebelumnya 404.
//!
//! Semua handler di bawah return shape minimal yang dibutuhkan FE agar tidak
//! memunculkan error di console audit. Implementasi penuh akan datang di fase
//! berikutnya — untuk saat ini cukup menjaga surface tetap clean.

use axum::{
    extract::Path,
    http::{header, StatusCode},
    response::IntoResponse,
};
use serde_json::json;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

// ─── PDF Executive Report (stub) ──────────────────────────────────────────────

pub async fn executive_report_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    _body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    Ok(VilResponse::ok(json!({
        "success": true,
        "stub": true,
        "pdf_url": null,
        "message": "executive-report stub — endpoint belum diimplementasi",
    })))
}

// ─── PDF Parent Report (stub) ─────────────────────────────────────────────────

pub async fn parent_report_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    _body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    Ok(VilResponse::ok(json!({
        "success": true,
        "stub": true,
        "reportData": {
            "summary": {},
            "lessons": [],
            "attendance": [],
            "grades": [],
        },
    })))
}

// ─── Reports Export create (stub) ─────────────────────────────────────────────

pub async fn reports_export_create_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let payload: serde_json::Value = body.json().unwrap_or(json!({}));
    let report_type = payload
        .get("report_type")
        .and_then(|v| v.as_str())
        .unwrap_or("grades")
        .to_string();
    let format = payload
        .get("format")
        .and_then(|v| v.as_str())
        .unwrap_or("csv")
        .to_string();

    let job_id = Uuid::new_v4().to_string();
    let now = now_iso();

    // Return status "completed" dengan downloadUrl kosong agar FE stop polling
    // tanpa memicu error path.
    Ok(VilResponse::ok(json!({
        "data": {
            "jobId": job_id,
            "status": "completed",
            "reportType": report_type,
            "format": format,
            "downloadUrl": null,
            "createdAt": now,
            "completedAt": now,
        },
        "stub": true,
    })))
}

// ─── Reports Export status (stub) ─────────────────────────────────────────────

pub async fn reports_export_status_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    Path(job_id): Path<String>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let now = now_iso();
    Ok(VilResponse::ok(json!({
        "data": {
            "jobId": job_id,
            "status": "completed",
            "reportType": "grades",
            "format": "csv",
            "downloadUrl": null,
            "createdAt": now,
            "completedAt": now,
        },
        "stub": true,
    })))
}

// ─── Plagiarism Check (stub) ──────────────────────────────────────────────────

pub async fn plagiarism_check_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let payload: serde_json::Value = body.json().unwrap_or(json!({}));
    let submission_id = payload
        .get("submission_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(VilResponse::ok(json!({
        "success": true,
        "stub": true,
        "submission_id": submission_id,
        "similarity_score": 0.0,
        "status": "completed",
        "matches": [],
        "report_data": {},
    })))
}

// ─── AI Tutor Stream (stub, SSE) ──────────────────────────────────────────────

/// Return minimal SSE stream dengan event `start` + `done` agar FE reader
/// menyelesaikan loop dengan bersih tanpa error.
pub async fn ai_tutor_stream_stub_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    _body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let body = concat!(
        "event: start\n",
        "data: {\"type\":\"start\",\"data\":{\"stub\":true}}\n\n",
        "event: done\n",
        "data: {\"type\":\"done\",\"data\":{\"stub\":true,\"message\":\"ai/tutor/stream stub\"}}\n\n",
    )
    .to_string();

    let response = (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/event-stream".to_string()),
            (header::CACHE_CONTROL, "no-cache".to_string()),
            (header::CONNECTION, "keep-alive".to_string()),
        ],
        body,
    )
        .into_response();

    Ok(response)
}

// ─── SCORM Runtime (stub) ─────────────────────────────────────────────────────

/// Fire-and-forget dari ScormPlayer beforeunload beacon — cukup return 200 OK.
pub async fn scorm_runtime_stub_handler(
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let _ignored: serde_json::Value = body.json().unwrap_or(json!({}));
    Ok(VilResponse::ok(json!({
        "success": true,
        "stub": true,
    })))
}

// ─── Ensure VilError import used (silence warning) ────────────────────────────
#[allow(dead_code)]
fn _unused_vilerror_marker() -> VilError {
    VilError::internal("unused")
}
