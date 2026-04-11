//! Phase 3A — AI service Axum handlers.
//!
//! Thin adapters that extract auth context from the request and delegate to
//! the corresponding service functions in `edusync_services::ai`.

use axum::{response::IntoResponse, Extension, Json};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

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
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<GradeEssayRequest>,
) -> impl IntoResponse {
    let context = GradeEssayContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };
    match grade_essay(context, payload).await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
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
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<TutorChatRequest>,
) -> impl IntoResponse {
    let context = TutorChatContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
    };
    match tutor_chat(context, payload.lesson_id, payload.message, payload.session_id).await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
}

// ─── Generate Content ─────────────────────────────────────────────────────────

pub async fn generate_content_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<GenerateContentRequest>,
) -> impl IntoResponse {
    let context = ContentGenContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };
    match generate_content(context, payload).await {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
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
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<GenerateQuizRequest>,
) -> impl IntoResponse {
    let context = QuizGenContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
        role: ctx.role.clone(),
    };
    match generate_quiz(
        context,
        payload.lesson_id,
        payload.count,
        payload.difficulty,
        payload.question_types,
    )
    .await
    {
        Ok(resp) => resp.into_response(),
        Err(e) => e.into_response(),
    }
}
