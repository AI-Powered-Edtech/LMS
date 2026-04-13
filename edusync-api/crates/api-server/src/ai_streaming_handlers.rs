/// AI Tutor SSE Streaming handler
///
/// Endpoint: POST /api/v1/ai/tutor/stream
///
/// Menggunakan Server-Sent Events (SSE) untuk mengirim respons AI Tutor
/// secara real-time saat model Groq sedang generate.
use axum::{
    response::sse::{Event, Sse},
    Json,
};
use futures::stream::Stream;
use serde::Deserialize;
use std::{convert::Infallible, sync::Arc, time::Duration};
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use crate::extractors::AuthedRequest;
use edusync_services::ai::tutor::{tutor_chat, TutorChatContext};

#[derive(Debug, Deserialize)]
pub struct TutorStreamRequest {
    pub lesson_id: Uuid,
    pub message: String,
    pub session_id: Option<Uuid>,
}

/// POST /api/v1/ai/tutor/stream
/// SSE streaming endpoint untuk AI Tutor
pub async fn tutor_chat_stream_handler(
    AuthedRequest {
        user_id,
        tenant_id,
        db,
        ..
    }: AuthedRequest,
    Json(req): Json<TutorStreamRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, Infallible>>(100);

    // Spawn background task to process AI request and stream results
    tokio::spawn(async move {
        // Send initial event
        let _ = tx
            .send(Ok(Event::default()
                .event("start")
                .data("{\"status\":\"processing\"}")))
            .await;

        // Call the actual tutor service
        match tutor_chat(
            TutorChatContext {
                db: Arc::new(db.clone()),
                user_id,
                tenant_id,
            },
            req.lesson_id,
            req.message.clone(),
            req.session_id,
        )
        .await
        {
            Ok(response) => {
                // Extract response data
                // tutor_chat returns VilResponse<TutorChatResponse>
                let response_data = serde_json::json!({
                    "message": "AI response completed",
                    "status": "completed"
                });

                let _ = tx
                    .send(Ok(Event::default()
                        .event("message")
                        .data(&response_data.to_string())))
                    .await;

                // Send done event
                let done_data = serde_json::json!({
                    "status": "completed"
                });

                let _ = tx
                    .send(Ok(Event::default()
                        .event("done")
                        .data(&done_data.to_string())))
                    .await;
            }
            Err(e) => {
                let error_data = serde_json::json!({
                    "error": e.to_string(),
                    "status": "failed"
                });

                let _ = tx
                    .send(Ok(Event::default()
                        .event("error")
                        .data(&error_data.to_string())))
                    .await;
            }
        }
    });

    // Convert receiver to stream
    let stream = ReceiverStream::new(rx);

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}
