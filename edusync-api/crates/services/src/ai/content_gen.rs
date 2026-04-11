#![allow(dead_code)]
/// AI Content Generation handler.
///
/// Ports `supabase/functions/generate-ai-content/index.ts` (476 lines).
///
/// Supports JSON body with `text_content` field.
/// Content types: quiz | reading | writing.
/// Bloom levels: C1–C6.
/// Rate limit: 20 calls/hr per user (checked via `ai_generation_logs` table).
/// CircuitBreaker: checked before every Groq call.
use axum::{response::IntoResponse, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use vil_server::prelude::{SseCollect, SseDialect};

use crate::ai::config::{
    groq_circuit_breaker, CONTENT_GEN_RATE_LIMIT_PER_HOUR, GROQ_API_URL, GROQ_MODEL,
};
use crate::ai::types::{
    AssignmentType, BloomLevel, GenerateContentRequest, GenerateContentResponse, GeneratedOption,
    GeneratedQuestion,
};

use axum::http::StatusCode;
use axum::response::Response;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CONTENT_CHARS: usize = 8_000;
const DEFAULT_QUESTION_COUNT: u8 = 5;
const MAX_QUESTION_COUNT: u8 = 20;

// ─── Error ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum ContentGenError {
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

impl IntoResponse for ContentGenError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            ContentGenError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            ContentGenError::Forbidden => (
                StatusCode::FORBIDDEN,
                "Akses ditolak: hanya guru atau admin yang dapat membuat konten".to_string(),
            ),
            ContentGenError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "Batas pembuatan konten AI tercapai (20/jam), coba lagi nanti".to_string(),
            ),
            ContentGenError::Timeout => (
                StatusCode::GATEWAY_TIMEOUT,
                "Layanan AI timeout, coba lagi".to_string(),
            ),
            ContentGenError::CircuitOpen => (
                StatusCode::SERVICE_UNAVAILABLE,
                "Layanan AI sedang tidak tersedia, coba lagi nanti".to_string(),
            ),
            ContentGenError::Internal(m) => {
                tracing::error!("content_gen_internal: {}", m);
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
) -> Result<(), ContentGenError> {
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
    .unwrap_or(0); // fail open

    if count >= CONTENT_GEN_RATE_LIMIT_PER_HOUR {
        return Err(ContentGenError::RateLimited);
    }
    Ok(())
}

/// Log a generation attempt (success or failure).
async fn log_generation(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    content_type: &str,
    status: &str,
    content_id: Option<Uuid>,
    error_msg: Option<&str>,
) {
    let _ = sqlx::query(
        r#"INSERT INTO public.ai_generation_logs
              (id, user_id, tenant_id, content_type, status, content_id, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(tenant_id)
    .bind(content_type)
    .bind(status)
    .bind(content_id)
    .bind(error_msg)
    .execute(db)
    .await;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

fn build_quiz_prompt(
    content: &str,
    title: &str,
    question_count: u8,
    bloom_level: &BloomLevel,
) -> String {
    let bloom_desc = bloom_level.description();
    format!(
        r#"Kamu adalah pembuat soal kuis ahli untuk siswa sekolah Indonesia.
Berdasarkan materi berikut, buat {question_count} soal pilihan ganda dalam Bahasa Indonesia.

JUDUL: "{title}"
MATERI:
{content}

TINGKAT BLOOM: {bloom_desc}

INSTRUKSI:
- Buat tepat {question_count} soal pilihan ganda (4 opsi: A, B, C, D), 1 jawaban benar
- Setiap soal harus relevan dengan materi di atas
- Sesuaikan tingkat kognitif dengan tingkat Bloom yang ditentukan
- Berikan penjelasan singkat untuk setiap jawaban yang benar

KEMBALIKAN HANYA JSON (tanpa teks lain):
{{
  "summary": "Ringkasan singkat materi",
  "questions": [
    {{
      "text": "Teks pertanyaan",
      "explanation": "Penjelasan jawaban benar",
      "options": [
        {{"text": "Opsi A", "is_correct": true}},
        {{"text": "Opsi B", "is_correct": false}},
        {{"text": "Opsi C", "is_correct": false}},
        {{"text": "Opsi D", "is_correct": false}}
      ]
    }}
  ]
}}"#,
        question_count = question_count,
        title = title,
        content = &content[..content.len().min(MAX_CONTENT_CHARS)],
        bloom_desc = bloom_desc,
    )
}

fn build_reading_prompt(content: &str, title: &str, bloom_level: &BloomLevel) -> String {
    let bloom_desc = bloom_level.description();
    format!(
        r#"Kamu adalah guru Bahasa Indonesia yang membuat soal pemahaman membaca.
Berdasarkan teks berikut, buat pertanyaan pemahaman dalam Bahasa Indonesia.

JUDUL: "{title}"
TEKS:
{content}

TINGKAT BLOOM: {bloom_desc}

INSTRUKSI:
- Buat pertanyaan yang menguji pemahaman teks
- Sesuaikan dengan tingkat Bloom yang ditentukan
- Sertakan pertanyaan analitik dan kritis

KEMBALIKAN HANYA JSON:
{{
  "summary": "Ringkasan teks",
  "questions": [
    {{
      "text": "Pertanyaan pemahaman",
      "explanation": "Jawaban atau kunci jawaban yang diharapkan",
      "options": []
    }}
  ]
}}"#,
        title = title,
        content = &content[..content.len().min(MAX_CONTENT_CHARS)],
        bloom_desc = bloom_desc,
    )
}

fn build_writing_prompt(content: &str, title: &str, bloom_level: &BloomLevel) -> String {
    let bloom_desc = bloom_level.description();
    format!(
        r#"Kamu adalah guru Bahasa Indonesia yang membuat tugas menulis.
Berdasarkan topik berikut, buat tugas menulis dalam Bahasa Indonesia.

JUDUL: "{title}"
KONTEKS:
{content}

TINGKAT BLOOM: {bloom_desc}

INSTRUKSI:
- Buat tugas menulis yang kreatif dan informatif
- Sesuaikan dengan tingkat Bloom yang ditentukan
- Sertakan kriteria penilaian (rubrik sederhana)

KEMBALIKAN HANYA JSON:
{{
  "summary": "Deskripsi tugas",
  "questions": [
    {{
      "text": "Instruksi tugas menulis lengkap",
      "explanation": "Kriteria penilaian dan panduan",
      "options": []
    }}
  ]
}}"#,
        title = title,
        content = &content[..content.len().min(MAX_CONTENT_CHARS)],
        bloom_desc = bloom_desc,
    )
}

// ─── Groq call ────────────────────────────────────────────────────────────────

/// Wire type for the Groq response (content gen doesn't force json_object mode
/// on all paths, but we still parse the response as JSON).
#[derive(Deserialize)]
struct RawGroqContent {
    #[serde(default)]
    summary: Option<String>,
    questions: Vec<RawQuestion>,
}

#[derive(Deserialize)]
struct RawQuestion {
    text: String,
    #[serde(default)]
    explanation: Option<String>,
    #[serde(default)]
    options: Vec<RawOption>,
}

#[derive(Deserialize)]
struct RawOption {
    text: String,
    is_correct: bool,
}

async fn call_groq_content_gen(prompt: &str) -> Result<RawGroqContent, ContentGenError> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| ContentGenError::Internal("GROQ_API_KEY tidak dikonfigurasi".to_string()))?;

    let cb = groq_circuit_breaker();
    if !cb.is_closed() {
        return Err(ContentGenError::CircuitOpen);
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
            return Err(ContentGenError::Internal(
                "Groq returned empty content".to_string(),
            ));
        }
        Err(e) => {
            cb.record_failure();
            return Err(ContentGenError::Internal(format!(
                "AI content gen gagal: {e}"
            )));
        }
    };

    let parsed: RawGroqContent = serde_json::from_str(&raw_text).map_err(|e| {
        tracing::error!("content_gen_parse: {e}, raw={raw_text}");
        ContentGenError::Internal("Format respons AI tidak valid".to_string())
    })?;

    Ok(parsed)
}

// ─── DB persistence ───────────────────────────────────────────────────────────

async fn save_generated_content(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    content_type: &str,
    title: &str,
    content_json: &serde_json::Value,
) -> Result<Uuid, ContentGenError> {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO public.ai_generated_content
              (id, user_id, tenant_id, content_type, title, content_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())"#,
    )
    .bind(id)
    .bind(user_id)
    .bind(tenant_id)
    .bind(content_type)
    .bind(title)
    .bind(content_json)
    .execute(db)
    .await
    .map_err(|e| ContentGenError::Internal(format!("Failed to save generated content: {e}")))?;
    Ok(id)
}

// ─── Public context + handler ─────────────────────────────────────────────────

pub struct ContentGenContext {
    pub db: Arc<PgPool>,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    /// Must not be "student".
    pub role: String,
}

pub async fn generate_content(
    ctx: ContentGenContext,
    req: GenerateContentRequest,
) -> Result<impl IntoResponse, ContentGenError> {
    // 1. Role check
    if ctx.role == "student" {
        return Err(ContentGenError::Forbidden);
    }

    // 2. Input validation
    let text_content = req
        .text_content
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();

    if text_content.is_empty() {
        return Err(ContentGenError::BadRequest(
            "Konten teks wajib diisi (gunakan field text_content)".to_string(),
        ));
    }
    if text_content.len() < 50 {
        return Err(ContentGenError::BadRequest(
            "Konten terlalu pendek (minimal 50 karakter)".to_string(),
        ));
    }

    let question_count = req
        .question_count
        .unwrap_or(DEFAULT_QUESTION_COUNT)
        .clamp(1, MAX_QUESTION_COUNT);

    let bloom_level = req.bloom_level.unwrap_or(BloomLevel::C2);
    let title = req.title.unwrap_or_else(|| "Konten Pembelajaran".to_string());

    let content_type_str = match &req.assignment_type {
        AssignmentType::Quiz => "quiz",
        AssignmentType::Reading => "reading",
        AssignmentType::Writing => "writing",
    };

    // 3. Rate limit
    check_rate_limit(&ctx.db, ctx.user_id, ctx.tenant_id).await?;

    // 4. Build prompt
    let prompt = match &req.assignment_type {
        AssignmentType::Quiz => {
            build_quiz_prompt(&text_content, &title, question_count, &bloom_level)
        }
        AssignmentType::Reading => build_reading_prompt(&text_content, &title, &bloom_level),
        AssignmentType::Writing => build_writing_prompt(&text_content, &title, &bloom_level),
    };

    // 5. Call Groq
    let raw = match call_groq_content_gen(&prompt).await {
        Ok(r) => r,
        Err(e) => {
            log_generation(
                &ctx.db,
                ctx.user_id,
                ctx.tenant_id,
                content_type_str,
                "failure",
                None,
                Some(&format!("{:?}", e)),
            )
            .await;
            return Err(e);
        }
    };

    // 6. Map raw response to typed output
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

    // 7. Persist to `ai_generated_content`
    let content_json = serde_json::json!({
        "summary": raw.summary,
        "questions": questions,
        "bloom_level": format!("{:?}", bloom_level),
        "question_count": question_count,
    });

    let content_id =
        save_generated_content(&ctx.db, ctx.user_id, ctx.tenant_id, content_type_str, &title, &content_json)
            .await?;

    // 8. Log success
    log_generation(
        &ctx.db,
        ctx.user_id,
        ctx.tenant_id,
        content_type_str,
        "success",
        Some(content_id),
        None,
    )
    .await;

    Ok(Json(GenerateContentResponse {
        summary: raw.summary,
        questions,
        content_id,
    }))
}
