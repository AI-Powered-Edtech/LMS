use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Class {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub grade_level: Option<String>,
    pub academic_year: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}
