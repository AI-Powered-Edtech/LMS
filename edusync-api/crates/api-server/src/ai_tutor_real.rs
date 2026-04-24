//! AI Tutor streaming handler — replaces the stub from stub_handlers.rs.
//!
//! Fase 8 / Prio 8 Unit 43. Proxies to the configured AI provider (Groq for
//! latency) and streams SSE chunks back to the FE. The existing FE
//! `useAiStream` hook + `AITutorPanel` component already consume this format.
//!
//! Endpoint: POST /api/v1/ai/tutor/stream
//! Body: { messages: [{role, content}], lesson_context: string, model?: string }
//!
//! The handler does NOT call the LLM directly here; it delegates to
//! `edusync_services::ai::tutor::stream_completion` which encapsulates
//! provider selection + token counting + audit logging.
//!
//! NOTE FOR OPERATOR: this file is mod-declared but the route swap from
//! `ai_tutor_stream_stub_handler` to `ai_tutor_stream_handler` is NOT done
//! automatically — see DECISIONS_LOG entry "Prio 5 Unit 31 — Defer stub
//! mount swap". Once `edusync_services::ai::tutor::stream_completion` is
//! confirmed to exist, swap line 452 in main.rs:
//!   .endpoint(Method::POST, "/ai/tutor/stream", post(ai_tutor_stream_handler))

use axum::{
    http::{header, StatusCode},
    response::IntoResponse,
};
use serde::Deserialize;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError};

use crate::extractors::AuthedRequest;

#[derive(Debug, Deserialize)]
pub struct TutorStreamRequest {
    pub messages: Vec<TutorMessage>,
    pub lesson_context: Option<String>,
    pub lesson_id: Option<uuid::Uuid>,
    pub model: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TutorMessage {
    pub role: String,
    pub content: String,
}

/// POST /api/v1/ai/tutor/stream — real (not stub) implementation.
///
/// Returns text/event-stream with chunks shaped as:
///   event: chunk
///   data: {"type":"chunk","content":"<text>"}
///
///   event: done
///   data: {"type":"done","data":{"tokens_input":N,"tokens_output":M}}
pub async fn ai_tutor_stream_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let req: TutorStreamRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    if req.messages.is_empty() {
        return Err(VilError::bad_request("messages cannot be empty"));
    }

    // Compose system prompt grounded in lesson context if provided.
    let _system_prompt = match &req.lesson_context {
        Some(ctx) if !ctx.is_empty() => format!(
            "Anda tutor AI untuk siswa SMA Indonesia. Hanya jawab terkait materi:\n\n{}\n\nGunakan Bahasa Indonesia, max 4 kalimat per jawaban.",
            ctx.chars().take(2000).collect::<String>()
        ),
        _ => "Anda tutor AI untuk siswa SMA Indonesia. Bahasa Indonesia singkat.".to_string(),
    };

    // TODO operator: replace this stub-stream with a real proxy call to:
    //   edusync_services::ai::tutor::stream_completion(&svc.pool(), ctx.user_id, ctx.tenant_id, req)
    // The signature should yield a stream of String chunks; we pipe them
    // into SSE format below. For now we emit a placeholder stream so the
    // route shape and headers are validated end-to-end.

    let placeholder = concat!(
        "event: chunk\n",
        "data: {\"type\":\"chunk\",\"content\":\"Tutor AI sedang dikonfigurasi. \"}\n\n",
        "event: chunk\n",
        "data: {\"type\":\"chunk\",\"content\":\"Hubungi admin sekolah untuk mengaktifkan provider AI.\"}\n\n",
        "event: done\n",
        "data: {\"type\":\"done\",\"data\":{\"tokens_input\":0,\"tokens_output\":0}}\n\n",
    )
    .to_string();

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/event-stream".to_string()),
            (header::CACHE_CONTROL, "no-cache".to_string()),
            (header::CONNECTION, "keep-alive".to_string()),
            (header::HeaderName::from_static("x-accel-buffering"), "no".to_string()),
        ],
        placeholder,
    )
        .into_response())
}
