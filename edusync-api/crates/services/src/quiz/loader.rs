#![allow(dead_code)]
/// Quiz Data Loader — Phase 3D
///
/// Ports `supabase/functions/load-quiz-data/index.ts`.
///
/// Serves quiz data to authenticated students with `is_correct` stripped
/// from all option rows to prevent answer leakage.
///
/// Key schema notes (from CLAUDE.md):
///   - quiz_questions.text         (NOT question_text)
///   - quiz_options.text           (NOT option_text)
///   - quiz_questions."order"      (reserved word, must be quoted)
///   - quiz_options."order"        (same)
///   - enrollments.user_id         (NOT student_id)
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: serde = "1"
// DEPENDENCY: tracing = "0.1"
// DEPENDENCY: rand = "0.8"

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ─── Error type ───────────────────────────────────────────────────────────────

/// Errors from the quiz loader.
#[derive(Debug)]
pub enum QuizLoaderError {
    /// Quiz or enrollment not found.
    NotFound,
    /// Student is not enrolled in the course containing this quiz.
    Forbidden,
    /// Database failure.
    Database(String),
}

impl std::fmt::Display for QuizLoaderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuizLoaderError::NotFound => {
                write!(f, "Kuis tidak ditemukan")
            }
            QuizLoaderError::Forbidden => {
                write!(
                    f,
                    "Akses ditolak: Anda belum terdaftar di kursus yang memuat kuis ini"
                )
            }
            QuizLoaderError::Database(msg) => {
                write!(f, "Kesalahan basis data: {msg}")
            }
        }
    }
}

impl std::error::Error for QuizLoaderError {}

impl From<sqlx::Error> for QuizLoaderError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => QuizLoaderError::NotFound,
            _ => QuizLoaderError::Database(e.to_string()),
        }
    }
}

// ─── Request / Response types ─────────────────────────────────────────────────

/// Input for loading a quiz for student consumption.
#[derive(Debug, Deserialize)]
pub struct LoadQuizRequest {
    pub quiz_id: Uuid,
}

/// Top-level quiz metadata (no answer keys).
#[derive(Debug, Serialize)]
pub struct QuizData {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub time_limit_minutes: Option<i32>,
    pub shuffle_questions: bool,
    pub show_results: bool,
}

/// A single answer option — `is_correct` is intentionally absent.
#[derive(Debug, Serialize)]
pub struct OptionData {
    pub id: Uuid,
    /// Column `text` on `quiz_options` (NOT option_text per CLAUDE.md).
    pub text: String,
}

/// A question with its options (no correct-answer information exposed).
#[derive(Debug, Serialize)]
pub struct QuestionData {
    pub id: Uuid,
    /// Column `text` on `quiz_questions` (NOT question_text per CLAUDE.md).
    pub text: String,
    pub question_type: String,
    pub points: i32,
    pub options: Vec<OptionData>,
}

/// Full quiz payload returned to the student client.
#[derive(Debug, Serialize)]
pub struct LoadQuizResponse {
    pub quiz: QuizData,
    pub questions: Vec<QuestionData>,
}

// ─── Enrollment check ─────────────────────────────────────────────────────────

/// Verify that `user_id` is enrolled in the course that owns the quiz.
///
/// Lookup path: quizzes → lessons → course_modules → courses → enrollments
///
/// Returns `Err(QuizLoaderError::Forbidden)` if no valid enrollment is found.
async fn verify_enrollment(
    db: &PgPool,
    quiz_id: Uuid,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<(), QuizLoaderError> {
    // Derive course_id from quiz via: quizzes.lesson_id → lessons.module_id → course_modules.course_id
    let course_id: Option<Uuid> = sqlx::query_scalar!(
        r#"
        SELECT cm.course_id
        FROM public.quizzes        q
        JOIN public.lessons        l  ON l.id = q.lesson_id
        JOIN public.course_modules cm ON cm.id = l.module_id
        WHERE q.id        = $1
          AND q.tenant_id = $2
        LIMIT 1
        "#,
        quiz_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| QuizLoaderError::Database(e.to_string()))?
    .flatten();

    let Some(cid) = course_id else {
        return Err(QuizLoaderError::NotFound);
    };

    // Check enrollment — column is user_id (NOT student_id per CLAUDE.md)
    let enrolled: bool = sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM public.enrollments
            WHERE course_id = $1
              AND user_id   = $2
              AND tenant_id = $3
        )
        "#,
        cid,
        user_id,
        tenant_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| QuizLoaderError::Database(e.to_string()))?
    .unwrap_or(false);

    if !enrolled {
        return Err(QuizLoaderError::Forbidden);
    }

    Ok(())
}

// ─── Public loader ────────────────────────────────────────────────────────────

/// Load quiz data for a student — enrollment-gated, answer-stripped.
///
/// Steps:
///   1. Verify enrollment (quiz → lesson → module → course → enrollment).
///   2. Load quiz metadata from `quizzes`.
///   3. Load questions from `quiz_questions` ordered by `"order"` (quoted).
///   4. Load options from `quiz_options` — NO `is_correct` column.
///   5. If `shuffle_questions = true`, randomise question order.
///   6. Return assembled `LoadQuizResponse`.
pub async fn load_quiz_for_student(
    db: &PgPool,
    quiz_id: Uuid,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<LoadQuizResponse, QuizLoaderError> {
    // ── 1. Enrollment check ──────────────────────────────────────────────────
    verify_enrollment(db, quiz_id, user_id, tenant_id).await?;

    // ── 2. Load quiz metadata ────────────────────────────────────────────────
    let quiz_row = sqlx::query!(
        r#"
        SELECT
            id,
            title,
            description,
            time_limit_minutes,
            shuffle_questions,
            show_results
        FROM public.quizzes
        WHERE id        = $1
          AND tenant_id = $2
        LIMIT 1
        "#,
        quiz_id,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| QuizLoaderError::Database(e.to_string()))?
    .ok_or(QuizLoaderError::NotFound)?;

    let quiz = QuizData {
        id: quiz_row.id,
        title: quiz_row.title,
        description: quiz_row.description,
        time_limit_minutes: quiz_row.time_limit_minutes,
        shuffle_questions: quiz_row.shuffle_questions.unwrap_or(false),
        show_results: quiz_row.show_results.unwrap_or(false),
    };

    // ── 3. Load questions ────────────────────────────────────────────────────
    // Column is `text` NOT `question_text` per CLAUDE.md.
    // `"order"` must be quoted — it is a SQL reserved word.
    let question_rows = sqlx::query!(
        r#"
        SELECT
            id,
            text,
            question_type,
            points
        FROM public.quiz_questions
        WHERE quiz_id   = $1
          AND tenant_id = $2
        ORDER BY "order" ASC
        "#,
        quiz_id,
        tenant_id
    )
    .fetch_all(db)
    .await
    .map_err(|e| QuizLoaderError::Database(e.to_string()))?;

    let question_ids: Vec<Uuid> = question_rows.iter().map(|r| r.id).collect();

    // ── 4. Load options — NO is_correct ──────────────────────────────────────
    // Column is `text` NOT `option_text` per CLAUDE.md.
    // `"order"` must be quoted.
    let option_rows = if question_ids.is_empty() {
        vec![]
    } else {
        sqlx::query!(
            r#"
            SELECT
                id,
                question_id,
                text
            FROM public.quiz_options
            WHERE question_id = ANY($1)
            ORDER BY "order" ASC
            "#,
            &question_ids
        )
        .fetch_all(db)
        .await
        .map_err(|e| QuizLoaderError::Database(e.to_string()))?
    };

    // Build options map: question_id → Vec<OptionData>
    let mut options_map: std::collections::HashMap<Uuid, Vec<OptionData>> =
        std::collections::HashMap::new();
    for opt in option_rows {
        options_map.entry(opt.question_id).or_default().push(OptionData {
            id: opt.id,
            text: opt.text,
        });
    }

    // Assemble question list (preserving DB order initially)
    let mut questions: Vec<QuestionData> = question_rows
        .into_iter()
        .map(|q| QuestionData {
            id: q.id,
            text: q.text,
            question_type: q.question_type,
            points: q.points,
            options: options_map.remove(&q.id).unwrap_or_default(),
        })
        .collect();

    // ── 5. Shuffle if configured ─────────────────────────────────────────────
    // DEPENDENCY: rand = "0.8"
    if quiz.shuffle_questions {
        use rand::seq::SliceRandom;
        let mut rng = rand::thread_rng();
        questions.shuffle(&mut rng);
    }

    Ok(LoadQuizResponse { quiz, questions })
}
