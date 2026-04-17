//! Anti-Cheat System — Server-side event tracking
//!
//! Ports `src/features/quizzes/utils/antiCheatLogger.ts`
//!
//! Features:
//! - Event tracking: TAB_SWITCH, WINDOW_BLUR, DEVTOOLS_OPEN, COPY_PASTE, RIGHT_CLICK
//! - Severity-weighted scoring
//! - Accumulated score with threshold detection
//! - Persistent anti-cheat flags per attempt

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AntiCheatEventType {
    TabSwitch,
    WindowBlur,
    DevToolsOpen,
    CopyPaste,
    RightClick,
    FocusLost,
    ScreenshotAttempt,
}

impl AntiCheatEventType {
    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "TAB_SWITCH" | "TABSWITCH" => AntiCheatEventType::TabSwitch,
            "WINDOW_BLUR" | "WINDOWBLUR" => AntiCheatEventType::WindowBlur,
            "DEVTOOLS_OPEN" | "DEVTOOLS" => AntiCheatEventType::DevToolsOpen,
            "COPY_PASTE" | "COPYPASTE" => AntiCheatEventType::CopyPaste,
            "RIGHT_CLICK" | "RIGHTCLICK" => AntiCheatEventType::RightClick,
            "FOCUS_LOST" | "FOCUSLOST" => AntiCheatEventType::FocusLost,
            "SCREENSHOT_ATTEMPT" | "SCREENSHOT" => AntiCheatEventType::ScreenshotAttempt,
            _ => AntiCheatEventType::WindowBlur,
        }
    }

    pub fn severity(&self) -> i32 {
        match self {
            AntiCheatEventType::TabSwitch => 1,
            AntiCheatEventType::WindowBlur => 1,
            AntiCheatEventType::RightClick => 1,
            AntiCheatEventType::CopyPaste => 3,
            AntiCheatEventType::FocusLost => 2,
            AntiCheatEventType::DevToolsOpen => 5,
            AntiCheatEventType::ScreenshotAttempt => 5,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AntiCheatEventType::TabSwitch => "TAB_SWITCH",
            AntiCheatEventType::WindowBlur => "WINDOW_BLUR",
            AntiCheatEventType::DevToolsOpen => "DEVTOOLS_OPEN",
            AntiCheatEventType::CopyPaste => "COPY_PASTE",
            AntiCheatEventType::RightClick => "RIGHT_CLICK",
            AntiCheatEventType::FocusLost => "FOCUS_LOST",
            AntiCheatEventType::ScreenshotAttempt => "SCREENSHOT_ATTEMPT",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SeverityLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl SeverityLevel {
    pub fn from_score(score: i32) -> Self {
        if score >= 25 {
            SeverityLevel::Critical
        } else if score >= 15 {
            SeverityLevel::High
        } else if score >= 10 {
            SeverityLevel::Medium
        } else {
            SeverityLevel::Low
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            SeverityLevel::Low => "low",
            SeverityLevel::Medium => "medium",
            SeverityLevel::High => "high",
            SeverityLevel::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntiCheatEvent {
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordEventRequest {
    pub attempt_id: Uuid,
    pub event_type: String,
    #[serde(default)]
    pub timestamp: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordEventResponse {
    pub accumulated_score: i32,
    pub severity_level: String,
    pub should_terminate: bool,
    pub should_flag: bool,
    pub event_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntiCheatReport {
    pub attempt_id: Uuid,
    pub events: Vec<AntiCheatEvent>,
    pub total_score: i32,
    pub severity_level: String,
    pub flagged: bool,
    pub should_terminate: bool,
    pub recommendation: String,
}

const SCORE_WARNING_THRESHOLD: i32 = 10;
const SCORE_FLAG_THRESHOLD: i32 = 15;
const SCORE_TERMINATE_THRESHOLD: i32 = 25;

pub async fn record_anticheat_event(
    db: &PgPool,
    req: &RecordEventRequest,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<RecordEventResponse, AntiCheatError> {
    let event_type = AntiCheatEventType::from_str(&req.event_type);
    let severity = event_type.severity();
    let timestamp = req.timestamp.unwrap_or_else(Utc::now);

    sqlx::query(
        r#"
        INSERT INTO public.anti_cheat_events (id, attempt_id, event_type, severity, occurred_at, metadata, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(req.attempt_id)
    .bind(event_type.as_str())
    .bind(severity)
    .bind(timestamp)
    .bind(&req.metadata)
    .bind(user_id)
    .bind(tenant_id)
    .execute(db)
    .await
    .map_err(|e| AntiCheatError::Database(e.to_string()))?;

    let total_score: i32 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(severity), 0)::int
        FROM public.anti_cheat_events
        WHERE attempt_id = $1
        "#,
    )
    .bind(req.attempt_id)
    .fetch_one(db)
    .await
    .map_err(|e| AntiCheatError::Database(e.to_string()))?;

    let event_count: i32 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)::int
        FROM public.anti_cheat_events
        WHERE attempt_id = $1
        "#,
    )
    .bind(req.attempt_id)
    .fetch_one(db)
    .await
    .map_err(|e| AntiCheatError::Database(e.to_string()))?;

    let should_flag = total_score >= SCORE_FLAG_THRESHOLD;
    let should_terminate = total_score >= SCORE_TERMINATE_THRESHOLD;

    if should_flag || should_terminate {
        sqlx::query(
            r#"
            UPDATE public.quiz_attempts_v2
            SET anti_cheat_score = $1, flagged = $2
            WHERE id = $3 AND tenant_id = $4
            "#,
        )
        .bind(total_score)
        .bind(should_flag)
        .bind(req.attempt_id)
        .bind(tenant_id)
        .execute(db)
        .await
        .map_err(|e| AntiCheatError::Database(e.to_string()))?;
    }

    let severity_level = SeverityLevel::from_score(total_score);

    Ok(RecordEventResponse {
        accumulated_score: total_score,
        severity_level: severity_level.as_str().to_string(),
        should_terminate,
        should_flag,
        event_count,
    })
}

pub async fn get_anticheat_report(
    db: &PgPool,
    attempt_id: Uuid,
) -> Result<AntiCheatReport, AntiCheatError> {
    let rows: Vec<(String, DateTime<Utc>, Option<serde_json::Value>)> = sqlx::query_as(
        r#"
        SELECT event_type, occurred_at, metadata
        FROM public.anti_cheat_events
        WHERE attempt_id = $1
        ORDER BY occurred_at ASC
        "#,
    )
    .bind(attempt_id)
    .fetch_all(db)
    .await
    .map_err(|e| AntiCheatError::Database(e.to_string()))?;

    let events: Vec<AntiCheatEvent> = rows
        .into_iter()
        .map(|(event_type, timestamp, metadata)| AntiCheatEvent {
            event_type,
            timestamp,
            metadata,
        })
        .collect();

    let total_score: i32 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(severity), 0)::int
        FROM public.anti_cheat_events
        WHERE attempt_id = $1
        "#,
    )
    .bind(attempt_id)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let severity_level = SeverityLevel::from_score(total_score);
    let should_terminate = total_score >= SCORE_TERMINATE_THRESHOLD;
    let flagged = total_score >= SCORE_FLAG_THRESHOLD;

    let recommendation = if should_terminate {
        "Terminate attempt and review manually".to_string()
    } else if flagged {
        "Flag for review after submission".to_string()
    } else if total_score >= SCORE_WARNING_THRESHOLD {
        "Issue warning to student".to_string()
    } else {
        "Continue monitoring".to_string()
    };

    Ok(AntiCheatReport {
        attempt_id,
        events,
        total_score,
        severity_level: severity_level.as_str().to_string(),
        flagged,
        should_terminate,
        recommendation,
    })
}

#[derive(Debug)]
pub enum AntiCheatError {
    Database(String),
    NotFound,
    Internal(String),
}

impl std::fmt::Display for AntiCheatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AntiCheatError::Database(msg) => write!(f, "Database error: {msg}"),
            AntiCheatError::NotFound => write!(f, "Attempt not found"),
            AntiCheatError::Internal(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl std::error::Error for AntiCheatError {}

impl From<sqlx::Error> for AntiCheatError {
    fn from(e: sqlx::Error) -> Self {
        AntiCheatError::Database(e.to_string())
    }
}
