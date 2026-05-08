//! AI Tutor SSE streaming handler — token-by-token streaming from Groq.
//!
//! G2 (2026-05-07): replaces previous buffered single-chunk implementation.
//! Emits SSE events that match the FE `useAiStream` consumer contract:
//!   event: start  → { status: "processing" }
//!   event: token  → { token: "..." }   (one per Groq delta chunk)
//!   event: done   → { status, session_id }
//!   event: error  → { error, status }
//!
//! Endpoint: POST /api/v1/ai/tutor/stream
//! Body: { lesson_id: uuid, message: string, session_id?: uuid }

use std::{convert::Infallible, time::Duration};

use axum::response::{
    sse::{Event, KeepAlive, Sse},
    IntoResponse,
};
use futures_util::stream::StreamExt;
use serde::Deserialize;
use serde_json::Value;
use sqlx::PgPool;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError};

use crate::{extractors::AuthedRequest, state::AppState};

#[derive(Debug, Deserialize)]
pub struct TutorStreamRequest {
    pub lesson_id: Uuid,
    pub message: String,
    pub session_id: Option<Uuid>,
}

const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL: &str = "llama-3.3-70b-versatile";
const RATE_LIMIT_PER_HOUR: i64 = 50;
const MAX_SESSION_MESSAGES: usize = 50;
const TUTOR_HISTORY_WINDOW: usize = 10;
const MAX_CONTEXT_CHARS: usize = 10_000;

#[derive(sqlx::FromRow)]
struct LessonRow {
    title: String,
    content: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ProgressRow {
    total_time_spent: Option<i32>,
    latest_quiz_score: Option<f64>,
}

#[derive(sqlx::FromRow)]
struct SessionLookupRow {
    id: Uuid,
    messages_json: Option<Value>,
}

struct SessionState {
    id: Uuid,
    messages_json: Value,
}

pub async fn ai_tutor_stream_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let req: TutorStreamRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    if req.message.trim().is_empty() {
        return Err(VilError::bad_request("Pesan tidak boleh kosong"));
    }
    if req.message.len() > 2_000 {
        return Err(VilError::bad_request("Pesan melebihi batas 2000 karakter"));
    }

    let state = svc.state::<AppState>()?.clone();
    let db = state.db.clone();
    let user_id = ctx.user_id;
    let tenant_id = ctx.tenant_id;

    // Rate limit guard before opening the stream.
    let usage_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.ai_quota_usage
           WHERE user_id = $1 AND tenant_id = $2
             AND created_at > NOW() - INTERVAL '1 hour'"#,
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(&db)
    .await
    .unwrap_or(0);
    if usage_count >= RATE_LIMIT_PER_HOUR {
        return Err(VilError::rate_limited());
    }

    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, Infallible>>(100);

    let lesson_id = req.lesson_id;
    let message = req.message.clone();
    let session_id_in = req.session_id;

    tokio::spawn(async move {
        crate::metrics::AI_TUTOR_STREAM_REQUESTS_TOTAL
            .with_label_values(&["start"]) // Issue #322 A3
            .inc();
        let _ = tx
            .send(Ok(Event::default()
                .event("start")
                .data(r#"{"status":"processing"}"#)))
            .await;

        match stream_pipeline(
            &db, user_id, tenant_id, lesson_id, &message, session_id_in, &tx,
        )
        .await
        {
            Ok(session_id) => {
                crate::metrics::AI_TUTOR_STREAM_REQUESTS_TOTAL
                    .with_label_values(&["done"]) // Issue #322 A3
                    .inc();
                let payload = serde_json::json!({
                    "status": "completed",
                    "session_id": session_id
                });
                let _ = tx
                    .send(Ok(Event::default().event("done").data(payload.to_string())))
                    .await;
            }
            Err(e) => {
                crate::metrics::AI_TUTOR_STREAM_REQUESTS_TOTAL
                    .with_label_values(&["failed"]) // Issue #322 A3
                    .inc();
                tracing::warn!(error = %e, "ai_tutor stream pipeline failed");
                let payload = serde_json::json!({
                    "error": e.to_string(),
                    "status": "failed"
                });
                let _ = tx
                    .send(Ok(Event::default().event("error").data(payload.to_string())))
                    .await;
            }
        }
    });

    let stream = ReceiverStream::new(rx);
    Ok(Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    ))
}

async fn stream_pipeline(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    lesson_id: Uuid,
    message: &str,
    session_id: Option<Uuid>,
    tx: &tokio::sync::mpsc::Sender<Result<Event, Infallible>>,
) -> Result<Uuid, anyhow::Error> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| anyhow::anyhow!("GROQ_API_KEY tidak dikonfigurasi"))?;

    let session = get_or_create_session(db, user_id, lesson_id, tenant_id, session_id).await?;

    let lesson: LessonRow = sqlx::query_as::<_, LessonRow>(
        r#"SELECT title, content FROM public.lessons
           WHERE id = $1 AND tenant_id = $2 LIMIT 1"#,
    )
    .bind(lesson_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Pelajaran tidak ditemukan"))?;

    let lesson_snippet: String = lesson
        .content
        .as_deref()
        .unwrap_or("")
        .chars()
        .take(MAX_CONTEXT_CHARS)
        .collect();

    let progress = sqlx::query_as::<_, ProgressRow>(
        r#"SELECT total_time_spent, latest_quiz_score
           FROM public.student_lesson_signals
           WHERE user_id = $1 AND lesson_id = $2 AND tenant_id = $3 LIMIT 1"#,
    )
    .bind(user_id)
    .bind(lesson_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    let progress_info = match progress {
        Some(ProgressRow { total_time_spent: Some(t), latest_quiz_score: Some(s) }) => format!(
            "Siswa telah menghabiskan {t} detik belajar pelajaran ini dan skor kuis terakhirnya {s:.1}."
        ),
        Some(ProgressRow { total_time_spent: Some(t), latest_quiz_score: None }) => format!(
            "Siswa telah menghabiskan {t} detik belajar pelajaran ini."
        ),
        Some(ProgressRow { total_time_spent: None, latest_quiz_score: Some(s) }) => format!(
            "Skor kuis terakhir siswa: {s:.1}."
        ),
        _ => "Belum ada data kemajuan belajar.".to_string(),
    };

    let system_prompt = format!(
        "Kamu adalah tutor AI EduSync yang membantu siswa memahami pelajaran.\n\
         Topik saat ini: \"{}\"\n\
         Konten pelajaran:\n{}\n\n\
         Kemajuan siswa: {}\n\n\
         Panduan respons:\n\
         - Gunakan Bahasa Indonesia yang ramah dan jelas\n\
         - Berikan penjelasan yang mudah dipahami\n\
         - Berikan contoh konkret jika diperlukan\n\
         - Dorong siswa untuk berpikir kritis\n\
         - Jangan memberikan jawaban langsung pada soal ujian",
        lesson.title, lesson_snippet, progress_info
    );

    let history: Vec<Value> = match &session.messages_json {
        Value::Array(arr) => {
            let len = arr.len();
            let start = len.saturating_sub(TUTOR_HISTORY_WINDOW);
            arr[start..].to_vec()
        }
        _ => vec![],
    };

    let mut groq_messages: Vec<Value> = Vec::with_capacity(history.len() + 2);
    groq_messages.push(serde_json::json!({"role": "system", "content": system_prompt}));
    groq_messages.extend(history);
    groq_messages.push(serde_json::json!({"role": "user", "content": message}));

    let client = reqwest::Client::new();
    let response = client
        .post(GROQ_URL)
        .bearer_auth(&api_key)
        .json(&serde_json::json!({
            "model": GROQ_MODEL,
            "messages": groq_messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Groq request failed: {e}"))?;

    if !response.status().is_success() {
        let body_text = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("Groq API error: {body_text}"));
    }

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut full_reply = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let bytes = chunk_result.map_err(|e| anyhow::anyhow!("Stream error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(pos) = buffer.find("\n\n") {
            let event_text = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            for line in event_text.lines() {
                if let Some(data) = line.strip_prefix("data:") {
                    let data = data.trim();
                    if data == "[DONE]" {
                        continue;
                    }
                    if let Ok(json) = serde_json::from_str::<Value>(data) {
                        if let Some(token) = json["choices"][0]["delta"]["content"].as_str() {
                            if !token.is_empty() {
                                full_reply.push_str(token);
                                crate::metrics::AI_TUTOR_TOKENS_EMITTED_TOTAL.inc(); // Issue #322 A3
                                let payload = serde_json::json!({"token": token});
                                let _ = tx
                                    .send(Ok(Event::default()
                                        .event("token")
                                        .data(payload.to_string())))
                                    .await;
                            }
                        }
                    }
                }
            }
        }
    }

    persist_session(db, session.id, tenant_id, session.messages_json, message, &full_reply).await?;

    let _ = sqlx::query(
        r#"INSERT INTO public.ai_quota_usage (id, user_id, tenant_id, endpoint, created_at)
           VALUES ($1, $2, $3, 'ai_tutor', NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(tenant_id)
    .execute(db)
    .await;

    Ok(session.id)
}

async fn get_or_create_session(
    db: &PgPool,
    user_id: Uuid,
    lesson_id: Uuid,
    tenant_id: Uuid,
    session_id: Option<Uuid>,
) -> Result<SessionState, anyhow::Error> {
    if let Some(sid) = session_id {
        let row = sqlx::query_as::<_, SessionLookupRow>(
            r#"SELECT id, messages_json FROM public.ai_tutor_sessions
               WHERE id = $1 AND user_id = $2 AND tenant_id = $3 LIMIT 1"#,
        )
        .bind(sid)
        .bind(user_id)
        .bind(tenant_id)
        .fetch_optional(db)
        .await?;
        if let Some(r) = row {
            return Ok(SessionState {
                id: r.id,
                messages_json: r.messages_json.unwrap_or(Value::Array(vec![])),
            });
        }
    }

    let row = sqlx::query_as::<_, SessionLookupRow>(
        r#"SELECT id, messages_json FROM public.ai_tutor_sessions
           WHERE user_id = $1 AND lesson_id = $2 AND tenant_id = $3 AND status = 'active'
           ORDER BY last_message_at DESC NULLS LAST LIMIT 1"#,
    )
    .bind(user_id)
    .bind(lesson_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await?;
    if let Some(r) = row {
        return Ok(SessionState {
            id: r.id,
            messages_json: r.messages_json.unwrap_or(Value::Array(vec![])),
        });
    }

    let new_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO public.ai_tutor_sessions
            (id, tenant_id, user_id, lesson_id, status, message_count, messages_json,
             last_message_at, created_at)
           VALUES ($1, $2, $3, $4, 'active', 0, '[]'::jsonb, NOW(), NOW())"#,
    )
    .bind(new_id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(lesson_id)
    .execute(db)
    .await?;

    Ok(SessionState {
        id: new_id,
        messages_json: Value::Array(vec![]),
    })
}

async fn persist_session(
    db: &PgPool,
    session_id: Uuid,
    tenant_id: Uuid,
    current_messages: Value,
    user_message: &str,
    assistant_reply: &str,
) -> Result<(), anyhow::Error> {
    let mut msgs: Vec<Value> = match current_messages {
        Value::Array(a) => a,
        _ => vec![],
    };
    msgs.push(serde_json::json!({"role": "user", "content": user_message}));
    msgs.push(serde_json::json!({"role": "assistant", "content": assistant_reply}));
    if msgs.len() > MAX_SESSION_MESSAGES {
        let drain = msgs.len() - MAX_SESSION_MESSAGES;
        msgs.drain(..drain);
    }

    sqlx::query(
        r#"UPDATE public.ai_tutor_sessions
           SET messages_json = $1, message_count = message_count + 2, last_message_at = NOW()
           WHERE id = $2 AND tenant_id = $3"#,
    )
    .bind(Value::Array(msgs))
    .bind(session_id)
    .bind(tenant_id)
    .execute(db)
    .await?;

    Ok(())
}
