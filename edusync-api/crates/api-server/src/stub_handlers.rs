//! Stub handlers untuk endpoint FE yang masih perlu placeholder.
//!
//! Per 2026-05-09: report (executive/parent), reports/export, dan plagiarism
//! sudah punya implementasi nyata di handler crate masing-masing dan dipanggil
//! langsung dari main.rs. Yang tersisa di file ini:
//!   - `scorm_runtime_stub_handler` — fire-and-forget beacon ScormPlayer
//!     (akan diganti Task C SCORM xAPI receiver).
//!   - `ai_tutor_stream_stub_handler` — fallback aman; pemensiun tunggu #320
//!     operator smoke pass (#321).

use axum::{
    http::{header, StatusCode},
    response::IntoResponse,
};
use serde_json::json;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilResponse};

use crate::extractors::AuthedRequest;

// ─── AI Tutor Stream (stub, SSE) ─────────────────────────────────────────────

/// Return minimal SSE stream dengan event `start` + `done` agar FE reader
/// menyelesaikan loop dengan bersih tanpa error. Kept as fallback until #320
/// operator smoke pass + #321 decommission.
#[allow(dead_code)]
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

// ─── SCORM Runtime (stub) ────────────────────────────────────────────────────────────

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
