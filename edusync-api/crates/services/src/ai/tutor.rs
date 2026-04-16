/// AI Tutor Chat handler.
///
/// Ports `supabase/functions/ai-tutor/index.ts` (674 lines).
///
/// Session management:
///   - Loads or creates an `ai_tutor_sessions` row.
///   - Appends messages to `messages_json` JSONB column.
///   - Keeps at most MAX_SESSION_MESSAGES; trims oldest when exceeded.
///
/// Rate limit: 50 calls/hr per user (checked via `ai_quota_usage` table).
/// CircuitBreaker: checked before every Groq call.
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use vil_server::prelude::{HandlerResult, SseCollect, SseDialect, VilError, VilResponse};

use crate::ai::config::{
    groq_circuit_breaker, AI_RATE_LIMIT_PER_HOUR, GROQ_API_URL, GROQ_MODEL, MAX_CONTEXT_CHARS,
    MAX_SESSION_MESSAGES, TUTOR_HISTORY_WINDOW,
};
use crate::ai::types::{GroqMessage, TutorChatResponse};

// ─── DB structs ───────────────────────────────────────────────────────────────

#[derive(Debug)]
struct TutorSession {
    id: Uuid,
    message_count: i32,
    messages_json: Value,
}

#[derive(Debug)]
struct LessonContext {
    title: String,
    content: Option<String>,
}

#[derive(Debug)]
struct StudentProgress {
    total_time_spent: Option<i64>,
    latest_quiz_score: Option<f64>,
}

// ─── Rate limit ───────────────────────────────────────────────────────────────

async fn check_rate_limit(db: &PgPool, user_id: Uuid, tenant_id: Uuid) -> Result<(), VilError> {
    let count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM public.ai_quota_usage
           WHERE user_id = $1
             AND tenant_id = $2
             AND created_at > NOW() - INTERVAL '1 hour'"#,
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    if count >= AI_RATE_LIMIT_PER_HOUR {
        return Err(VilError::rate_limited());
    }
    Ok(())
}

async fn record_usage(db: &PgPool, user_id: Uuid, tenant_id: Uuid) {
    let _ = sqlx::query(
        r#"INSERT INTO public.ai_quota_usage (id, user_id, tenant_id, endpoint, created_at)
           VALUES ($1, $2, $3, $4, NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(tenant_id)
    .bind("ai_tutor")
    .execute(db)
    .await;
}

// ─── Session management ───────────────────────────────────────────────────────

async fn get_or_create_session(
    db: &PgPool,
    user_id: Uuid,
    lesson_id: Uuid,
    tenant_id: Uuid,
    session_id: Option<Uuid>,
) -> Result<TutorSession, VilError> {
    // 1. Try to load the requested session
    if let Some(sid) = session_id {
        let row = sqlx::query!(
            r#"SELECT id, message_count, messages_json
               FROM public.ai_tutor_sessions
               WHERE id = $1 AND user_id = $2 AND tenant_id = $3
               LIMIT 1"#,
            sid,
            user_id,
            tenant_id
        )
        .fetch_optional(db)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

        if let Some(r) = row {
            return Ok(TutorSession {
                id: r.id,
                message_count: r.message_count.unwrap_or(0),
                messages_json: r.messages_json.unwrap_or(Value::Array(vec![])),
            });
        }
    }

    // 2. Look for an existing active session for this lesson
    let existing = sqlx::query!(
        r#"SELECT id, message_count, messages_json
           FROM public.ai_tutor_sessions
           WHERE user_id = $1 AND lesson_id = $2 AND tenant_id = $3 AND status = 'active'
           ORDER BY last_message_at DESC NULLS LAST
           LIMIT 1"#,
        user_id,
        lesson_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    if let Some(r) = existing {
        return Ok(TutorSession {
            id: r.id,
            message_count: r.message_count.unwrap_or(0),
            messages_json: r.messages_json.unwrap_or(Value::Array(vec![])),
        });
    }

    // 3. Create new session
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
    .await
    .map_err(|e| VilError::internal(format!("Failed to create tutor session: {e}")))?;

    Ok(TutorSession {
        id: new_id,
        message_count: 0,
        messages_json: Value::Array(vec![]),
    })
}

// ─── Lesson + progress context ────────────────────────────────────────────────

async fn load_lesson(
    db: &PgPool,
    lesson_id: Uuid,
    tenant_id: Uuid,
) -> Result<LessonContext, VilError> {
    let row = sqlx::query!(
        r#"SELECT title, content
           FROM public.lessons
           WHERE id = $1 AND tenant_id = $2
           LIMIT 1"#,
        lesson_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?
    .ok_or_else(|| VilError::not_found("Pelajaran tidak ditemukan"))?;

    Ok(LessonContext {
        title: row.title,
        content: row.content,
    })
}

async fn load_student_progress(
    db: &PgPool,
    user_id: Uuid,
    lesson_id: Uuid,
    tenant_id: Uuid,
) -> StudentProgress {
    // Fail gracefully — progress is context enrichment only
    sqlx::query!(
        r#"SELECT total_time_spent, latest_quiz_score
           FROM public.student_lesson_signals
           WHERE user_id = $1 AND lesson_id = $2 AND tenant_id = $3
           LIMIT 1"#,
        user_id,
        lesson_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .ok()
    .flatten()
    .map(|r| StudentProgress {
        total_time_spent: r.total_time_spent.map(|v| v as i64),
        latest_quiz_score: r.latest_quiz_score,
    })
    .unwrap_or(StudentProgress {
        total_time_spent: None,
        latest_quiz_score: None,
    })
}

// ─── Groq call ────────────────────────────────────────────────────────────────

async fn call_groq_tutor(messages: Vec<GroqMessage>) -> Result<String, VilError> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let cb = groq_circuit_breaker();
    if !cb.is_closed() {
        return Err(VilError::service_unavailable(
            "Layanan AI sedang tidak tersedia, coba lagi nanti",
        ));
    }

    // Serialise GroqMessage vec to serde_json::Value for SseCollect body.
    let messages_json = serde_json::to_value(&messages)
        .map_err(|e| VilError::internal(format!("Failed to serialise messages: {e}")))?;

    let result = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(&api_key)
        .body(serde_json::json!({
            "model": GROQ_MODEL,
            "messages": messages_json,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": true
        }))
        .collect_text()
        .await;

    match result {
        Ok(reply) if !reply.trim().is_empty() => {
            cb.record_success();
            Ok(reply)
        }
        Ok(_) => {
            cb.record_failure();
            Err(VilError::internal("Groq returned empty response"))
        }
        Err(e) => {
            cb.record_failure();
            Err(VilError::internal(format!("AI tutor gagal: {e}")))
        }
    }
}

// ─── Session update ───────────────────────────────────────────────────────────

/// Append `user_msg` + `assistant_reply` to session and persist.
/// Trims the oldest messages when MAX_SESSION_MESSAGES would be exceeded.
async fn persist_session_messages(
    db: &PgPool,
    session_id: Uuid,
    tenant_id: Uuid,
    current_messages: Value,
    current_count: i32,
    user_msg: &str,
    assistant_reply: &str,
) -> Result<i32, VilError> {
    let mut msgs: Vec<Value> = match current_messages {
        Value::Array(a) => a,
        _ => vec![],
    };

    msgs.push(serde_json::json!({ "role": "user", "content": user_msg }));
    msgs.push(serde_json::json!({ "role": "assistant", "content": assistant_reply }));

    // Trim to MAX_SESSION_MESSAGES (keep the newest)
    if msgs.len() > MAX_SESSION_MESSAGES {
        let drain_count = msgs.len() - MAX_SESSION_MESSAGES;
        msgs.drain(..drain_count);
    }

    let new_count = current_count + 2; // user + assistant
    let msgs_json = Value::Array(msgs);

    sqlx::query!(
        r#"UPDATE public.ai_tutor_sessions
           SET messages_json = $1,
               message_count = $2,
               last_message_at = NOW()
           WHERE id = $3 AND tenant_id = $4"#,
        msgs_json,
        new_count,
        session_id,
        tenant_id
    )
    .execute(db)
    .await
    .map_err(|e| VilError::internal(format!("Failed to update session: {e}")))?;

    Ok(new_count)
}

// ─── Public context + handler ─────────────────────────────────────────────────

pub struct TutorChatContext {
    pub db: Arc<PgPool>,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
}

pub async fn tutor_chat(
    ctx: TutorChatContext,
    lesson_id: Uuid,
    message: String,
    session_id: Option<Uuid>,
) -> HandlerResult<VilResponse<TutorChatResponse>> {
    // 1. Validate input
    if message.trim().is_empty() {
        return Err(VilError::bad_request("Pesan tidak boleh kosong"));
    }
    if message.len() > 2_000 {
        return Err(VilError::bad_request(
            "Pesan melebihi batas 2000 karakter",
        ));
    }

    // 2. Rate limit
    check_rate_limit(&ctx.db, ctx.user_id, ctx.tenant_id).await?;

    // 3. Load lesson context
    let lesson = load_lesson(&ctx.db, lesson_id, ctx.tenant_id).await?;

    // 4. Load student progress (best-effort)
    let progress = load_student_progress(&ctx.db, ctx.user_id, lesson_id, ctx.tenant_id).await;

    // 5. Get or create session
    let session =
        get_or_create_session(&ctx.db, ctx.user_id, lesson_id, ctx.tenant_id, session_id).await?;

    // 6. Extract last N messages for conversation history
    let history: Vec<GroqMessage> = {
        let all_msgs: Vec<Value> = match &session.messages_json {
            Value::Array(a) => a.clone(),
            _ => vec![],
        };
        let window_start = all_msgs.len().saturating_sub(TUTOR_HISTORY_WINDOW);
        all_msgs[window_start..]
            .iter()
            .filter_map(|m| {
                let role = m.get("role")?.as_str()?.to_string();
                let content = m.get("content")?.as_str()?.to_string();
                Some(GroqMessage { role, content })
            })
            .collect()
    };

    // 7. Build system prompt
    let lesson_content_snippet = lesson
        .content
        .as_deref()
        .unwrap_or("")
        .chars()
        .take(MAX_CONTEXT_CHARS)
        .collect::<String>();

    let progress_info = match (progress.total_time_spent, progress.latest_quiz_score) {
        (Some(t), Some(s)) => format!(
            "Siswa telah menghabiskan {} detik belajar pelajaran ini dan skor kuis terakhirnya {:.1}.",
            t, s
        ),
        (Some(t), None) => format!(
            "Siswa telah menghabiskan {} detik belajar pelajaran ini.",
            t
        ),
        (None, Some(s)) => format!("Skor kuis terakhir siswa: {:.1}.", s),
        (None, None) => "Belum ada data kemajuan belajar.".to_string(),
    };

    let system_prompt = format!(
        r#"Kamu adalah tutor AI EduSync yang membantu siswa memahami pelajaran.
Topik saat ini: "{title}"
Konten pelajaran:
{content}

Kemajuan siswa: {progress}

Panduan respons:
- Gunakan Bahasa Indonesia yang ramah dan jelas
- Berikan penjelasan yang mudah dipahami
- Berikan contoh konkret jika diperlukan
- Dorong siswa untuk berpikir kritis
- Jangan memberikan jawaban langsung pada soal ujian"#,
        title = lesson.title,
        content = lesson_content_snippet,
        progress = progress_info,
    );

    // 8. Compose messages for Groq
    let mut groq_messages = vec![GroqMessage {
        role: "system".to_string(),
        content: system_prompt,
    }];
    groq_messages.extend(history);
    groq_messages.push(GroqMessage {
        role: "user".to_string(),
        content: message.clone(),
    });

    // 9. Call Groq
    let reply = call_groq_tutor(groq_messages).await?;

    // 10. Persist messages
    let new_count = persist_session_messages(
        &ctx.db,
        session.id,
        ctx.tenant_id,
        session.messages_json,
        session.message_count,
        &message,
        &reply,
    )
    .await?;

    // 11. Record usage (best-effort)
    record_usage(&ctx.db, ctx.user_id, ctx.tenant_id).await;

    Ok(VilResponse::ok(TutorChatResponse {
        reply,
        session_id: session.id,
        message_count: new_count,
    }))
}
