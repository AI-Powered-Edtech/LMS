#![allow(dead_code)]
/// AI Quiz Generation handler (from lesson content).
///
/// Ports `supabase/functions/generate-quiz-from-content/index.ts`.
///
/// Loads lesson content from the DB, builds a prompt, and calls Groq to
/// generate structured quiz questions.
///
/// Auth: teacher / admin only (via RbacGuard in api-server).
/// Rate limit: shared with content-gen (20/hr, via `ai_generation_logs`).
/// CircuitBreaker: checked before every Groq call.
use axum::{response::IntoResponse, Json};
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use vil_server::prelude::{SseCollect, SseDialect};

use crate::ai::config::{
    groq_circuit_breaker, CONTENT_GEN_RATE_LIMIT_PER_HOUR, GROQ_API_URL, GROQ_MODEL,
};
use crate::ai::types::{GeneratedOption, GeneratedQuestion, GenerateQuizResponse};

use axum::http::StatusCode;
use axum::response::Response;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CONTENT_CHARS: usize = 3_000;
const DEFAULT_COUNT: u8 = 5;
const MAX_COUNT: u8 = 20;

// ─── Error ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum QuizGenError {
    NotFound,
    BadRequest(String),
    Forbidden,
    RateLimited,
    Timeout,
    CircuitOpen,
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for QuizGenError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            QuizGenError::NotFound => (StatusCode::NOT_FOUND, "Pelajaran tidak ditemukan".to_string()),
            QuizGenError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            QuizGenError::Forbidden => (
                StatusCode::FORBIDDEN,
                "Akses ditolak".to_string(),
            ),
            QuizGenError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "Batas pembuatan kuis AI tercapai (20/jam), coba lagi nanti".to_string(),
            ),
            QuizGenError::Timeout => (
                StatusCode::GATEWAY_TIMEOUT,
                "Layanan AI timeout, coba lagi".to_string(),
            ),
            QuizGenError::CircuitOpen => (
                StatusCode::SERVICE_UNAVAILABLE,
                "Layanan AI sedang tidak tersedia, coba lagi nanti".to_string(),
            ),
            QuizGenError::Internal(m) => {
                tracing::error!("quiz_gen_internal: {}", m);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Terjadi kesalahan server internal".to_string(),
                )
            }
        };
        (status, Json(ErrorBody { error: msg })).into_response()
    }
}

// ─── Rate limit ───────────────────────────────────────────────────────────────

async fn check_rate_limit(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<(), QuizGenError> {
    let count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM public.ai_generation_logs
           WHERE user_id = $1
             AND tenant_id = $2
             AND status = 'success'
             AND created_at > NOW() - INTERVAL '1 hour'"#,
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    if count >= CONTENT_GEN_RATE_LIMIT_PER_HOUR {
        return Err(QuizGenError::RateLimited);
    }
    Ok(())
}

// ─── DB load ──────────────────────────────────────────────────────────────────

struct LessonData {
    title: String,
    content: Option<String>,
}

async fn load_lesson_with_resources(
    db: &PgPool,
    lesson_id: Uuid,
    tenant_id: Uuid,
) -> Result<(LessonData, String), QuizGenError> {
    let lesson = sqlx::query!(
        r#"SELECT title, content
           FROM public.lessons
           WHERE id = $1 AND tenant_id = $2
           LIMIT 1"#,
        lesson_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| QuizGenError::Internal(e.to_string()))?
    .ok_or(QuizGenError::NotFound)?;

    // Load up to 5 lesson resources for additional context
    let resources = sqlx::query!(
        r#"SELECT title, content
           FROM public.lesson_resources
           WHERE lesson_id = $1 AND tenant_id = $2
           LIMIT 5"#,
        lesson_id,
        tenant_id
    )
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let mut content_parts: Vec<String> = Vec::new();
    if let Some(c) = &lesson.content {
        content_parts.push(c.clone());
    }
    for r in &resources {
        if let Some(c) = &r.content {
            content_parts.push(c.clone());
        } else {
            content_parts.push(r.title.clone());
        }
    }

    let combined_content = content_parts
        .join("\n\n")
        .chars()
        .take(MAX_CONTENT_CHARS)
        .collect::<String>();

    Ok((
        LessonData {
            title: lesson.title,
            content: lesson.content,
        },
        combined_content,
    ))
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

fn build_quiz_prompt(
    title: &str,
    content: &str,
    count: u8,
    difficulty: &str,
    type_labels: &str,
) -> String {
    let difficulty_id = match difficulty {
        "easy" => "mudah",
        "hard" => "sulit",
        _ => "sedang",
    };

    format!(
        r#"Kamu adalah pembuat soal kuis yang ahli. Berdasarkan materi pelajaran berikut, buat {count} soal kuis dalam Bahasa Indonesia.

MATERI PELAJARAN: "{title}"
{content}

INSTRUKSI:
- Buat tepat {count} soal
- Tipe soal: {type_labels}
- Tingkat kesulitan: {difficulty_id}
- Soal harus relevan dengan materi di atas
- Jawaban harus dapat ditemukan dalam materi
- Berikan penjelasan singkat untuk setiap jawaban benar

KEMBALIKAN HANYA JSON dengan format ini (tidak ada teks lain):
{{
  "questions": [
    {{
      "text": "Teks pertanyaan",
      "question_type": "MCQ",
      "explanation": "Penjelasan mengapa jawaban ini benar",
      "options": [
        {{"text": "Opsi A", "is_correct": true}},
        {{"text": "Opsi B", "is_correct": false}},
        {{"text": "Opsi C", "is_correct": false}},
        {{"text": "Opsi D", "is_correct": false}}
      ]
    }}
  ]
}}"#,
        count = count,
        title = title,
        content = content,
        type_labels = type_labels,
        difficulty_id = difficulty_id,
    )
}

// ─── Groq wire ────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct RawQuizResponse {
    questions: Vec<RawQuestion>,
}

#[derive(serde::Deserialize)]
struct RawQuestion {
    text: String,
    #[serde(default)]
    explanation: Option<String>,
    #[serde(default)]
    options: Vec<RawOption>,
}

#[derive(serde::Deserialize)]
struct RawOption {
    text: String,
    is_correct: bool,
}

async fn call_groq_quiz(prompt: &str) -> Result<RawQuizResponse, QuizGenError> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| QuizGenError::Internal("GROQ_API_KEY tidak dikonfigurasi".to_string()))?;

    let cb = groq_circuit_breaker();
    if !cb.is_closed() {
        return Err(QuizGenError::CircuitOpen);
    }

    let result = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(&api_key)
        .body(serde_json::json!({
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
            "stream": true
        }))
        .collect_text()
        .await;

    let raw_text = match result {
        Ok(text) if !text.trim().is_empty() => {
            cb.record_success();
            text
        }
        Ok(_) => {
            cb.record_failure();
            return Err(QuizGenError::Internal(
                "Groq returned empty response".to_string(),
            ));
        }
        Err(e) => {
            cb.record_failure();
            return Err(QuizGenError::Internal(format!("AI quiz gen gagal: {e}")));
        }
    };

    let parsed: RawQuizResponse = serde_json::from_str(&raw_text).map_err(|e| {
        tracing::error!("quiz_gen_parse: {e}, raw={raw_text}");
        QuizGenError::Internal("Format respons AI tidak valid".to_string())
    })?;

    Ok(parsed)
}

// ─── Log helper ───────────────────────────────────────────────────────────────

async fn log_generation(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    status: &str,
    error_msg: Option<&str>,
) {
    let _ = sqlx::query(
        r#"INSERT INTO public.ai_generation_logs
              (id, user_id, tenant_id, content_type, status, error_message, created_at)
           VALUES ($1, $2, $3, 'quiz', $4, $5, NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(tenant_id)
    .bind(status)
    .bind(error_msg)
    .execute(db)
    .await;
}

// ─── Public context + handler ─────────────────────────────────────────────────

pub struct QuizGenContext {
    pub db: Arc<PgPool>,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub role: String,
}

pub async fn generate_quiz(
    ctx: QuizGenContext,
    lesson_id: Uuid,
    count: Option<u8>,
    difficulty: Option<String>,
    question_types: Option<Vec<String>>,
) -> Result<impl IntoResponse, QuizGenError> {
    // 1. Role check
    if ctx.role == "student" {
        return Err(QuizGenError::Forbidden);
    }

    // 2. Validate parameters
    let count = count.unwrap_or(DEFAULT_COUNT).clamp(1, MAX_COUNT);
    let difficulty = difficulty.unwrap_or_else(|| "medium".to_string());

    // 3. Rate limit
    check_rate_limit(&ctx.db, ctx.user_id, ctx.tenant_id).await?;

    // 4. Load lesson data
    let (lesson_data, combined_content) =
        load_lesson_with_resources(&ctx.db, lesson_id, ctx.tenant_id).await?;

    if combined_content.trim().len() < 50 {
        return Err(QuizGenError::BadRequest(
            "Konten pelajaran terlalu pendek untuk membuat kuis".to_string(),
        ));
    }

    // 5. Build type labels
    let types = question_types.unwrap_or_else(|| vec!["MCQ".to_string()]);
    let type_map: std::collections::HashMap<&str, &str> = [
        ("MCQ", "Pilihan ganda (4 opsi, 1 benar)"),
        ("TRUE_FALSE", "Benar/Salah"),
        ("MULTIPLE_SELECT", "Pilih semua yang benar"),
        ("SHORT_ANSWER", "Jawaban singkat"),
    ]
    .iter()
    .cloned()
    .collect();

    let type_labels: String = types
        .iter()
        .map(|t| *type_map.get(t.as_str()).unwrap_or(&t.as_str()))
        .collect::<Vec<_>>()
        .join(", ");

    // 6. Build prompt and call Groq
    let prompt = build_quiz_prompt(
        &lesson_data.title,
        &combined_content,
        count,
        &difficulty,
        &type_labels,
    );

    let raw = match call_groq_quiz(&prompt).await {
        Ok(r) => r,
        Err(e) => {
            log_generation(
                &ctx.db,
                ctx.user_id,
                ctx.tenant_id,
                "failure",
                Some(&format!("{:?}", e)),
            )
            .await;
            return Err(e);
        }
    };

    // 7. Map to typed response
    let questions: Vec<GeneratedQuestion> = raw
        .questions
        .into_iter()
        .map(|q| GeneratedQuestion {
            text: q.text,
            explanation: q.explanation,
            options: q
                .options
                .into_iter()
                .map(|o| GeneratedOption {
                    text: o.text,
                    is_correct: o.is_correct,
                })
                .collect(),
        })
        .collect();

    // 8. Log success
    log_generation(&ctx.db, ctx.user_id, ctx.tenant_id, "success", None).await;

    Ok(Json(GenerateQuizResponse {
        questions,
        lesson_id,
        lesson_title: lesson_data.title,
    }))
}
