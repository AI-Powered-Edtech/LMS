use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Class {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub course_id: Option<Uuid>,
    pub teacher_id: Uuid,
    pub join_code: String,
    pub max_students: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}
