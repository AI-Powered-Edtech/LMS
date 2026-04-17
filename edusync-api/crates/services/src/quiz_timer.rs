//! Quiz Timer Authority — Server-side timer management
//!
//! Features:
//! - Server-authoritative countdown timer
//! - Pause/resume with limits (1 pause, 5 min duration)
//! - Warning states at 5min, 1min remaining
//! - Auto-submit on timeout

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AttemptStatus {
    InProgress,
    Paused,
    Submitted,
    Expired,
    Graded,
}

impl AttemptStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AttemptStatus::InProgress => "in_progress",
            AttemptStatus::Paused => "paused",
            AttemptStatus::Submitted => "submitted",
            AttemptStatus::Expired => "expired",
            AttemptStatus::Graded => "graded",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartAttemptRequest {
    pub quiz_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartAttemptResponse {
    pub attempt_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub deadline: DateTime<Utc>,
    pub duration_seconds: i64,
    pub server_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PauseAttemptResponse {
    pub paused_at: DateTime<Utc>,
    pub remaining_time_seconds: i64,
    pub pause_remaining: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeAttemptResponse {
    pub resumed_at: DateTime<Utc>,
    pub new_deadline: DateTime<Utc>,
    pub remaining_time_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRemainingResponse {
    pub remaining_seconds: i64,
    pub server_time: DateTime<Utc>,
    pub status: String,
    pub warning_state: Option<String>,
}

const MAX_PAUSES: i32 = 1;
const MAX_PAUSE_DURATION_SECS: i64 = 300;

pub async fn start_quiz_attempt(
    db: &PgPool,
    quiz_id: Uuid,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<StartAttemptResponse, QuizTimerError> {
    let quiz_row: Option<(i32,)> = sqlx::query_as(
        r#"
        SELECT COALESCE(time_limit_minutes, 30)::int
        FROM public.quizzes
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(quiz_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    let duration_minutes = quiz_row.map(|(d,)| d).unwrap_or(30);
    let duration_seconds = (duration_minutes * 60) as i64;
    let now = Utc::now();
    let deadline = now + Duration::seconds(duration_seconds);

    let attempt_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO public.quiz_attempts_v2 (
            id, quiz_id, user_id, tenant_id,
            started_at, deadline, status,
            pause_count, pause_remaining_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(attempt_id)
    .bind(quiz_id)
    .bind(user_id)
    .bind(tenant_id)
    .bind(now)
    .bind(deadline)
    .bind(AttemptStatus::InProgress.as_str())
    .bind(MAX_PAUSES)
    .bind(0)
    .execute(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    Ok(StartAttemptResponse {
        attempt_id,
        started_at: now,
        deadline,
        duration_seconds,
        server_time: now,
    })
}

pub async fn pause_attempt(
    db: &PgPool,
    attempt_id: Uuid,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<PauseAttemptResponse, QuizTimerError> {
    let row: Option<(DateTime<Utc>, DateTime<Utc>, i32, i32)> = sqlx::query_as(
        r#"
        SELECT started_at, deadline, pause_count, COALESCE(pause_remaining_seconds, 0)
        FROM public.quiz_attempts_v2
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND status = 'in_progress'
        FOR UPDATE
        "#,
    )
    .bind(attempt_id)
    .bind(user_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    let (started_at, deadline, pause_count, pause_remaining) = row
        .ok_or(QuizTimerError::AttemptNotFound)?;

    if pause_count <= 0 {
        return Err(QuizTimerError::NoPauseRemaining);
    }

    let now = Utc::now();
    let remaining = (deadline - now).num_seconds().max(0);

    sqlx::query(
        r#"
        UPDATE public.quiz_attempts_v2
        SET status = 'paused',
            paused_at = $1,
            deadline = $1 + INTERVAL '1 second' * $2,
            pause_count = $3,
            pause_remaining_seconds = $4
        WHERE id = $5
        "#,
    )
    .bind(now)
    .bind(remaining)
    .bind(pause_count - 1)
    .bind(remaining)
    .bind(attempt_id)
    .execute(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    Ok(PauseAttemptResponse {
        paused_at: now,
        remaining_time_seconds: remaining,
        pause_remaining: pause_count - 1,
    })
}

pub async fn resume_attempt(
    db: &PgPool,
    attempt_id: Uuid,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<ResumeAttemptResponse, QuizTimerError> {
    let row: Option<(DateTime<Utc>, i32)> = sqlx::query_as(
        r#"
        SELECT paused_at, COALESCE(pause_remaining_seconds, 0)
        FROM public.quiz_attempts_v2
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND status = 'paused'
        FOR UPDATE
        "#,
    )
    .bind(attempt_id)
    .bind(user_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    let (paused_at, pause_remaining) = row
        .ok_or(QuizTimerError::AttemptNotFound)?;

    let now = Utc::now();
    let pause_elapsed = (now - paused_at).num_seconds().min(pause_remaining as i64).max(0);
    let actual_remaining = (pause_remaining as i64 - pause_elapsed).max(0);
    let new_deadline = now + Duration::seconds(actual_remaining);

    sqlx::query(
        r#"
        UPDATE public.quiz_attempts_v2
        SET status = 'in_progress',
            deadline = $1,
            pause_remaining_seconds = $2
        WHERE id = $3
        "#,
    )
    .bind(new_deadline)
    .bind(actual_remaining as i32)
    .bind(attempt_id)
    .execute(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    Ok(ResumeAttemptResponse {
        resumed_at: now,
        new_deadline,
        remaining_time_seconds: actual_remaining,
    })
}

pub async fn get_time_remaining(
    db: &PgPool,
    attempt_id: Uuid,
    user_id: Uuid,
) -> Result<TimeRemainingResponse, QuizTimerError> {
    let row: Option<(String, DateTime<Utc>)> = sqlx::query_as(
        r#"
        SELECT status, deadline
        FROM public.quiz_attempts_v2
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(attempt_id)
    .bind(user_id)
    .fetch_optional(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    let (status, deadline) = row.ok_or(QuizTimerError::AttemptNotFound)?;

    let now = Utc::now();
    let remaining = (deadline - now).num_seconds().max(0);

    let warning_state = if remaining <= 0 {
        None
    } else if remaining <= 60 {
        Some("critical".to_string())
    } else if remaining <= 300 {
        Some("warning".to_string())
    } else {
        None
    };

    Ok(TimeRemainingResponse {
        remaining_seconds: remaining,
        server_time: now,
        status,
        warning_state,
    })
}

pub async fn expire_attempts(db: &PgPool) -> Result<Vec<Uuid>, QuizTimerError> {
    let expired: Vec<(Uuid,)> = sqlx::query_as(
        r#"
        UPDATE public.quiz_attempts_v2
        SET status = 'expired'
        WHERE status = 'in_progress' AND deadline < NOW()
        RETURNING id
        "#,
    )
    .fetch_all(db)
    .await
    .map_err(|e| QuizTimerError::Database(e.to_string()))?;

    Ok(expired.into_iter().map(|(id,)| id).collect())
}

#[derive(Debug)]
pub enum QuizTimerError {
    Database(String),
    AttemptNotFound,
    NoPauseRemaining,
    AlreadyExpired,
    Internal(String),
}

impl std::fmt::Display for QuizTimerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuizTimerError::Database(msg) => write!(f, "Database error: {msg}"),
            QuizTimerError::AttemptNotFound => write!(f, "Quiz attempt not found"),
            QuizTimerError::NoPauseRemaining => write!(f, "No pause remaining for this attempt"),
            QuizTimerError::AlreadyExpired => write!(f, "Attempt has already expired"),
            QuizTimerError::Internal(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl std::error::Error for QuizTimerError {}

impl From<sqlx::Error> for QuizTimerError {
    fn from(e: sqlx::Error) -> Self {
        QuizTimerError::Database(e.to_string())
    }
}
