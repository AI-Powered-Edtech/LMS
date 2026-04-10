# Agent Task Queue — Phase 2 Batch 3-4

<aside>
🤖

**Untuk AI Coding Agents.** Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Task harus dikerjakan **berurutan dalam batch**, tapi **antar module dalam batch bisa paralel** kecuali ada dependency eksplisit. Setiap task punya:

- **Input:** File yang harus dibaca dulu
- **Output:** File yang harus dibuat/diubah
- **Code:** Kode lengkap siap copas
- **Verify:** Command untuk verifikasi
</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `pnpm typecheck && pnpm lint` setelah setiap task
6. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
7. Analytics RPCs: **KEEP sebagai stored procedures** — thin Rust handler → `sqlx::query!` ke stored procedure, **JANGAN port logic ke Rust**
8. xAPI & progress harus respect offline queue delivery semantics (CC6 di Main Plan)
9. Semua endpoint harus punya `TenantGuard` + `RbacGuard` middleware
10. Error format: `{ code, message, details, hint }` (PostgREST compatible)
11. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 2C/D-XX"`. Jika verify gagal: `git stash`. JANGAN lanjut dengan state setengah jadi.
12. **🛠️ Transaction wrapping (Gap #3):** Bulk import (2C-5), enrollment changes, dan multi-table user operations WAJIB wrapped dalam `pool.begin()` → `tx.commit()`.
13. **🛠️ VilError type (Gap #4):** Gunakan `AppError` dari `crates/middleware/src/errors.rs`. JANGAN assume `VilError`.
14. **🛠️ Nginx route update (Gap #5):** Setiap batch yang menambah `/api/v1/*` endpoint baru HARUS update `nginx.conf`. Buat sub-task jika belum ada.
15. **Email digest tetap di Supabase Edge Function sampai Phase 3C** — notification CRUD pindah ke VIL, tapi `digestApi.ts` yang pakai `supabase.functions.invoke()` stays on Supabase. Jangan asumsikan digest otomatis jalan via VIL.
16. **Sebelum mulai Batch 4**, setiap task WAJIB audit schema aktual: `\d table_name` di psql. Jangan asumsikan nama tabel — cek actual schema karena long-tail modules mungkin kurang mature.
17. **Discussions realtime**: CRUD → VIL, tapi realtime notification of new posts tetap via Supabase Realtime sampai Phase 4.
18. **Weak modules guard**: Jika frontend module Finance/Surveys punya `TODO` stubs atau < 50% feature completion → SKIP, keep on Supabase proxy. Jangan build VIL endpoints untuk fitur yang belum jalan di frontend.

---

## Dependency Map

```
Batch 3 (bisa paralel antar cluster):
├── Cluster A: Analytics (2C-1 → 2C-2 → 2C-3)
├── Cluster B: User Management (2C-4 → 2C-5)
└── Cluster C: Progress + xAPI (2C-6 → 2C-7)

Batch 4 (bisa paralel antar module, kecuali dependency eksplisit):
├── Cluster D: Notifications → Discussions → Parent (2D-1 → 2D-2 → 2D-7)
├── Cluster E: Calendar + Attendance (2D-3, 2D-4 — paralel)
├── Cluster F: Gamification + Certificates (2D-5, 2D-6 — paralel)
├── Cluster G: Principal + Onboarding (2D-8, 2D-9 — paralel)
└── Cluster H: Surveys + Finance + Search (2D-10, 2D-11, 2D-12 — paralel)
```

---

# 📊 Batch 3 — Users, Analytics, Progress (Minggu 32-36)

---

## Task 2C-1: Analytics Models + Executive Overview RPC Handler

**TASK ID:** 2C-1

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Buat Rust model structs untuk analytics responses + handler executive overview RPC

**DEPENDENCY:** Phase 1A scaffold selesai, Phase 2 Batch 1-2 selesai

**READ FIRST:**

- `edusync-api/crates/models/src/` — existing model pattern
- `src/features/analytics/api/analyticsQueries.ts` — lihat RPC names + response shapes
- `supabase/migrations/` — cari `get_executive_overview` stored procedure

**EDIT ONLY:**

- `edusync-api/crates/models/src/analytics.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs` (tambah `pub mod analytics;`)
- `edusync-api/crates/server/src/handlers/analytics.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah `pub mod analytics;`)
- `edusync-api/crates/server/src/main.rs` (register analytics service)

**DO NOT TOUCH:**

- Stored procedures di PostgreSQL — JANGAN port logic ke Rust
- File frontend apapun
- `edusync-api/crates/server/src/handlers/auth.rs`
- `edusync-api/crates/server/src/handlers/courses.rs`

**IMPLEMENTATION STEPS:**

1. Buat response struct untuk `ExecutiveOverview` di `analytics.rs`
2. Buat handler `get_executive_overview` yang panggil stored procedure via `sqlx::query_as!`
3. Register endpoint di `main.rs`
4. Test dengan `cargo test`

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/analytics.rs
use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Executive overview response — maps to get_executive_overview() stored procedure
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ExecutiveOverview {
    pub total_students: Option<i64>,
    pub total_teachers: Option<i64>,
    pub total_courses: Option<i64>,
    pub total_classes: Option<i64>,
    pub active_students: Option<i64>,
    pub avg_completion_rate: Option<f64>,
    pub avg_quiz_score: Option<f64>,
    pub total_assignments: Option<i64>,
}

/// Query params for analytics endpoints
#[derive(Debug, Deserialize)]
pub struct AnalyticsParams {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

/// Principal overview cached — maps to get_principal_overview_cached()
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PrincipalOverview {
    pub total_students: Option<i64>,
    pub total_teachers: Option<i64>,
    pub total_courses: Option<i64>,
    pub active_students_7d: Option<i64>,
    pub avg_quiz_score: Option<f64>,
    pub attendance_rate: Option<f64>,
}
```

```rust
// edusync-api/crates/server/src/handlers/analytics.rs
use axum::extract::{Query, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::analytics::*;

/// GET /api/v1/analytics/executive
/// Role: admin, principal
pub async fn get_executive_overview(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<AnalyticsParams>,
) -> Result<Json<ExecutiveOverview>, AppError> {
    // RBAC: hanya admin dan principal
    claims.require_any_role(&["admin", "principal"])?;

    let result = sqlx::query_as::<_, ExecutiveOverview>(
        "SELECT * FROM get_executive_overview($1, $2, $3)"
    )
    .bind(tenant.0)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}

/// GET /api/v1/analytics/principal-overview
/// Role: admin, principal
pub async fn get_principal_overview(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
) -> Result<Json<PrincipalOverview>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;

    let result = sqlx::query_as::<_, PrincipalOverview>(
        "SELECT * FROM get_principal_overview_cached($1)"
    )
    .bind(tenant.0)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}
```

```rust
// Di main.rs — register analytics service
let analytics = ServiceProcess::new("analytics")
    .prefix("/api/v1/analytics")
    .endpoint(Method::GET, "/executive", get(handlers::analytics::get_executive_overview))
    .endpoint(Method::GET, "/principal-overview", get(handlers::analytics::get_principal_overview));
```

**VERIFY:**

```
cargo check
cargo test -- analytics
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:8080/api/v1/analytics/executive
```

**STOP IF:**

- Stored procedure `get_executive_overview` tidak ditemukan di database → BLOCKED, perlu audit migration files
- Response shape dari stored procedure tidak match struct → perbaiki struct dulu, JANGAN ubah stored procedure
- Lebih dari 3 file tak terduga perlu diubah → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-2: Analytics Teacher + Student RPC Handlers

**TASK ID:** 2C-2

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Handler untuk teacher dashboard + student progress RPCs

**DEPENDENCY:** Task 2C-1 selesai

**READ FIRST:**

- `edusync-api/crates/models/src/analytics.rs` (dari 2C-1)
- `src/features/analytics/api/analyticsQueries.ts` — cari `get_teacher_dashboard`, `get_student_progress`
- `supabase/migrations/` — cari stored procedure definitions

**EDIT ONLY:**

- `edusync-api/crates/models/src/analytics.rs` (tambah structs)
- `edusync-api/crates/server/src/handlers/analytics.rs` (tambah handlers)
- `edusync-api/crates/server/src/main.rs` (register endpoints)

**DO NOT TOUCH:**

- Stored procedures di PostgreSQL
- File frontend apapun
- Handler analytics dari Task 2C-1

**IMPLEMENTATION STEPS:**

1. Tambah response structs: `TeacherDashboard`, `StudentProgress`, `CourseAnalytics`
2. Buat handler yang panggil stored procedures via `sqlx::query_as!`
3. Register endpoints
4. GOTCHA: Saat check teacher role di analytics RPCs, query `user_roles` table langsung — jangan pakai `has_role()` karena fails saat JWT missing tenant claim

**COPY-PASTE STARTER:**

```rust
// Tambah di analytics.rs models

/// Teacher dashboard — maps to get_teacher_dashboard()
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TeacherDashboard {
    pub total_courses: Option<i64>,
    pub total_students: Option<i64>,
    pub avg_quiz_score: Option<f64>,
    pub pending_assignments: Option<i64>,
    pub attendance_rate: Option<f64>,
}

/// Student progress — maps to get_student_progress()
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StudentProgress {
    pub course_id: Option<Uuid>,
    pub course_title: Option<String>,
    pub completion_rate: Option<f64>,
    pub avg_score: Option<f64>,
    pub total_time_spent: Option<i64>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

/// Course analytics — maps to get_course_analytics()
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CourseAnalytics {
    pub enrolled_count: Option<i64>,
    pub completion_rate: Option<f64>,
    pub avg_quiz_score: Option<f64>,
    pub avg_assignment_score: Option<f64>,
}

/// Analytics query with course filter
#[derive(Debug, Deserialize)]
pub struct CourseAnalyticsParams {
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

/// Student analytics params
#[derive(Debug, Deserialize)]
pub struct StudentAnalyticsParams {
    pub student_id: Option<Uuid>,
}
```

```rust
// Tambah di handlers/analytics.rs

/// GET /api/v1/analytics/teacher-dashboard
/// Role: teacher, admin
pub async fn get_teacher_dashboard(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<AnalyticsParams>,
) -> Result<Json<TeacherDashboard>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query_as::<_, TeacherDashboard>(
        "SELECT * FROM get_teacher_dashboard($1, $2, $3, $4)"
    )
    .bind(tenant.0)
    .bind(claims.sub)  // teacher user_id
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}

/// GET /api/v1/analytics/student-progress
/// Role: student (own), teacher, admin, parent (linked child)
pub async fn get_student_progress(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<StudentAnalyticsParams>,
) -> Result<Json<Vec<StudentProgress>>, AppError> {
    // Student can only see own progress
    let student_id = if claims.has_role("student") {
        claims.sub
    } else {
        claims.require_any_role(&["teacher", "admin", "parent"])?;
        params.student_id.unwrap_or(claims.sub)
    };

    let results = sqlx::query_as::<_, StudentProgress>(
        "SELECT * FROM get_student_progress($1, $2)"
    )
    .bind(tenant.0)
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(results))
}

/// GET /api/v1/analytics/course/:course_id
/// Role: teacher (owner), admin
pub async fn get_course_analytics(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(course_id): Path<Uuid>,
    Query(params): Query<CourseAnalyticsParams>,
) -> Result<Json<CourseAnalytics>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query_as::<_, CourseAnalytics>(
        "SELECT * FROM get_course_analytics($1, $2, $3, $4)"
    )
    .bind(tenant.0)
    .bind(course_id)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}
```

```rust
// Register di main.rs — tambah ke analytics service
.endpoint(Method::GET, "/teacher-dashboard", get(handlers::analytics::get_teacher_dashboard))
.endpoint(Method::GET, "/student-progress", get(handlers::analytics::get_student_progress))
.endpoint(Method::GET, "/course/:course_id", get(handlers::analytics::get_course_analytics))
```

**VERIFY:**

```
cargo check
cargo test -- analytics
curl -H "Authorization: Bearer $TEACHER_JWT" http://localhost:8080/api/v1/analytics/teacher-dashboard
curl -H "Authorization: Bearer $STUDENT_JWT" http://localhost:8080/api/v1/analytics/student-progress
```

**STOP IF:**

- Stored procedure parameter count mismatch → audit migration SQL, adjust binds
- Role check fails pada teacher endpoint → verify `user_roles` table query, jangan pakai `has_role()`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-3: Analytics Remaining RPCs (Bulk Handler Registration)

**TASK ID:** 2C-3

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Register semua remaining 15+ analytics RPC handlers sebagai thin wrappers ke stored procedures

**DEPENDENCY:** Task 2C-2 selesai

**READ FIRST:**

- `src/features/analytics/api/analyticsQueries.ts` — full list of RPC names
- `edusync-api/crates/server/src/handlers/analytics.rs` (dari 2C-1, 2C-2)
- `supabase/migrations/` — grep untuk semua analytics-related stored procedures

**EDIT ONLY:**

- `edusync-api/crates/models/src/analytics.rs` (tambah remaining structs)
- `edusync-api/crates/server/src/handlers/analytics.rs` (tambah remaining handlers)
- `edusync-api/crates/server/src/main.rs` (register remaining endpoints)

**DO NOT TOUCH:**

- Stored procedures di PostgreSQL
- File frontend
- Existing handlers dari 2C-1 dan 2C-2

**IMPLEMENTATION STEPS:**

1. Audit `analyticsQueries.ts` — list semua RPC call names
2. Untuk setiap RPC, buat:

   a. Response struct (match stored procedure return type)

   b. Handler function (thin wrapper: extract params → `sqlx::query_as!` → return JSON)

3. Register semua endpoints
4. Pattern untuk setiap handler sama — hanya nama RPC dan struct yang berbeda

**COPY-PASTE STARTER:**

```rust
// Pattern untuk setiap remaining analytics RPC:
// Semua handler mengikuti pattern yang SAMA:

/// Generic analytics RPC response (untuk RPCs yang return JSON)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AnalyticsJsonResult {
    pub result: Option<serde_json::Value>,
}

// Macro untuk generate thin handlers:
macro_rules! analytics_rpc_handler {
    ($fn_name:ident, $rpc_name:expr, $roles:expr) => {
        pub async fn $fn_name(
            State(state): State<AppState>,
            tenant: TenantId,
            claims: Claims,
            Query(params): Query<AnalyticsParams>,
        ) -> Result<Json<serde_json::Value>, AppError> {
            claims.require_any_role($roles)?;

            let result = sqlx::query_scalar::<_, serde_json::Value>(
                &format!("SELECT {}($1, $2, $3)", $rpc_name)
            )
            .bind(tenant.0)
            .bind(params.start_date)
            .bind(params.end_date)
            .fetch_one(&state.db)
            .await
            .map_err(AppError::from)?;

            Ok(Json(result))
        }
    };
}

// Contoh penggunaan macro:
analytics_rpc_handler!(get_attendance_analytics, "get_attendance_analytics", &["teacher", "admin", "principal"]);
analytics_rpc_handler!(get_quiz_analytics, "get_quiz_analytics", &["teacher", "admin"]);
analytics_rpc_handler!(get_assignment_analytics, "get_assignment_analytics", &["teacher", "admin"]);
analytics_rpc_handler!(get_engagement_metrics, "get_engagement_metrics", &["admin", "principal"]);
analytics_rpc_handler!(get_class_performance, "get_class_performance", &["teacher", "admin"]);
analytics_rpc_handler!(get_student_ranking, "get_student_ranking", &["teacher", "admin"]);
analytics_rpc_handler!(get_learning_path_analytics, "get_learning_path_analytics", &["teacher", "admin"]);
analytics_rpc_handler!(get_gamification_leaderboard, "get_gamification_leaderboard", &["teacher", "admin", "student"]);

// CATATAN: Jika RPC punya parameter berbeda dari AnalyticsParams,
// buat handler manual (jangan pakai macro).
// Audit setiap RPC parameter list dari migration files.
```

```rust
// Register di main.rs — tambah semua ke analytics service
.endpoint(Method::GET, "/attendance", get(handlers::analytics::get_attendance_analytics))
.endpoint(Method::GET, "/quiz", get(handlers::analytics::get_quiz_analytics))
.endpoint(Method::GET, "/assignment", get(handlers::analytics::get_assignment_analytics))
.endpoint(Method::GET, "/engagement", get(handlers::analytics::get_engagement_metrics))
.endpoint(Method::GET, "/class-performance", get(handlers::analytics::get_class_performance))
.endpoint(Method::GET, "/student-ranking", get(handlers::analytics::get_student_ranking))
.endpoint(Method::GET, "/learning-path", get(handlers::analytics::get_learning_path_analytics))
.endpoint(Method::GET, "/gamification-leaderboard", get(handlers::analytics::get_gamification_leaderboard))
```

**VERIFY:**

```
cargo check
cargo test -- analytics
# Verify total handler count matches RPC count:
grep -c 'pub async fn' edusync-api/crates/server/src/handlers/analytics.rs
# Expected: >= 10 handlers
```

**STOP IF:**

- RPC parameter list sangat beragam dan macro tidak cukup → buat handler manual per RPC
- Lebih dari 5 RPCs punya return type yang butuh custom struct → buat custom structs satu per satu
- Stored procedure tidak ditemukan → BLOCKED, list missing RPCs

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-4: User Management CRUD Endpoints

**TASK ID:** 2C-4

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Admin user CRUD endpoints — list, get, update, deactivate users per tenant

**DEPENDENCY:** Phase 1A scaffold + Phase 1B auth selesai

**READ FIRST:**

- `src/features/administration/api/` — admin service files
- `edusync-api/crates/models/src/` — existing model pattern
- Bootstrap Context §13: `enrollments.user_id` BUKAN `student_id`

**EDIT ONLY:**

- `edusync-api/crates/models/src/user.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs` (tambah `pub mod user;`)
- `edusync-api/crates/server/src/handlers/users.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah `pub mod users;`)
- `edusync-api/crates/server/src/main.rs` (register users service)

**DO NOT TOUCH:**

- Auth handlers — user CRUD beda dari auth
- `public.users` migration (sudah dari Phase 1B)
- File frontend

**IMPLEMENTATION STEPS:**

1. Buat `User` model struct (map ke `public.users` + `profiles` join)
2. Buat CRUD handlers: list, get, update, deactivate
3. List harus support: pagination, search (ilike full_name), role filter
4. Role datang dari `user_roles` table, BUKAN `profiles.role` (Bootstrap Context §13)
5. Register endpoints

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub tenant_id: Uuid,
    pub is_active: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserWithRoles {
    #[serde(flatten)]
    pub profile: UserProfile,
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListUsersParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub is_active: Option<bool>,
    pub avatar_url: Option<String>,
}
```

```rust
// edusync-api/crates/server/src/handlers/users.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::user::*;

/// GET /api/v1/users
/// Role: admin
pub async fn list_users(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<ListUsersParams>,
) -> Result<Json<Vec<UserWithRoles>>, AppError> {
    claims.require_any_role(&["admin"])?;

    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.page.unwrap_or(0) * limit;

    // Query users with roles from user_roles table
    let users = sqlx::query_as::<_, UserProfile>(
        r#"SELECT p.id, p.email, p.full_name, p.avatar_url, p.tenant_id,
                  p.is_active, p.created_at, p.updated_at
           FROM profiles p
           WHERE p.tenant_id = $1
             AND ($2::TEXT IS NULL OR p.full_name ILIKE '%' || $2 || '%')
           ORDER BY p.created_at DESC
           LIMIT $3 OFFSET $4"#
    )
    .bind(tenant.0)
    .bind(&params.search)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    // Fetch roles for each user from user_roles table
    let mut result = Vec::with_capacity(users.len());
    for user in users {
        let roles = sqlx::query_scalar::<_, String>(
            "SELECT role FROM user_roles WHERE user_id = $1 AND tenant_id = $2"
        )
        .bind(user.id)
        .bind(tenant.0)
        .fetch_all(&state.db)
        .await
        .map_err(AppError::from)?;

        // Filter by role if specified
        if let Some(ref role_filter) = params.role {
            if !roles.contains(role_filter) {
                continue;
            }
        }

        result.push(UserWithRoles { profile: user, roles });
    }

    Ok(Json(result))
}

/// GET /api/v1/users/:id
/// Role: admin, teacher (limited), self
pub async fn get_user(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserWithRoles>, AppError> {
    // Self-access allowed, otherwise admin/teacher
    if claims.sub != user_id {
        claims.require_any_role(&["admin", "teacher"])?;
    }

    let user = sqlx::query_as::<_, UserProfile>(
        r#"SELECT id, email, full_name, avatar_url, tenant_id,
                  is_active, created_at, updated_at
           FROM profiles
           WHERE id = $1 AND tenant_id = $2"#
    )
    .bind(user_id)
    .bind(tenant.0)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("User not found"))?;

    let roles = sqlx::query_scalar::<_, String>(
        "SELECT role FROM user_roles WHERE user_id = $1 AND tenant_id = $2"
    )
    .bind(user_id)
    .bind(tenant.0)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(UserWithRoles { profile: user, roles }))
}

/// PUT /api/v1/users/:id
/// Role: admin, self (limited fields)
pub async fn update_user(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(user_id): Path<Uuid>,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<UserProfile>, AppError> {
    // Self can update name/avatar, admin can update everything
    if claims.sub != user_id {
        claims.require_any_role(&["admin"])?;
    }

    let user = sqlx::query_as::<_, UserProfile>(
        r#"UPDATE profiles SET
              full_name = COALESCE($3, full_name),
              is_active = COALESCE($4, is_active),
              avatar_url = COALESCE($5, avatar_url),
              updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, email, full_name, avatar_url, tenant_id,
                     is_active, created_at, updated_at"#
    )
    .bind(user_id)
    .bind(tenant.0)
    .bind(&body.full_name)
    .bind(body.is_active)
    .bind(&body.avatar_url)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("User not found"))?;

    Ok(Json(user))
}

/// DELETE /api/v1/users/:id (soft delete — set is_active = false)
/// Role: admin
pub async fn deactivate_user(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["admin"])?;

    sqlx::query(
        "UPDATE profiles SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2"
    )
    .bind(user_id)
    .bind(tenant.0)
    .execute(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(serde_json::json!({ "message": "User deactivated", "user_id": user_id })))
}
```

```rust
// Register di main.rs
let users = ServiceProcess::new("users")
    .prefix("/api/v1")
    .endpoint(Method::GET, "/users", get(handlers::users::list_users))
    .endpoint(Method::GET, "/users/:id", get(handlers::users::get_user))
    .endpoint(Method::PUT, "/users/:id", put(handlers::users::update_user))
    .endpoint(Method::DELETE, "/users/:id", delete(handlers::users::deactivate_user));
```

**VERIFY:**

```
cargo check
cargo test -- users
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:8080/api/v1/users
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:8080/api/v1/users/$USER_ID
```

**STOP IF:**

- `profiles` table schema mismatch → audit migration files
- `user_roles` table tidak ada → BLOCKED, perlu Phase 1B auth migration
- Self-access logic conflict with existing RLS → document conflict

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-5: Bulk Import Service Endpoints

**TASK ID:** 2C-5

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Bulk CSV import endpoint for admin — chunk-based, resumable

**DEPENDENCY:** Task 2C-4 selesai

**READ FIRST:**

- `src/features/administration/api/bulkImportService.ts` — existing import logic
- `src/features/administration/hooks/useBulkImport.ts` — frontend hook
- CC7 di Main Plan: Bulk import = 3 retries per chunk, resume from last chunk

**EDIT ONLY:**

- `edusync-api/crates/models/src/bulk_import.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs` (tambah module)
- `edusync-api/crates/server/src/handlers/bulk_import.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah module)
- `edusync-api/crates/server/src/main.rs` (register endpoint)

**DO NOT TOUCH:**

- User CRUD handlers (Task 2C-4)
- Frontend bulk import hook
- Existing stored procedures

**IMPLEMENTATION STEPS:**

1. Buat models: `BulkImportJob`, `BulkImportRow`, `BulkImportResult`
2. Buat endpoints:
   - `POST /api/v1/admin/bulk-import` — start import job
   - `GET /api/v1/admin/bulk-import/:job_id` — check job status
   - `POST /api/v1/admin/bulk-import/:job_id/retry` — retry failed chunks
3. Processing: chunk-based (50 rows per chunk), insert via transaction
4. Error handling: per-row validation, failed rows tracked

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/bulk_import.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkImportRequest {
    pub rows: Vec<BulkImportRow>,
    pub entity_type: String,  // "student" | "teacher"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BulkImportRow {
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub class_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct BulkImportJob {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub status: String,      // 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
    pub total_rows: i32,
    pub processed_rows: i32,
    pub failed_rows: i32,
    pub error_details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkImportResult {
    pub job_id: Uuid,
    pub status: String,
    pub total: i32,
    pub success: i32,
    pub failed: i32,
    pub errors: Vec<BulkImportError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkImportError {
    pub row: i32,
    pub email: String,
    pub error: String,
}
```

```rust
// edusync-api/crates/server/src/handlers/bulk_import.rs
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::bulk_import::*;

const CHUNK_SIZE: usize = 50;

/// POST /api/v1/admin/bulk-import
/// Role: admin
pub async fn start_bulk_import(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<BulkImportRequest>,
) -> Result<Json<BulkImportResult>, AppError> {
    claims.require_any_role(&["admin"])?;

    let job_id = Uuid::new_v4();
    let total = body.rows.len() as i32;
    let mut success = 0i32;
    let mut failed = 0i32;
    let mut errors = Vec::new();

    // Process in chunks
    for (chunk_idx, chunk) in body.rows.chunks(CHUNK_SIZE).enumerate() {
        let mut tx = state.db.begin().await.map_err(AppError::from)?;

        for (row_idx, row) in chunk.iter().enumerate() {
            let global_idx = (chunk_idx * CHUNK_SIZE + row_idx) as i32;

            // Validate row
            if row.email.is_empty() || row.full_name.is_empty() {
                failed += 1;
                errors.push(BulkImportError {
                    row: global_idx,
                    email: row.email.clone(),
                    error: "Email dan nama lengkap wajib diisi".to_string(),
                });
                continue;
            }

            // Check duplicate email within tenant
            let existing = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM profiles WHERE email = $1 AND tenant_id = $2"
            )
            .bind(&row.email)
            .bind(tenant.0)
            .fetch_one(&mut *tx)
            .await
            .map_err(AppError::from)?;

            if existing > 0 {
                failed += 1;
                errors.push(BulkImportError {
                    row: global_idx,
                    email: row.email.clone(),
                    error: "Email sudah terdaftar".to_string(),
                });
                continue;
            }

            // Insert user
            let user_id = Uuid::new_v4();
            let insert_result = sqlx::query(
                r#"INSERT INTO profiles (id, email, full_name, tenant_id, is_active, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, true, NOW(), NOW())"#
            )
            .bind(user_id)
            .bind(&row.email)
            .bind(&row.full_name)
            .bind(tenant.0)
            .execute(&mut *tx)
            .await;

            match insert_result {
                Ok(_) => {
                    // Insert role
                    let _ = sqlx::query(
                        "INSERT INTO user_roles (user_id, tenant_id, role) VALUES ($1, $2, $3)"
                    )
                    .bind(user_id)
                    .bind(tenant.0)
                    .bind(&row.role)
                    .execute(&mut *tx)
                    .await;
                    success += 1;
                }
                Err(e) => {
                    failed += 1;
                    errors.push(BulkImportError {
                        row: global_idx,
                        email: row.email.clone(),
                        error: format!("Database error: {}", e),
                    });
                }
            }
        }

        tx.commit().await.map_err(AppError::from)?;
    }

    let status = if failed == 0 {
        "completed"
    } else if success == 0 {
        "failed"
    } else {
        "partial"
    };

    Ok(Json(BulkImportResult {
        job_id,
        status: status.to_string(),
        total,
        success,
        failed,
        errors,
    }))
}

/// GET /api/v1/admin/bulk-import/:job_id
/// Role: admin
pub async fn get_import_status(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(job_id): Path<Uuid>,
) -> Result<Json<BulkImportJob>, AppError> {
    claims.require_any_role(&["admin"])?;

    let job = sqlx::query_as::<_, BulkImportJob>(
        "SELECT * FROM bulk_import_jobs WHERE id = $1 AND tenant_id = $2"
    )
    .bind(job_id)
    .bind(tenant.0)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("Import job not found"))?;

    Ok(Json(job))
}
```

```rust
// Register di main.rs
let admin = ServiceProcess::new("admin")
    .prefix("/api/v1/admin")
    .endpoint(Method::POST, "/bulk-import", post(handlers::bulk_import::start_bulk_import))
    .endpoint(Method::GET, "/bulk-import/:job_id", get(handlers::bulk_import::get_import_status));
```

**VERIFY:**

```
cargo check
cargo test -- bulk_import
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"rows":[{"email":"test@test.com","full_name":"Test User","role":"student"}],"entity_type":"student"}' \
  http://localhost:8080/api/v1/admin/bulk-import
```

**STOP IF:**

- `bulk_import_jobs` table tidak ada → BLOCKED, buat migration dulu
- Password creation flow diperlukan untuk imported users → gabungkan dengan Phase 1B auth flow

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-6: Progress Tracking Endpoints

**TASK ID:** 2C-6

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Progress tracking CRUD — lesson progress, course completion, student_lesson_signals

**DEPENDENCY:** Phase 2 Batch 1 courses/lessons selesai

**READ FIRST:**

- `src/features/progress/api/` — progress service files
- Bootstrap Context §13: `student_lesson_signals` → gunakan `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (BUKAN `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)
- CC6 di Main Plan: Progress delivery = **last-write-wins** (latest timestamp)

**EDIT ONLY:**

- `edusync-api/crates/models/src/progress.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs` (tambah module)
- `edusync-api/crates/server/src/handlers/progress.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah module)
- `edusync-api/crates/server/src/main.rs` (register)

**DO NOT TOUCH:**

- Offline queue logic di frontend (`offlineQueue.ts`)
- Analytics handlers
- Existing stored procedures

**IMPLEMENTATION STEPS:**

1. Buat models: `LessonProgress`, `CourseProgress`, `StudentLessonSignal`
2. Buat endpoints:
   - `POST /api/v1/progress/lesson` — upsert lesson progress (last-write-wins)
   - `GET /api/v1/progress/course/:course_id` — get course completion
   - `GET /api/v1/progress/student/:student_id` — get all progress for student
   - `POST /api/v1/progress/signals` — batch upsert student lesson signals
3. GOTCHA: column names `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
4. Progress upsert: ON CONFLICT → UPDATE if timestamp newer (last-write-wins)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/progress.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LessonProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    pub course_id: Uuid,
    pub tenant_id: Uuid,
    pub status: String,           // 'not_started' | 'in_progress' | 'completed'
    pub progress_percentage: Option<f64>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CourseProgress {
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub total_lessons: Option<i64>,
    pub completed_lessons: Option<i64>,
    pub completion_rate: Option<f64>,
}

/// GOTCHA: use total_time_spent, last_accessed_at, latest_quiz_score
/// NOT time_spent_seconds, last_event_at, quiz_avg_score
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StudentLessonSignal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    pub tenant_id: Uuid,
    pub total_time_spent: Option<i64>,
    pub last_accessed_at: Option<DateTime<Utc>>,
    pub latest_quiz_score: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertLessonProgressRequest {
    pub lesson_id: Uuid,
    pub course_id: Uuid,
    pub status: String,
    pub progress_percentage: Option<f64>,
    pub timestamp: DateTime<Utc>,  // for last-write-wins
}

#[derive(Debug, Deserialize)]
pub struct BatchSignalRequest {
    pub signals: Vec<SignalEntry>,
}

#[derive(Debug, Deserialize)]
pub struct SignalEntry {
    pub lesson_id: Uuid,
    pub total_time_spent: Option<i64>,
    pub latest_quiz_score: Option<f64>,
    pub timestamp: DateTime<Utc>,
}
```

```rust
// edusync-api/crates/server/src/handlers/progress.rs
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::progress::*;

/// POST /api/v1/progress/lesson
/// Role: student (own progress)
/// Delivery: last-write-wins (CC6)
pub async fn upsert_lesson_progress(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<UpsertLessonProgressRequest>,
) -> Result<Json<LessonProgress>, AppError> {
    let completed_at = if body.status == "completed" {
        Some(Utc::now())
    } else {
        None
    };

    // Last-write-wins: ON CONFLICT, update only if timestamp is newer
    let result = sqlx::query_as::<_, LessonProgress>(
        r#"INSERT INTO lesson_progress
              (id, user_id, lesson_id, course_id, tenant_id, status,
               progress_percentage, completed_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT (user_id, lesson_id, tenant_id)
           DO UPDATE SET
              status = CASE WHEN $8 > lesson_progress.updated_at
                            THEN EXCLUDED.status ELSE lesson_progress.status END,
              progress_percentage = CASE WHEN $8 > lesson_progress.updated_at
                            THEN EXCLUDED.progress_percentage ELSE lesson_progress.progress_percentage END,
              completed_at = CASE WHEN $8 > lesson_progress.updated_at
                            THEN EXCLUDED.completed_at ELSE lesson_progress.completed_at END,
              updated_at = CASE WHEN $8 > lesson_progress.updated_at
                            THEN NOW() ELSE lesson_progress.updated_at END
           RETURNING *"#
    )
    .bind(claims.sub)
    .bind(body.lesson_id)
    .bind(body.course_id)
    .bind(tenant.0)
    .bind(&body.status)
    .bind(body.progress_percentage)
    .bind(completed_at)
    .bind(body.timestamp)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}

/// GET /api/v1/progress/course/:course_id
/// Role: student (own), teacher, admin
pub async fn get_course_progress(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(course_id): Path<Uuid>,
) -> Result<Json<CourseProgress>, AppError> {
    let result = sqlx::query_as::<_, CourseProgress>(
        r#"SELECT
              $1::UUID as user_id,
              $2::UUID as course_id,
              COUNT(l.id) as total_lessons,
              COUNT(lp.id) FILTER (WHERE lp.status = 'completed') as completed_lessons,
              CASE WHEN COUNT(l.id) > 0
                   THEN (COUNT(lp.id) FILTER (WHERE lp.status = 'completed'))::FLOAT / COUNT(l.id)
                   ELSE 0 END as completion_rate
           FROM lessons l
           LEFT JOIN lesson_progress lp
              ON lp.lesson_id = l.id AND lp.user_id = $1 AND lp.tenant_id = $3
           WHERE l.course_id = $2"#
    )
    .bind(claims.sub)
    .bind(course_id)
    .bind(tenant.0)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(result))
}

/// POST /api/v1/progress/signals
/// Role: student (own signals)
/// Delivery: last-write-wins (CC6)
pub async fn batch_upsert_signals(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<BatchSignalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut success = 0;
    let mut failed = 0;

    for signal in &body.signals {
        let result = sqlx::query(
            r#"INSERT INTO student_lesson_signals
                  (id, user_id, lesson_id, tenant_id,
                   total_time_spent, last_accessed_at, latest_quiz_score)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
               ON CONFLICT (user_id, lesson_id, tenant_id)
               DO UPDATE SET
                  total_time_spent = GREATEST(student_lesson_signals.total_time_spent, EXCLUDED.total_time_spent),
                  last_accessed_at = GREATEST(student_lesson_signals.last_accessed_at, EXCLUDED.last_accessed_at),
                  latest_quiz_score = CASE WHEN $5 > student_lesson_signals.last_accessed_at
                                           THEN EXCLUDED.latest_quiz_score
                                           ELSE student_lesson_signals.latest_quiz_score END"#
        )
        .bind(claims.sub)
        .bind(signal.lesson_id)
        .bind(tenant.0)
        .bind(signal.total_time_spent)
        .bind(signal.timestamp)
        .bind(signal.latest_quiz_score)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => success += 1,
            Err(_) => failed += 1,
        }
    }

    Ok(Json(serde_json::json!({
        "success": success,
        "failed": failed,
        "total": body.signals.len()
    })))
}
```

```rust
// Register di main.rs
let progress = ServiceProcess::new("progress")
    .prefix("/api/v1/progress")
    .endpoint(Method::POST, "/lesson", post(handlers::progress::upsert_lesson_progress))
    .endpoint(Method::GET, "/course/:course_id", get(handlers::progress::get_course_progress))
    .endpoint(Method::POST, "/signals", post(handlers::progress::batch_upsert_signals));
```

**VERIFY:**

```
cargo check
cargo test -- progress
curl -X POST -H "Authorization: Bearer $STUDENT_JWT" -H "Content-Type: application/json" \
  -d '{"lesson_id":"...","course_id":"...","status":"in_progress","progress_percentage":50,"timestamp":"2026-01-01T00:00:00Z"}' \
  http://localhost:8080/api/v1/progress/lesson
```

**STOP IF:**

- `lesson_progress` table schema mismatch → audit migrations
- `student_lesson_signals` column names tidak sesuai → GUNAKAN `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
- Unique constraint `(user_id, lesson_id, tenant_id)` tidak ada → buat migration dulu

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2C-7: xAPI Statement Endpoints

**TASK ID:** 2C-7

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** xAPI statement ingestion with idempotency keys — at-least-once delivery

**DEPENDENCY:** Task 2C-6 selesai

**PREREQUISITE CHECK (WAJIB sebelum mulai):**

- Verify `src/utils/offlineQueue.ts` sudah pakai `getApiClient()` (Phase 0A refactor). Jika masih `supabase.from()` / `supabase.rpc()` → BLOCKED, xAPI statements dari offline queue akan fail saat backend switch ke VIL.
- Verify `src/features/xapi/api/xapiQueue.ts` sudah pakai `getApiClient()`. Jika belum → BLOCKED.
- `grep -n "from '@/services/supabase/client'" src/utils/offlineQueue.ts src/features/xapi/` harus return 0 results.

**READ FIRST:**

- `src/features/xapi/api/` — xAPI service files
- CC6 di Main Plan: xAPI = **at-least-once** delivery, server dedup by idempotency key
- Idempotency key format: `xapi:{verb}:{objectType}:{objectId}:{userId}`
- `src/utils/offlineQueue.ts` — idempotency key generation pattern

**EDIT ONLY:**

- `edusync-api/crates/models/src/xapi.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs` (tambah module)
- `edusync-api/crates/server/src/handlers/xapi.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah module)
- `edusync-api/crates/server/src/main.rs` (register)

**DO NOT TOUCH:**

- `offlineQueue.ts` — idempotency key format sudah fixed
- Progress handlers (Task 2C-6)
- Frontend xAPI hook

**IMPLEMENTATION STEPS:**

1. Buat models: `XApiStatement`, `XApiBatchRequest`
2. Buat endpoints:
   - `POST /api/v1/xapi/statements` — single statement with idempotency
   - `POST /api/v1/xapi/statements/batch` — batch statements from offline queue
3. Idempotency: check `idempotency_key` column, return 200 (bukan 409) jika duplicate
4. At-least-once: server HARUS accept duplicate tanpa error

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/xapi.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct XApiStatement {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub verb: String,
    pub object_type: String,
    pub object_id: String,
    pub result: Option<serde_json::Value>,
    pub context: Option<serde_json::Value>,
    pub idempotency_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateXApiStatement {
    pub verb: String,
    pub object_type: String,
    pub object_id: String,
    pub result: Option<serde_json::Value>,
    pub context: Option<serde_json::Value>,
    /// Format: xapi:{verb}:{objectType}:{objectId}:{userId}
    /// MUST match offlineQueue.ts format
    pub idempotency_key: String,
}

#[derive(Debug, Deserialize)]
pub struct XApiBatchRequest {
    pub statements: Vec<CreateXApiStatement>,
}

#[derive(Debug, Serialize)]
pub struct XApiBatchResult {
    pub accepted: i32,
    pub duplicates: i32,
    pub failed: i32,
}
```

```rust
// edusync-api/crates/server/src/handlers/xapi.rs
use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::xapi::*;

/// POST /api/v1/xapi/statements
/// At-least-once delivery: return 200 for duplicates (CC6)
pub async fn create_statement(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<CreateXApiStatement>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Idempotency check — return 200 if already exists (NOT 409)
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM xapi_statements WHERE idempotency_key = $1 AND tenant_id = $2"
    )
    .bind(&body.idempotency_key)
    .bind(tenant.0)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    if existing > 0 {
        return Ok(Json(serde_json::json!({
            "status": "duplicate",
            "idempotency_key": body.idempotency_key
        })));
    }

    sqlx::query(
        r#"INSERT INTO xapi_statements
              (id, user_id, tenant_id, verb, object_type, object_id,
               result, context, idempotency_key, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())"#
    )
    .bind(claims.sub)
    .bind(tenant.0)
    .bind(&body.verb)
    .bind(&body.object_type)
    .bind(&body.object_id)
    .bind(&body.result)
    .bind(&body.context)
    .bind(&body.idempotency_key)
    .execute(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(serde_json::json!({
        "status": "accepted",
        "idempotency_key": body.idempotency_key
    })))
}

/// POST /api/v1/xapi/statements/batch
/// Batch from offline queue — at-least-once, return 200 for ALL
pub async fn batch_statements(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<XApiBatchRequest>,
) -> Result<Json<XApiBatchResult>, AppError> {
    let mut accepted = 0;
    let mut duplicates = 0;
    let mut failed = 0;

    for stmt in &body.statements {
        // Check idempotency
        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM xapi_statements WHERE idempotency_key = $1 AND tenant_id = $2"
        )
        .bind(&stmt.idempotency_key)
        .bind(tenant.0)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        if existing > 0 {
            duplicates += 1;
            continue;
        }

        let result = sqlx::query(
            r#"INSERT INTO xapi_statements
                  (id, user_id, tenant_id, verb, object_type, object_id,
                   result, context, idempotency_key, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())"#
        )
        .bind(claims.sub)
        .bind(tenant.0)
        .bind(&stmt.verb)
        .bind(&stmt.object_type)
        .bind(&stmt.object_id)
        .bind(&stmt.result)
        .bind(&stmt.context)
        .bind(&stmt.idempotency_key)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => accepted += 1,
            Err(_) => failed += 1,
        }
    }

    // Always return 200 — at-least-once delivery contract
    Ok(Json(XApiBatchResult { accepted, duplicates, failed }))
}
```

```rust
// Register di main.rs
let xapi = ServiceProcess::new("xapi")
    .prefix("/api/v1/xapi")
    .endpoint(Method::POST, "/statements", post(handlers::xapi::create_statement))
    .endpoint(Method::POST, "/statements/batch", post(handlers::xapi::batch_statements));
```

**VERIFY:**

```
cargo check
cargo test -- xapi
# Test idempotency — same key twice should return 200 both times:
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"verb":"completed","object_type":"lesson","object_id":"abc","idempotency_key":"xapi:completed:lesson:abc:user1"}' \
  http://localhost:8080/api/v1/xapi/statements
# Send same again — expect {"status":"duplicate"} with HTTP 200
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"verb":"completed","object_type":"lesson","object_id":"abc","idempotency_key":"xapi:completed:lesson:abc:user1"}' \
  http://localhost:8080/api/v1/xapi/statements
```

**STOP IF:**

- `xapi_statements` table tidak ada → buat migration: `CREATE TABLE xapi_statements (id UUID PK, user_id UUID, tenant_id UUID, verb TEXT, object_type TEXT, object_id TEXT, result JSONB, context JSONB, idempotency_key TEXT UNIQUE, created_at TIMESTAMPTZ)`
- Idempotency key format dari frontend berbeda → BLOCKED, verify against `offlineQueue.ts`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 📦 Batch 4 — Remaining Modules (Minggu 36-38)

---

## Task 2D-1: Notifications CRUD + Batching

**TASK ID:** 2D-1

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Notification CRUD endpoints + batch mark-as-read

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:**

- `src/features/notifications/api/` — notification service files
- CC7 di Main Plan: Notification fanout = 2 retries, then log and skip

**EDIT ONLY:**

- `edusync-api/crates/models/src/notification.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/notifications.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:**

- Realtime notification handlers (Phase 4)
- Email digest cron (Phase 3)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/notification.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub notification_type: String,
    pub is_read: bool,
    pub action_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListNotificationsParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub is_read: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct MarkReadRequest {
    pub notification_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub notification_type: String,
    pub action_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}
```

```rust
// edusync-api/crates/server/src/handlers/notifications.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::notification::*;

/// GET /api/v1/notifications
/// Role: all (own notifications)
pub async fn list_notifications(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<ListNotificationsParams>,
) -> Result<Json<Vec<Notification>>, AppError> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.page.unwrap_or(0) * limit;

    let notifications = sqlx::query_as::<_, Notification>(
        r#"SELECT id, user_id, tenant_id, title, body, notification_type,
                  is_read, action_url, metadata, created_at
           FROM notifications
           WHERE user_id = $1 AND tenant_id = $2
             AND ($3::BOOL IS NULL OR is_read = $3)
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#
    )
    .bind(claims.sub)
    .bind(tenant.0)
    .bind(params.is_read)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(notifications))
}

/// PUT /api/v1/notifications/mark-read
/// Role: all (own notifications)
pub async fn mark_read(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<MarkReadRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let count = sqlx::query_scalar::<_, i64>(
        r#"UPDATE notifications SET is_read = true
           WHERE id = ANY($1) AND user_id = $2 AND tenant_id = $3
           RETURNING id"#
    )
    .bind(&body.notification_ids)
    .bind(claims.sub)
    .bind(tenant.0)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?
    .len() as i64;

    Ok(Json(serde_json::json!({ "marked": count })))
}

/// PUT /api/v1/notifications/mark-all-read
pub async fn mark_all_read(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND tenant_id = $2 AND is_read = false"
    )
    .bind(claims.sub)
    .bind(tenant.0)
    .execute(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(serde_json::json!({ "status": "ok" })))
}

/// GET /api/v1/notifications/unread-count
pub async fn unread_count(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND tenant_id = $2 AND is_read = false"
    )
    .bind(claims.sub)
    .bind(tenant.0)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(serde_json::json!({ "unread_count": count })))
}
```

```rust
// Register di main.rs
let notifications = ServiceProcess::new("notifications")
    .prefix("/api/v1/notifications")
    .endpoint(Method::GET, "/", get(handlers::notifications::list_notifications))
    .endpoint(Method::PUT, "/mark-read", put(handlers::notifications::mark_read))
    .endpoint(Method::PUT, "/mark-all-read", put(handlers::notifications::mark_all_read))
    .endpoint(Method::GET, "/unread-count", get(handlers::notifications::unread_count));
```

**VERIFY:**

```
cargo check
cargo test -- notifications
```

**⚠️ PENTING:** Task ini HANYA covers notification CRUD (read, mark-read, unread-count). Email digest (`digestApi.ts` yang pakai `supabase.functions.invoke()`) tetap jalan via Supabase Edge Function sampai Phase 3C. Jangan implement digest endpoint di VIL di task ini.

**STOP IF:**

- `notifications` table schema mismatch → audit migration files

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-2: Discussions Forum CRUD

**TASK ID:** 2D-2

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Discussions forum — threads + comments CRUD

**DEPENDENCY:** Task 2D-1 selesai (notifications used by discussions)

**READ FIRST:**

- `src/features/discussions/api/` — discussion service files

**EDIT ONLY:**

- `edusync-api/crates/models/src/discussion.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/discussions.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:**

- Realtime discussion subscriptions (Phase 4)
- Notification handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/discussion.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DiscussionThread {
    pub id: Uuid,
    pub course_id: Uuid,
    pub tenant_id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_locked: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DiscussionComment {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub tenant_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub parent_comment_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateThreadRequest {
    pub course_id: Uuid,
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub content: String,
    pub parent_comment_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ListThreadsParams {
    pub course_id: Uuid,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}
```

```rust
// edusync-api/crates/server/src/handlers/discussions.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::discussion::*;

/// GET /api/v1/discussions?course_id=...
pub async fn list_threads(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<ListThreadsParams>,
) -> Result<Json<Vec<DiscussionThread>>, AppError> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.page.unwrap_or(0) * limit;

    let threads = sqlx::query_as::<_, DiscussionThread>(
        r#"SELECT id, course_id, tenant_id, author_id, title, content,
                  is_pinned, is_locked, created_at, updated_at
           FROM discussion_threads
           WHERE course_id = $1 AND tenant_id = $2
           ORDER BY is_pinned DESC NULLS LAST, created_at DESC
           LIMIT $3 OFFSET $4"#
    )
    .bind(params.course_id)
    .bind(tenant.0)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(threads))
}

/// POST /api/v1/discussions
pub async fn create_thread(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(body): Json<CreateThreadRequest>,
) -> Result<Json<DiscussionThread>, AppError> {
    let thread = sqlx::query_as::<_, DiscussionThread>(
        r#"INSERT INTO discussion_threads
              (id, course_id, tenant_id, author_id, title, content, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *"#
    )
    .bind(body.course_id)
    .bind(tenant.0)
    .bind(claims.sub)
    .bind(&body.title)
    .bind(&body.content)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(thread))
}

/// GET /api/v1/discussions/:thread_id/comments
pub async fn list_comments(
    State(state): State<AppState>,
    tenant: TenantId,
    _claims: Claims,
    Path(thread_id): Path<Uuid>,
) -> Result<Json<Vec<DiscussionComment>>, AppError> {
    let comments = sqlx::query_as::<_, DiscussionComment>(
        r#"SELECT id, thread_id, tenant_id, author_id, content,
                  parent_comment_id, created_at, updated_at
           FROM discussion_comments
           WHERE thread_id = $1 AND tenant_id = $2
           ORDER BY created_at ASC"#
    )
    .bind(thread_id)
    .bind(tenant.0)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(comments))
}

/// POST /api/v1/discussions/:thread_id/comments
pub async fn create_comment(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(thread_id): Path<Uuid>,
    Json(body): Json<CreateCommentRequest>,
) -> Result<Json<DiscussionComment>, AppError> {
    let comment = sqlx::query_as::<_, DiscussionComment>(
        r#"INSERT INTO discussion_comments
              (id, thread_id, tenant_id, author_id, content, parent_comment_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *"#
    )
    .bind(thread_id)
    .bind(tenant.0)
    .bind(claims.sub)
    .bind(&body.content)
    .bind(body.parent_comment_id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(comment))
}

/// DELETE /api/v1/discussions/:thread_id
/// Role: author or admin
pub async fn delete_thread(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(thread_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let thread = sqlx::query_as::<_, DiscussionThread>(
        "SELECT * FROM discussion_threads WHERE id = $1 AND tenant_id = $2"
    )
    .bind(thread_id)
    .bind(tenant.0)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("Thread not found"))?;

    if thread.author_id != claims.sub {
        claims.require_any_role(&["admin", "teacher"])?;
    }

    sqlx::query("DELETE FROM discussion_threads WHERE id = $1 AND tenant_id = $2")
        .bind(thread_id).bind(tenant.0).execute(&state.db).await.map_err(AppError::from)?;

    Ok(Json(serde_json::json!({ "deleted": thread_id })))
}
```

```rust
// Register di main.rs
let discussions = ServiceProcess::new("discussions")
    .prefix("/api/v1")
    .endpoint(Method::GET, "/discussions", get(handlers::discussions::list_threads))
    .endpoint(Method::POST, "/discussions", post(handlers::discussions::create_thread))
    .endpoint(Method::DELETE, "/discussions/:thread_id", delete(handlers::discussions::delete_thread))
    .endpoint(Method::GET, "/discussions/:thread_id/comments", get(handlers::discussions::list_comments))
    .endpoint(Method::POST, "/discussions/:thread_id/comments", post(handlers::discussions::create_comment));
```

**VERIFY:**

```
cargo check
cargo test -- discussions
```

**⚠️ PENTING:** Task ini covers discussions CRUD saja. Realtime subscription untuk new posts/comments (postgres_changes pattern di `discussionQueries.ts`) tetap via Supabase Realtime sampai Phase 4. VIL hanya handle REST CRUD.

**STOP IF:**

- `discussion_threads` / `discussion_comments` table tidak ada → audit migrations

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-3: Calendar Events CRUD

**TASK ID:** 2D-3

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Calendar events CRUD — simple CRUD

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:**

- `src/features/calendar/api/` — calendar service

**EDIT ONLY:**

- `edusync-api/crates/models/src/calendar.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/calendar.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** File frontend, auth handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/calendar.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CalendarEvent {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub event_type: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub all_day: Option<bool>,
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub event_type: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub all_day: Option<bool>,
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ListEventsParams {
    pub start: Option<NaiveDate>,
    pub end: Option<NaiveDate>,
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
}
```

```rust
// edusync-api/crates/server/src/handlers/calendar.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::calendar::*;

pub async fn list_events(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Query(params): Query<ListEventsParams>,
) -> Result<Json<Vec<CalendarEvent>>, AppError> {
    let events = sqlx::query_as::<_, CalendarEvent>(
        r#"SELECT * FROM calendar_events
           WHERE tenant_id = $1
             AND ($2::DATE IS NULL OR start_date >= $2::TIMESTAMPTZ)
             AND ($3::DATE IS NULL OR start_date <= $3::TIMESTAMPTZ)
             AND ($4::UUID IS NULL OR course_id = $4)
             AND ($5::UUID IS NULL OR class_id = $5)
           ORDER BY start_date ASC"#
    )
    .bind(tenant.0).bind(params.start).bind(params.end)
    .bind(params.course_id).bind(params.class_id)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(events))
}

pub async fn create_event(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<CreateEventRequest>,
) -> Result<Json<CalendarEvent>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let event = sqlx::query_as::<_, CalendarEvent>(
        r#"INSERT INTO calendar_events
              (id, tenant_id, created_by, title, description, event_type,
               start_date, end_date, all_day, course_id, class_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
           RETURNING *"#
    )
    .bind(tenant.0).bind(claims.sub).bind(&body.title).bind(&body.description)
    .bind(&body.event_type).bind(body.start_date).bind(body.end_date)
    .bind(body.all_day).bind(body.course_id).bind(body.class_id)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(event))
}

pub async fn update_event(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(id): Path<Uuid>, Json(body): Json<CreateEventRequest>,
) -> Result<Json<CalendarEvent>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let event = sqlx::query_as::<_, CalendarEvent>(
        r#"UPDATE calendar_events SET title=$3, description=$4, event_type=$5,
              start_date=$6, end_date=$7, all_day=$8, course_id=$9, class_id=$10, updated_at=NOW()
           WHERE id=$1 AND tenant_id=$2 RETURNING *"#
    )
    .bind(id).bind(tenant.0).bind(&body.title).bind(&body.description)
    .bind(&body.event_type).bind(body.start_date).bind(body.end_date)
    .bind(body.all_day).bind(body.course_id).bind(body.class_id)
    .fetch_optional(&state.db).await.map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("Event not found"))?;
    Ok(Json(event))
}

pub async fn delete_event(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    sqlx::query("DELETE FROM calendar_events WHERE id=$1 AND tenant_id=$2")
        .bind(id).bind(tenant.0).execute(&state.db).await.map_err(AppError::from)?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
```

```rust
// Register
let calendar = ServiceProcess::new("calendar")
    .prefix("/api/v1/calendar")
    .endpoint(Method::GET, "/events", get(handlers::calendar::list_events))
    .endpoint(Method::POST, "/events", post(handlers::calendar::create_event))
    .endpoint(Method::PUT, "/events/:id", put(handlers::calendar::update_event))
    .endpoint(Method::DELETE, "/events/:id", delete(handlers::calendar::delete_event));
```

**VERIFY:**

```
cargo check
cargo test -- calendar
```

**STOP IF:** `calendar_events` table tidak ada → buat migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-4: Attendance (QR + Manual)

**TASK ID:** 2D-4

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Attendance CRUD — QR code check-in + manual attendance

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/attendance/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/attendance.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/attendance.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** File frontend, auth handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/attendance.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub class_id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub status: String,  // 'present' | 'absent' | 'late' | 'excused'
    pub check_in_method: Option<String>,  // 'qr' | 'manual'
    pub checked_in_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RecordAttendanceRequest {
    pub class_id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub status: String,
    pub check_in_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QrCheckInRequest {
    pub class_id: Uuid,
    pub qr_token: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkAttendanceRequest {
    pub records: Vec<RecordAttendanceRequest>,
}

#[derive(Debug, Deserialize)]
pub struct ListAttendanceParams {
    pub class_id: Uuid,
    pub date: Option<NaiveDate>,
    pub user_id: Option<Uuid>,
}
```

```rust
// edusync-api/crates/server/src/handlers/attendance.rs
use axum::extract::{Query, State};
use axum::Json;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::attendance::*;

pub async fn list_attendance(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Query(params): Query<ListAttendanceParams>,
) -> Result<Json<Vec<AttendanceRecord>>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let records = sqlx::query_as::<_, AttendanceRecord>(
        r#"SELECT * FROM attendance_records
           WHERE class_id = $1 AND tenant_id = $2
             AND ($3::DATE IS NULL OR date = $3)
             AND ($4::UUID IS NULL OR user_id = $4)
           ORDER BY date DESC, user_id"#
    )
    .bind(params.class_id).bind(tenant.0).bind(params.date).bind(params.user_id)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(records))
}

pub async fn record_attendance(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<RecordAttendanceRequest>,
) -> Result<Json<AttendanceRecord>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let record = sqlx::query_as::<_, AttendanceRecord>(
        r#"INSERT INTO attendance_records
              (id, tenant_id, class_id, user_id, date, status, check_in_method, checked_in_at, notes, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
           ON CONFLICT (class_id, user_id, date, tenant_id)
           DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, check_in_method = EXCLUDED.check_in_method
           RETURNING *"#
    )
    .bind(tenant.0).bind(body.class_id).bind(body.user_id).bind(body.date)
    .bind(&body.status).bind(&body.check_in_method).bind(&body.notes)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(record))
}

pub async fn bulk_attendance(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<BulkAttendanceRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let mut success = 0;
    for record in &body.records {
        let result = sqlx::query(
            r#"INSERT INTO attendance_records
                  (id, tenant_id, class_id, user_id, date, status, check_in_method, notes, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
               ON CONFLICT (class_id, user_id, date, tenant_id)
               DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes"#
        )
        .bind(tenant.0).bind(record.class_id).bind(record.user_id).bind(record.date)
        .bind(&record.status).bind(&record.check_in_method).bind(&record.notes)
        .execute(&state.db).await;
        if result.is_ok() { success += 1; }
    }
    Ok(Json(serde_json::json!({ "success": success, "total": body.records.len() })))
}

pub async fn qr_check_in(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<QrCheckInRequest>,
) -> Result<Json<AttendanceRecord>, AppError> {
    // Validate QR token (class_id + date + secret hash)
    // For now, just record attendance with qr method
    let today = chrono::Utc::now().date_naive();
    let record = sqlx::query_as::<_, AttendanceRecord>(
        r#"INSERT INTO attendance_records
              (id, tenant_id, class_id, user_id, date, status, check_in_method, checked_in_at, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'present', 'qr', NOW(), NOW())
           ON CONFLICT (class_id, user_id, date, tenant_id)
           DO UPDATE SET status = 'present', check_in_method = 'qr', checked_in_at = NOW()
           RETURNING *"#
    )
    .bind(tenant.0).bind(body.class_id).bind(claims.sub).bind(today)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(record))
}
```

```rust
// Register
let attendance = ServiceProcess::new("attendance")
    .prefix("/api/v1/attendance")
    .endpoint(Method::GET, "/", get(handlers::attendance::list_attendance))
    .endpoint(Method::POST, "/record", post(handlers::attendance::record_attendance))
    .endpoint(Method::POST, "/bulk", post(handlers::attendance::bulk_attendance))
    .endpoint(Method::POST, "/qr-check-in", post(handlers::attendance::qr_check_in));
```

**VERIFY:**

```
cargo check
cargo test -- attendance
```

**STOP IF:** `attendance_records` table / unique constraint missing → buat migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-5: Certificates Generation

**TASK ID:** 2D-5

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Certificate CRUD + generation trigger

**DEPENDENCY:** Phase 2 Batch 1 courses selesai

**READ FIRST:** `src/features/certificates/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/certificate.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/certificates.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** PDF generation (Phase 3), file frontend

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/certificate.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Certificate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub certificate_number: Option<String>,
    pub issued_at: DateTime<Utc>,
    pub pdf_url: Option<String>,
    pub verified: Option<bool>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct IssueCertificateRequest {
    pub user_id: Uuid,
    pub course_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct VerifyCertificateParams {
    pub certificate_number: String,
}
```

```rust
// edusync-api/crates/server/src/handlers/certificates.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::certificate::*;

pub async fn list_certificates(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<Certificate>>, AppError> {
    let user_id = claims.sub;
    let certs = sqlx::query_as::<_, Certificate>(
        "SELECT * FROM certificates WHERE user_id = $1 AND tenant_id = $2 ORDER BY issued_at DESC"
    )
    .bind(user_id).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(certs))
}

pub async fn issue_certificate(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<IssueCertificateRequest>,
) -> Result<Json<Certificate>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let cert_number = format!("EDU-{}-{}", tenant.0.to_string().split('-').next().unwrap_or("X"),
        chrono::Utc::now().format("%Y%m%d%H%M%S"));
    let cert = sqlx::query_as::<_, Certificate>(
        r#"INSERT INTO certificates
              (id, tenant_id, user_id, course_id, certificate_number, issued_at, verified, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), true, NOW())
           RETURNING *"#
    )
    .bind(tenant.0).bind(body.user_id).bind(body.course_id).bind(&cert_number)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(cert))
}

pub async fn verify_certificate(
    State(state): State<AppState>,
    Query(params): Query<VerifyCertificateParams>,
) -> Result<Json<serde_json::Value>, AppError> {
    let cert = sqlx::query_as::<_, Certificate>(
        "SELECT * FROM certificates WHERE certificate_number = $1 AND verified = true"
    )
    .bind(&params.certificate_number)
    .fetch_optional(&state.db).await.map_err(AppError::from)?;
    match cert {
        Some(c) => Ok(Json(serde_json::json!({ "valid": true, "certificate": c }))),
        None => Ok(Json(serde_json::json!({ "valid": false }))),
    }
}
```

```rust
let certificates = ServiceProcess::new("certificates")
    .prefix("/api/v1/certificates")
    .endpoint(Method::GET, "/", get(handlers::certificates::list_certificates))
    .endpoint(Method::POST, "/issue", post(handlers::certificates::issue_certificate))
    .endpoint(Method::GET, "/verify", get(handlers::certificates::verify_certificate));
```

**VERIFY:**

```
cargo check
cargo test -- certificates
```

**STOP IF:** `certificates` table missing → buat migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-6: Gamification (XP, Badges, Streaks, Leaderboard)

**TASK ID:** 2D-6

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Gamification CRUD — XP, badges, streaks, leaderboard

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/gamification/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/gamification.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/gamification.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Analytics gamification leaderboard RPC (Task 2C-3), frontend

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/gamification.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserXp {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub total_xp: i64,
    pub level: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_activity_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Badge {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub criteria: Option<serde_json::Value>,
    pub xp_reward: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserBadge {
    pub id: Uuid,
    pub user_id: Uuid,
    pub badge_id: Uuid,
    pub tenant_id: Uuid,
    pub earned_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub full_name: Option<String>,
    pub total_xp: i64,
    pub level: i32,
    pub rank: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AddXpRequest {
    pub user_id: Uuid,
    pub xp_amount: i32,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardParams {
    pub class_id: Option<Uuid>,
    pub limit: Option<i64>,
}
```

```rust
// edusync-api/crates/server/src/handlers/gamification.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::gamification::*;

pub async fn get_user_xp(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<UserXp>, AppError> {
    let xp = sqlx::query_as::<_, UserXp>(
        "SELECT * FROM user_xp WHERE user_id = $1 AND tenant_id = $2"
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_optional(&state.db).await.map_err(AppError::from)?
    .unwrap_or(UserXp {
        user_id: claims.sub, tenant_id: tenant.0,
        total_xp: 0, level: 1, current_streak: 0, longest_streak: 0,
        last_activity_date: None,
    });
    Ok(Json(xp))
}

pub async fn add_xp(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<AddXpRequest>,
) -> Result<Json<UserXp>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let xp = sqlx::query_as::<_, UserXp>(
        r#"INSERT INTO user_xp (user_id, tenant_id, total_xp, level, current_streak, longest_streak)
           VALUES ($1, $2, $3, 1, 0, 0)
           ON CONFLICT (user_id, tenant_id)
           DO UPDATE SET total_xp = user_xp.total_xp + $3,
              level = GREATEST(1, (user_xp.total_xp + $3) / 1000 + 1)
           RETURNING *"#
    )
    .bind(body.user_id).bind(tenant.0).bind(body.xp_amount as i64)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(xp))
}

pub async fn get_leaderboard(
    State(state): State<AppState>, tenant: TenantId, _claims: Claims,
    Query(params): Query<LeaderboardParams>,
) -> Result<Json<Vec<LeaderboardEntry>>, AppError> {
    let limit = params.limit.unwrap_or(20).min(100);
    let entries = sqlx::query_as::<_, LeaderboardEntry>(
        r#"SELECT x.user_id, p.full_name, x.total_xp, x.level,
                  ROW_NUMBER() OVER (ORDER BY x.total_xp DESC) as rank
           FROM user_xp x
           JOIN profiles p ON p.id = x.user_id
           WHERE x.tenant_id = $1
           ORDER BY x.total_xp DESC
           LIMIT $2"#
    )
    .bind(tenant.0).bind(limit)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(entries))
}

pub async fn list_badges(
    State(state): State<AppState>, tenant: TenantId, _claims: Claims,
) -> Result<Json<Vec<Badge>>, AppError> {
    let badges = sqlx::query_as::<_, Badge>(
        "SELECT * FROM badges WHERE tenant_id = $1 ORDER BY name"
    )
    .bind(tenant.0).fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(badges))
}

pub async fn get_user_badges(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<UserBadge>>, AppError> {
    let badges = sqlx::query_as::<_, UserBadge>(
        "SELECT * FROM user_badges WHERE user_id = $1 AND tenant_id = $2 ORDER BY earned_at DESC"
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(badges))
}
```

```rust
let gamification = ServiceProcess::new("gamification")
    .prefix("/api/v1/gamification")
    .endpoint(Method::GET, "/xp", get(handlers::gamification::get_user_xp))
    .endpoint(Method::POST, "/xp", post(handlers::gamification::add_xp))
    .endpoint(Method::GET, "/leaderboard", get(handlers::gamification::get_leaderboard))
    .endpoint(Method::GET, "/badges", get(handlers::gamification::list_badges))
    .endpoint(Method::GET, "/badges/me", get(handlers::gamification::get_user_badges));
```

**VERIFY:**

```
cargo check
cargo test -- gamification
```

**STOP IF:**

- `user_xp` / `badges` / `user_badges` tables missing → buat migrations
- Leaderboard query terlalu lambat (> 500ms untuk 1000+ students) → tambahkan materialized view atau caching
- Jika streak logic lebih complex dari simple daily check → BLOCKED, split task jadi 2D-6a (XP + Badges) dan 2D-6b (Streaks + Leaderboard)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-7: Parent Portal

**TASK ID:** 2D-7

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Parent portal — view linked children, progress, messages

**DEPENDENCY:** Task 2D-1 (notifications), Task 2D-2 (discussions) selesai

**READ FIRST:** `src/features/parent/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/parent.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/parent.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Auth, notification, discussion handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/parent.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ParentChild {
    pub parent_id: Uuid,
    pub child_id: Uuid,
    pub child_name: Option<String>,
    pub child_email: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ChildProgress {
    pub course_id: Uuid,
    pub course_title: Option<String>,
    pub completion_rate: Option<f64>,
    pub avg_score: Option<f64>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ParentMessage {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub receiver_id: Uuid,
    pub content: String,
}
```

```rust
// edusync-api/crates/server/src/handlers/parent.rs
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::parent::*;

pub async fn list_children(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<ParentChild>>, AppError> {
    claims.require_any_role(&["parent"])?;
    let children = sqlx::query_as::<_, ParentChild>(
        r#"SELECT pc.parent_id, pc.child_id, p.full_name as child_name,
                  p.email as child_email, pc.tenant_id
           FROM parent_children pc
           JOIN profiles p ON p.id = pc.child_id
           WHERE pc.parent_id = $1 AND pc.tenant_id = $2"#
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(children))
}

pub async fn get_child_progress(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(child_id): Path<Uuid>,
) -> Result<Json<Vec<ChildProgress>>, AppError> {
    claims.require_any_role(&["parent"])?;
    // Verify parent-child relationship
    let linked = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM parent_children WHERE parent_id = $1 AND child_id = $2 AND tenant_id = $3"
    )
    .bind(claims.sub).bind(child_id).bind(tenant.0)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    if linked == 0 {
        return Err(AppError::forbidden("Tidak memiliki akses ke data anak ini"));
    }
    let progress = sqlx::query_as::<_, ChildProgress>(
        r#"SELECT c.id as course_id, c.title as course_title,
                  COALESCE(AVG(lp.progress_percentage), 0) as completion_rate,
                  AVG(sls.latest_quiz_score) as avg_score,
                  MAX(sls.last_accessed_at) as last_accessed_at
           FROM enrollments e
           JOIN courses c ON c.id = e.course_id
           LEFT JOIN lesson_progress lp ON lp.course_id = c.id AND lp.user_id = $1
           LEFT JOIN student_lesson_signals sls ON sls.user_id = $1 AND sls.tenant_id = $2
           WHERE e.user_id = $1 AND e.tenant_id = $2
           GROUP BY c.id, c.title"#
    )
    .bind(child_id).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(progress))
}

pub async fn list_messages(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<ParentMessage>>, AppError> {
    claims.require_any_role(&["parent", "teacher"])?;
    let messages = sqlx::query_as::<_, ParentMessage>(
        r#"SELECT * FROM parent_messages
           WHERE (sender_id = $1 OR receiver_id = $1) AND tenant_id = $2
           ORDER BY created_at DESC LIMIT 50"#
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(messages))
}

pub async fn send_message(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<SendMessageRequest>,
) -> Result<Json<ParentMessage>, AppError> {
    claims.require_any_role(&["parent", "teacher"])?;
    let msg = sqlx::query_as::<_, ParentMessage>(
        r#"INSERT INTO parent_messages
              (id, sender_id, receiver_id, tenant_id, content, is_read, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW())
           RETURNING *"#
    )
    .bind(claims.sub).bind(body.receiver_id).bind(tenant.0).bind(&body.content)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(msg))
}
```

```rust
let parent = ServiceProcess::new("parent")
    .prefix("/api/v1/parent")
    .endpoint(Method::GET, "/children", get(handlers::parent::list_children))
    .endpoint(Method::GET, "/children/:child_id/progress", get(handlers::parent::get_child_progress))
    .endpoint(Method::GET, "/messages", get(handlers::parent::list_messages))
    .endpoint(Method::POST, "/messages", post(handlers::parent::send_message));
```

**VERIFY:**

```
cargo check
cargo test -- parent
```

**STOP IF:**

- `parent_children` / `parent_messages` tables missing → buat migrations
- Table name mismatch: jika actual table adalah `parent_student_links` atau `parent_student_relations` (bukan `parent_children`) → ADAPT query ke nama tabel yang benar. Run `\dt *parent*` di psql terlebih dahulu.

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-8: Principal Dashboard

**TASK ID:** 2D-8

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Principal dashboard endpoints — executive reports, surveys overview

**DEPENDENCY:** Task 2C-1 (analytics) selesai

**READ FIRST:** `src/features/principal/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/principal.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/principal.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Analytics handlers (sudah dibuat), stored procedures

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/principal.rs
// Principal endpoints are mostly thin wrappers around analytics RPCs.
// Reuse existing analytics stored procedures.

use axum::extract::{Query, State};
use axum::Json;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct ReportParams {
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub report_type: Option<String>,
}

/// GET /api/v1/principal/overview
pub async fn get_overview(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["principal", "admin"])?;
    let result = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT get_principal_overview_cached($1)"
    )
    .bind(tenant.0).fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(result))
}

/// GET /api/v1/principal/reports
pub async fn get_reports(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Query(params): Query<ReportParams>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["principal", "admin"])?;
    // Delegate to stored procedure
    let result = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT get_executive_overview($1, $2, $3)"
    )
    .bind(tenant.0).bind(params.start_date).bind(params.end_date)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(result))
}

/// GET /api/v1/principal/school-stats
pub async fn get_school_stats(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["principal", "admin"])?;
    let stats = sqlx::query_as::<_, (Option<i64>, Option<i64>, Option<i64>, Option<i64>)>(
        r#"SELECT
              (SELECT COUNT(*) FROM profiles WHERE tenant_id = $1 AND is_active = true),
              (SELECT COUNT(*) FROM courses WHERE tenant_id = $1),
              (SELECT COUNT(*) FROM classes WHERE tenant_id = $1),
              (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE tenant_id = $1 AND role = 'teacher')"#
    )
    .bind(tenant.0).fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(serde_json::json!({
        "total_users": stats.0, "total_courses": stats.1,
        "total_classes": stats.2, "total_teachers": stats.3
    })))
}
```

```rust
let principal = ServiceProcess::new("principal")
    .prefix("/api/v1/principal")
    .endpoint(Method::GET, "/overview", get(handlers::principal::get_overview))
    .endpoint(Method::GET, "/reports", get(handlers::principal::get_reports))
    .endpoint(Method::GET, "/school-stats", get(handlers::principal::get_school_stats));
```

**VERIFY:**

```
cargo check
cargo test -- principal
```

**STOP IF:** Stored procedures tidak tersedia → gunakan direct SQL queries

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-9: Teacher Onboarding Wizard

**TASK ID:** 2D-9

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Onboarding wizard — track teacher setup progress

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/onboarding/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/onboarding.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/onboarding.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Auth, course, class handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/onboarding.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OnboardingProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub step: String,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStepRequest {
    pub step: String,
    pub completed: bool,
    pub metadata: Option<serde_json::Value>,
}
```

```rust
// edusync-api/crates/server/src/handlers/onboarding.rs
use axum::extract::State;
use axum::Json;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::onboarding::*;

pub async fn get_progress(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<OnboardingProgress>>, AppError> {
    let progress = sqlx::query_as::<_, OnboardingProgress>(
        "SELECT * FROM onboarding_progress WHERE user_id = $1 AND tenant_id = $2 ORDER BY step"
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(progress))
}

pub async fn update_step(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<UpdateStepRequest>,
) -> Result<Json<OnboardingProgress>, AppError> {
    let completed_at = if body.completed { Some(chrono::Utc::now()) } else { None };
    let progress = sqlx::query_as::<_, OnboardingProgress>(
        r#"INSERT INTO onboarding_progress (id, user_id, tenant_id, step, completed, completed_at, metadata)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, tenant_id, step)
           DO UPDATE SET completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at,
              metadata = COALESCE(EXCLUDED.metadata, onboarding_progress.metadata)
           RETURNING *"#
    )
    .bind(claims.sub).bind(tenant.0).bind(&body.step).bind(body.completed)
    .bind(completed_at).bind(&body.metadata)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(progress))
}
```

```rust
let onboarding = ServiceProcess::new("onboarding")
    .prefix("/api/v1/onboarding")
    .endpoint(Method::GET, "/progress", get(handlers::onboarding::get_progress))
    .endpoint(Method::POST, "/step", post(handlers::onboarding::update_step));
```

**VERIFY:**

```
cargo check
cargo test -- onboarding
```

**STOP IF:** `onboarding_progress` table missing → buat migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-9: Teacher Onboarding Wizard

**TASK ID:** 2D-9

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Onboarding wizard — track teacher setup progress

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/onboarding/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/onboarding.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/onboarding.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Auth, course, class handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/onboarding.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OnboardingProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub step: String,
    pub completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStepRequest {
    pub step: String,
    pub completed: bool,
    pub metadata: Option<serde_json::Value>,
}
```

```rust
// edusync-api/crates/server/src/handlers/onboarding.rs
use axum::extract::State;
use axum::Json;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::onboarding::*;

pub async fn get_progress(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<OnboardingProgress>>, AppError> {
    let progress = sqlx::query_as::<_, OnboardingProgress>(
        "SELECT * FROM onboarding_progress WHERE user_id = $1 AND tenant_id = $2 ORDER BY step"
    )
    .bind(claims.sub).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(progress))
}

pub async fn update_step(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<UpdateStepRequest>,
) -> Result<Json<OnboardingProgress>, AppError> {
    let completed_at = if body.completed { Some(chrono::Utc::now()) } else { None };
    let progress = sqlx::query_as::<_, OnboardingProgress>(
        r#"INSERT INTO onboarding_progress (id, user_id, tenant_id, step, completed, completed_at, metadata)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, tenant_id, step)
           DO UPDATE SET completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at,
              metadata = COALESCE(EXCLUDED.metadata, onboarding_progress.metadata)
           RETURNING *"#
    )
    .bind(claims.sub).bind(tenant.0).bind(&body.step).bind(body.completed)
    .bind(completed_at).bind(&body.metadata)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(progress))
}
```

```rust
let onboarding = ServiceProcess::new("onboarding")
    .prefix("/api/v1/onboarding")
    .endpoint(Method::GET, "/progress", get(handlers::onboarding::get_progress))
    .endpoint(Method::POST, "/step", post(handlers::onboarding::update_step));
```

**VERIFY:**

```
cargo check
cargo test -- onboarding
```

**STOP IF:** `onboarding_progress` table missing → buat migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-10: Surveys CRUD

**TASK ID:** 2D-10

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Surveys CRUD + responses

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/surveys/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/survey.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/surveys.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Frontend, analytics handlers

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/survey.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Survey {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub questions: Option<serde_json::Value>,
    pub status: String,  // 'draft' | 'active' | 'closed'
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SurveyResponse {
    pub id: Uuid,
    pub survey_id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub answers: serde_json::Value,
    pub submitted_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSurveyRequest {
    pub title: String,
    pub description: Option<String>,
    pub questions: serde_json::Value,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitResponseRequest {
    pub answers: serde_json::Value,
}
```

```rust
// edusync-api/crates/server/src/handlers/surveys.rs
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::survey::*;

pub async fn list_surveys(
    State(state): State<AppState>, tenant: TenantId, _claims: Claims,
) -> Result<Json<Vec<Survey>>, AppError> {
    let surveys = sqlx::query_as::<_, Survey>(
        "SELECT * FROM surveys WHERE tenant_id = $1 ORDER BY created_at DESC"
    )
    .bind(tenant.0).fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(surveys))
}

pub async fn create_survey(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<CreateSurveyRequest>,
) -> Result<Json<Survey>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;
    let survey = sqlx::query_as::<_, Survey>(
        r#"INSERT INTO surveys (id, tenant_id, created_by, title, description, questions, status, start_date, end_date, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'draft', $6, $7, NOW())
           RETURNING *"#
    )
    .bind(tenant.0).bind(claims.sub).bind(&body.title).bind(&body.description)
    .bind(&body.questions).bind(body.start_date).bind(body.end_date)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(survey))
}

pub async fn submit_response(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(survey_id): Path<Uuid>, Json(body): Json<SubmitResponseRequest>,
) -> Result<Json<SurveyResponse>, AppError> {
    let response = sqlx::query_as::<_, SurveyResponse>(
        r#"INSERT INTO survey_responses (id, survey_id, user_id, tenant_id, answers, submitted_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
           RETURNING *"#
    )
    .bind(survey_id).bind(claims.sub).bind(tenant.0).bind(&body.answers)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(response))
}

pub async fn get_survey_results(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(survey_id): Path<Uuid>,
) -> Result<Json<Vec<SurveyResponse>>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;
    let responses = sqlx::query_as::<_, SurveyResponse>(
        "SELECT * FROM survey_responses WHERE survey_id = $1 AND tenant_id = $2 ORDER BY submitted_at"
    )
    .bind(survey_id).bind(tenant.0)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(responses))
}
```

```rust
let surveys = ServiceProcess::new("surveys")
    .prefix("/api/v1/surveys")
    .endpoint(Method::GET, "/", get(handlers::surveys::list_surveys))
    .endpoint(Method::POST, "/", post(handlers::surveys::create_survey))
    .endpoint(Method::POST, "/:survey_id/respond", post(handlers::surveys::submit_response))
    .endpoint(Method::GET, "/:survey_id/results", get(handlers::surveys::get_survey_results));
```

**VERIFY:**

```
cargo check
cargo test -- surveys
```

**STOP IF:**

- `surveys` / `survey_responses` tables missing → buat migrations
- Frontend `src/features/surveys/` has TODO stubs atau < 50% feature completion → SKIP, keep on Supabase proxy

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-11: Finance (SPP Tracking)

**TASK ID:** 2D-11

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Finance / SPP (Sumbangan Pembinaan Pendidikan) tracking — 5 RPCs

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:** `src/features/finance/api/`

**EDIT ONLY:**

- `edusync-api/crates/models/src/finance.rs` (BUAT BARU)
- `edusync-api/crates/models/src/lib.rs`
- `edusync-api/crates/server/src/handlers/finance.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Frontend, analytics

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/finance.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SppRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub student_id: Uuid,
    pub amount: f64,
    pub due_date: NaiveDate,
    pub paid_date: Option<NaiveDate>,
    pub status: String,    // 'pending' | 'paid' | 'overdue' | 'partial'
    pub payment_method: Option<String>,
    pub receipt_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSppRequest {
    pub student_id: Uuid,
    pub amount: f64,
    pub due_date: NaiveDate,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RecordPaymentRequest {
    pub paid_date: NaiveDate,
    pub payment_method: Option<String>,
    pub amount_paid: f64,
}

#[derive(Debug, Deserialize)]
pub struct SppListParams {
    pub student_id: Option<Uuid>,
    pub status: Option<String>,
    pub month: Option<i32>,
    pub year: Option<i32>,
}
```

```rust
// edusync-api/crates/server/src/handlers/finance.rs
use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;
use edusync_models::finance::*;

pub async fn list_spp(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Query(params): Query<SppListParams>,
) -> Result<Json<Vec<SppRecord>>, AppError> {
    claims.require_any_role(&["admin", "parent"])?;
    let records = sqlx::query_as::<_, SppRecord>(
        r#"SELECT * FROM spp_records
           WHERE tenant_id = $1
             AND ($2::UUID IS NULL OR student_id = $2)
             AND ($3::TEXT IS NULL OR status = $3)
           ORDER BY due_date DESC"#
    )
    .bind(tenant.0).bind(params.student_id).bind(&params.status)
    .fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(records))
}

pub async fn create_spp(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<CreateSppRequest>,
) -> Result<Json<SppRecord>, AppError> {
    claims.require_any_role(&["admin"])?;
    let record = sqlx::query_as::<_, SppRecord>(
        r#"INSERT INTO spp_records
              (id, tenant_id, student_id, amount, due_date, status, notes, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', $5, NOW(), NOW())
           RETURNING *"#
    )
    .bind(tenant.0).bind(body.student_id).bind(body.amount)
    .bind(body.due_date).bind(&body.notes)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(record))
}

pub async fn record_payment(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(spp_id): Path<Uuid>, Json(body): Json<RecordPaymentRequest>,
) -> Result<Json<SppRecord>, AppError> {
    claims.require_any_role(&["admin"])?;
    let receipt = format!("SPP-{}-{}", tenant.0.to_string().split('-').next().unwrap_or("X"),
        chrono::Utc::now().format("%Y%m%d%H%M%S"));
    let record = sqlx::query_as::<_, SppRecord>(
        r#"UPDATE spp_records SET
              paid_date = $3, payment_method = $4, status = 'paid',
              receipt_number = $5, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING *"#
    )
    .bind(spp_id).bind(tenant.0).bind(body.paid_date)
    .bind(&body.payment_method).bind(&receipt)
    .fetch_optional(&state.db).await.map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("SPP record not found"))?;
    Ok(Json(record))
}

pub async fn get_spp_summary(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["admin", "principal"])?;
    let summary = sqlx::query_as::<_, (Option<i64>, Option<f64>, Option<i64>, Option<f64>)>(
        r#"SELECT
              COUNT(*) FILTER (WHERE status = 'paid'),
              SUM(amount) FILTER (WHERE status = 'paid'),
              COUNT(*) FILTER (WHERE status = 'pending' OR status = 'overdue'),
              SUM(amount) FILTER (WHERE status = 'pending' OR status = 'overdue')
           FROM spp_records WHERE tenant_id = $1"#
    )
    .bind(tenant.0).fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(serde_json::json!({
        "paid_count": summary.0, "paid_total": summary.1,
        "outstanding_count": summary.2, "outstanding_total": summary.3
    })))
}
```

```rust
let finance = ServiceProcess::new("finance")
    .prefix("/api/v1/finance")
    .endpoint(Method::GET, "/spp", get(handlers::finance::list_spp))
    .endpoint(Method::POST, "/spp", post(handlers::finance::create_spp))
    .endpoint(Method::POST, "/spp/:spp_id/pay", post(handlers::finance::record_payment))
    .endpoint(Method::GET, "/spp/summary", get(handlers::finance::get_spp_summary));
```

**VERIFY:**

```
cargo check
cargo test -- finance
```

**STOP IF:**

- `spp_records` table missing → buat migration
- Frontend `src/features/finance/` has TODO stubs atau < 50% feature completion → SKIP, keep on Supabase proxy
- Finance reconciliation logic terlalu complex → BLOCKED, document complexity

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2D-12: Search + Moderation (ILIKE keyword filter)

**TASK ID:** 2D-12

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Global search (PostgreSQL ILIKE keyword filter, bukan full-text ts_vector) + content moderation CRUD (manual report/resolve, bukan AI-based). Search scope: courses, discussions, users by name. Moderation scope: user-reported content → admin reviews → resolve/dismiss.

**DEPENDENCY:** Phase 2 Batch 1-3 selesai (search queries across multiple tables)

**READ FIRST:**

- `src/features/search/api/` — search service (verify scope: ILIKE atau ts_vector?)
- `src/features/moderation/api/` — moderation service (verify: manual reports or AI?)

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/search.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/moderation.rs` (BUAT BARU)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/main.rs`

**DO NOT TOUCH:** Existing handlers, frontend

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/search.rs
use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub entity_type: Option<String>,  // 'course' | 'lesson' | 'discussion' | 'user'
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub id: Uuid,
    pub entity_type: String,
    pub title: String,
    pub snippet: Option<String>,
    pub url: Option<String>,
}

/// GET /api/v1/search?q=...&entity_type=...
pub async fn global_search(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<SearchResult>>, AppError> {
    let limit = params.limit.unwrap_or(20).min(50);
    let search_term = format!("%{}%", params.q);
    let mut results = Vec::new();

    // Search courses
    if params.entity_type.is_none() || params.entity_type.as_deref() == Some("course") {
        let courses = sqlx::query_as::<_, (Uuid, String, Option<String>)>(
            r#"SELECT id, title, description FROM courses
               WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
               LIMIT $3"#
        )
        .bind(tenant.0).bind(&search_term).bind(limit)
        .fetch_all(&state.db).await.map_err(AppError::from)?;
        for (id, title, desc) in courses {
            results.push(SearchResult {
                id, entity_type: "course".into(), title,
                snippet: desc, url: None,
            });
        }
    }

    // Search discussions
    if params.entity_type.is_none() || params.entity_type.as_deref() == Some("discussion") {
        let threads = sqlx::query_as::<_, (Uuid, String, Option<String>)>(
            r#"SELECT id, title, content FROM discussion_threads
               WHERE tenant_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
               LIMIT $3"#
        )
        .bind(tenant.0).bind(&search_term).bind(limit)
        .fetch_all(&state.db).await.map_err(AppError::from)?;
        for (id, title, content) in threads {
            results.push(SearchResult {
                id, entity_type: "discussion".into(), title,
                snippet: content, url: None,
            });
        }
    }

    Ok(Json(results))
}
```

```rust
// edusync-api/crates/server/src/handlers/moderation.rs
use axum::extract::{Path, State};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use crate::error::AppError;
use crate::extractors::{Claims, TenantId};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ModerationReport {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub reporter_id: Uuid,
    pub content_type: String,  // 'discussion' | 'comment' | 'message'
    pub content_id: Uuid,
    pub reason: String,
    pub status: String,  // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
    pub reviewed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReportRequest {
    pub content_type: String,
    pub content_id: Uuid,
    pub reason: String,
}

pub async fn list_reports(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
) -> Result<Json<Vec<ModerationReport>>, AppError> {
    claims.require_any_role(&["admin"])?;
    let reports = sqlx::query_as::<_, ModerationReport>(
        "SELECT * FROM moderation_reports WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100"
    )
    .bind(tenant.0).fetch_all(&state.db).await.map_err(AppError::from)?;
    Ok(Json(reports))
}

pub async fn create_report(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Json(body): Json<CreateReportRequest>,
) -> Result<Json<ModerationReport>, AppError> {
    let report = sqlx::query_as::<_, ModerationReport>(
        r#"INSERT INTO moderation_reports
              (id, tenant_id, reporter_id, content_type, content_id, reason, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', NOW())
           RETURNING *"#
    )
    .bind(tenant.0).bind(claims.sub).bind(&body.content_type)
    .bind(body.content_id).bind(&body.reason)
    .fetch_one(&state.db).await.map_err(AppError::from)?;
    Ok(Json(report))
}

pub async fn resolve_report(
    State(state): State<AppState>, tenant: TenantId, claims: Claims,
    Path(report_id): Path<Uuid>,
) -> Result<Json<ModerationReport>, AppError> {
    claims.require_any_role(&["admin"])?;
    let report = sqlx::query_as::<_, ModerationReport>(
        r#"UPDATE moderation_reports SET status = 'resolved', reviewed_by = $3
           WHERE id = $1 AND tenant_id = $2 RETURNING *"#
    )
    .bind(report_id).bind(tenant.0).bind(claims.sub)
    .fetch_optional(&state.db).await.map_err(AppError::from)?
    .ok_or_else(|| AppError::not_found("Report not found"))?;
    Ok(Json(report))
}
```

```rust
// Register
let search = ServiceProcess::new("search")
    .prefix("/api/v1")
    .endpoint(Method::GET, "/search", get(handlers::search::global_search));

let moderation = ServiceProcess::new("moderation")
    .prefix("/api/v1/moderation")
    .endpoint(Method::GET, "/reports", get(handlers::moderation::list_reports))
    .endpoint(Method::POST, "/reports", post(handlers::moderation::create_report))
    .endpoint(Method::PUT, "/reports/:report_id/resolve", put(handlers::moderation::resolve_report));
```

**VERIFY:**

```
cargo check
cargo test -- search
cargo test -- moderation
```

**STOP IF:** Tables missing → buat migrations jika `moderation_reports` tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# ✅ Phase 2 Batch 3-4 Gate Review

<aside>
🚧

**Semua task di atas harus selesai sebelum Phase 2 Gate Review (Week 38).** Checklist verifikasi akhir:

</aside>

**Final Verification Commands:**

```
# 1. Compile check seluruh project
cargo check

# 2. Run semua tests
cargo test

# 3. Verify handler count
grep -rc 'pub async fn' edusync-api/crates/server/src/handlers/ | sort
# Expected: total >= 50 handlers across all files

# 4. Verify semua modules punya model
ls edusync-api/crates/models/src/
# Expected: analytics.rs, user.rs, bulk_import.rs, progress.rs, xapi.rs,
#           notification.rs, discussion.rs, calendar.rs, attendance.rs,
#           certificate.rs, gamification.rs, parent.rs, onboarding.rs,
#           survey.rs, finance.rs

# 5. Verify error format PostgREST-compatible
grep -r 'AppError' edusync-api/crates/server/src/error.rs
# Must contain: code, message, details, hint fields

# 6. Verify tenant isolation
grep -c 'tenant_id' edusync-api/crates/server/src/handlers/*.rs | sort
# Every handler file should have multiple tenant_id references
```

**Task Summary:**

| **Task** | **Module**                  | **Cluster** | **Status** |
| -------- | --------------------------- | ----------- | ---------- |
| 2C-1     | Analytics (Executive)       | A           | ⬜         |
| 2C-2     | Analytics (Teacher/Student) | A           | ⬜         |
| 2C-3     | Analytics (Remaining RPCs)  | A           | ⬜         |
| 2C-4     | User Management             | B           | ⬜         |
| 2C-5     | Bulk Import                 | B           | ⬜         |
| 2C-6     | Progress Tracking           | C           | ⬜         |
| 2C-7     | xAPI Statements             | C           | ⬜         |
| 2D-1     | Notifications               | D           | ⬜         |
| 2D-2     | Discussions                 | D           | ⬜         |
| 2D-3     | Calendar                    | E           | ⬜         |
| 2D-4     | Attendance                  | E           | ⬜         |
| 2D-5     | Certificates                | F           | ⬜         |
| 2D-6     | Gamification                | F           | ⬜         |
| 2D-7     | Parent Portal               | D           | ⬜         |
| 2D-8     | Principal Dashboard         | G           | ⬜         |
| 2D-9     | Onboarding                  | G           | ⬜         |
| 2D-10    | Surveys                     | H           | ⬜         |
| 2D-11    | Finance (SPP)               | H           | ⬜         |
| 2D-12    | Search + Moderation         | H           | ⬜         |

```rust

```
