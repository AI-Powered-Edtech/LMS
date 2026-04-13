/// AI Tutor SSE Streaming handler - TRUE streaming implementation
///
/// Implements token-by-token streaming from Groq API to the client.
/// Uses direct HTTP streaming to Groq API with stream=true.
use axum::{
    body::Bytes,
    extract::State,
    response::sse::{Event, Sse},
    Json,
};
use futures::stream::Stream;
use serde::Deserialize;
use std::{convert::Infallible, sync::Arc, time::Duration};
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use crate::{extractors::AuthedUser, state::AppState};

#[derive(Debug, Deserialize)]
pub struct TutorStreamRequest {
    pub lesson_id: Uuid,
    pub message: String,
    pub session_id: Option<Uuid>,
}

/// POST /api/v1/ai/tutor/stream
/// True SSE streaming endpoint for AI Tutor.
///
/// Streams tokens from Groq API in real-time using SSE format:
/// event: start    - Streaming started
/// event: token    - Individual token from Groq
/// event: done     - Streaming completed
/// event: error    - Error occurred
pub async fn tutor_chat_stream_handler(
    State(state): State<Arc<AppState>>,
    AuthedUser(user): AuthedUser,
    Json(req): Json<TutorStreamRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, Infallible>>(100);

    let tenant_id = user.tenant_id;
    let user_id = user.user_id;
    let db = state.db.clone();
    let lesson_id = req.lesson_id;
    let message = req.message.clone();
    let session_id = req.session_id;

    tokio::spawn(async move {
        // Send start event
        let _ = tx
            .send(Ok(Event::default()
                .event("start")
                .data("{\"status\":\"processing\"}")))
            .await;

        // Call Groq with streaming
        match stream_from_groq(
            &db, user_id, tenant_id, lesson_id, &message, session_id, &tx,
        )
        .await
        {
            Ok(session_id) => {
                let done_data = serde_json::json!({
                    "status": "completed",
                    "session_id": session_id
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

    let stream = ReceiverStream::new(rx);

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

/// Stream from Groq API with true token-by-token SSE
async fn stream_from_groq(
    db: &sqlx::PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    lesson_id: Uuid,
    message: &str,
    session_id: Option<Uuid>,
    tx: &tokio::sync::mpsc::Sender<Result<Event, Infallible>>,
) -> Result<Uuid, anyhow::Error> {
    let groq_api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| anyhow::anyhow!("GROQ_API_KEY tidak dikonfigurasi"))?;

    // Get or create session and build messages
    let session = get_or_create_session(db, user_id, lesson_id, tenant_id, session_id).await?;
    let messages = build_messages(db, session.id, message).await?;

    // Call Groq API with streaming
    let client = reqwest::Client::new();
    let groq_url = "https://api.groq.com/openai/v1/chat/completions";

    let response = client
        .post(groq_url)
        .bearer_auth(&groq_api_key)
        .json(&serde_json::json!({
            "model": "llama-3.1-70b-versatile",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Groq API request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("Groq API error: {}", error_text));
    }

    // Read SSE stream from Groq
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| anyhow::anyhow!("Stream error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete SSE events in buffer
        while let Some(pos) = buffer.find("\n\n") {
            let event = &buffer[..pos];
            buffer = buffer[pos + 2..].to_string();

            // Parse SSE data
            if let Some(data_line) = event.lines().find(|l| l.starts_with("data:")) {
                let data = &data_line[5..]; // Remove "data: "

                // Check for [DONE] marker
                if data.trim() == "[DONE]" {
                    break;
                }

                // Parse JSON
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = json["choices"][0]["delta"]["content"].as_str() {
                        if !token.is_empty() {
                            full_response.push_str(token);

                            // Send token event
                            let token_data = serde_json::json!({
                                "token": token
                            });

                            let _ = tx
                                .send(Ok(Event::default()
                                    .event("token")
                                    .data(&token_data.to_string())))
                                .await;
                        }
                    }
                }
            }
        }
    }

    // Save response to session
    save_response_to_session(db, session.id, message, &full_response).await?;

    // Record usage
    record_usage(db, user_id, tenant_id).await;

    Ok(session.id)
}

// ─── Session Management Helpers ───────────────────────────────────────────────

struct TutorSession {
    id: Uuid,
    messages_json: serde_json::Value,
}

async fn get_or_create_session(
    db: &sqlx::PgPool,
    user_id: Uuid,
    lesson_id: Uuid,
    tenant_id: Uuid,
    session_id: Option<Uuid>,
) -> Result<TutorSession, anyhow::Error> {
    if let Some(sid) = session_id {
        let row = sqlx::query!(
            r#"SELECT id, messages_json FROM public.ai_tutor_sessions
               WHERE id = $1 AND user_id = $2 AND tenant_id = $3 LIMIT 1"#,
            sid,
            user_id,
            tenant_id
        )
        .fetch_optional(db)
        .await?;

        if let Some(r) = row {
            return Ok(TutorSession {
                id: r.id,
                messages_json: r.messages_json.unwrap_or(serde_json::json!([])),
            });
        }
    }

    // Create new session
    let new_id = Uuid::new_v4();
    sqlx::query!(
        r#"INSERT INTO public.ai_tutor_sessions
            (id, tenant_id, user_id, lesson_id, status, message_count, messages_json, last_message_at, created_at)
           VALUES ($1, $2, $3, $4, 'active', 0, '[]'::jsonb, NOW(), NOW())"#,
        new_id,
        tenant_id,
        user_id,
        lesson_id
    )
    .execute(db)
    .await?;

    Ok(TutorSession {
        id: new_id,
        messages_json: serde_json::json!([]),
    })
}

async fn build_messages(
    db: &sqlx::PgPool,
    _session_id: Uuid,
    user_message: &str,
) -> Result<Vec<serde_json::Value>, anyhow::Error> {
    // Build system prompt
    let system_prompt = serde_json::json!({
        "role": "system",
        "content": "Anda adalah tutor AI yang membantu siswa memahami materi pelajaran. Jawab dengan jelas, ringkas, dan mendidik dalam Bahasa Indonesia."
    });

    // Build user message
    let user_msg = serde_json::json!({
        "role": "user",
        "content": user_message
    });

    Ok(vec![system_prompt, user_msg])
}

async fn save_response_to_session(
    db: &sqlx::PgPool,
    session_id: Uuid,
    user_message: &str,
    assistant_reply: &str,
) -> Result<(), anyhow::Error> {
    let row = sqlx::query!(
        r#"SELECT messages_json FROM public.ai_tutor_sessions WHERE id = $1"#,
        session_id
    )
    .fetch_optional(db)
    .await?;

    let mut messages: Vec<serde_json::Value> = match row.and_then(|r| r.messages_json) {
        Some(Value::Array(arr)) => arr,
        _ => vec![],
    };

    // Add user message
    messages.push(serde_json::json!({
        "role": "user",
        "content": user_message
    }));

    // Add assistant message
    messages.push(serde_json::json!({
        "role": "assistant",
        "content": assistant_reply
    }));

    // Keep only last 20 messages
    if messages.len() > 20 {
        messages = messages.split_off(messages.len() - 20);
    }

    sqlx::query!(
        r#"UPDATE public.ai_tutor_sessions
           SET messages_json = $2, message_count = message_count + 2, last_message_at = NOW()
           WHERE id = $1"#,
        session_id,
        serde_json::json!(messages)
    )
    .execute(db)
    .await?;

    Ok(())
}

async fn record_usage(db: &sqlx::PgPool, user_id: Uuid, tenant_id: Uuid) {
    let _ = sqlx::query!(
        r#"INSERT INTO public.ai_quota_usage (id, user_id, tenant_id, endpoint, created_at)
           VALUES ($1, $2, $3, $4, NOW())"#,
        Uuid::new_v4(),
        user_id,
        tenant_id,
        "ai_tutor_stream"
    )
    .execute(db)
    .await;
}

use futures::StreamExt;
use serde_json::Value;
