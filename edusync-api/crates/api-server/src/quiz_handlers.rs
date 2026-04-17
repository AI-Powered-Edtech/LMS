//! Quiz Service Handlers — Grading, Anti-Cheat, Timer, Item Analysis
//!
//! Endpoints:
//! - POST /api/v1/quiz/grade-answer
//! - POST /api/v1/quiz/submit-attempt
//! - POST /api/v1/quiz/anticheat/event
//! - GET /api/v1/quiz/anticheat/report/:attempt_id
//! - POST /api/v1/quiz/start-attempt
//! - POST /api/v1/quiz/pause-attempt/:attempt_id
//! - POST /api/v1/quiz/resume-attempt/:attempt_id
//! - GET /api/v1/quiz/time-remaining/:attempt_id
//! - GET /api/v1/quiz/item-analysis/:quiz_id

use std::sync::Arc;
use uuid::Uuid;
use axum::{extract::Path, Json};
use vil_server::prelude::{HandlerResult, ServiceCtx, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;
use edusync_services::anticheat::{
    get_anticheat_report, record_anticheat_event, AntiCheatError, RecordEventRequest,
};
use edusync_services::grading::{
    grade_attempt_questions, grade_question, AttemptGradeResult, GradeableQuestion,
    QuestionGradeResult, StudentAnswer,
};
use edusync_services::item_analysis::{analyze_quiz, analyze_quiz_item, ItemAnalysisError};
use edusync_services::quiz_timer::{
    get_time_remaining, pause_attempt, resume_attempt,
    start_quiz_attempt, QuizTimerError, StartAttemptRequest,
};

// ─── Grading Handlers ─────────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
pub struct GradeAnswerRequest {
    pub question: GradeableQuestion,
    pub answer: Option<StudentAnswer>,
}

pub async fn grade_answer_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Json(body): Json<GradeAnswerRequest>,
) -> HandlerResult<VilResponse<QuestionGradeResult>> {
    let _state = svc.state::<Arc<AppState>>()?;
    let result = grade_question(&body.question, body.answer.as_ref());
    Ok(VilResponse::ok(result))
}

#[derive(Debug, serde::Deserialize)]
pub struct GradeAttemptRequest {
    pub questions: Vec<GradeableQuestion>,
    pub answers: Vec<StudentAnswer>,
}

pub async fn grade_attempt_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Json(body): Json<GradeAttemptRequest>,
) -> HandlerResult<VilResponse<AttemptGradeResult>> {
    let _state = svc.state::<Arc<AppState>>()?;
    let result = grade_attempt_questions(&body.questions, &body.answers);
    Ok(VilResponse::ok(result))
}

// ─── Anti-Cheat Handlers ───────────────────────────────────────────────────────

pub async fn anticheat_event_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Json(body): Json<RecordEventRequest>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    use edusync_services::anticheat::RecordEventResponse;

    let state = svc.state::<Arc<AppState>>()?;

    let result = record_anticheat_event(
        &state.db,
        &body,
        ctx.user_id,
        ctx.tenant_id,
    )
    .await
    .map_err(|e| match e {
        AntiCheatError::Database(msg) => VilError::internal(msg),
        _ => VilError::internal(e.to_string()),
    })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn anticheat_report_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(attempt_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = get_anticheat_report(&state.db, attempt_id)
        .await
        .map_err(|e| match e {
            AntiCheatError::Database(msg) => VilError::internal(msg),
            AntiCheatError::NotFound => VilError::not_found("Attempt not found"),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

// ─── Quiz Timer Handlers ──────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
pub struct StartAttemptBody {
    pub quiz_id: Uuid,
}

pub async fn start_attempt_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Json(body): Json<StartAttemptBody>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = start_quiz_attempt(
        &state.db,
        body.quiz_id,
        ctx.user_id,
        ctx.tenant_id,
    )
    .await
    .map_err(|e| match e {
        QuizTimerError::Database(msg) => VilError::internal(msg),
        _ => VilError::internal(e.to_string()),
    })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn pause_attempt_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(attempt_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = pause_attempt(&state.db, attempt_id, ctx.user_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            QuizTimerError::Database(msg) => VilError::internal(msg),
            QuizTimerError::AttemptNotFound => VilError::not_found("Attempt not found"),
            QuizTimerError::NoPauseRemaining => {
                VilError::bad_request("No pause remaining for this attempt")
            }
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn resume_attempt_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(attempt_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = resume_attempt(&state.db, attempt_id, ctx.user_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            QuizTimerError::Database(msg) => VilError::internal(msg),
            QuizTimerError::AttemptNotFound => VilError::not_found("Attempt not found or not paused"),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn time_remaining_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(attempt_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = get_time_remaining(&state.db, attempt_id, ctx.user_id)
        .await
        .map_err(|e| match e {
            QuizTimerError::Database(msg) => VilError::internal(msg),
            QuizTimerError::AttemptNotFound => VilError::not_found("Attempt not found"),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

// ─── Item Analysis Handlers ───────────────────────────────────────────────────

pub async fn analyze_quiz_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(quiz_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = analyze_quiz(&state.db, quiz_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            ItemAnalysisError::Database(msg) => VilError::internal(msg),
            ItemAnalysisError::InsufficientData => {
                VilError::bad_request("Insufficient data for analysis")
            }
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn analyze_item_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(question_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?;

    let result = analyze_quiz_item(&state.db, question_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            ItemAnalysisError::Database(msg) => VilError::internal(msg),
            ItemAnalysisError::QuestionNotFound => VilError::not_found("Question not found"),
            ItemAnalysisError::InsufficientData => {
                VilError::bad_request("Insufficient data for analysis")
            }
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}
