//! Phase 3D — Processing & Misc handlers (VIL Way).
//!
//! Covers: progress events, quiz data loader, SCORM extraction, bulk user import.
//!
//! Migration notes:
//! - `enqueue_events_handler`: `Json<Vec<T>>` → `ShmSlice` + `body.json::<Vec<T>>()?`
//! - `load_quiz_handler`:       GET + `Path<Uuid>` — no body, no change to extractors.
//! - `extract_scorm_handler`:   raw ZIP upload via `Bytes` — keep `Bytes` extractor;
//!                              `RbacGuard.require()` now returns `VilError` directly.
//! - `import_users_handler`:    raw CSV upload via `Bytes` — keep `Bytes` extractor;
//!                              same RBAC pattern.
//! - All `Extension<Arc<AppState>>` → `ServiceCtx` + `svc.state::<AppState>()?`
//! - All ad-hoc `(StatusCode, Json)` error tuples → `VilError::*` methods

use axum::{
    body::Bytes,
    extract::Path,
};
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::{AuthedRequest, RbacGuard};
use crate::state::AppState;
use edusync_services::{
    import::import_users_from_csv,
    progress::{
        api::{enqueue_progress_events, ProgressApiError},
        types::TelemetryEvent,
    },
    quiz::loader::load_quiz_for_student,
    scorm::extract_scorm,
};

// ─── Progress Events ──────────────────────────────────────────────────────────

pub async fn enqueue_events_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;
    let events: Vec<TelemetryEvent> = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let resp = enqueue_progress_events(&state.db, ctx.user_id, events)
        .await
        .map_err(|e| match e {
            ProgressApiError::TooManyEvents(n) => VilError::bad_request(format!(
                "Terlalu banyak event: {n}. Maksimum 100 per permintaan."
            )),
            ProgressApiError::QueueFull => VilError::service_unavailable(
                "Server sibuk — antrian penuh, coba lagi nanti",
            ),
            ProgressApiError::Database(msg) => VilError::internal(msg),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(resp).unwrap_or_default()))
}

// ─── Quiz Loader ──────────────────────────────────────────────────────────────

pub async fn load_quiz_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(quiz_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    use edusync_services::quiz::loader::QuizLoaderError;

    let state = svc.state::<AppState>()?;

    let resp = load_quiz_for_student(&state.db, quiz_id, ctx.user_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            QuizLoaderError::NotFound => VilError::not_found("Kuis tidak ditemukan"),
            QuizLoaderError::Forbidden => VilError::forbidden(
                "Akses ditolak: Anda belum terdaftar di kursus yang memuat kuis ini",
            ),
            QuizLoaderError::Database(msg) => VilError::internal(msg),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(resp).unwrap_or_default()))
}

// ─── SCORM Extract ────────────────────────────────────────────────────────────

/// Raw ZIP upload — keeps `Bytes` extractor (not JSON).
/// `RbacGuard::require` now returns `VilError` directly (no early-return dance).
pub async fn extract_scorm_handler(
    rbac: RbacGuard,
    _svc: ServiceCtx,
    body: Bytes,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    use edusync_services::scorm::ScormError;

    // Only teachers and admins can upload SCORM content
    rbac.require("teacher")?;

    let manifest = extract_scorm(&body).map_err(|e| match e {
        ScormError::InvalidZip(msg) => {
            VilError::bad_request(format!("File ZIP tidak valid: {msg}"))
        }
        ScormError::NoManifest(msg) => {
            VilError::bad_request(format!("Manifest SCORM tidak ditemukan: {msg}"))
        }
        ScormError::NoEntryPoint => VilError::bad_request(
            "Titik masuk (entry point) tidak ditemukan dalam manifest SCORM",
        ),
        e => VilError::internal(e.to_string()),
    })?;

    Ok(VilResponse::ok(
        serde_json::to_value(manifest).unwrap_or_default(),
    ))
}

// ─── Bulk User Import ─────────────────────────────────────────────────────────

/// Raw CSV upload — keeps `Bytes` extractor (not JSON).
pub async fn import_users_handler(
    rbac: RbacGuard,
    svc: ServiceCtx,
    body: Bytes,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    use edusync_services::import::BulkImportError;

    // Only admins can import users
    rbac.require("admin")?;

    let state = svc.state::<AppState>()?;
    let ctx = rbac.ctx();

    let result = import_users_from_csv(&state.db, &body, ctx.tenant_id, ctx.user_id)
        .await
        .map_err(|e| match e {
            BulkImportError::CsvParse(msg) => {
                VilError::bad_request(format!("Gagal mem-parsing CSV: {msg}"))
            }
            BulkImportError::Database(msg) => VilError::internal(msg),
        })?;

    Ok(VilResponse::ok(
        serde_json::to_value(result).unwrap_or_default(),
    ))
}
