//! XP & Gradebook Service Handlers
//!
//! XP Endpoints:
//! - POST /api/v1/xp/award
//! - GET /api/v1/xp/user/:user_id
//! - GET /api/v1/xp/leaderboard
//! - GET /api/v1/xp/transactions/:user_id
//!
//! Gradebook Endpoints:
//! - GET /api/v1/gradebook/class/:class_id
//! - GET /api/v1/gradebook/student/:student_id

use std::sync::Arc;
use uuid::Uuid;
use axum::{extract::{Path, Query, State}, Json};
use vil_server::prelude::{HandlerResult, ServiceCtx, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;
use edusync_services::gradebook::{get_gradebook, get_student_grades, GradebookError};
use edusync_services::xp::{
    award_xp, get_leaderboard, get_user_xp, get_xp_transactions, AwardXpRequest, XpError,
};

// ─── XP Handlers ──────────────────────────────────────────────────────────────

pub async fn award_xp_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Json(body): Json<AwardXpRequest>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;

    let result = award_xp(&state.db, ctx.user_id, ctx.tenant_id, &body)
        .await
        .map_err(|e| match e {
            XpError::Database(msg) => VilError::internal(msg),
            XpError::InvalidActivity(s) => VilError::bad_request(format!("Invalid activity type: {}", s)),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

pub async fn get_user_xp_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(user_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;

    let result = get_user_xp(&state.db, user_id)
        .await
        .map_err(|e| match e {
            XpError::Database(msg) => VilError::internal(msg),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

#[derive(Debug, serde::Deserialize)]
pub struct LeaderboardQuery {
    pub course_id: Option<Uuid>,
    pub limit: Option<i32>,
}

pub async fn leaderboard_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Query(query): Query<LeaderboardQuery>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;
    let limit = query.limit.unwrap_or(10);

    let result = get_leaderboard(&state.db, ctx.tenant_id, query.course_id, limit)
        .await
        .map_err(|e| match e {
            XpError::Database(msg) => VilError::internal(msg),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

#[derive(Debug, serde::Deserialize)]
pub struct TransactionsQuery {
    pub limit: Option<i32>,
}

pub async fn xp_transactions_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(user_id): Path<Uuid>,
    Query(query): Query<TransactionsQuery>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;
    let limit = query.limit.unwrap_or(20);

    let result = get_xp_transactions(&state.db, user_id, limit)
        .await
        .map_err(|e| match e {
            XpError::Database(msg) => VilError::internal(msg),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

// ─── Gradebook Handlers ───────────────────────────────────────────────────────

pub async fn gradebook_class_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(class_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;

    let result = get_gradebook(&state.db, class_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            GradebookError::Database(msg) => VilError::internal(msg),
            GradebookError::NotFound => VilError::not_found("Class not found"),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}

#[derive(Debug, serde::Deserialize)]
pub struct StudentGradesQuery {
    pub course_id: Option<Uuid>,
}

pub async fn gradebook_student_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(student_id): Path<Uuid>,
    Query(query): Query<StudentGradesQuery>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?;

    let result = get_student_grades(&state.db, student_id, query.course_id, ctx.tenant_id)
        .await
        .map_err(|e| match e {
            GradebookError::Database(msg) => VilError::internal(msg),
            GradebookError::NotFound => VilError::not_found("Student not found"),
            _ => VilError::internal(e.to_string()),
        })?;

    Ok(VilResponse::ok(serde_json::to_value(result).unwrap_or_default()))
}
