# Task Queue — Phase 2 Batch 1

**Modul:** Courses, Classes, Lessons, Course Builder  
**Durasi:** Minggu 23–28 | **Effort:** ~80–100 jam

---

## Task IDs

| ID      | Modul       | Deskripsi                       |
| ------- | ----------- | ------------------------------- |
| 2B1-00  | Foundation  | Schema Introspection            |
| 2B1-00b | DevOps      | Nginx Route Update              |
| 2B1-01  | Foundation  | Rust Model Structs              |
| 2B1-02  | Foundation  | vil_resource! Macro             |
| 2B1-03  | Foundation  | TenantGuard + RbacGuard         |
| 2B1-04  | Courses     | Course CRUD Endpoints           |
| 2B1-05  | Courses     | Course RLS Guards               |
| 2B1-06  | Courses     | Template Endpoints              |
| 2B1-07  | Courses     | Version Endpoints               |
| 2B1-08  | Courses     | Course Integration Tests        |
| 2B1-09  | Courses     | Frontend courseService → VIL    |
| 2B1-10  | Lessons     | Lesson + Module CRUD            |
| 2B1-11  | Lessons     | Lesson Block Content            |
| 2B1-12  | Lessons     | Lesson RLS Guards               |
| 2B1-13  | Lessons     | Lesson Integration Tests        |
| 2B1-14  | Lessons     | Frontend lessonService → VIL    |
| 2B1-15  | Classroom   | Classroom CRUD                  |
| 2B1-16  | Classroom   | Enrollment Endpoints            |
| 2B1-17  | Classroom   | Classroom RLS Guards            |
| 2B1-18  | Classroom   | Classroom Integration Tests     |
| 2B1-19  | Classroom   | Frontend classroomService → VIL |
| 2B1-20  | Builder     | Builder API Endpoints           |
| 2B1-21  | Builder     | Builder Integration Tests       |
| 2B1-22  | Builder     | Frontend courseBuilderApi → VIL |
| 2B1-23  | Integration | Shadow Mode Infra               |
| 2B1-24  | Integration | Shadow Mode Verification        |
| 2B1-25  | Integration | E2E Tests VIL                   |
| 2B1-26  | Integration | Per-Flow Cutover Flags          |

---

## Dependency Graph

```
2B1-01 (Model Structs)
    ├──→ 2B1-02 (vil_resource! Macro)
    └──→ 2B1-03 (TenantGuard + RbacGuard)

2B1-02 + 2B1-03
    ├──→ 2B1-04 (Course CRUD Endpoints)
    ├──→ 2B1-10 (Lesson + Module CRUD)
    ├──→ 2B1-15 (Classroom CRUD)
    └──→ 2B1-20 (Builder API Endpoints)

2B1-04 → 2B1-05 (Course RLS Guards)
    ├──→ 2B1-06 (Template Endpoints)
    ├──→ 2B1-07 (Version Endpoints)
    └──→ 2B1-08 (Course Integration Tests)

2B1-05 → 2B1-09 (Frontend courseService → VIL)

2B1-10 → 2B1-11 (Lesson Block Content)
    └──→ 2B1-12 (Lesson RLS Guards)
        └──→ 2B1-13 (Lesson Integration Tests)
            └──→ 2B1-14 (Frontend lessonService → VIL)

2B1-15 → 2B1-16 (Enrollment Endpoints)
    └──→ 2B1-17 (Classroom RLS Guards)
        └──→ 2B1-18 (Classroom Integration Tests)
            └──→ 2B1-19 (Frontend classroomService → VIL)

2B1-20 → 2B1-21 (Builder Integration Tests)
    └──→ 2B1-22 (Frontend courseBuilderApi → VIL)

(2B1-09 + 2B1-14 + 2B1-19 + 2B1-22)
    └──→ 2B1-23 (Shadow Mode Infra)
        └──→ 2B1-24 (Shadow Mode Verification)
            └──→ 2B1-25 (E2E Tests VIL)
                └──→ 2B1-26 (Per-Flow Cutover Flags)
```

---

## SQL Gotchas (Batch 1 Specific)

> WAJIB dibaca sebelum menulis query SQL apapun di Batch 1.

| Gotcha | Detail |
|--------|--------|
| `course_modules."order"` | `order` adalah SQL reserved word — WAJIB quoted: `"order"` |
| `lessons."order"` | Sama — WAJIB quoted: `"order"` |
| `courses.status` | Gunakan `status = 'published'`, BUKAN `is_published` (kolom tidak ada) |
| `courses.status` enum | Includes `'draft'`, `'published'`, `'archived'`, `'in_review'`, `'approved'` |
| `enrollments.user_id` | BUKAN `student_id` — kolom `student_id` tidak ada |
| `SELECT *` | DILARANG — selalu specify columns explicitly |
| `course_collaborators` trigger | Gunakan `auto_set_tenant_id()`, BUKAN `set_tenant_id_from_user()` |

---

## Task Detail

### 2B1-00: Schema Introspection

**Goal:** Document exact column names dan types dari actual database sebelum membuat model structs

**Dependencies:** None (prerequisite)

**Implementation:**

```sql
-- Run semua query ini dan document output di schema-batch1.md

-- 1. courses table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'courses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. classes table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'classes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. course_modules table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'course_modules' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. lessons table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lessons' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. enrollments table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'enrollments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('courses', 'classes', 'course_modules', 'lessons', 'enrollments')
ORDER BY tablename, policyname;

-- 7. Foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('courses', 'classes', 'course_modules', 'lessons', 'enrollments')
ORDER BY tc.table_name;
```

**Verification:**

```bash
# File harus ada dan non-empty setelah introspection
test -s edusync-api/docs/schema-batch1.md && echo "PASS: schema doc exists" || echo "FAIL: schema doc missing"
```

---

### 2B1-00b: Nginx Route Update

**Goal:** Tambahkan Batch 1 route ke nginx config agar traffic ke `/api/v1/courses`, `/api/v1/classes`, `/api/v1/modules`, `/api/v1/lessons` di-proxy ke VIL server

**Dependencies:** None (can run parallel with 2B1-00)

**File:** `nginx/default.conf`

**Implementation:**

```nginx
# Batch 1 routes — proxy ke VIL server
location /api/v1/courses {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/classes {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/modules {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/lessons {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
```

**Verification:**

```bash
nginx -t && echo "PASS: nginx config valid" || echo "FAIL: nginx config invalid"
```

---

### 2B1-01: Rust Model Structs

**Goal:** Buat semua model struct untuk Batch 1 resources

**Dependencies:** Phase 1A scaffold selesai

**Files to create:**

- `edusync-api/crates/models/src/course.rs`
- `edusync-api/crates/models/src/class.rs`
- `edusync-api/crates/models/src/lesson.rs`
- `edusync-api/crates/models/src/course_module.rs`
- `edusync-api/crates/models/src/enrollment.rs`
- `edusync-api/crates/models/src/course_collaborator.rs`
- `edusync-api/crates/models/src/lib.rs` (add mod declarations)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/course.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: courses.status is an enum — NOT a boolean is_published
/// Valid values: 'draft', 'published', 'archived', 'in_review', 'approved'
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "text", rename_all = "snake_case")]
pub enum CourseStatus {
    Draft,
    Published,
    Archived,
    InReview,
    Approved,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: CourseStatus,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub thumbnail_url: Option<String>,
    pub category: Option<String>,
    pub grade_level: Option<String>,
    pub subject: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCourseRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub grade_level: Option<String>,
    pub subject: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<CourseStatus>,
    pub category: Option<String>,
    pub grade_level: Option<String>,
    pub subject: Option<String>,
}
```

```rust
// === edusync-api/crates/models/src/course_module.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: course_modules."order" — `order` is a SQL reserved word, WAJIB quoted
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CourseModule {
    pub id: Uuid,
    pub course_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModuleRequest {
    pub title: String,
    pub description: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub order: Option<i32>,
}
```

```rust
// === edusync-api/crates/models/src/lesson.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: lessons."order" — `order` is a SQL reserved word, WAJIB quoted
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Lesson {
    pub id: Uuid,
    pub module_id: Uuid,
    pub title: String,
    pub content: Option<serde_json::Value>,  // Block-based JSON content
    #[sqlx(rename = "order")]
    pub order: i32,
    pub lesson_type: Option<String>,
    pub duration_minutes: Option<i32>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLessonRequest {
    pub title: String,
    pub content: Option<serde_json::Value>,
    pub order: Option<i32>,
    pub lesson_type: Option<String>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLessonRequest {
    pub title: Option<String>,
    pub content: Option<serde_json::Value>,
    pub order: Option<i32>,
    pub lesson_type: Option<String>,
    pub duration_minutes: Option<i32>,
}
```

```rust
// === edusync-api/crates/models/src/class.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Class {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub course_id: Uuid,
    pub teacher_id: Uuid,
    pub academic_year: Option<String>,
    pub semester: Option<String>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClassRequest {
    pub name: String,
    pub description: Option<String>,
    pub course_id: Uuid,
    pub academic_year: Option<String>,
    pub semester: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClassRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub academic_year: Option<String>,
    pub semester: Option<String>,
}
```

```rust
// === edusync-api/crates/models/src/enrollment.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: enrollments.user_id — BUKAN student_id (kolom student_id tidak ada)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Enrollment {
    pub id: Uuid,
    pub class_id: Uuid,
    pub user_id: Uuid,       // BUKAN student_id
    pub enrolled_at: DateTime<Utc>,
    pub status: String,
    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateEnrollmentRequest {
    pub class_id: Uuid,
    pub user_id: Uuid,       // BUKAN student_id
}
```

```rust
// === edusync-api/crates/models/src/course_collaborator.rs ===

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA: course_collaborators uses auto_set_tenant_id() trigger, NOT set_tenant_id_from_user()
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CourseCollaborator {
    pub id: Uuid,
    pub course_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}
```

```rust
// === edusync-api/crates/models/src/lib.rs ===

pub mod course;
pub mod course_module;
pub mod lesson;
pub mod class;
pub mod enrollment;
pub mod course_collaborator;

// Re-exports
pub use course::*;
pub use course_module::*;
pub use lesson::*;
pub use class::*;
pub use enrollment::*;
pub use course_collaborator::*;
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5
echo "---"
# Verify all model files exist
for f in course.rs course_module.rs lesson.rs class.rs enrollment.rs course_collaborator.rs lib.rs; do
  test -f crates/models/src/$f && echo "PASS: $f" || echo "FAIL: $f missing"
done
```

---

### 2B1-02: vil_resource! Macro

**Goal:** Implement `vil_resource!` macro yang auto-generate 5 CRUD endpoints per resource

**Dependencies:** 2B1-01

**Files to create:**

- `edusync-api/crates/macros/src/lib.rs`
- `edusync-api/crates/macros/Cargo.toml`
- `edusync-api/Cargo.toml` (add workspace member)

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: macro compiles" || echo "FAIL"
```

---

### 2B1-03: TenantGuard + RbacGuard Middleware

**Goal:** Implement Axum extractors `TenantId` dan `Claims` yang dipakai semua CRUD handlers

**Dependencies:** Phase 1 auth selesai

**Files to create:**

- `edusync-api/crates/middleware/src/tenant_guard.rs`
- `edusync-api/crates/middleware/src/rbac_guard.rs`
- `edusync-api/crates/middleware/src/mod.rs`
- `edusync-api/crates/server/src/error.rs` (AppError type)

**Concrete Code (Claims extractor):**

```rust
// === edusync-api/crates/middleware/src/rbac_guard.rs ===

use axum::{extract::FromRequestParts, http::request::Parts};
use uuid::Uuid;

/// JWT claims extracted from Authorization header.
/// Role comes from user_roles table, NOT profiles.role.
#[derive(Debug, Clone)]
pub struct Claims {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub email: String,
    pub roles: Vec<String>,  // from user_roles table
}

impl Claims {
    /// Check if user has any of the specified roles.
    pub fn require_any_role(&self, allowed: &[&str]) -> Result<(), AppError> {
        if self.roles.iter().any(|r| allowed.contains(&r.as_str())) {
            Ok(())
        } else {
            Err(AppError::Forbidden("Akses ditolak: role tidak diizinkan".into()))
        }
    }
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract JWT from Authorization: Bearer <token>
        let auth_header = parts.headers.get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized("Token tidak ditemukan".into()))?;

        let token = auth_header.strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized("Format token tidak valid".into()))?;

        // Decode and validate JWT — implementation depends on jwt crate choice
        // Returns Claims with user_id, tenant_id, email, roles
        decode_jwt(token).map_err(|_| AppError::Unauthorized("Token tidak valid".into()))
    }
}
```

```rust
// === edusync-api/crates/server/src/error.rs ===

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

/// PostgREST-compatible error format
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "PGRST000", msg),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "PGRST301", msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "PGRST302", msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "PGRST116", msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "PGRST500", msg),
        };
        (status, Json(json!({
            "code": code,
            "message": message,
            "details": null,
            "hint": null
        }))).into_response()
    }
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: middleware compiles" || echo "FAIL"
```

---

### 2B1-04: Course CRUD Endpoints

**Goal:** Implement 5 CRUD endpoints untuk courses resource di VIL

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Files to create:**

- `edusync-api/crates/server/src/routes/courses.rs`
- `edusync-api/crates/server/src/routes/mod.rs`
- `edusync-api/crates/server/src/main.rs` (register ServiceProcess)

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/routes/courses.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::{Course, CourseStatus, CreateCourseRequest, UpdateCourseRequest};

#[derive(Debug, serde::Deserialize)]
pub struct PaginationParams {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub status: Option<String>,
}

fn default_limit() -> i64 { 20 }

#[derive(Debug, serde::Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub count: i64,
}

/// GET /api/v1/courses
/// Role: teacher, admin, student (students see published only)
pub async fn list_courses(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
    claims: Claims,
) -> Result<Json<PaginatedResponse<Course>>, AppError> {
    // GOTCHA: courses.status uses enum string, NOT boolean is_published
    let courses = sqlx::query_as!(Course,
        r#"SELECT id, title, description, status as "status: CourseStatus",
            tenant_id, created_by, created_at, updated_at,
            thumbnail_url, category, grade_level, subject
        FROM courses
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3"#,
        claims.tenant_id,
        params.limit,
        params.offset
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM courses WHERE tenant_id = $1",
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .unwrap_or(0);

    Ok(Json(PaginatedResponse { data: courses, count }))
}

/// GET /api/v1/courses/:id
pub async fn get_course(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Course>, AppError> {
    let course = sqlx::query_as!(Course,
        r#"SELECT id, title, description, status as "status: CourseStatus",
            tenant_id, created_by, created_at, updated_at,
            thumbnail_url, category, grade_level, subject
        FROM courses
        WHERE id = $1 AND tenant_id = $2"#,
        id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Kursus tidak ditemukan".into()))?;

    Ok(Json(course))
}

/// POST /api/v1/courses
/// Role: teacher, admin
pub async fn create_course(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<CreateCourseRequest>,
) -> Result<(axum::http::StatusCode, Json<Course>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let course = sqlx::query_as!(Course,
        r#"INSERT INTO courses (title, description, category, grade_level, subject,
            status, tenant_id, created_by)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
        RETURNING id, title, description, status as "status: CourseStatus",
            tenant_id, created_by, created_at, updated_at,
            thumbnail_url, category, grade_level, subject"#,
        body.title,
        body.description,
        body.category,
        body.grade_level,
        body.subject,
        claims.tenant_id,
        claims.user_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(course)))
}

/// PUT /api/v1/courses/:id
/// Role: teacher (owner), admin
pub async fn update_course(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<UpdateCourseRequest>,
) -> Result<Json<Course>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Ownership check: created_by = user_id OR admin
    let course = sqlx::query_as!(Course,
        r#"UPDATE courses SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            category = COALESCE($4, category),
            grade_level = COALESCE($5, grade_level),
            subject = COALESCE($6, subject),
            updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
            AND (created_by = $9 OR $10 = true)
        RETURNING id, title, description, status as "status: CourseStatus",
            tenant_id, created_by, created_at, updated_at,
            thumbnail_url, category, grade_level, subject"#,
        body.title,
        body.description,
        body.status.as_ref().map(|s| s.to_string()),
        body.category,
        body.grade_level,
        body.subject,
        id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Kursus tidak ditemukan atau tidak diizinkan".into()))?;

    Ok(Json(course))
}

/// DELETE /api/v1/courses/:id (soft delete — set status to 'archived')
/// Role: teacher (owner), admin
pub async fn delete_course(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query!(
        "UPDATE courses SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
           AND (created_by = $3 OR $4 = true)",
        id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Kursus tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**ServiceProcess Registration (main.rs):**

```rust
// In main.rs — register courses service
let courses_svc = ServiceProcess::new("courses")
    .prefix("/api/v1")
    .visibility(Visibility::Public)
    .endpoint(Method::GET, "/courses", get(list_courses))
    .endpoint(Method::GET, "/courses/:id", get(get_course))
    .endpoint(Method::POST, "/courses", post(create_course))
    .endpoint(Method::PUT, "/courses/:id", put(update_course))
    .endpoint(Method::DELETE, "/courses/:id", delete(delete_course));
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: course endpoints compile" || echo "FAIL"
cargo test --lib courses 2>&1 | tail -10
```

---

### 2B1-05: Course RLS Guards

**Goal:** Port semua RLS policies untuk `courses` table ke Rust guard functions

**Dependencies:** 2B1-04

**Files to create:**

- `edusync-api/crates/middleware/src/guards/course_guard.rs`
- `edusync-api/crates/middleware/src/guards/mod.rs`
- Update `routes/courses.rs` to use guards

**Concrete Code:**

```rust
// === edusync-api/crates/middleware/src/guards/course_guard.rs ===

use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;

/// Verify caller can read this course.
/// Students can only read published courses.
/// Teachers can read their own + published.
/// Admin can read all within tenant.
pub async fn can_read_course(
    pool: &PgPool,
    claims: &Claims,
    course_id: Uuid,
) -> Result<(), AppError> {
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM courses
            WHERE id = $1 AND tenant_id = $2
            AND (
                status = 'published'
                OR created_by = $3
                OR $4 = true
            )
        ) as "exists!: bool""#,
        course_id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.iter().any(|r| r == "admin" || r == "teacher")
    ).fetch_one(pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !exists {
        return Err(AppError::NotFound("Kursus tidak ditemukan".into()));
    }
    Ok(())
}

/// Verify caller can write (update/delete) this course.
/// Only owner or admin.
pub async fn can_write_course(
    pool: &PgPool,
    claims: &Claims,
    course_id: Uuid,
) -> Result<(), AppError> {
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM courses
            WHERE id = $1 AND tenant_id = $2
            AND (created_by = $3 OR $4 = true)
        ) as "exists!: bool""#,
        course_id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).fetch_one(pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !exists {
        return Err(AppError::Forbidden("Tidak diizinkan mengubah kursus ini".into()));
    }
    Ok(())
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: guards compile" || echo "FAIL"
```

---

### 2B1-06: Template Endpoints

**Goal:** Course template CRUD (clone course as template)

**Dependencies:** 2B1-05

**Concrete Code:**

```rust
/// POST /api/v1/courses/:id/clone
/// Clone a course as template — copies course + modules + lessons
pub async fn clone_course_as_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<(axum::http::StatusCode, Json<Course>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Clone in a transaction to ensure atomicity
    let mut tx = pool.begin().await.map_err(|e| AppError::Internal(e.to_string()))?;

    let new_course = sqlx::query_as!(Course,
        r#"INSERT INTO courses (title, description, category, grade_level, subject,
            status, tenant_id, created_by)
        SELECT title || ' (Salinan)', description, category, grade_level, subject,
            'draft', tenant_id, $2
        FROM courses WHERE id = $1 AND tenant_id = $3
        RETURNING id, title, description, status as "status: CourseStatus",
            tenant_id, created_by, created_at, updated_at,
            thumbnail_url, category, grade_level, subject"#,
        id,
        claims.user_id,
        claims.tenant_id
    ).fetch_one(&mut *tx).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Clone modules — GOTCHA: quote "order"
    sqlx::query!(
        r#"INSERT INTO course_modules (course_id, title, description, "order", tenant_id)
        SELECT $1, title, description, "order", tenant_id
        FROM course_modules WHERE course_id = $2"#,
        new_course.id,
        id
    ).execute(&mut *tx).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(new_course)))
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && cargo test clone 2>&1 | tail -5
```

---

### 2B1-07: Version Endpoints

**Goal:** Course versioning endpoints

**Dependencies:** 2B1-05

**Concrete Code:**

```rust
/// POST /api/v1/courses/:id/versions
/// Create a new version snapshot of a course
pub async fn create_course_version(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<(axum::http::StatusCode, Json<serde_json::Value>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let version = sqlx::query!(
        r#"INSERT INTO course_versions (course_id, version_number, snapshot, created_by, tenant_id)
        SELECT $1,
            COALESCE((SELECT MAX(version_number) FROM course_versions WHERE course_id = $1), 0) + 1,
            row_to_json(c),
            $2,
            $3
        FROM courses c WHERE c.id = $1 AND c.tenant_id = $3
        RETURNING id, version_number, created_at"#,
        course_id,
        claims.user_id,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(serde_json::json!({
        "id": version.id,
        "version_number": version.version_number,
        "created_at": version.created_at
    }))))
}

/// GET /api/v1/courses/:id/versions
pub async fn list_course_versions(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Vec<serde_json::Value>>, AppError> {
    let versions = sqlx::query!(
        "SELECT id, version_number, created_at, created_by
        FROM course_versions
        WHERE course_id = $1 AND tenant_id = $2
        ORDER BY version_number DESC",
        course_id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let result: Vec<serde_json::Value> = versions.iter().map(|v| serde_json::json!({
        "id": v.id,
        "version_number": v.version_number,
        "created_at": v.created_at,
        "created_by": v.created_by
    })).collect();

    Ok(Json(result))
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && cargo test version 2>&1 | tail -5
```

---

### 2B1-08: Course Integration Tests

**Goal:** Integration tests untuk course endpoints

**Dependencies:** 2B1-06, 2B1-07

**Concrete Code:**

```rust
// === edusync-api/tests/integration/courses_test.rs ===

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use serde_json::json;
    use crate::helpers::{spawn_app, get_auth_token};

    #[tokio::test]
    async fn list_courses_returns_200() {
        let app = spawn_app().await;
        let token = get_auth_token(&app, "teacher@edusync.dev", "password123").await;

        let res = app.client
            .get(&format!("{}/api/v1/courses", app.address))
            .header("Authorization", format!("Bearer {}", token))
            .send().await.unwrap();

        assert_eq!(res.status(), StatusCode::OK);
        let body: serde_json::Value = res.json().await.unwrap();
        assert!(body["data"].is_array());
        assert!(body["count"].is_number());
    }

    #[tokio::test]
    async fn create_course_requires_teacher_role() {
        let app = spawn_app().await;
        let token = get_auth_token(&app, "student@edusync.dev", "password123").await;

        let res = app.client
            .post(&format!("{}/api/v1/courses", app.address))
            .header("Authorization", format!("Bearer {}", token))
            .json(&json!({ "title": "Test Course" }))
            .send().await.unwrap();

        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn course_crud_lifecycle() {
        let app = spawn_app().await;
        let token = get_auth_token(&app, "teacher@edusync.dev", "password123").await;

        // Create
        let res = app.client
            .post(&format!("{}/api/v1/courses", app.address))
            .header("Authorization", format!("Bearer {}", token))
            .json(&json!({ "title": "Matematika Kelas 10" }))
            .send().await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let course: serde_json::Value = res.json().await.unwrap();
        let id = course["id"].as_str().unwrap();

        // Read
        let res = app.client
            .get(&format!("{}/api/v1/courses/{}", app.address, id))
            .header("Authorization", format!("Bearer {}", token))
            .send().await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // Update
        let res = app.client
            .put(&format!("{}/api/v1/courses/{}", app.address, id))
            .header("Authorization", format!("Bearer {}", token))
            .json(&json!({ "title": "Matematika Lanjut Kelas 10" }))
            .send().await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // Delete (soft)
        let res = app.client
            .delete(&format!("{}/api/v1/courses/{}", app.address, id))
            .header("Authorization", format!("Bearer {}", token))
            .send().await.unwrap();
        assert_eq!(res.status(), StatusCode::NO_CONTENT);
    }
}
```

**Verification:**

```bash
cd edusync-api && cargo test integration::courses 2>&1 | tail -10
```

---

### 2B1-09: Frontend courseService → VIL

**Goal:** Refactor frontend course service untuk menggunakan VIL API

**Dependencies:** 2B1-08

**Verification:**

```bash
cd /home/rog/Documents/edusync1/LMS && pnpm typecheck 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-10: Lesson + Module CRUD

**Goal:** Implement CRUD untuk lessons dan course_modules

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Files:**

- `edusync-api/crates/server/src/routes/lessons.rs`
- `edusync-api/crates/server/src/routes/modules.rs`

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/routes/modules.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::{CourseModule, CreateModuleRequest, UpdateModuleRequest};

/// GET /api/v1/courses/:course_id/modules
pub async fn list_modules(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Vec<CourseModule>>, AppError> {
    // GOTCHA: "order" is a reserved word — MUST be quoted
    let modules = sqlx::query_as!(CourseModule,
        r#"SELECT id, course_id, title, description,
            "order", tenant_id, created_at, updated_at
        FROM course_modules
        WHERE course_id = $1 AND tenant_id = $2
        ORDER BY "order" ASC"#,
        course_id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(modules))
}

/// POST /api/v1/courses/:course_id/modules
pub async fn create_module(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<CreateModuleRequest>,
) -> Result<(axum::http::StatusCode, Json<CourseModule>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // GOTCHA: "order" must be quoted in INSERT and SELECT
    let next_order = body.order.unwrap_or_else(|| 0);
    let module = sqlx::query_as!(CourseModule,
        r#"INSERT INTO course_modules (course_id, title, description, "order", tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, course_id, title, description,
            "order", tenant_id, created_at, updated_at"#,
        course_id,
        body.title,
        body.description,
        next_order,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(module)))
}

/// PUT /api/v1/courses/:course_id/modules/:id
pub async fn update_module(
    State(pool): State<PgPool>,
    Path((course_id, id)): Path<(Uuid, Uuid)>,
    claims: Claims,
    Json(body): Json<UpdateModuleRequest>,
) -> Result<Json<CourseModule>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let module = sqlx::query_as!(CourseModule,
        r#"UPDATE course_modules SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            "order" = COALESCE($3, "order"),
            updated_at = NOW()
        WHERE id = $4 AND course_id = $5 AND tenant_id = $6
        RETURNING id, course_id, title, description,
            "order", tenant_id, created_at, updated_at"#,
        body.title,
        body.description,
        body.order,
        id,
        course_id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Modul tidak ditemukan".into()))?;

    Ok(Json(module))
}

/// DELETE /api/v1/courses/:course_id/modules/:id
pub async fn delete_module(
    State(pool): State<PgPool>,
    Path((course_id, id)): Path<(Uuid, Uuid)>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query!(
        "DELETE FROM course_modules WHERE id = $1 AND course_id = $2 AND tenant_id = $3",
        id, course_id, claims.tenant_id
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Modul tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

```rust
// === edusync-api/crates/server/src/routes/lessons.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::{Lesson, CreateLessonRequest, UpdateLessonRequest};

/// GET /api/v1/modules/:module_id/lessons
pub async fn list_lessons(
    State(pool): State<PgPool>,
    Path(module_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Vec<Lesson>>, AppError> {
    // GOTCHA: "order" is a reserved word — MUST be quoted
    let lessons = sqlx::query_as!(Lesson,
        r#"SELECT id, module_id, title, content,
            "order", lesson_type, duration_minutes,
            tenant_id, created_at, updated_at
        FROM lessons
        WHERE module_id = $1 AND tenant_id = $2
        ORDER BY "order" ASC"#,
        module_id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(lessons))
}

/// POST /api/v1/modules/:module_id/lessons
pub async fn create_lesson(
    State(pool): State<PgPool>,
    Path(module_id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<CreateLessonRequest>,
) -> Result<(axum::http::StatusCode, Json<Lesson>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let lesson = sqlx::query_as!(Lesson,
        r#"INSERT INTO lessons (module_id, title, content, "order",
            lesson_type, duration_minutes, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, module_id, title, content,
            "order", lesson_type, duration_minutes,
            tenant_id, created_at, updated_at"#,
        module_id,
        body.title,
        body.content,
        body.order.unwrap_or(0),
        body.lesson_type,
        body.duration_minutes,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(lesson)))
}

/// PUT /api/v1/modules/:module_id/lessons/:id
pub async fn update_lesson(
    State(pool): State<PgPool>,
    Path((module_id, id)): Path<(Uuid, Uuid)>,
    claims: Claims,
    Json(body): Json<UpdateLessonRequest>,
) -> Result<Json<Lesson>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let lesson = sqlx::query_as!(Lesson,
        r#"UPDATE lessons SET
            title = COALESCE($1, title),
            content = COALESCE($2, content),
            "order" = COALESCE($3, "order"),
            lesson_type = COALESCE($4, lesson_type),
            duration_minutes = COALESCE($5, duration_minutes),
            updated_at = NOW()
        WHERE id = $6 AND module_id = $7 AND tenant_id = $8
        RETURNING id, module_id, title, content,
            "order", lesson_type, duration_minutes,
            tenant_id, created_at, updated_at"#,
        body.title,
        body.content,
        body.order,
        body.lesson_type,
        body.duration_minutes,
        id,
        module_id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Pelajaran tidak ditemukan".into()))?;

    Ok(Json(lesson))
}

/// DELETE /api/v1/modules/:module_id/lessons/:id
pub async fn delete_lesson(
    State(pool): State<PgPool>,
    Path((module_id, id)): Path<(Uuid, Uuid)>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query!(
        "DELETE FROM lessons WHERE id = $1 AND module_id = $2 AND tenant_id = $3",
        id, module_id, claims.tenant_id
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Pelajaran tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**ServiceProcess Registration:**

```rust
// Modules + Lessons service registration in main.rs
let learning_svc = ServiceProcess::new("learning")
    .prefix("/api/v1")
    .visibility(Visibility::Public)
    // Modules
    .endpoint(Method::GET, "/courses/:course_id/modules", get(list_modules))
    .endpoint(Method::POST, "/courses/:course_id/modules", post(create_module))
    .endpoint(Method::PUT, "/courses/:course_id/modules/:id", put(update_module))
    .endpoint(Method::DELETE, "/courses/:course_id/modules/:id", delete(delete_module))
    // Lessons
    .endpoint(Method::GET, "/modules/:module_id/lessons", get(list_lessons))
    .endpoint(Method::POST, "/modules/:module_id/lessons", post(create_lesson))
    .endpoint(Method::PUT, "/modules/:module_id/lessons/:id", put(update_lesson))
    .endpoint(Method::DELETE, "/modules/:module_id/lessons/:id", delete(delete_lesson));
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: lesson+module CRUD compiles" || echo "FAIL"
```

---

### 2B1-11: Lesson Block Content

**Goal:** Support block-based lesson content (JSON)

**Dependencies:** 2B1-10

**Implementation Notes:** Lesson content is stored as `serde_json::Value` in the `content` column. No special handling needed — the `Lesson` struct already uses `Option<serde_json::Value>`. Ensure PUT endpoint accepts partial block updates.

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-12: Lesson RLS Guards

**Goal:** Port RLS policies untuk lessons dan modules

**Dependencies:** 2B1-11

**Concrete Code:**

```rust
// === edusync-api/crates/middleware/src/guards/lesson_guard.rs ===

use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;

/// Teachers who own the course (or admin) can write lessons/modules.
/// All enrolled students + teachers can read.
pub async fn can_write_lesson(
    pool: &PgPool,
    claims: &Claims,
    module_id: Uuid,
) -> Result<(), AppError> {
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM course_modules cm
            JOIN courses c ON c.id = cm.course_id
            WHERE cm.id = $1 AND cm.tenant_id = $2
            AND (c.created_by = $3 OR $4 = true)
        ) as "exists!: bool""#,
        module_id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).fetch_one(pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !exists {
        return Err(AppError::Forbidden("Tidak diizinkan mengubah pelajaran ini".into()));
    }
    Ok(())
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-13: Lesson Integration Tests

**Dependencies:** 2B1-12

**Verification:**

```bash
cd edusync-api && cargo test integration::lessons 2>&1 | tail -10
```

---

### 2B1-14: Frontend lessonService → VIL

**Dependencies:** 2B1-13

**Verification:**

```bash
cd /home/rog/Documents/edusync1/LMS && pnpm typecheck 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-15: Classroom CRUD

**Goal:** Implement CRUD untuk classes

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/routes/classes.rs ===

use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::{Class, CreateClassRequest, UpdateClassRequest};

/// GET /api/v1/classes
pub async fn list_classes(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
    claims: Claims,
) -> Result<Json<PaginatedResponse<Class>>, AppError> {
    let classes = sqlx::query_as!(Class,
        r#"SELECT id, name, description, course_id, teacher_id,
            academic_year, semester, tenant_id, created_at, updated_at
        FROM classes
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3"#,
        claims.tenant_id,
        params.limit,
        params.offset
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM classes WHERE tenant_id = $1",
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .unwrap_or(0);

    Ok(Json(PaginatedResponse { data: classes, count }))
}

/// POST /api/v1/classes
/// Role: teacher, admin
pub async fn create_class(
    State(pool): State<PgPool>,
    claims: Claims,
    Json(body): Json<CreateClassRequest>,
) -> Result<(axum::http::StatusCode, Json<Class>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let class = sqlx::query_as!(Class,
        r#"INSERT INTO classes (name, description, course_id, teacher_id,
            academic_year, semester, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, description, course_id, teacher_id,
            academic_year, semester, tenant_id, created_at, updated_at"#,
        body.name,
        body.description,
        body.course_id,
        claims.user_id,
        body.academic_year,
        body.semester,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(class)))
}

/// GET /api/v1/classes/:id
pub async fn get_class(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Class>, AppError> {
    let class = sqlx::query_as!(Class,
        r#"SELECT id, name, description, course_id, teacher_id,
            academic_year, semester, tenant_id, created_at, updated_at
        FROM classes
        WHERE id = $1 AND tenant_id = $2"#,
        id,
        claims.tenant_id
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Kelas tidak ditemukan".into()))?;

    Ok(Json(class))
}

/// PUT /api/v1/classes/:id
pub async fn update_class(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<UpdateClassRequest>,
) -> Result<Json<Class>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let class = sqlx::query_as!(Class,
        r#"UPDATE classes SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            academic_year = COALESCE($3, academic_year),
            semester = COALESCE($4, semester),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6
            AND (teacher_id = $7 OR $8 = true)
        RETURNING id, name, description, course_id, teacher_id,
            academic_year, semester, tenant_id, created_at, updated_at"#,
        body.name,
        body.description,
        body.academic_year,
        body.semester,
        id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Kelas tidak ditemukan atau tidak diizinkan".into()))?;

    Ok(Json(class))
}

/// DELETE /api/v1/classes/:id
pub async fn delete_class(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query!(
        "DELETE FROM classes WHERE id = $1 AND tenant_id = $2
         AND (teacher_id = $3 OR $4 = true)",
        id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Kelas tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: class CRUD compiles" || echo "FAIL"
```

---

### 2B1-16: Enrollment Endpoints

**Goal:** Student enrollment management

**Dependencies:** 2B1-15

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/routes/enrollments.rs ===

use axum::{extract::{Path, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;
use edusync_models::{Enrollment, CreateEnrollmentRequest};

/// GET /api/v1/classes/:class_id/enrollments
pub async fn list_enrollments(
    State(pool): State<PgPool>,
    Path(class_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<Vec<Enrollment>>, AppError> {
    // GOTCHA: enrollments.user_id — NOT student_id
    let enrollments = sqlx::query_as!(Enrollment,
        r#"SELECT id, class_id, user_id, enrolled_at, status, tenant_id
        FROM enrollments
        WHERE class_id = $1 AND tenant_id = $2
        ORDER BY enrolled_at DESC"#,
        class_id,
        claims.tenant_id
    ).fetch_all(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(enrollments))
}

/// POST /api/v1/classes/:class_id/enrollments
/// Role: teacher, admin
pub async fn create_enrollment(
    State(pool): State<PgPool>,
    Path(class_id): Path<Uuid>,
    claims: Claims,
    Json(body): Json<CreateEnrollmentRequest>,
) -> Result<(axum::http::StatusCode, Json<Enrollment>), AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // GOTCHA: column is user_id, NOT student_id
    let enrollment = sqlx::query_as!(Enrollment,
        r#"INSERT INTO enrollments (class_id, user_id, status, tenant_id)
        VALUES ($1, $2, 'active', $3)
        RETURNING id, class_id, user_id, enrolled_at, status, tenant_id"#,
        class_id,
        body.user_id,
        claims.tenant_id
    ).fetch_one(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((axum::http::StatusCode::CREATED, Json(enrollment)))
}

/// DELETE /api/v1/classes/:class_id/enrollments/:id
/// Role: teacher, admin
pub async fn delete_enrollment(
    State(pool): State<PgPool>,
    Path((class_id, id)): Path<(Uuid, Uuid)>,
    claims: Claims,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query!(
        "DELETE FROM enrollments WHERE id = $1 AND class_id = $2 AND tenant_id = $3",
        id, class_id, claims.tenant_id
    ).execute(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .rows_affected();

    if rows == 0 {
        return Err(AppError::NotFound("Pendaftaran tidak ditemukan".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: enrollment CRUD compiles" || echo "FAIL"
```

---

### 2B1-17: Classroom RLS Guards

**Dependencies:** 2B1-16

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-18: Classroom Integration Tests

**Dependencies:** 2B1-17

**Verification:**

```bash
cd edusync-api && cargo test integration::classes 2>&1 | tail -10
```

---

### 2B1-19: Frontend classroomService → VIL

**Dependencies:** 2B1-18

**Verification:**

```bash
cd /home/rog/Documents/edusync1/LMS && pnpm typecheck 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-20: Builder API Endpoints

**Goal:** Course builder endpoints (reorder, publish)

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Concrete Code:**

```rust
// === edusync-api/crates/server/src/routes/builder.rs ===

use axum::{extract::{Path, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;
use crate::middleware::Claims;

#[derive(Debug, serde::Deserialize)]
pub struct ReorderItem {
    pub id: Uuid,
    pub order: i32,
}

/// PUT /api/v1/courses/:course_id/reorder-modules
/// Role: teacher (owner), admin
pub async fn reorder_modules(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
    Json(items): Json<Vec<ReorderItem>>,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let mut tx = pool.begin().await.map_err(|e| AppError::Internal(e.to_string()))?;

    for item in &items {
        // GOTCHA: "order" must be quoted
        sqlx::query!(
            r#"UPDATE course_modules SET "order" = $1, updated_at = NOW()
            WHERE id = $2 AND course_id = $3 AND tenant_id = $4"#,
            item.order,
            item.id,
            course_id,
            claims.tenant_id
        ).execute(&mut *tx).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// PUT /api/v1/modules/:module_id/reorder-lessons
pub async fn reorder_lessons(
    State(pool): State<PgPool>,
    Path(module_id): Path<Uuid>,
    claims: Claims,
    Json(items): Json<Vec<ReorderItem>>,
) -> Result<axum::http::StatusCode, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let mut tx = pool.begin().await.map_err(|e| AppError::Internal(e.to_string()))?;

    for item in &items {
        // GOTCHA: "order" must be quoted
        sqlx::query!(
            r#"UPDATE lessons SET "order" = $1, updated_at = NOW()
            WHERE id = $2 AND module_id = $3 AND tenant_id = $4"#,
            item.order,
            item.id,
            module_id,
            claims.tenant_id
        ).execute(&mut *tx).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    tx.commit().await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// POST /api/v1/courses/:course_id/publish
/// GOTCHA: status is enum string, NOT boolean is_published
pub async fn publish_course(
    State(pool): State<PgPool>,
    Path(course_id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query!(
        "UPDATE courses SET status = 'published', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
           AND (created_by = $3 OR $4 = true)
         RETURNING id, status",
        course_id,
        claims.tenant_id,
        claims.user_id,
        claims.roles.contains(&"admin".to_string())
    ).fetch_optional(&pool).await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Kursus tidak ditemukan".into()))?;

    Ok(Json(serde_json::json!({
        "id": result.id,
        "status": result.status
    })))
}
```

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS: builder endpoints compile" || echo "FAIL"
```

---

### 2B1-21: Builder Integration Tests

**Dependencies:** 2B1-20

**Verification:**

```bash
cd edusync-api && cargo test integration::builder 2>&1 | tail -10
```

---

### 2B1-22: Frontend courseBuilderApi → VIL

**Dependencies:** 2B1-21

**Verification:**

```bash
cd /home/rog/Documents/edusync1/LMS && pnpm typecheck 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-23: Shadow Mode Infra

**Goal:** Setup dual-write infrastructure

**Dependencies:** 2B1-09, 2B1-14, 2B1-19, 2B1-22

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

### 2B1-24: Shadow Mode Verification

**Dependencies:** 2B1-23

**Verification:**

```bash
cd edusync-api && cargo test shadow 2>&1 | tail -10
```

---

### 2B1-25: E2E Tests VIL

**Dependencies:** 2B1-24

**Verification:**

```bash
cd edusync-api && cargo test e2e 2>&1 | tail -10
```

---

### 2B1-26: Per-Flow Cutover Flags

**Goal:** Implement feature flags untuk per-flow cutover

**Dependencies:** 2B1-25

**Verification:**

```bash
cd edusync-api && cargo check 2>&1 | tail -5 && echo "PASS" || echo "FAIL"
```

---

## Parallelism Map

| Parallel Group        | Tasks                  | Can Run In Parallel With          |
| --------------------- | ---------------------- | --------------------------------- |
| Group A (Foundation)  | 2B1-01, 2B1-02, 2B1-03 | Serial                            |
| Group B (Courses)     | 2B1-04 → 2B1-09        | Group C, D, E                     |
| Group C (Lessons)     | 2B1-10 → 2B1-14        | Group B, D, E                     |
| Group D (Classroom)   | 2B1-15 → 2B1-19        | Group B, C, E                     |
| Group E (Builder)     | 2B1-20 → 2B1-22        | Group B, C, D                     |
| Group F (Integration) | 2B1-23 → 2B1-26        | Serial (all groups must complete) |
