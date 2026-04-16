#![allow(dead_code)]
/// Progress Event Processor — Phase 3D
///
/// Ports `supabase/functions/process-progress-events/index.ts`.
///
/// Reads unprocessed events from the `progress_events` table, aggregates them
/// by (user_id, lesson_id), and upserts into `student_lesson_signals`.
///
/// Key column names (from CLAUDE.md — do not change):
///   student_lesson_signals.total_time_spent    (NOT time_spent_seconds)
///   student_lesson_signals.last_accessed_at    (NOT last_event_at)
///   student_lesson_signals.latest_quiz_score   (NOT quiz_avg_score)
///
/// Advisory lock: `pg_try_advisory_lock(hashtext('progress_events'))` prevents
/// queue stampede when multiple invocations race.
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: tracing = "0.1"
// DEPENDENCY: chrono = "0.4"

use sqlx::PgPool;
use uuid::Uuid;

// ─── Module-local error type ──────────────────────────────────────────────────

/// Errors from the progress event processor.
#[derive(Debug)]
pub enum ProgressProcessorError {
    Database(String),
}

impl std::fmt::Display for ProgressProcessorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProgressProcessorError::Database(msg) => {
                write!(f, "Kesalahan basis data prosesor: {msg}")
            }
        }
    }
}

impl std::error::Error for ProgressProcessorError {}

// ─── Internal aggregate ───────────────────────────────────────────────────────

/// Aggregated state for one (user_id, lesson_id) pair across a batch.
#[derive(Debug)]
struct LessonAggregate {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    /// Maximum video position seen across all events (seconds).
    pub max_position: f64,
    /// Latest timestamp (unix ms) seen across all events.
    pub last_accessed_ms: i64,
    /// Latest quiz score (from `quiz_submitted` events, highest seen).
    pub latest_quiz_score: Option<f64>,
}

// ─── Batch size ───────────────────────────────────────────────────────────────

/// Number of events read per batch.
const BATCH_SIZE: i64 = 500;

#[derive(sqlx::FromRow)]
struct ProgressEventRow {
    id: i64,
    tenant_id: Uuid,
    user_id: Uuid,
    lesson_id: Uuid,
    event_type: String,
    position: Option<f64>,
    client_timestamp_ms: i64,
}

// ─── Public processor ─────────────────────────────────────────────────────────

/// Process one batch of unprocessed progress events.
///
/// Steps:
///   1. Acquire PostgreSQL advisory lock (prevents queue stampede).
///   2. SELECT up to BATCH_SIZE unprocessed events (FOR UPDATE SKIP LOCKED).
///   3. Aggregate by (user_id, lesson_id).
///   4. Upsert into `student_lesson_signals`.
///   5. Mark events as processed.
///   6. Release advisory lock.
///
/// Returns the number of events processed.
/// Returns 0 (without error) if the lock is already held by another invocation.
pub async fn process_progress_batch(db: &PgPool) -> Result<usize, ProgressProcessorError> {
    // ── 1. Acquire advisory lock ─────────────────────────────────────────────
    let lock_acquired: bool = sqlx::query_scalar(
        r#"SELECT pg_try_advisory_lock(hashtext('progress_events'))"#,
    )
    .fetch_one(db)
    .await
    .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;

    if !lock_acquired {
        tracing::debug!("progress_processor: prosesor lain sedang berjalan, lewati batch ini");
        return Ok(0);
    }

    let result = process_inner(db).await;

    // ── 6. Always release advisory lock ──────────────────────────────────────
    let _ = sqlx::query("SELECT pg_advisory_unlock(hashtext('progress_events'))")
        .execute(db)
        .await;

    result
}

async fn process_inner(db: &PgPool) -> Result<usize, ProgressProcessorError> {
    // ── 2. SELECT unprocessed events ─────────────────────────────────────────
    let rows: Vec<ProgressEventRow> = sqlx::query_as::<_, ProgressEventRow>(
        r#"
        SELECT
            id,
            tenant_id,
            user_id,
            lesson_id,
            event_type,
            position,
            client_timestamp_ms
        FROM public.progress_events
        WHERE processed = false
        ORDER BY client_timestamp_ms ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        "#,
    )
    .bind(BATCH_SIZE)
    .fetch_all(db)
    .await
    .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;

    if rows.is_empty() {
        tracing::debug!("progress_processor: tidak ada event yang perlu diproses");
        return Ok(0);
    }

    let total_fetched = rows.len();
    let event_ids: Vec<i64> = rows.iter().map(|r| r.id).collect();

    // ── 3. Aggregate by (user_id, lesson_id) ─────────────────────────────────
    let mut aggregates: std::collections::HashMap<(Uuid, Uuid), LessonAggregate> =
        std::collections::HashMap::new();

    for row in rows {
        let position = row.position.unwrap_or(0.0);
        let timestamp_ms = row.client_timestamp_ms;
        let key = (row.user_id, row.lesson_id);

        match aggregates.get_mut(&key) {
            None => {
                let latest_quiz_score = if row.event_type == "quiz_submitted" {
                    // `position` carries the quiz score for quiz_submitted events
                    Some(position)
                } else {
                    None
                };

                aggregates.insert(
                    key,
                    LessonAggregate {
                        tenant_id: row.tenant_id,
                        user_id: row.user_id,
                        lesson_id: row.lesson_id,
                        max_position: position,
                        last_accessed_ms: timestamp_ms,
                        latest_quiz_score,
                    },
                );
            }
            Some(agg) => {
                // Track max position (furthest point reached in video)
                if position > agg.max_position {
                    agg.max_position = position;
                }
                if timestamp_ms > agg.last_accessed_ms {
                    agg.last_accessed_ms = timestamp_ms;
                }
                if row.event_type == "quiz_submitted" {
                    agg.latest_quiz_score = Some(match agg.latest_quiz_score {
                        Some(existing) => existing.max(position),
                        None => position,
                    });
                }
            }
        }
    }

    // ── 4. Upsert student_lesson_signals ─────────────────────────────────────
    // Column names per CLAUDE.md:
    //   total_time_spent    (NOT time_spent_seconds)
    //   last_accessed_at    (NOT last_event_at)
    //   latest_quiz_score   (NOT quiz_avg_score)
    let mut tx = db
        .begin()
        .await
        .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;

    for agg in aggregates.values() {
        // Convert unix-ms to timestamptz for last_accessed_at
        let last_accessed_at =
            chrono::DateTime::from_timestamp_millis(agg.last_accessed_ms)
                .unwrap_or_else(chrono::Utc::now);

        if let Some(quiz_score) = agg.latest_quiz_score {
            sqlx::query(
                r#"
                INSERT INTO public.student_lesson_signals (
                    tenant_id,
                    user_id,
                    lesson_id,
                    total_time_spent,
                    last_accessed_at,
                    latest_quiz_score,
                    updated_at
                ) VALUES (
                    $1, $2, $3,
                    $4::double precision,
                    $5,
                    $6,
                    NOW()
                )
                ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                    total_time_spent  = GREATEST(
                        student_lesson_signals.total_time_spent,
                        EXCLUDED.total_time_spent
                    ),
                    last_accessed_at  = GREATEST(
                        student_lesson_signals.last_accessed_at,
                        EXCLUDED.last_accessed_at
                    ),
                    latest_quiz_score = GREATEST(
                        COALESCE(student_lesson_signals.latest_quiz_score, 0),
                        EXCLUDED.latest_quiz_score
                    ),
                    updated_at        = NOW()
                "#,
            )
            .bind(agg.tenant_id)
            .bind(agg.user_id)
            .bind(agg.lesson_id)
            .bind(agg.max_position)
            .bind(last_accessed_at)
            .bind(quiz_score)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO public.student_lesson_signals (
                    tenant_id,
                    user_id,
                    lesson_id,
                    total_time_spent,
                    last_accessed_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3,
                    $4::double precision,
                    $5,
                    NOW()
                )
                ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                    total_time_spent = GREATEST(
                        student_lesson_signals.total_time_spent,
                        EXCLUDED.total_time_spent
                    ),
                    last_accessed_at = GREATEST(
                        student_lesson_signals.last_accessed_at,
                        EXCLUDED.last_accessed_at
                    ),
                    updated_at       = NOW()
                "#,
            )
            .bind(agg.tenant_id)
            .bind(agg.user_id)
            .bind(agg.lesson_id)
            .bind(agg.max_position)
            .bind(last_accessed_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;
        }
    }

    // ── 5. Mark events as processed ──────────────────────────────────────────
    sqlx::query(
        r#"
        UPDATE public.progress_events
        SET processed = true
        WHERE id = ANY($1)
        "#,
    )
    .bind(&event_ids[..])
    .execute(&mut *tx)
    .await
    .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;

    tx.commit()
        .await
        .map_err(|e| ProgressProcessorError::Database(e.to_string()))?;

    tracing::info!(
        processed  = total_fetched,
        aggregates = aggregates.len(),
        "progress_processor: batch selesai diproses"
    );

    Ok(total_fetched)
}
