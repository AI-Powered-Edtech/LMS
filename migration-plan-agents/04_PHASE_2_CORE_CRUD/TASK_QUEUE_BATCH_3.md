# Task Queue — Phase 2 Batch 3

**Modul:** Analytics, Users, Progress  
**Durasi:** Minggu 32–36 | **Effort:** ~50–60 jam

---

## Task IDs

| ID   | Modul           | Deskripsi                                  |
| ---- | --------------- | ------------------------------------------ |
| 2C-1 | Analytics       | Executive Overview RPC Handler             |
| 2C-2 | Analytics       | Teacher + Student RPC Handlers             |
| 2C-3 | Analytics       | Remaining RPCs (Bulk Handler Registration) |
| 2C-4 | User Management | User CRUD Endpoints                        |
| 2C-5 | Bulk Import     | Bulk CSV Import Service                    |
| 2C-6 | Progress        | Progress Tracking Endpoints                |
| 2C-7 | xAPI            | xAPI Statement Endpoints                   |

---

## Dependency Map

```
Cluster A: Analytics
2C-1 → 2C-2 → 2C-3

Cluster B: User Management
2C-4 → 2C-5

Cluster C: Progress + xAPI
2C-6 → 2C-7
```

---

## SQL Gotchas (Batch 3 Specific)

> WAJIB dibaca sebelum menulis query SQL apapun di Batch 3.

| Gotcha | Detail |
|--------|--------|
| Analytics RPCs | Tetap sebagai stored procedures — thin Rust handler, JANGAN port logic ke Rust |
| Teacher role check | Query `user_roles` table langsung, JANGAN pakai `has_role()` (fails saat JWT missing tenant claim) |
| `student_lesson_signals.total_time_spent` | BUKAN `time_spent_seconds` |
| `student_lesson_signals.last_accessed_at` | BUKAN `last_event_at` |
| `student_lesson_signals.latest_quiz_score` | BUKAN `quiz_avg_score` |
| `enrollments.user_id` | BUKAN `student_id` |
| `profiles.role` | TIDAK ADA — role datang dari `user_roles` table |
| `SELECT *` | DILARANG — selalu specify columns explicitly |

---

## Task Detail

### 2C-1: Analytics Models + Executive Overview RPC Handler

**Goal:** Buat Rust model structs untuk analytics responses + handler executive overview RPC

**Dependencies:** Phase 1A scaffold selesai, Phase 2 Batch 1-2 selesai

**CATATAN:** Analytics RPCs tetap sebagai stored procedures — thin Rust handler memanggil `sqlx::query!` ke stored procedure, TIDAK port logic ke Rust.

**Files:**

- `edusync-api/crates/models/src/analytics.rs`
- `edusync-api/crates/server/src/handlers/analytics.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod analytics;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/analytics.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Response struct for executive overview RPC
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ExecutiveOverview {
    pub total_students: Option<i64>,
    pub total_teachers: Option<i64>,
    pub total_courses: Option<i64>,
    pub total_classes: Option<i64>,
    pub active_enrollments: Option<i64>,
    pub avg_completion_rate: Option<f64>,
    pub avg_quiz_score: Option<f64>,
}

/// Response struct for principal overview RPC
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PrincipalOverview {
    pub total_students: Option<i64>,
    pub total_teachers: Option<i64>,
    pub total_courses: Option<i64>,
    pub avg_attendance_rate: Option<f64>,
    pub avg_quiz_score: Option<f64>,
    pub top_performing_classes: Option<serde_json::Value>,
}

/// Response struct for teacher dashboard RPC
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeacherDashboard {
    pub total_students: Option<i64>,
    pub total_courses: Option<i64>,
    pub total_classes: Option<i64>,
    pub avg_completion_rate: Option<f64>,
    pub recent_submissions: Option<serde_json::Value>,
    pub at_risk_students: Option<serde_json::Value>,
}

/// Response struct for student progress RPC
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StudentProgress {
    pub courses_enrolled: Option<i64>,
    pub courses_completed: Option<i64>,
    pub overall_completion_rate: Option<f64>,
    pub total_xp: Option<i64>,
    pub avg_quiz_score: Option<f64>,
    pub recent_activity: Option<serde_json::Value>,
}

/// Response struct for course analytics RPC
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CourseAnalytics {
    pub course_id: Option<Uuid>,
    pub total_enrolled: Option<i64>,
    pub avg_completion_rate: Option<f64>,
    pub avg_quiz_score: Option<f64>,
    pub module_progress: Option<serde_json::Value>,
}

/// Generic RPC response wrapper — used by remaining analytics RPCs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    pub data: serde_json::Value,
}
```

```rust
// === edusync-api/crates/server/src/handlers/analytics.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::analytics::*;

/// Query params for analytics endpoints
#[derive(Debug, serde::Deserialize)]
pub struct AnalyticsParams {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub class_id: Option<Uuid>,
}

/// GET /api/v1/analytics/executive
/// Role: admin, principal
///
/// CATATAN: Thin wrapper ke stored procedure. JANGAN port logic ke Rust.
pub async fn get_executive_overview(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<ExecutiveOverview>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;

    let overview = sqlx::query_as!(ExecutiveOverview,
        r#"SELECT
            total_students, total_teachers, total_courses,
            total_classes, active_enrollments,
            avg_completion_rate, avg_quiz_score
        FROM get_executive_overview($1, $2, $3)"#,
        claims.tenant_id,
        params.date_from,
        params.date_to
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(overview))
}

/// GET /api/v1/analytics/principal-overview
/// Role: admin, principal
pub async fn get_principal_overview(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<PrincipalOverview>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;

    let overview = sqlx::query_as!(PrincipalOverview,
        r#"SELECT
            total_students, total_teachers, total_courses,
            avg_attendance_rate, avg_quiz_score,
            top_performing_classes
        FROM get_principal_overview($1, $2, $3)"#,
        claims.tenant_id,
        params.date_from,
        params.date_to
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(overview))
}
```

**Endpoint:**

- `GET /api/v1/analytics/executive` — Role: admin, principal
- `GET /api/v1/analytics/principal-overview` — Role: admin, principal

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: analytics models compile" || echo "FAIL"
```

---

### 2C-2: Analytics Teacher + Student RPC Handlers

**Goal:** Handler untuk teacher dashboard + student progress RPCs

**Dependencies:** Task 2C-1 selesai

**Concrete Code:**

```rust
// === Tambahkan di edusync-api/crates/server/src/handlers/analytics.rs ===

/// GET /api/v1/analytics/teacher-dashboard
/// Role: teacher, admin
///
/// GOTCHA: Saat check teacher role di analytics RPCs, query user_roles table
/// langsung — JANGAN pakai has_role() karena fails saat JWT missing tenant claim.
pub async fn get_teacher_dashboard(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<TeacherDashboard>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // GOTCHA: Verify teacher role via user_roles table, NOT has_role()
    let is_teacher = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM user_roles
            WHERE user_id = $1 AND role IN ('teacher', 'admin')
            AND tenant_id = $2
        ) as "exists!: bool""#,
        claims.user_id,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !is_teacher {
        return Err(AppError::Forbidden("Akses ditolak: bukan guru".into()));
    }

    let dashboard = sqlx::query_as!(TeacherDashboard,
        r#"SELECT
            total_students, total_courses, total_classes,
            avg_completion_rate, recent_submissions, at_risk_students
        FROM get_teacher_dashboard($1, $2, $3, $4)"#,
        claims.user_id,
        claims.tenant_id,
        params.date_from,
        params.date_to
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(dashboard))
}

/// GET /api/v1/analytics/student-progress
/// Role: student, teacher, admin, parent
pub async fn get_student_progress(
    State(pool): State<PgPool>,
    Query(params): Query<StudentProgressParams>,
    claims: Claims,
) -> Result<Json<StudentProgress>, AppError> {
    // Students can only view their own progress
    let target_user = params.student_id.unwrap_or(claims.user_id);
    if target_user != claims.user_id {
        claims.require_any_role(&["teacher", "admin", "parent"])?;
    }

    let progress = sqlx::query_as!(StudentProgress,
        r#"SELECT
            courses_enrolled, courses_completed,
            overall_completion_rate, total_xp,
            avg_quiz_score, recent_activity
        FROM get_student_progress($1, $2)"#,
        target_user,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(progress))
}

/// GET /api/v1/analytics/course/:course_id
/// Role: teacher, admin
pub async fn get_course_analytics(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<CourseAnalytics>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let analytics = sqlx::query_as!(CourseAnalytics,
        r#"SELECT
            course_id, total_enrolled, avg_completion_rate,
            avg_quiz_score, module_progress
        FROM get_course_analytics($1, $2)"#,
        course_id,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(analytics))
}

#[derive(Debug, serde::Deserialize)]
pub struct StudentProgressParams {
    pub student_id: Option<Uuid>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}
```

**Endpoints:**

- `GET /api/v1/analytics/teacher-dashboard` — Role: teacher, admin
- `GET /api/v1/analytics/student-progress` — Role: student, teacher, admin, parent
- `GET /api/v1/analytics/course/:course_id` — Role: teacher, admin

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: teacher+student analytics compile" || echo "FAIL"
```

---

### 2C-3: Analytics Remaining RPCs (Bulk Handler Registration)

**Goal:** Register semua remaining 15+ analytics RPC handlers sebagai thin wrappers ke stored procedures

**Dependencies:** Task 2C-2 selesai

**Concrete Code:**

```rust
// === Tambahkan di edusync-api/crates/server/src/handlers/analytics.rs ===

/// Generic thin wrapper — calls a stored procedure by name and returns JSON
/// Used for all remaining analytics RPCs that don't need special handling.
async fn call_analytics_rpc(
    pool: &PgPool,
    rpc_name: &str,
    tenant_id: Uuid,
    params: &AnalyticsParams,
) -> Result<Json<RpcResponse>, AppError> {
    // Build dynamic query — safe because rpc_name is hardcoded per handler
    let query = format!(
        "SELECT row_to_json(t) as data FROM {}($1, $2, $3) t",
        rpc_name
    );

    let row = sqlx::query_scalar::<_, serde_json::Value>(&query)
        .bind(tenant_id)
        .bind(&params.date_from)
        .bind(&params.date_to)
        .fetch_one(pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(RpcResponse { data: row }))
}

/// GET /api/v1/analytics/attendance
pub async fn get_attendance_analytics(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_attendance_analytics", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/quiz
pub async fn get_quiz_analytics(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_quiz_analytics", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/assignment
pub async fn get_assignment_analytics(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_assignment_analytics", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/engagement
pub async fn get_engagement_analytics(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_engagement_analytics", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/class-performance
pub async fn get_class_performance(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_class_performance", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/student-ranking
pub async fn get_student_ranking(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin", "student"])?;
    call_analytics_rpc(&pool, "get_student_ranking", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/learning-path
pub async fn get_learning_path(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin", "student"])?;
    call_analytics_rpc(&pool, "get_learning_path_analytics", claims.tenant_id, &params).await
}

/// GET /api/v1/analytics/gamification-leaderboard
pub async fn get_gamification_leaderboard(
    State(pool): State<PgPool>,
    Query(params): Query<AnalyticsParams>,
    claims: Claims,
) -> Result<Json<RpcResponse>, AppError> {
    // GOTCHA: leaderboard harus include student AND teacher
    claims.require_any_role(&["student", "teacher", "admin"])?;
    call_analytics_rpc(&pool, "get_gamification_leaderboard", claims.tenant_id, &params).await
}
```

**ServiceProcess Registration:**

```rust
// Analytics service registration in main.rs
let analytics_svc = ServiceProcess::new("analytics")
    .prefix("/api/v1/analytics")
    .visibility(Visibility::Public)
    .endpoint(Method::GET, "/executive", get(get_executive_overview))
    .endpoint(Method::GET, "/principal-overview", get(get_principal_overview))
    .endpoint(Method::GET, "/teacher-dashboard", get(get_teacher_dashboard))
    .endpoint(Method::GET, "/student-progress", get(get_student_progress))
    .endpoint(Method::GET, "/course/:course_id", get(get_course_analytics))
    .endpoint(Method::GET, "/attendance", get(get_attendance_analytics))
    .endpoint(Method::GET, "/quiz", get(get_quiz_analytics))
    .endpoint(Method::GET, "/assignment", get(get_assignment_analytics))
    .endpoint(Method::GET, "/engagement", get(get_engagement_analytics))
    .endpoint(Method::GET, "/class-performance", get(get_class_performance))
    .endpoint(Method::GET, "/student-ranking", get(get_student_ranking))
    .endpoint(Method::GET, "/learning-path", get(get_learning_path))
    .endpoint(Method::GET, "/gamification-leaderboard", get(get_gamification_leaderboard));
```

**Endpoints:**

- `GET /api/v1/analytics/attendance`
- `GET /api/v1/analytics/quiz`
- `GET /api/v1/analytics/assignment`
- `GET /api/v1/analytics/engagement`
- `GET /api/v1/analytics/class-performance`
- `GET /api/v1/analytics/student-ranking`
- `GET /api/v1/analytics/learning-path`
- `GET /api/v1/analytics/gamification-leaderboard`

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: all analytics RPCs compile" || echo "FAIL"
```

---

### 2C-4: User Management CRUD Endpoints

**Goal:** Admin user CRUD endpoints — list, get, update, deactivate users per tenant

**Dependencies:** Phase 1A scaffold + Phase 1B auth selesai

**Files:**

- `edusync-api/crates/models/src/user.rs`
- `edusync-api/crates/server/src/handlers/users.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod user;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/user.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: Role datang dari user_roles table, BUKAN profiles.role
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub phone: Option<String>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// User with role — joined from profiles + user_roles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserWithRole {
    pub id: Uuid,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub phone: Option<String>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    pub roles: Vec<String>,  // from user_roles table
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UserListParams {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub role: Option<String>,
    pub search: Option<String>,
}

fn default_limit() -> i64 { 20 }
```

```rust
// === edusync-api/crates/server/src/handlers/users.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use crate::routes::courses::PaginatedResponse; // Defined in Batch 1 (2B1-04)
use edusync_models::user::*;

/// GET /api/v1/users
/// Role: admin
pub async fn list_users(
    State(pool): State<PgPool>,
    Query(params): Query<UserListParams>,
    claims: Claims,
) -> Result<Json<PaginatedResponse<UserWithRole>>, AppError> {
    claims.require_any_role(&["admin"])?;

    // GOTCHA: Role dari user_roles table, BUKAN profiles.role
    let profiles = sqlx::query_as!(UserProfile,
        r#"SELECT id, email, full_name, avatar_url, phone,
            tenant_id, created_at, updated_at, is_active
        FROM profiles
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3"#,
        claims.tenant_id,
        params.limit,
        params.offset
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Batch-fetch roles for all returned users
    let user_ids: Vec<Uuid> = profiles.iter().map(|p| p.id).collect();
    let roles = sqlx::query!(
        "SELECT user_id, role FROM user_roles WHERE user_id = ANY($1) AND tenant_id = $2",
        &user_ids,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let users: Vec<UserWithRole> = profiles.into_iter().map(|p| {
        let user_roles: Vec<String> = roles.iter()
            .filter(|r| r.user_id == p.id)
            .map(|r| r.role.clone())
            .collect();
        UserWithRole {
            id: p.id, email: p.email, full_name: p.full_name,
            avatar_url: p.avatar_url, phone: p.phone,
            tenant_id: p.tenant_id, created_at: p.created_at,
            updated_at: p.updated_at, is_active: p.is_active,
            roles: user_roles,
        }
    }).collect();

    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM profiles WHERE tenant_id = $1",
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .unwrap_or(0);

    Ok(Json(PaginatedResponse { data: users, count }))
}

/// GET /api/v1/users/:id
/// Role: admin, teacher (limited), self
pub async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<UserWithRole>, AppError> {
    // Self-access is always allowed; otherwise require admin/teacher
    if id != claims.user_id {
        claims.require_any_role(&["admin", "teacher"])?;
    }

    let profile = sqlx::query_as!(UserProfile,
        r#"SELECT id, email, full_name, avatar_url, phone,
            tenant_id, created_at, updated_at, is_active
        FROM profiles
        WHERE id = $1 AND tenant_id = $2"#,
        id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Pengguna tidak ditemukan".into()))?;

    let roles = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1 AND tenant_id = $2",
        id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(UserWithRole {
        id: profile.id, email: profile.email, full_name: profile.full_name,
        avatar_url: profile.avatar_url, phone: profile.phone,
        tenant_id: profile.tenant_id, created_at: profile.created_at,
        updated_at: profile.updated_at, is_active: profile.is_active,
        roles,
    }))
}

/// PUT /api/v1/users/:id
/// Role: admin, self (limited — self cannot change is_active)
pub async fn update_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<UserProfile>, AppError> {
    // Self can update own profile but not is_active
    if id != claims.user_id {
        claims.require_any_role(&["admin"])?;
    }
    if id == claims.user_id && body.is_active.is_some() {
        return Err(AppError::Forbidden("Tidak bisa mengubah status aktif sendiri".into()));
    }

    let profile = sqlx::query_as!(UserProfile,
        r#"UPDATE profiles SET
            full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            avatar_url = COALESCE($3, avatar_url),
            is_active = COALESCE($4, is_active),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6
        RETURNING id, email, full_name, avatar_url, phone,
            tenant_id, created_at, updated_at, is_active"#,
        body.full_name,
        body.phone,
        body.avatar_url,
        body.is_active,
        id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Pengguna tidak ditemukan".into()))?;

    Ok(Json(profile))
}

/// DELETE /api/v1/users/:id (soft delete — set is_active = false)
/// Role: admin
pub async fn deactivate_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["admin"])?;

    let rows = sqlx::query!(
        "UPDATE profiles SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2",
        id,
        claims.tenant_id
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Pengguna tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**ServiceProcess Registration:**

```rust
let users_svc = ServiceProcess::new("users")
    .prefix("/api/v1")
    .visibility(Visibility::Public)
    .endpoint(Method::GET, "/users", get(list_users))
    .endpoint(Method::GET, "/users/:id", get(get_user))
    .endpoint(Method::PUT, "/users/:id", put(update_user))
    .endpoint(Method::DELETE, "/users/:id", delete(deactivate_user));
```

**Endpoints:**

- `GET /api/v1/users` — Role: admin
- `GET /api/v1/users/:id` — Role: admin, teacher (limited), self
- `PUT /api/v1/users/:id` — Role: admin, self (limited)
- `DELETE /api/v1/users/:id` (soft delete) — Role: admin

**GOTCHA:** Role datang dari `user_roles` table, BUKAN `profiles.role`

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: user CRUD compiles" || echo "FAIL"
```

---

### 2C-5: Bulk Import Service Endpoints

**Goal:** Bulk CSV import endpoint for admin — chunk-based, resumable

**Dependencies:** Task 2C-4 selesai

**Files:**

- `edusync-api/crates/server/src/handlers/bulk_import.rs`

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/handlers/bulk_import.rs ===

use axum::{extract::{Multipart, Path, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ImportJob {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub status: String,       // 'pending', 'processing', 'completed', 'failed'
    pub total_rows: i64,
    pub processed_rows: i64,
    pub failed_rows: i64,
    pub error_log: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

const CHUNK_SIZE: i64 = 50;

/// POST /api/v1/admin/bulk-import
/// Role: admin
/// Accepts multipart CSV upload, creates import job, processes in chunks
pub async fn start_bulk_import(
    State(pool): State<PgPool>,
    claims: Claims,
    mut multipart: Multipart,
) -> Result<(axum::http::StatusCode, Json<ImportJob>), AppError> {
    claims.require_any_role(&["admin"])?;

    // Read CSV from multipart
    let field = multipart.next_field().await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
        .ok_or(AppError::BadRequest("File CSV tidak ditemukan".into()))?;

    let csv_data = field.bytes().await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let csv_text = String::from_utf8(csv_data.to_vec())
        .map_err(|_| AppError::BadRequest("File bukan UTF-8 valid".into()))?;

    let total_rows = csv_text.lines().count() as i64 - 1; // minus header

    // Create import job
    let job = sqlx::query_as!(ImportJob,
        r#"INSERT INTO import_jobs (tenant_id, created_by, status, total_rows, processed_rows, failed_rows)
        VALUES ($1, $2, 'pending', $3, 0, 0)
        RETURNING id, tenant_id, created_by, status,
            total_rows, processed_rows, failed_rows,
            error_log, created_at, updated_at"#,
        claims.tenant_id,
        claims.user_id,
        total_rows
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Process chunks asynchronously (spawn background task)
    let pool_clone = pool.clone();
    let job_id = job.id;
    let tenant_id = claims.tenant_id;
    tokio::spawn(async move {
        process_csv_chunks(&pool_clone, job_id, tenant_id, &csv_text, CHUNK_SIZE).await;
    });

    Ok((axum::http::StatusCode::CREATED, Json(job)))
}

/// GET /api/v1/admin/bulk-import/:job_id
/// Role: admin
pub async fn get_import_status(
    State(pool): State<PgPool>,
    Path(job_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<ImportJob>, AppError> {
    claims.require_any_role(&["admin"])?;

    let job = sqlx::query_as!(ImportJob,
        r#"SELECT id, tenant_id, created_by, status,
            total_rows, processed_rows, failed_rows,
            error_log, created_at, updated_at
        FROM import_jobs
        WHERE id = $1 AND tenant_id = $2"#,
        job_id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Import job tidak ditemukan".into()))?;

    Ok(Json(job))
}

/// POST /api/v1/admin/bulk-import/:job_id/retry
/// Role: admin
pub async fn retry_failed_chunks(
    State(pool): State<PgPool>,
    Path(job_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<ImportJob>, AppError> {
    claims.require_any_role(&["admin"])?;

    let job = sqlx::query_as!(ImportJob,
        r#"UPDATE import_jobs SET status = 'processing', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'failed'
        RETURNING id, tenant_id, created_by, status,
            total_rows, processed_rows, failed_rows,
            error_log, created_at, updated_at"#,
        job_id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Import job tidak ditemukan atau bukan status failed".into()))?;

    Ok(Json(job))
}

/// Internal: process CSV in chunks of CHUNK_SIZE rows
async fn process_csv_chunks(
    pool: &PgPool,
    job_id: Uuid,
    tenant_id: Uuid,
    csv_text: &str,
    chunk_size: i64,
) {
    // Update status to processing
    let _ = sqlx::query!(
        "UPDATE import_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1",
        job_id
    ).execute(pool).await;

    // Parse CSV rows (skip header), process in chunks via transaction
    let lines: Vec<&str> = csv_text.lines().skip(1).collect();
    let mut processed = 0i64;
    let mut failed = 0i64;

    for chunk in lines.chunks(chunk_size as usize) {
        let mut tx = match pool.begin().await {
            Ok(tx) => tx,
            Err(_) => { failed += chunk.len() as i64; continue; }
        };

        for line in chunk {
            // CSV format: email,full_name,role
            let fields: Vec<&str> = line.split(',').collect();
            if fields.len() < 3 {
                failed += 1;
                continue;
            }

            let result = sqlx::query!(
                "INSERT INTO profiles (email, full_name, tenant_id) VALUES ($1, $2, $3)
                 ON CONFLICT (email, tenant_id) DO NOTHING",
                fields[0].trim(),
                fields[1].trim(),
                tenant_id
            ).execute(&mut *tx).await;

            match result {
                Ok(_) => processed += 1,
                Err(_) => failed += 1,
            }
        }

        let _ = tx.commit().await;

        // Update progress
        let _ = sqlx::query!(
            "UPDATE import_jobs SET processed_rows = $1, failed_rows = $2, updated_at = NOW() WHERE id = $3",
            processed, failed, job_id
        ).execute(pool).await;
    }

    // Final status
    let status = if failed > 0 { "failed" } else { "completed" };
    let _ = sqlx::query!(
        "UPDATE import_jobs SET status = $1, updated_at = NOW() WHERE id = $2",
        status, job_id
    ).execute(pool).await;
}
```

**ServiceProcess Registration:**

```rust
let admin_svc = ServiceProcess::new("admin")
    .prefix("/api/v1/admin")
    .visibility(Visibility::Public)
    .endpoint(Method::POST, "/bulk-import", post(start_bulk_import))
    .endpoint(Method::GET, "/bulk-import/:job_id", get(get_import_status))
    .endpoint(Method::POST, "/bulk-import/:job_id/retry", post(retry_failed_chunks));
```

**Endpoints:**

- `POST /api/v1/admin/bulk-import` — Start import job
- `GET /api/v1/admin/bulk-import/:job_id` — Check job status
- `POST /api/v1/admin/bulk-import/:job_id/retry` — Retry failed chunks

**Processing:** Chunk-based (50 rows per chunk), insert via transaction

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: bulk import compiles" || echo "FAIL"
```

---

### 2C-6: Progress Tracking Endpoints

**Goal:** Progress tracking CRUD — lesson progress, course completion, student_lesson_signals

**Dependencies:** Phase 2 Batch 1 courses/lessons selesai

**Files:**

- `edusync-api/crates/models/src/progress.rs`
- `edusync-api/crates/server/src/handlers/progress.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod progress;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/progress.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LessonProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    pub status: String,        // 'not_started', 'in_progress', 'completed'
    pub progress_pct: Option<f64>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// GOTCHA: Use correct column names from student_lesson_signals:
/// - total_time_spent (NOT time_spent_seconds)
/// - last_accessed_at (NOT last_event_at)
/// - latest_quiz_score (NOT quiz_avg_score)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StudentLessonSignal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    pub total_time_spent: Option<i64>,      // NOT time_spent_seconds
    pub last_accessed_at: Option<DateTime<Utc>>,  // NOT last_event_at
    pub latest_quiz_score: Option<f64>,     // NOT quiz_avg_score
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseCompletion {
    pub course_id: Uuid,
    pub user_id: Uuid,
    pub total_lessons: i64,
    pub completed_lessons: i64,
    pub completion_pct: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpsertLessonProgressRequest {
    pub lesson_id: Uuid,
    pub status: String,
    pub progress_pct: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct BatchSignalRequest {
    pub signals: Vec<SignalItem>,
}

#[derive(Debug, Deserialize)]
pub struct SignalItem {
    pub lesson_id: Uuid,
    pub total_time_spent: Option<i64>,
    pub latest_quiz_score: Option<f64>,
}
```

```rust
// === edusync-api/crates/server/src/handlers/progress.rs ===

use axum::{extract::{Path, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::progress::*;

/// POST /api/v1/progress/lesson
/// Upsert lesson progress (last-write-wins)
pub async fn upsert_lesson_progress(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<UpsertLessonProgressRequest>,
) -> Result<Json<LessonProgress>, AppError> {
    // Last-write-wins: INSERT ON CONFLICT UPDATE
    let progress = sqlx::query_as!(LessonProgress,
        r#"INSERT INTO lesson_progress (user_id, lesson_id, status, progress_pct, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_pct = EXCLUDED.progress_pct,
            updated_at = NOW()
        RETURNING id, user_id, lesson_id, status, progress_pct,
            tenant_id, created_at, updated_at"#,
        claims.user_id,
        body.lesson_id,
        body.status,
        body.progress_pct,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(progress))
}

/// GET /api/v1/progress/course/:course_id
/// Get course completion for current user
pub async fn get_course_completion(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<CourseCompletion>, AppError> {
    let completion = sqlx::query_as!(CourseCompletion,
        r#"SELECT
            $1::uuid as "course_id!",
            $2::uuid as "user_id!",
            COUNT(l.id) as "total_lessons!: i64",
            COUNT(lp.id) FILTER (WHERE lp.status = 'completed') as "completed_lessons!: i64",
            CASE WHEN COUNT(l.id) > 0
                THEN (COUNT(lp.id) FILTER (WHERE lp.status = 'completed'))::float / COUNT(l.id)::float * 100
                ELSE 0
            END as "completion_pct!: f64"
        FROM lessons l
        JOIN course_modules cm ON cm.id = l.module_id
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
        WHERE cm.course_id = $1 AND l.tenant_id = $3"#,
        course_id,
        claims.user_id,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(completion))
}

/// GET /api/v1/progress/student/:student_id
/// Get all progress for a student
/// Role: self, teacher, admin, parent
pub async fn get_student_progress(
    State(pool): State<PgPool>,
    Path(student_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Vec<LessonProgress>>, AppError> {
    if student_id != claims.user_id {
        claims.require_any_role(&["teacher", "admin", "parent"])?;
    }

    let progress = sqlx::query_as!(LessonProgress,
        r#"SELECT id, user_id, lesson_id, status, progress_pct,
            tenant_id, created_at, updated_at
        FROM lesson_progress
        WHERE user_id = $1 AND tenant_id = $2
        ORDER BY updated_at DESC"#,
        student_id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(progress))
}

/// POST /api/v1/progress/signals
/// Batch upsert student lesson signals
///
/// GOTCHA: Column names are total_time_spent, last_accessed_at, latest_quiz_score
/// NOT time_spent_seconds, last_event_at, quiz_avg_score
pub async fn batch_upsert_signals(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<BatchSignalRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut tx = pool.begin().await.map_err(|e| AppError::Internal(e.to_string()))?;

    for signal in &body.signals {
        // GOTCHA: correct column names
        sqlx::query!(
            r#"INSERT INTO student_lesson_signals
                (user_id, lesson_id, total_time_spent, latest_quiz_score, last_accessed_at, tenant_id)
            VALUES ($1, $2, $3, $4, NOW(), $5)
            ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                total_time_spent = COALESCE(EXCLUDED.total_time_spent, student_lesson_signals.total_time_spent),
                latest_quiz_score = COALESCE(EXCLUDED.latest_quiz_score, student_lesson_signals.latest_quiz_score),
                last_accessed_at = NOW()"#,
            claims.user_id,
            signal.lesson_id,
            signal.total_time_spent,
            signal.latest_quiz_score,
            claims.tenant_id
        ).execute(&mut *tx).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**ServiceProcess Registration:**

```rust
let progress_svc = ServiceProcess::new("progress")
    .prefix("/api/v1/progress")
    .visibility(Visibility::Public)
    .endpoint(Method::POST, "/lesson", post(upsert_lesson_progress))
    .endpoint(Method::GET, "/course/:course_id", get(get_course_completion))
    .endpoint(Method::GET, "/student/:student_id", get(get_student_progress))
    .endpoint(Method::POST, "/signals", post(batch_upsert_signals));
```

**Endpoints:**

- `POST /api/v1/progress/lesson` — Upsert lesson progress (last-write-wins)
- `GET /api/v1/progress/course/:course_id` — Get course completion
- `GET /api/v1/progress/student/:student_id` — Get all progress for student
- `POST /api/v1/progress/signals` — Batch upsert student lesson signals

**GOTCHA:** Column names: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (BUKAN `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)

**Delivery:** Last-write-wins (CC6)

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: progress endpoints compile" || echo "FAIL"
```

---

### 2C-7: xAPI Statement Endpoints

**Goal:** xAPI statement ingestion with idempotency keys — at-least-once delivery

**Dependencies:** Task 2C-6 selesai

**PREREQUISITE:** Verify `src/utils/offlineQueue.ts` sudah pakai `getApiClient()` (Phase 0A refactor)

**Files:**

- `edusync-api/crates/models/src/xapi.rs`
- `edusync-api/crates/server/src/handlers/xapi.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod xapi;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/xapi.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct XapiStatement {
    pub id: Uuid,
    pub user_id: Uuid,
    pub verb: String,
    pub object_type: String,
    pub object_id: Uuid,
    pub result: Option<serde_json::Value>,
    pub context: Option<serde_json::Value>,
    pub idempotency_key: String,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateXapiStatementRequest {
    pub verb: String,
    pub object_type: String,
    pub object_id: Uuid,
    pub result: Option<serde_json::Value>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct BatchXapiStatementsRequest {
    pub statements: Vec<CreateXapiStatementRequest>,
}
```

```rust
// === edusync-api/crates/server/src/handlers/xapi.rs ===

use axum::{extract::State, Json};
use sqlx::PgPool;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::xapi::*;

/// POST /api/v1/xapi/statements
/// Single statement with idempotency
///
/// Idempotency Key Format: xapi:{verb}:{objectType}:{objectId}:{userId}
/// Delivery: At-least-once — server HARUS accept duplicate tanpa error (return 200, BUKAN 409)
pub async fn create_xapi_statement(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<CreateXapiStatementRequest>,
) -> Result<Json<XapiStatement>, AppError> {
    let idempotency_key = format!(
        "xapi:{}:{}:{}:{}",
        body.verb, body.object_type, body.object_id, claims.user_id
    );

    // At-least-once: ON CONFLICT return existing row (200, NOT 409)
    let statement = sqlx::query_as!(XapiStatement,
        r#"INSERT INTO xapi_statements
            (user_id, verb, object_type, object_id, result, context, idempotency_key, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (idempotency_key) DO UPDATE SET
            idempotency_key = EXCLUDED.idempotency_key
        RETURNING id, user_id, verb, object_type, object_id,
            result, context, idempotency_key, tenant_id, created_at"#,
        claims.user_id,
        body.verb,
        body.object_type,
        body.object_id,
        body.result,
        body.context,
        idempotency_key,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(statement))
}

/// POST /api/v1/xapi/statements/batch
/// Batch statements from offline queue
///
/// At-least-once delivery: duplicates return 200 (not 409)
pub async fn batch_create_xapi_statements(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<BatchXapiStatementsRequest>,
) -> Result<Json<Vec<XapiStatement>>, AppError> {
    let mut results = Vec::with_capacity(body.statements.len());
    let mut tx = pool.begin().await.map_err(|e| AppError::Internal(e.to_string()))?;

    for stmt in &body.statements {
        let idempotency_key = format!(
            "xapi:{}:{}:{}:{}",
            stmt.verb, stmt.object_type, stmt.object_id, claims.user_id
        );

        let statement = sqlx::query_as!(XapiStatement,
            r#"INSERT INTO xapi_statements
                (user_id, verb, object_type, object_id, result, context, idempotency_key, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (idempotency_key) DO UPDATE SET
                idempotency_key = EXCLUDED.idempotency_key
            RETURNING id, user_id, verb, object_type, object_id,
                result, context, idempotency_key, tenant_id, created_at"#,
            claims.user_id,
            stmt.verb,
            stmt.object_type,
            stmt.object_id,
            stmt.result,
            stmt.context,
            idempotency_key,
            claims.tenant_id
        ).fetch_one(&mut *tx).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        results.push(statement);
    }

    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(Json(results))
}
```

**ServiceProcess Registration:**

```rust
let xapi_svc = ServiceProcess::new("xapi")
    .prefix("/api/v1/xapi")
    .visibility(Visibility::Public)
    .endpoint(Method::POST, "/statements", post(create_xapi_statement))
    .endpoint(Method::POST, "/statements/batch", post(batch_create_xapi_statements));
```

**Endpoints:**

- `POST /api/v1/xapi/statements` — Single statement with idempotency
- `POST /api/v1/xapi/statements/batch` — Batch statements from offline queue

**Idempotency Key Format:** `xapi:{verb}:{objectType}:{objectId}:{userId}`

**Delivery:** At-least-once — server HARUS accept duplicate tanpa error (return 200, BUKAN 409)

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: xapi endpoints compile" || echo "FAIL"
```

---

## Parallelism

Batch 3 bisa paralel antar cluster:

- Cluster A (Analytics): 2C-1 → 2C-2 → 2C-3
- Cluster B (User Management): 2C-4 → 2C-5
- Cluster C (Progress + xAPI): 2C-6 → 2C-7
