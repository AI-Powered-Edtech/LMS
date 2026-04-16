//! Phase 3A — AI service handlers (VIL Way).
//!
//! Thin adapters that extract auth context from the request and delegate to
//! the corresponding service functions in `edusync_services::ai`.
//!
//! All handlers use VIL primitives:
//! - `ServiceCtx`  replaces `Extension<Arc<AppState>>`
//! - `ShmSlice`    replaces `Json<T>` (zero-copy body via ExchangeHeap)
//! - `VilResponse` replaces `impl IntoResponse`
//! - `VilError`    replaces ad-hoc `(StatusCode, Json)` tuples

use axum::response::IntoResponse;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;
use edusync_services::ai::{
    content_gen::{generate_content, ContentGenContext},
    grading::{grade_essay, GradeEssayContext},
    quiz_gen::{generate_quiz, QuizGenContext},
    tutor::{tutor_chat, TutorChatContext},
    types::{GenerateContentRequest, GradeEssayRequest},
};

// ─── Grade Essay ──────────────────────────────────────────────────────────────

pub async fn grade_essay_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<Arc<AppState>>()?;
    let payload: GradeEssayRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let context = GradeEssayContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };

    let resp = grade_essay(context, payload)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(resp)
}

// ─── Tutor Chat ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct TutorChatRequest {
    pub lesson_id: Uuid,
    pub message: String,
    pub session_id: Option<Uuid>,
}

pub async fn tutor_chat_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<Arc<AppState>>()?;
    let payload: TutorChatRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let context = TutorChatContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
    };

    let resp = tutor_chat(context, payload.lesson_id, payload.message, payload.session_id)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(resp)
}

// ─── Generate Content ─────────────────────────────────────────────────────────

pub async fn generate_content_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;
    let payload: GenerateContentRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let context = ContentGenContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };

    let resp = generate_content(context, payload)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(VilResponse::ok(resp))
}

// ─── Generate Quiz ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct GenerateQuizRequest {
    pub lesson_id: Uuid,
    pub count: Option<u8>,
    pub difficulty: Option<String>,
    pub question_types: Option<Vec<String>>,
}

pub async fn generate_quiz_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;
    let payload: GenerateQuizRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let context = QuizGenContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };

    let resp = generate_quiz(
        context,
        payload.lesson_id,
        payload.count,
        payload.difficulty,
        payload.question_types,
    )
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(VilResponse::ok(resp))
}
