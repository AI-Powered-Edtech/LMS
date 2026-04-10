use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Lesson {
    pub id: Uuid,
    pub module_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub order: i32,
    pub tenant_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub lesson_type: Option<String>,
    pub passing_score: Option<i32>,
    pub is_published: Option<bool>,
    pub duration_minutes: Option<i32>,
}
