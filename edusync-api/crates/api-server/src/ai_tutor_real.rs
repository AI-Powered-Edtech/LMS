//! AI Tutor streaming handler. Bridges the streaming FE contract
//! (`event: chunk` / `event: done` SSE format consumed by useAiStream) to
//! the existing non-streaming `edusync_services::ai::tutor::tutor_chat`
//! pipeline which already handles Groq calls, session memory, rate limit,
//! and audit logging.
//!
//! Endpoint: POST /api/v1/ai/tutor/stream
//! Body: { messages: [{role, content}], lesson_id: uuid, session_id?: uuid }

use std::sync::Arc;

use axum::{
    http::{header, StatusCode},
    response::IntoResponse,
};
use edusync_services::ai::tutor::{tutor_chat, TutorChatContext};
use serde::Deserialize;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError};

use crate::{extractors::AuthedRequest, state::AppState};

#[derive(Debug, Deserialize)]
pub struct TutorStreamRequest {
    pub messages: Vec<TutorMessage>,
    pub lesson_id: uuid::Uuid,
    pub session_id: Option<uuid::Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct TutorMessage {
    pub role: String,
    pub content: String,
}

pub async fn ai_tutor_stream_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let req: TutorStreamRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    let last_user_msg = req
        .messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .ok_or_else(|| VilError::bad_request("no user message in conversation"))?
        .content
        .clone();

    let state = svc.state::<AppState>()?.clone();
    let tutor_ctx = TutorChatContext {
        db: Arc::new(state.db.clone()),
        user_id: ctx.user_id,
        tenant_id: ctx.tenant_id,
    };

    // Call non-streaming tutor; emit the full reply as a single SSE chunk.
    // Upgrading to real token-by-token streaming requires refactoring
    // tutor_chat to return a stream, which is tracked as a separate unit.
    let vil_resp = tutor_chat(tutor_ctx, req.lesson_id, last_user_msg, req.session_id).await?;
    let reply = vil_resp.data;

    let escaped = reply
        .reply
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n");
    let sse_body = format!(
        "event: chunk\ndata: {{\"type\":\"chunk\",\"content\":\"{}\"}}\n\nevent: done\ndata: {{\"type\":\"done\",\"session_id\":\"{}\"}}\n\n",
        escaped, reply.session_id
    );

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/event-stream".to_string()),
            (header::CACHE_CONTROL, "no-cache".to_string()),
            (header::CONNECTION, "keep-alive".to_string()),
            (header::HeaderName::from_static("x-accel-buffering"), "no".to_string()),
        ],
        sse_body,
    )
        .into_response())
}
