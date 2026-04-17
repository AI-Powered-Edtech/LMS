//! XP & Level System — Server-side computation
//!
//! Ports `src/utils/clientCompute.ts` XP functions
//!
//! Features:
//! - Level thresholds computation
//! - XP award transactions
//! - Streak tracking
//! - Leaderboard ranking

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

const XP_LEVEL_THRESHOLDS: [i32; 15] = [
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500,
];

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum XpActivityType {
    QuizComplete,
    QuizScore,
    LessonComplete,
    CourseComplete,
    DailyLogin,
    StreakBonus,
    AssignmentSubmit,
    Attendance,
    Achievement,
    Discussion,
}

impl XpActivityType {
    pub fn base_xp(&self) -> i32 {
        match self {
            XpActivityType::QuizComplete => 10,
            XpActivityType::QuizScore => 5,
            XpActivityType::LessonComplete => 15,
            XpActivityType::CourseComplete => 100,
            XpActivityType::DailyLogin => 5,
            XpActivityType::StreakBonus => 20,
            XpActivityType::AssignmentSubmit => 10,
            XpActivityType::Attendance => 5,
            XpActivityType::Achievement => 50,
            XpActivityType::Discussion => 5,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            XpActivityType::QuizComplete => "quiz_complete",
            XpActivityType::QuizScore => "quiz_score",
            XpActivityType::LessonComplete => "lesson_complete",
            XpActivityType::CourseComplete => "course_complete",
            XpActivityType::DailyLogin => "daily_login",
            XpActivityType::StreakBonus => "streak_bonus",
            XpActivityType::AssignmentSubmit => "assignment_submit",
            XpActivityType::Attendance => "attendance",
            XpActivityType::Achievement => "achievement",
            XpActivityType::Discussion => "discussion",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "quiz_complete" => Some(XpActivityType::QuizComplete),
            "quiz_score" => Some(XpActivityType::QuizScore),
            "lesson_complete" => Some(XpActivityType::LessonComplete),
            "course_complete" => Some(XpActivityType::CourseComplete),
            "daily_login" => Some(XpActivityType::DailyLogin),
            "streak_bonus" => Some(XpActivityType::StreakBonus),
            "assignment_submit" => Some(XpActivityType::AssignmentSubmit),
            "attendance" => Some(XpActivityType::Attendance),
            "achievement" => Some(XpActivityType::Achievement),
            "discussion" => Some(XpActivityType::Discussion),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserXpInfo {
    pub user_id: Uuid,
    pub total_xp: i32,
    pub current_level: i32,
    pub current_streak: i32,
    pub last_activity_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwardXpRequest {
    pub activity_type: String,
    pub activity_id: Option<Uuid>,
    pub base_xp: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwardXpResponse {
    pub new_total_xp: i32,
    pub new_level: i32,
    pub leveled_up: bool,
    pub xp_awarded: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub total_xp: i32,
    pub current_level: i32,
    pub rank: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XpTransaction {
    pub id: Uuid,
    pub activity_type: String,
    pub activity_id: Option<Uuid>,
    pub xp_amount: i32,
    pub created_at: DateTime<Utc>,
}

pub fn calculate_level(xp: i32) -> i32 {
    let mut level = 1;
    for (i, threshold) in XP_LEVEL_THRESHOLDS.iter().enumerate() {
        if xp >= *threshold {
            level = (i + 1) as i32;
        } else {
            break;
        }
    }
    level
}

pub fn xp_to_next_level(level: i32) -> i32 {
    if level as usize >= XP_LEVEL_THRESHOLDS.len() {
        return 0;
    }
    XP_LEVEL_THRESHOLDS[level as usize]
}

pub fn current_level_xp(level: i32) -> i32 {
    if level <= 1 {
        return 0;
    }
    let idx = (level - 1) as usize;
    if idx >= XP_LEVEL_THRESHOLDS.len() {
        return XP_LEVEL_THRESHOLDS.last().copied().unwrap_or(0);
    }
    XP_LEVEL_THRESHOLDS[idx]
}

pub fn calculate_streak(last_activity: Option<DateTime<Utc>>, current_time: DateTime<Utc>) -> i32 {
    match last_activity {
        None => 1,
        Some(last) => {
            let days_since = (current_time.date_naive() - last.date_naive()).num_days();
            if days_since == 0 {
                0
            } else if days_since == 1 {
                1
            } else {
                0
            }
        }
    }
}

pub async fn award_xp(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    req: &AwardXpRequest,
) -> Result<AwardXpResponse, XpError> {
    let activity_type = XpActivityType::from_str(&req.activity_type)
        .ok_or_else(|| XpError::InvalidActivity(req.activity_type.clone()))?;

    let xp_to_award = req.base_xp.unwrap_or_else(|| activity_type.base_xp());

    let row: Option<(i32, i32, Option<DateTime<Utc>>)> = sqlx::query_as(
        r#"
        SELECT total_xp, current_streak, last_activity_at
        FROM public.user_xp
        WHERE user_id = $1
        FOR UPDATE
        "#,
    )
    .bind(user_id)
    .fetch_optional(db)
    .await
    .map_err(|e| XpError::Database(e.to_string()))?;

    let (current_xp, current_streak, last_activity) = row.unwrap_or((0, 0, None));

    let new_total_xp = current_xp + xp_to_award;
    let current_level = calculate_level(current_xp);
    let new_level = calculate_level(new_total_xp);
    let leveled_up = new_level > current_level;

    let now = Utc::now();
    let new_streak = calculate_streak(last_activity, now);

    sqlx::query(
        r#"
        INSERT INTO public.user_xp (user_id, total_xp, current_level, current_streak, last_activity_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
            total_xp = EXCLUDED.total_xp,
            current_level = EXCLUDED.current_level,
            current_streak = EXCLUDED.current_streak,
            last_activity_at = EXCLUDED.last_activity_at
        "#,
    )
    .bind(user_id)
    .bind(new_total_xp)
    .bind(new_level)
    .bind(new_streak)
    .bind(now)
    .bind(tenant_id)
    .execute(db)
    .await
    .map_err(|e| XpError::Database(e.to_string()))?;

    sqlx::query(
        r#"
        INSERT INTO public.xp_transactions (id, user_id, activity_type, activity_id, xp_amount, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(activity_type.as_str())
    .bind(req.activity_id)
    .bind(xp_to_award)
    .bind(now)
    .bind(tenant_id)
    .execute(db)
    .await
    .map_err(|e| XpError::Database(e.to_string()))?;

    Ok(AwardXpResponse {
        new_total_xp,
        new_level,
        leveled_up,
        xp_awarded: xp_to_award,
    })
}

pub async fn get_user_xp(
    db: &PgPool,
    user_id: Uuid,
) -> Result<UserXpInfo, XpError> {
    let row: Option<(i32, i32, i32, Option<DateTime<Utc>>)> = sqlx::query_as(
        r#"
        SELECT total_xp, current_level, current_streak, last_activity_at
        FROM public.user_xp
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(db)
    .await
    .map_err(|e| XpError::Database(e.to_string()))?;

    Ok(row.map(|(total_xp, current_level, current_streak, last_activity_at)| {
        UserXpInfo {
            user_id,
            total_xp,
            current_level,
            current_streak,
            last_activity_at,
        }
    }).unwrap_or_else(|| UserXpInfo {
        user_id,
        total_xp: 0,
        current_level: 1,
        current_streak: 0,
        last_activity_at: None,
    }))
}

pub async fn get_leaderboard(
    db: &PgPool,
    tenant_id: Uuid,
    course_id: Option<Uuid>,
    limit: i32,
) -> Result<Vec<LeaderboardEntry>, XpError> {
    let limit = limit.min(100).max(1);

    let rows: Vec<(Uuid, String, Option<String>, i32, i32)> = if let Some(cid) = course_id {
        sqlx::query_as(
            r#"
            SELECT 
                ux.user_id,
                COALESCE(p.display_name, p.username, 'Unknown'),
                p.display_name,
                ux.total_xp,
                ux.current_level
            FROM public.user_xp ux
            JOIN public.profiles p ON p.user_id = ux.user_id
            JOIN public.enrollments e ON e.user_id = ux.user_id
            WHERE e.course_id = $1 AND e.tenant_id = $2 AND e.status = 'active'
            ORDER BY ux.total_xp DESC
            LIMIT $3
            "#,
        )
        .bind(cid)
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(db)
        .await
        .map_err(|e| XpError::Database(e.to_string()))?
    } else {
        sqlx::query_as(
            r#"
            SELECT 
                ux.user_id,
                COALESCE(p.display_name, p.username, 'Unknown'),
                p.display_name,
                ux.total_xp,
                ux.current_level
            FROM public.user_xp ux
            JOIN public.profiles p ON p.user_id = ux.user_id
            WHERE ux.tenant_id = $1
            ORDER BY ux.total_xp DESC
            LIMIT $2
            "#,
        )
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(db)
        .await
        .map_err(|e| XpError::Database(e.to_string()))?
    };

    let leaderboard: Vec<LeaderboardEntry> = rows
        .into_iter()
        .enumerate()
        .map(|(i, (user_id, username, display_name, total_xp, current_level))| LeaderboardEntry {
            user_id,
            username,
            display_name,
            total_xp,
            current_level,
            rank: (i + 1) as i32,
        })
        .collect();

    Ok(leaderboard)
}

pub async fn get_xp_transactions(
    db: &PgPool,
    user_id: Uuid,
    limit: i32,
) -> Result<Vec<XpTransaction>, XpError> {
    let limit = limit.min(100).max(1);

    let rows: Vec<(Uuid, String, Option<Uuid>, i32, DateTime<Utc>)> = sqlx::query_as(
        r#"
        SELECT id, activity_type, activity_id, xp_amount, created_at
        FROM public.xp_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(db)
    .await
    .map_err(|e| XpError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|(id, activity_type, activity_id, xp_amount, created_at)| {
        XpTransaction {
            id,
            activity_type,
            activity_id,
            xp_amount,
            created_at,
        }
    }).collect())
}

#[derive(Debug)]
pub enum XpError {
    Database(String),
    UserNotFound,
    InvalidActivity(String),
    Internal(String),
}

impl std::fmt::Display for XpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            XpError::Database(msg) => write!(f, "Database error: {msg}"),
            XpError::UserNotFound => write!(f, "User not found"),
            XpError::InvalidActivity(s) => write!(f, "Invalid activity type: {s}"),
            XpError::Internal(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl std::error::Error for XpError {}

impl From<sqlx::Error> for XpError {
    fn from(e: sqlx::Error) -> Self {
        XpError::Database(e.to_string())
    }
}
