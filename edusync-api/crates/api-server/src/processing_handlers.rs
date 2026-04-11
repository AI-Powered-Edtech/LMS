//! Phase 3D — Processing & Misc Axum handlers.
//!
//! Covers: progress events, quiz data loader, SCORM extraction, bulk user import.

use axum::{
    body::Bytes,
    extract::Path,
    http::StatusCode,
    response::{IntoResponse, Response},
    Extension, Json,
};
use std::sync::Arc;
use uuid::Uuid;

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
    Extension(state): Extension<Arc<AppState>>,
    Json(events): Json<Vec<TelemetryEvent>>,
) -> impl IntoResponse {
    match enqueue_progress_events(&state.db, ctx.user_id, events).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(ProgressApiError::TooManyEvents(n)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": format!("Terlalu banyak event: {n}. Maksimum 100 per permintaan.")
            })),
        )
            .into_response(),
        Err(ProgressApiError::QueueFull) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "error": "Server sibuk — antrian penuh, coba lagi nanti" })),
        )
            .into_response(),
        Err(ProgressApiError::Database(msg)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response(),
    }
}

// ─── Quiz Loader ──────────────────────────────────────────────────────────────

pub async fn load_quiz_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Path(quiz_id): Path<Uuid>,
) -> impl IntoResponse {
    use edusync_services::quiz::loader::QuizLoaderError;

    match load_quiz_for_student(&state.db, quiz_id, ctx.user_id, ctx.tenant_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(QuizLoaderError::NotFound) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Kuis tidak ditemukan" })),
        )
            .into_response(),
        Err(QuizLoaderError::Forbidden) => (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Akses ditolak: Anda belum terdaftar di kursus yang memuat kuis ini"
            })),
        )
            .into_response(),
        Err(QuizLoaderError::Database(msg)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response(),
    }
}

// ─── SCORM Extract ────────────────────────────────────────────────────────────

pub async fn extract_scorm_handler(
    rbac: RbacGuard,
    Extension(_state): Extension<Arc<AppState>>,
    body: Bytes,
) -> Response {
    // Only teachers and admins can upload SCORM content
    if rbac.require("teacher").is_err() {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Akses ditolak" })),
        )
            .into_response();
    }

    use edusync_services::scorm::ScormError;
    match extract_scorm(&body) {
        Ok(manifest) => (StatusCode::OK, Json(manifest)).into_response(),
        Err(ScormError::InvalidZip(msg)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": format!("File ZIP tidak valid: {msg}") })),
        )
            .into_response(),
        Err(ScormError::NoManifest(msg)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": format!("Manifest SCORM tidak ditemukan: {msg}")
            })),
        )
            .into_response(),
        Err(ScormError::NoEntryPoint) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Titik masuk (entry point) tidak ditemukan dalam manifest SCORM"
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

// ─── Bulk User Import ─────────────────────────────────────────────────────────

pub async fn import_users_handler(
    rbac: RbacGuard,
    Extension(state): Extension<Arc<AppState>>,
    body: Bytes,
) -> Response {
    // Only admins can import users
    if rbac.require("admin").is_err() {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Akses ditolak: hanya admin yang dapat mengimpor pengguna" })),
        )
            .into_response();
    }

    let ctx = rbac.ctx();

    use edusync_services::import::BulkImportError;
    match import_users_from_csv(&state.db, &body, ctx.tenant_id, ctx.user_id).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(BulkImportError::CsvParse(msg)) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": format!("Gagal mem-parsing CSV: {msg}") })),
        )
            .into_response(),
        Err(BulkImportError::Database(msg)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response(),
    }
}
