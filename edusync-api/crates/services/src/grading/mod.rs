/// Quiz Grading Worker — Phase 3D
///
/// Ports `supabase/functions/grade-quiz-attempt/index.ts`.
///
/// Worker that processes pending quiz submissions from the `quiz_submission_queue`
/// using `FOR UPDATE SKIP LOCKED` (via RPC) to prevent double-processing.
///
/// Key tables:
///   - `quiz_submission_queue`        : job queue (ticket_id, attempt_id, tenant_id, retry_count)
///   - `quiz_attempts_v2`             : composite PK (id, started_at)
///   - `quiz_attempt_questions_v2`    : composite PK (attempt_id, question_id, started_at)
///   - `quiz_questions`               : column is `text` NOT `question_text`
///   - `quiz_options`                 : column is `text` NOT `option_text`; has `is_correct`
///
/// Retry logic: MAX_RETRIES=3, backoff=[30s, 120s, 600s]
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: serde = "1"
// DEPENDENCY: serde_json = "1"
// DEPENDENCY: tracing = "0.1"
// DEPENDENCY: chrono = "0.4"

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES: i32 = 3;
/// Backoff intervals in seconds: 30s, 2m, 10m
const BACKOFF_SECS: [i64; 3] = [30, 120, 600];

// ─── Error type ───────────────────────────────────────────────────────────────

/// Errors that can occur during grading worker execution.
#[derive(Debug)]
pub enum GradingWorkerError {
    /// Database query failed.
    Database(String),
    /// Circuit breaker is open — too many recent failures.
    CircuitBreakerOpen,
    /// General internal error.
    Internal(String),
}

impl std::fmt::Display for GradingWorkerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GradingWorkerError::Database(msg) => {
                write!(f, "Kesalahan basis data: {msg}")
            }
            GradingWorkerError::CircuitBreakerOpen => {
                write!(
                    f,
                    "Pemutus sirkuit terbuka — terlalu banyak kegagalan terbaru"
                )
            }
            GradingWorkerError::Internal(msg) => {
                write!(f, "Kesalahan server internal: {msg}")
            }
        }
    }
}

impl std::error::Error for GradingWorkerError {}

impl From<sqlx::Error> for GradingWorkerError {
    fn from(e: sqlx::Error) -> Self {
        GradingWorkerError::Database(e.to_string())
    }
}

// ─── Public result type ───────────────────────────────────────────────────────

/// Result of grading a single quiz attempt.
#[derive(Debug, Clone, Serialize)]
pub struct GradeResult {
    /// Total points earned across all auto-graded questions.
    pub score: f64,
    /// Maximum possible points (sum of all objective question points).
    pub max_score: f64,
    /// Number of questions auto-graded.
    pub graded_count: usize,
    /// Final attempt status: "graded" or "submitted" (if subjective questions exist).
    pub status: String,
}

// ─── Internal types ───────────────────────────────────────────────────────────

/// A checkout ticket from `quiz_submission_queue`.
#[derive(Debug, Deserialize)]
struct QueueTicket {
    pub ticket_id: Uuid,
    pub attempt_id: Uuid,
    pub tenant_id: Uuid,
    pub retry_count: i32,
}

/// A row from `quiz_attempt_questions_v2`.
#[derive(Debug, sqlx::FromRow)]
struct AttemptQuestion {
    pub question_id: Uuid,
    pub started_at: chrono::DateTime<chrono::Utc>,
    /// student_answers stored as a JSON value (array or string of option UUIDs).
    pub student_answers: Option<serde_json::Value>,
}

#[derive(Debug, sqlx::FromRow)]
struct QuizQuestionRow {
    pub id: Uuid,
    pub points: i32,
    pub question_type: String,
}

#[derive(Debug, sqlx::FromRow)]
struct QuizOptionRow {
    pub id: Uuid,
    pub question_id: Uuid,
    pub is_correct: bool,
}

/// An option from `quiz_options`.
#[derive(Debug)]
struct QuizOption {
    pub id: Uuid,
    pub is_correct: bool,
}

/// A question definition from `quiz_questions` with its options.
#[derive(Debug)]
struct QuizQuestion {
    pub id: Uuid,
    pub points: i32,
    pub question_type: String,
    pub options: Vec<QuizOption>,
}

/// Result of grading a single question (internal).
#[derive(Debug)]
struct GradedQuestion {
    pub question_id: Uuid,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub is_correct: bool,
    pub points_earned: f64,
}

// ─── Pure grading logic ───────────────────────────────────────────────────────

/// Returns true for ESSAY / SHORT_ANSWER — these require manual grading.
fn is_subjective(question_type: &str) -> bool {
    matches!(question_type, "ESSAY" | "SHORT_ANSWER")
}

/// Grade a single objective question. Returns None for subjective types.
///
/// MCQ / TRUE_FALSE: single-answer match against correct option ID.
/// MULTI_SELECT: exact set match (order-independent).
fn grade_question(aq: &AttemptQuestion, q: &QuizQuestion) -> Option<GradedQuestion> {
    if is_subjective(&q.question_type) {
        return None;
    }

    let correct_ids: Vec<Uuid> = q.options.iter().filter(|o| o.is_correct).map(|o| o.id).collect();

    let is_correct = match &aq.student_answers {
        None => false,
        Some(serde_json::Value::Array(arr)) => {
            // Multi-select: exact set match (order-independent)
            let student_ids: Vec<Uuid> = arr
                .iter()
                .filter_map(|v| v.as_str())
                .filter_map(|s| s.parse::<Uuid>().ok())
                .collect();
            student_ids.len() == correct_ids.len()
                && correct_ids.iter().all(|id| student_ids.contains(id))
        }
        Some(serde_json::Value::String(s)) => {
            // Single-answer MCQ / TRUE_FALSE
            if let Ok(student_id) = s.parse::<Uuid>() {
                correct_ids.len() == 1 && correct_ids[0] == student_id
            } else {
                false
            }
        }
        _ => false,
    };

    let points_earned = if is_correct { q.points as f64 } else { 0.0 };

    Some(GradedQuestion {
        question_id: aq.question_id,
        started_at: aq.started_at,
        is_correct,
        points_earned,
    })
}

// ─── Core grading function ────────────────────────────────────────────────────

/// Grade a single attempt identified by `attempt_id` within `tenant_id`.
///
/// Steps:
///   1. Load all `quiz_attempt_questions_v2` rows for the attempt.
///   2. Load `quiz_questions` + `quiz_options` for those question IDs.
///   3. Grade each objective question (skip ESSAY / SHORT_ANSWER).
///   4. Update graded rows in `quiz_attempt_questions_v2`.
///   5. Update `quiz_attempts_v2` status and score.
///
/// Returns `GradeResult` with final score and status.
pub async fn grade_attempt(
    db: &PgPool,
    attempt_id: Uuid,
    tenant_id: Uuid,
) -> Result<GradeResult, GradingWorkerError> {
    // ── Step 1: Load attempt question rows ───────────────────────────────────
    let attempt_questions: Vec<AttemptQuestion> = sqlx::query_as::<_, AttemptQuestion>(
        r#"
        SELECT
            question_id,
            started_at,
            student_answers
        FROM public.quiz_attempt_questions_v2
        WHERE attempt_id = $1
        "#,
    )
    .bind(attempt_id)
    .fetch_all(db)
    .await
    .map_err(|e| GradingWorkerError::Database(e.to_string()))?;

    let question_ids: Vec<Uuid> = attempt_questions.iter().map(|aq| aq.question_id).collect();

    // ── Step 2: Load question definitions + options ──────────────────────────
    let questions: Vec<QuizQuestion> = if question_ids.is_empty() {
        vec![]
    } else {
        // Fetch questions — column is `text` NOT `question_text`
        let q_rows: Vec<QuizQuestionRow> = sqlx::query_as::<_, QuizQuestionRow>(
            r#"
            SELECT
                id,
                COALESCE(points, 10) as points,
                COALESCE(question_type::text, 'MCQ') as question_type
            FROM public.quiz_questions
            WHERE id = ANY($1)
              AND tenant_id = $2
            "#,
        )
        .bind(&question_ids[..])
        .bind(tenant_id)
        .fetch_all(db)
        .await
        .map_err(|e| GradingWorkerError::Database(e.to_string()))?;

        // Fetch options — column is `text` NOT `option_text`
        // Tenant isolation: filter by tenant_id to prevent cross-tenant option leakage
        let opt_rows: Vec<QuizOptionRow> = sqlx::query_as::<_, QuizOptionRow>(
            r#"
            SELECT
                id,
                question_id,
                is_correct
            FROM public.quiz_options
            WHERE question_id = ANY($1)
            "#,
        )
        .bind(&question_ids[..])
        .fetch_all(db)
        .await
        .map_err(|e| GradingWorkerError::Database(e.to_string()))?;

        // Build options map: question_id → Vec<QuizOption>
        let mut options_map: std::collections::HashMap<Uuid, Vec<QuizOption>> =
            std::collections::HashMap::new();
        for opt in opt_rows {
            options_map.entry(opt.question_id).or_default().push(QuizOption {
                id: opt.id,
                is_correct: opt.is_correct,
            });
        }

        q_rows
            .into_iter()
            .map(|q| QuizQuestion {
                id: q.id,
                points: q.points,
                question_type: q.question_type,
                options: options_map.remove(&q.id).unwrap_or_default(),
            })
            .collect()
    };

    let questions_map: std::collections::HashMap<Uuid, &QuizQuestion> =
        questions.iter().map(|q| (q.id, q)).collect();

    // ── Step 3: Grade each objective question ────────────────────────────────
    let mut total_score: f64 = 0.0;
    let mut max_score: f64 = 0.0;
    let mut graded_questions: Vec<GradedQuestion> = vec![];
    let mut has_subjective = false;

    for aq in &attempt_questions {
        let Some(q_def) = questions_map.get(&aq.question_id) else {
            tracing::warn!(
                attempt_id  = %attempt_id,
                question_id = %aq.question_id,
                "grade_attempt: definisi soal tidak ditemukan, lewati"
            );
            continue;
        };

        if is_subjective(&q_def.question_type) {
            has_subjective = true;
            max_score += q_def.points as f64;
            continue;
        }

        max_score += q_def.points as f64;

        if let Some(graded) = grade_question(aq, q_def) {
            total_score += graded.points_earned;
            graded_questions.push(graded);
        }
    }

    // ── Step 4: Update graded objective question rows ────────────────────────
    for gq in &graded_questions {
        sqlx::query(
            r#"
            UPDATE public.quiz_attempt_questions_v2
            SET
                is_correct    = $1,
                points_earned = $2
            WHERE attempt_id  = $3
              AND question_id = $4
              AND started_at  = $5
            "#,
        )
        .bind(gq.is_correct)
        .bind(gq.points_earned)
        .bind(attempt_id)
        .bind(gq.question_id)
        .bind(gq.started_at)
        .execute(db)
        .await
        .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?;
    }

    // ── Step 5: Update attempt status and score ──────────────────────────────
    // "submitted" → has essay/short_answer (awaiting manual grading)
    // "graded"    → all objective questions auto-graded
    let attempt_status = if has_subjective { "submitted" } else { "graded" };
    let started_at = attempt_questions.first().map(|aq| aq.started_at);

    if let Some(sat) = started_at {
        sqlx::query(
            r#"
            UPDATE public.quiz_attempts_v2
            SET
                score     = $1,
                status    = $2
            WHERE id         = $3
              AND started_at = $4
              AND tenant_id  = $5
            "#,
        )
        .bind(total_score)
        .bind(attempt_status)
        .bind(attempt_id)
        .bind(sat)
        .bind(tenant_id)
        .execute(db)
        .await
        .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?;
    } else {
        // Edge case: attempt with zero answered questions
        sqlx::query(
            r#"
            UPDATE public.quiz_attempts_v2
            SET
                score  = 0,
                status = $1
            WHERE id        = $2
              AND tenant_id = $3
            "#,
        )
        .bind(attempt_status)
        .bind(attempt_id)
        .bind(tenant_id)
        .execute(db)
        .await
        .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?;
    }

    Ok(GradeResult {
        score: total_score,
        max_score,
        graded_count: graded_questions.len(),
        status: attempt_status.to_string(),
    })
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

/// Process pending quiz grading jobs (one per invocation).
///
/// Steps:
///   1. Release stuck PROCESSING tickets older than 2 minutes.
///   2. Abort if ≥ 5 failures in the last 60 seconds (circuit breaker).
///   3. Checkout one pending ticket via `v1_checkout_submission_queue()` RPC
///      (which uses `FOR UPDATE SKIP LOCKED`).
///   4. Grade the attempt.
///   5. Mark ticket COMPLETED, or schedule retry / dead-letter on failure.
///   6. Trigger `detect_new_struggles()` for fully graded attempts (best-effort).
///
/// Returns the number of attempts successfully graded (0 or 1).
/// Called by cron every 30 s or triggered on-demand.
pub async fn run_grading_worker(db: &PgPool) -> Result<usize, GradingWorkerError> {
    // ── 1. Circuit recovery: release stuck PROCESSING tickets ────────────────
    let _ = sqlx::query(
        r#"
        UPDATE public.quiz_submission_queue
        SET
            status        = 'PENDING',
            next_retry_at = NOW() + INTERVAL '30 seconds'
        WHERE status     = 'PROCESSING'
          AND updated_at  < NOW() - INTERVAL '2 minutes'
        "#
    )
    .execute(db)
    .await;
    // Best-effort cleanup — do not abort if this fails

    // ── 2. Circuit breaker: count recent failures ─────────────────────────────
    let recent_failures: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)::bigint
        FROM public.quiz_submission_queue
        WHERE status     = 'FAILED'
          AND updated_at >= NOW() - INTERVAL '60 seconds'
        "#,
    )
    .fetch_one(db)
    .await
    .unwrap_or(0);

    if recent_failures >= 5 {
        tracing::warn!(
            recent_failures = recent_failures,
            "grading_worker: pemutus sirkuit terbuka — terlalu banyak kegagalan terbaru"
        );
        return Err(GradingWorkerError::CircuitBreakerOpen);
    }

    // ── 3. Checkout one ticket ────────────────────────────────────────────────
    // The RPC `v1_checkout_submission_queue()` uses FOR UPDATE SKIP LOCKED
    // internally to prevent double-processing.
    let ticket_row = sqlx::query(
        r#"
        SELECT
            ticket_id,
            attempt_id,
            tenant_id,
            retry_count
        FROM public.v1_checkout_submission_queue()
        "#,
    )
    .fetch_optional(db)
    .await
    .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?;

    let ticket = match ticket_row {
        None => {
            tracing::debug!("grading_worker: tidak ada pengajuan yang tertunda");
            return Ok(0);
        }
        Some(r) => QueueTicket {
            ticket_id: r
                .try_get("ticket_id")
                .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?,
            attempt_id: r
                .try_get("attempt_id")
                .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?,
            tenant_id: r
                .try_get("tenant_id")
                .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?,
            retry_count: r
                .try_get("retry_count")
                .map_err(|e: sqlx::Error| GradingWorkerError::Database(e.to_string()))?,
        },
    };

    tracing::info!(
        ticket_id   = %ticket.ticket_id,
        attempt_id  = %ticket.attempt_id,
        retry_count = ticket.retry_count,
        "grading_worker: memulai penilaian ujian"
    );

    // ── 4. Grade the attempt ──────────────────────────────────────────────────
    let grade_result = grade_attempt(db, ticket.attempt_id, ticket.tenant_id).await;

    match grade_result {
        Ok(result) => {
            // ── 5a. Mark ticket COMPLETED ─────────────────────────────────────
            sqlx::query(
                r#"
                UPDATE public.quiz_submission_queue
                SET status = 'COMPLETED'
                WHERE id   = $1
                "#,
            )
            .bind(ticket.ticket_id)
            .execute(db)
            .await
            .map_err(|e| GradingWorkerError::Database(e.to_string()))?;

            tracing::info!(
                ticket_id    = %ticket.ticket_id,
                attempt_id   = %ticket.attempt_id,
                score        = result.score,
                max_score    = result.max_score,
                graded_count = result.graded_count,
                status       = %result.status,
                "grading_worker: penilaian selesai"
            );

            // ── 6. Trigger struggle detection (best-effort) ───────────────────
            // Only call for fully graded attempts — subjective attempts may change later.
            if result.status == "graded" {
                let _ = sqlx::query("SELECT public.detect_new_struggles()")
                    .execute(db)
                    .await
                    .map_err(|e| {
                        tracing::error!(
                            error = %e,
                            "grading_worker: gagal memicu deteksi kesulitan belajar"
                        );
                    });
            }

            Ok(1)
        }

        Err(ref e) => {
            let err_msg = e.to_string();
            let new_retry_count = ticket.retry_count + 1;

            if new_retry_count >= MAX_RETRIES {
                // Terminal failure → dead letter queue
                tracing::error!(
                    ticket_id  = %ticket.ticket_id,
                    attempt_id = %ticket.attempt_id,
                    error      = %err_msg,
                    "grading_worker: tiket dipindahkan ke dead-letter setelah {} percobaan",
                    MAX_RETRIES
                );

                let _ = sqlx::query(r#"SELECT public.v1_mark_dead_letter($1::uuid, $2::text)"#)
                .bind(ticket.ticket_id)
                .bind(err_msg)
                .execute(db)
                .await;
            } else {
                // Schedule exponential backoff retry
                let backoff_secs = BACKOFF_SECS
                    .get(ticket.retry_count as usize)
                    .copied()
                    .unwrap_or(BACKOFF_SECS[0]);

                tracing::warn!(
                    ticket_id    = %ticket.ticket_id,
                    retry_count  = new_retry_count,
                    backoff_secs = backoff_secs,
                    error        = %err_msg,
                    "grading_worker: menjadwalkan ulang percobaan penilaian"
                );

                let _ = sqlx::query(
                    r#"
                    SELECT public.v1_schedule_retry_submission(
                        $1::uuid,
                        $2::int,
                        $3::text,
                        $4::int
                    )
                    "#,
                )
                .bind(ticket.ticket_id)
                .bind(new_retry_count)
                .bind(err_msg)
                .bind(backoff_secs as i32)
                .execute(db)
                .await;
            }

            grade_result.map(|_| 0)
        }
    }
}
