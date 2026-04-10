# Task Queue — Phase 2 Batch 4

**Modul:** Notifications, Discussions, Calendar, Attendance, Gamification, Certificates, Parent, Principal, Onboarding, Surveys, Finance, Search
**Durasi:** Minggu 36–38 | **Effort:** ~40–50 jam

---

## Task IDs

| ID    | Modul               | Deskripsi                                  |
| ----- | ------------------- | ------------------------------------------ |
| 2D-1  | Notifications       | Notification CRUD + Batching               |
| 2D-2  | Discussions         | Discussions Forum CRUD                     |
| 2D-3  | Calendar            | Calendar Events CRUD                       |
| 2D-4  | Attendance          | Attendance (QR + Manual)                   |
| 2D-5  | Certificates        | Certificates Generation                    |
| 2D-6  | Gamification        | XP, Badges, Streaks, Leaderboard           |
| 2D-7  | Parent Portal       | View linked children, progress, messages   |
| 2D-8  | Principal Dashboard | Executive reports, surveys overview        |
| 2D-9  | Onboarding          | Teacher Onboarding Wizard                  |
| 2D-10 | Surveys             | Surveys CRUD + responses                   |
| 2D-11 | Finance             | Finance (SPP) Tracking                     |
| 2D-12 | Search              | Search + Moderation (ILIKE keyword filter) |

---

## Dependency Map

```
Cluster D: Notifications → Discussions → Parent
2D-1 → 2D-2 → 2D-7

Cluster E: Calendar + Attendance (parallel)
2D-3, 2D-4

Cluster F: Gamification + Certificates (parallel)
2D-5, 2D-6

Cluster G: Principal + Onboarding (parallel)
2D-8, 2D-9

Cluster H: Surveys + Finance + Search (parallel)
2D-10, 2D-11, 2D-12
```

---

## Task Detail

### 2D-1: Notifications CRUD + Batching

**Goal:** Notification CRUD endpoints + batch mark-as-read

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/notification.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod notification;`)
- `edusync-api/crates/server/src/handlers/notification.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add notification routes)

**Endpoints:**

- `GET /api/v1/notifications?page=1&limit=20` — List (tenant-scoped, user-scoped)
- `PUT /api/v1/notifications/mark-read` — Batch mark-as-read `{ ids: [Uuid] }`
- `PUT /api/v1/notifications/mark-all-read` — Mark all as read for current user
- `GET /api/v1/notifications/unread-count` — Returns `{ count: i64 }`

**NOTE:** Email digest tetap di Supabase Edge Function sampai Phase 3C

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/notification.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub is_read: bool,
    pub metadata: Option<serde_json::Value>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct MarkReadRequest {
    pub ids: Vec<Uuid>,
}
```

```rust
// === edusync-api/crates/server/src/handlers/notification.rs ===
use axum::{extract::{Query, State}, http::StatusCode, response::IntoResponse, Json};
use sqlx::PgPool;
use uuid::Uuid;
use std::collections::HashMap;

pub async fn list_notifications(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = Uuid::nil(); // TODO: from JWT
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(20).min(100);
    let offset = params.get("offset").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);

    match sqlx::query!(
        "SELECT id, title, body, notification_type, is_read, metadata, created_at
         FROM notifications WHERE user_id=$1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        user_id, limit, offset
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn mark_read(
    State(pool): State<PgPool>,
    Json(req): Json<crate::models::notification::MarkReadRequest>,
) -> impl IntoResponse {
    let user_id = Uuid::nil(); // TODO: from JWT
    // Batch update — only mark own notifications
    sqlx::query!(
        "UPDATE notifications SET is_read=true WHERE id=ANY($1) AND user_id=$2",
        &req.ids, user_id,
    ).execute(&pool).await
     .map(|_| StatusCode::NO_CONTENT)
     .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn unread_count(State(pool): State<PgPool>) -> impl IntoResponse {
    let user_id = Uuid::nil(); // TODO: from JWT
    let count: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false",
        user_id
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);
    Json(serde_json::json!({ "count": count }))
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-1 notifications OK"
```

---

### 2D-2: Discussions Forum CRUD

**Goal:** Discussions forum — threads + comments CRUD

**Dependencies:** 2D-1

**EDIT ONLY:**

- `edusync-api/crates/models/src/discussion.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod discussion;`)
- `edusync-api/crates/server/src/handlers/discussion.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add discussion routes)

**Endpoints:**

- `GET /api/v1/discussions?course_id=...` — List threads
- `POST /api/v1/discussions` — Create thread
- `DELETE /api/v1/discussions/:thread_id` — Delete thread (owner or admin)
- `GET /api/v1/discussions/:thread_id/comments` — List comments
- `POST /api/v1/discussions/:thread_id/comments` — Add comment

**NOTE:** Realtime subscription tetap via Supabase Realtime sampai Phase 4

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/discussion.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscussionThread {
    pub id: Uuid,
    pub course_id: Option<Uuid>,
    pub title: String,
    pub body: String,
    pub author_id: Uuid,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub reply_count: i32,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DiscussionComment {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub body: String,
    pub author_id: Uuid,
    pub parent_comment_id: Option<Uuid>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateThreadRequest {
    pub course_id: Option<Uuid>,
    pub title: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub body: String,
    pub parent_comment_id: Option<Uuid>,
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-2 discussions OK"
```

---

### 2D-3: Calendar Events CRUD

**Goal:** Calendar events CRUD

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/calendar.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod calendar;`)
- `edusync-api/crates/server/src/handlers/calendar.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add calendar routes)

**Endpoints:**

- `GET /api/v1/calendar/events?from=...&to=...` — List events in date range
- `POST /api/v1/calendar/events` — Create event
- `PUT /api/v1/calendar/events/:id` — Update event
- `DELETE /api/v1/calendar/events/:id` — Delete event

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/calendar.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CalendarEvent {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub event_type: String,  // "class" | "exam" | "holiday" | "assignment_due" | "other"
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub color: Option<String>,
    pub is_all_day: bool,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub event_type: String,
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub color: Option<String>,
    pub is_all_day: Option<bool>,
}
```

```rust
// In handler: list events in date range
pub async fn list_events(State(pool): State<PgPool>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); // TODO: from JWT
    let from = params.get("from").and_then(|s| s.parse::<DateTime<Utc>>().ok());
    let to = params.get("to").and_then(|s| s.parse::<DateTime<Utc>>().ok());

    let events = sqlx::query!(
        "SELECT id, title, description, start_time, end_time, event_type, course_id, class_id, color, is_all_day
         FROM calendar_events
         WHERE tenant_id=$1
           AND ($2::timestamptz IS NULL OR start_time >= $2)
           AND ($3::timestamptz IS NULL OR end_time <= $3)
         ORDER BY start_time ASC LIMIT 200",
        tenant_id, from, to
    ).fetch_all(&pool).await;

    match events {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-3 calendar OK"
```

---

### 2D-4: Attendance (QR + Manual)

**Goal:** Attendance CRUD — QR code check-in + manual attendance

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/attendance.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod attendance;`)
- `edusync-api/crates/server/src/handlers/attendance.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add attendance routes)

**Endpoints:**

- `GET /api/v1/attendance?class_id=...&date=...` — List attendance records
- `POST /api/v1/attendance/record` — Record single attendance
- `POST /api/v1/attendance/bulk` — Bulk record (teacher marks whole class)
- `POST /api/v1/attendance/qr-check-in` — QR code check-in by student

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/attendance.rs ===
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub student_id: Uuid,
    pub class_id: Uuid,
    pub date: NaiveDate,
    pub status: String,   // "present" | "absent" | "late" | "excused"
    pub method: String,   // "qr" | "manual" | "online"
    pub notes: Option<String>,
    pub tenant_id: Uuid,
    pub recorded_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct QrCheckinRequest {
    pub qr_token: String,
    pub class_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct BulkAttendanceRequest {
    pub class_id: Uuid,
    pub date: NaiveDate,
    pub records: Vec<StudentAttendance>,
}

#[derive(Debug, Deserialize)]
pub struct StudentAttendance {
    pub student_id: Uuid,
    pub status: String,
    pub notes: Option<String>,
}
```

```rust
// QR check-in handler:
pub async fn qr_checkin(
    State(pool): State<PgPool>,
    Json(req): Json<crate::models::attendance::QrCheckinRequest>,
) -> impl IntoResponse {
    let student_id = Uuid::nil(); // TODO: from JWT

    // Validate QR token (token links to class + expiry)
    let token = sqlx::query!(
        "SELECT class_id FROM qr_tokens WHERE token=$1 AND class_id=$2 AND expires_at>NOW()",
        req.qr_token, req.class_id
    ).fetch_optional(&pool).await;

    match token {
        Ok(Some(_)) => {
            let _ = sqlx::query!(
                "INSERT INTO attendance_records (student_id, class_id, date, status, method, tenant_id)
                 VALUES ($1,$2,CURRENT_DATE,'present','qr',$3)
                 ON CONFLICT (student_id, class_id, date) DO UPDATE SET status='present', method='qr'",
                student_id, req.class_id, Uuid::nil()
            ).execute(&pool).await;
            StatusCode::CREATED
        }
        Ok(None) => StatusCode::BAD_REQUEST,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-4 attendance OK"
```

---

### 2D-5: Certificates Generation

**Goal:** Certificate CRUD + issuance trigger

**Dependencies:** Phase 2 Batch 1 courses selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/certificate.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod certificate;`)
- `edusync-api/crates/server/src/handlers/certificate.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add certificate routes)

**Endpoints:**

- `GET /api/v1/certificates` — List user's certificates
- `POST /api/v1/certificates/issue` — Issue certificate (auto after course completion)
- `GET /api/v1/certificates/verify?cert_no=...` — Public verification (no auth needed)

**NOTE:** PDF generation moved to Phase 3 (Task 3C-7). Phase 2 only creates DB record.

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/certificate.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Certificate {
    pub id: Uuid,
    pub student_name: String,
    pub course_title: String,
    pub course_id: Uuid,
    pub user_id: Uuid,
    pub certificate_number: String,
    pub issued_at: DateTime<Utc>,
    pub verification_url: Option<String>,
    pub pdf_url: Option<String>,        // NULL until Phase 3 generates it
    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct IssueCertificateRequest {
    pub course_id: Uuid,
    pub user_id: Uuid,
}
```

```rust
// Issue certificate — verify completion first
pub async fn issue_certificate(
    State(pool): State<PgPool>,
    Json(req): Json<crate::models::certificate::IssueCertificateRequest>,
) -> impl IntoResponse {
    // Check 100% lesson completion
    let completion = sqlx::query!(
        "SELECT COUNT(*) FILTER (WHERE sls.last_accessed_at IS NOT NULL) as completed,
                COUNT(*) as total
         FROM lessons l
         JOIN course_modules cm ON cm.id=l.module_id
         LEFT JOIN student_lesson_signals sls ON sls.lesson_id=l.id AND sls.user_id=$1
         WHERE cm.course_id=$2",
        req.user_id, req.course_id
    ).fetch_one(&pool).await;

    match completion {
        Ok(c) if c.completed == c.total && c.total.unwrap_or(0) > 0 => {},
        _ => return (StatusCode::BAD_REQUEST, "Kursus belum selesai").into_response(),
    }

    // Generate certificate number
    let cert_num = format!("CERT-{}-{:06}", chrono::Utc::now().year(), rand::random::<u32>() % 999999);

    let result = sqlx::query!(
        "INSERT INTO certificates (student_name, course_title, course_id, user_id, certificate_number, tenant_id)
         SELECT p.full_name, c.title, $1, $2, $3, $4
         FROM profiles p, courses c WHERE p.id=$2 AND c.id=$1
         ON CONFLICT (user_id, course_id) DO NOTHING
         RETURNING id",
        req.course_id, req.user_id, cert_num, Uuid::nil()
    ).fetch_optional(&pool).await;

    match result {
        Ok(Some(r)) => (StatusCode::CREATED, Json(serde_json::json!({"id":r.id,"cert_number":cert_num}))).into_response(),
        Ok(None) => Json(serde_json::json!({"message":"Sertifikat sudah ada"})).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-5 certificates OK"
```

---

### 2D-6: Gamification (XP, Badges, Streaks, Leaderboard)

**Goal:** XP, badges, streaks, leaderboard CRUD

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/gamification.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod gamification;`)
- `edusync-api/crates/server/src/handlers/gamification.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add gamification routes)

**Endpoints:**

- `GET /api/v1/gamification/xp` — Get current user XP + level
- `POST /api/v1/gamification/xp` — Add XP (service role / internal only)
- `GET /api/v1/gamification/leaderboard?limit=50` — Top users by XP
- `GET /api/v1/gamification/badges` — All available badges
- `GET /api/v1/gamification/badges/me` — User's earned badges

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/gamification.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserXP {
    pub user_id: Uuid,
    pub total_xp: i64,
    pub level: i32,
    pub current_streak_days: i32,
    pub longest_streak_days: i32,
    pub last_activity_at: Option<DateTime<Utc>>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Badge {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub icon_url: Option<String>,
    pub xp_threshold: Option<i64>,
    pub condition_type: String,  // "xp_milestone" | "course_complete" | "streak" | "quiz_perfect"
    pub condition_value: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub full_name: String,
    pub total_xp: i64,
    pub level: i32,
    pub rank: i64,
}

#[derive(Debug, Deserialize)]
pub struct AddXpRequest {
    pub user_id: Uuid,
    pub xp_amount: i64,
    pub reason: String,   // "lesson_complete" | "quiz_pass" | "streak_bonus" etc.
}
```

```rust
// Leaderboard SQL:
// SELECT p.id as user_id, p.full_name, ux.total_xp, ux.level,
//        RANK() OVER (ORDER BY ux.total_xp DESC) as rank
// FROM user_xp ux JOIN profiles p ON p.id=ux.user_id
// WHERE ux.tenant_id=$1 ORDER BY ux.total_xp DESC LIMIT $2;

pub async fn get_leaderboard(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); // TODO: from JWT
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(50).min(100);

    match sqlx::query!(
        "SELECT p.id as user_id, p.full_name, ux.total_xp, ux.level,
                RANK() OVER (ORDER BY ux.total_xp DESC)::bigint as rank
         FROM user_xp ux JOIN profiles p ON p.id=ux.user_id
         WHERE ux.tenant_id=$1 ORDER BY ux.total_xp DESC LIMIT $2",
        tenant_id, limit
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-6 gamification OK"
```

---

### 2D-7: Parent Portal

**Goal:** Parent portal — view linked children, progress, messages

**Dependencies:** 2D-1 (notifications), 2D-2 (discussions)

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/parent.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add parent routes)

**Endpoints:**

- `GET /api/v1/parent/children` — List linked children
- `GET /api/v1/parent/children/:child_id/progress` — Child's course progress
- `GET /api/v1/parent/messages` — Parent messages
- `POST /api/v1/parent/messages` — Send message to teacher

**Concrete Code:**

```rust
pub async fn list_children(State(pool): State<PgPool>) -> impl IntoResponse {
    let parent_id = Uuid::nil(); // TODO: from JWT
    let tenant_id = Uuid::nil();

    match sqlx::query!(
        "SELECT p.id, p.full_name, p.avatar_url
         FROM parent_student_links psl
         JOIN profiles p ON p.id=psl.student_id
         WHERE psl.parent_id=$1 AND psl.tenant_id=$2",
        parent_id, tenant_id
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn child_progress(
    Path(child_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    // GOTCHA: student_lesson_signals columns:
    //   total_time_spent, last_accessed_at, latest_quiz_score
    //   NOT: time_spent_seconds, last_event_at, quiz_avg_score
    match sqlx::query!(
        "SELECT l.id as lesson_id, l.title, sls.total_time_spent, sls.last_accessed_at,
                sls.latest_quiz_score
         FROM lessons l
         LEFT JOIN student_lesson_signals sls ON sls.lesson_id=l.id AND sls.user_id=$1
         ORDER BY l.id LIMIT 100",
        child_id
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-7 parent portal OK"
```

---

### 2D-8: Principal Dashboard

**Goal:** Principal executive dashboard endpoints — thin wrappers around analytics RPCs

**Dependencies:** Task 2C-1 (analytics) selesai

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/principal.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add principal routes)

**Endpoints:**

- `GET /api/v1/principal/overview` — Overview stats
- `GET /api/v1/principal/reports` — Available reports
- `GET /api/v1/principal/school-stats` — School-wide statistics

**CATATAN:** These are thin wrappers — call stored procedures, do NOT port analytics logic to Rust.

**Concrete Code:**

```rust
pub async fn get_principal_overview(State(pool): State<PgPool>) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); // TODO: from JWT

    // Call stored procedure — don't replicate logic in Rust
    match sqlx::query!(
        "SELECT get_executive_overview($1::uuid) as data",
        tenant_id
    ).fetch_optional(&pool).await {
        Ok(Some(row)) => Json(row.data).into_response(),
        Ok(None) => Json(serde_json::json!({})).into_response(),
        Err(e) => {
            tracing::error!("get_executive_overview error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-8 principal dashboard OK"
```

---

### 2D-9: Teacher Onboarding Wizard

**Goal:** Track teacher setup progress through onboarding steps

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/onboarding.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add onboarding routes)

**Endpoints:**

- `GET /api/v1/onboarding/progress` — Get current step + completion status
- `POST /api/v1/onboarding/step` — Mark step complete `{ step: "profile" | "first_course" | "first_class" | "first_student" | "first_quiz" }`

**Concrete Code:**

```rust
#[derive(Debug, serde::Deserialize)]
pub struct OnboardingStepRequest {
    pub step: String,
}

pub async fn get_onboarding_progress(State(pool): State<PgPool>) -> impl IntoResponse {
    let user_id = Uuid::nil(); // TODO: from JWT
    match sqlx::query!(
        "SELECT completed_steps, current_step, is_complete
         FROM teacher_onboarding_progress WHERE user_id=$1",
        user_id
    ).fetch_optional(&pool).await {
        Ok(Some(row)) => Json(row).into_response(),
        Ok(None) => Json(serde_json::json!({
            "completed_steps": [],
            "current_step": "profile",
            "is_complete": false
        })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn complete_step(
    State(pool): State<PgPool>,
    Json(req): Json<OnboardingStepRequest>,
) -> impl IntoResponse {
    let user_id = Uuid::nil(); // TODO: from JWT
    let valid_steps = ["profile","first_course","first_class","first_student","first_quiz"];
    if !valid_steps.contains(&req.step.as_str()) {
        return (StatusCode::BAD_REQUEST, "Step tidak valid").into_response();
    }
    let _ = sqlx::query!(
        "INSERT INTO teacher_onboarding_progress (user_id, completed_steps)
         VALUES ($1, ARRAY[$2])
         ON CONFLICT (user_id) DO UPDATE SET
             completed_steps = array_append(teacher_onboarding_progress.completed_steps, $2),
             updated_at = NOW()",
        user_id, req.step,
    ).execute(&pool).await;
    StatusCode::NO_CONTENT
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-9 onboarding OK"
```

---

### 2D-10: Surveys CRUD

**Goal:** Surveys CRUD + responses — Skip if frontend module < 50% complete

**Dependencies:** Phase 1A scaffold selesai

**BEFORE STARTING:** Check frontend completion:

```bash
grep -r "TODO\|stub\|placeholder" src/features/surveys/ | wc -l
# If > 10 TODOs: skip this task, mark as DEFERRED
```

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/survey.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add survey routes)

**Endpoints:**

- `GET /api/v1/surveys` — List surveys
- `POST /api/v1/surveys` — Create survey
- `POST /api/v1/surveys/:id/respond` — Submit response
- `GET /api/v1/surveys/:id/results` — Results (admin/teacher only)

**Concrete Code:**

```rust
pub async fn create_survey(
    State(pool): State<PgPool>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); let user_id = Uuid::nil();
    match sqlx::query!(
        "INSERT INTO surveys (title, description, questions, tenant_id, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id",
        req["title"].as_str().unwrap_or(""),
        req["description"].as_str(),
        req["questions"],  // JSON array of question objects
        tenant_id, user_id,
    ).fetch_one(&pool).await {
        Ok(r) => (StatusCode::CREATED, Json(serde_json::json!({"id":r.id}))).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-10 surveys OK"
```

---

### 2D-11: Finance (SPP Tracking)

**Goal:** SPP (Sumbangan Pembinaan Pendidikan) payment tracking — Skip if < 50% complete

**Dependencies:** Phase 1A scaffold selesai

**BEFORE STARTING:** Check frontend completion:

```bash
grep -r "TODO\|stub" src/features/finance/ 2>/dev/null | wc -l
# If > 10 TODOs or directory missing: skip, mark DEFERRED
```

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/finance.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add finance routes)

**Endpoints:**

- `GET /api/v1/finance/spp` — List SPP records (paginated)
- `POST /api/v1/finance/spp` — Create SPP record
- `POST /api/v1/finance/spp/:id/pay` — Record payment
- `GET /api/v1/finance/spp/summary` — Summary by class/month

**Concrete Code:**

```rust
pub async fn record_payment(
    Path(spp_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    let amount = req["amount"].as_f64().unwrap_or(0.0);
    match sqlx::query!(
        "UPDATE spp_records
         SET paid_amount=COALESCE(paid_amount,0)+$1, payment_date=NOW(), status='paid'
         WHERE id=$2 RETURNING id",
        amount, spp_id,
    ).fetch_optional(&pool).await {
        Ok(Some(_)) => StatusCode::NO_CONTENT,
        Ok(None) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-11 finance OK"
```

---

### 2D-12: Search + Moderation

**Goal:** Global search (PostgreSQL ILIKE) + content moderation CRUD

**Dependencies:** Phase 2 Batch 1-3 selesai

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/search.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add search + moderation routes)

**Search Endpoints:**

- `GET /api/v1/search?q=...&entity_type=course|lesson|user` — Global search

**Moderation Endpoints:**

- `GET /api/v1/moderation/reports` — List reports (admin only)
- `POST /api/v1/moderation/reports` — Create report
- `PUT /api/v1/moderation/reports/:id/resolve` — Resolve report

**Concrete Code:**

```rust
pub async fn global_search(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let q = match params.get("q") {
        Some(q) if !q.is_empty() => q.clone(),
        _ => return (StatusCode::BAD_REQUEST, "Parameter 'q' wajib diisi").into_response(),
    };
    let tenant_id = Uuid::nil(); // TODO: from JWT
    let entity_type = params.get("entity_type").map(|s| s.as_str()).unwrap_or("all");
    let pattern = format!("%{}%", q);

    // Search courses
    let courses = if entity_type == "all" || entity_type == "course" {
        sqlx::query!(
            "SELECT id, title, 'course' as entity_type
             FROM courses WHERE title ILIKE $1 AND tenant_id=$2 AND status='published'
             LIMIT 10",
            pattern, tenant_id
        ).fetch_all(&pool).await.unwrap_or_default()
    } else { vec![] };

    // Search lessons
    let lessons = if entity_type == "all" || entity_type == "lesson" {
        sqlx::query!(
            "SELECT l.id, l.title, 'lesson' as entity_type
             FROM lessons l
             JOIN course_modules cm ON cm.id=l.module_id
             JOIN courses c ON c.id=cm.course_id
             WHERE l.title ILIKE $1 AND c.tenant_id=$2
             LIMIT 10",
            pattern, tenant_id
        ).fetch_all(&pool).await.unwrap_or_default()
    } else { vec![] };

    Json(serde_json::json!({
        "query": q,
        "results": {
            "courses": courses,
            "lessons": lessons,
        }
    })).into_response()
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2D-12 search OK"
```

---

## Parallelism

| Cluster | Tasks                | Can Run Parallel With |
| ------- | -------------------- | --------------------- |
| D       | 2D-1 → 2D-2 → 2D-7  | E, F, G, H            |
| E       | 2D-3, 2D-4 (parallel)| D, F, G, H            |
| F       | 2D-5, 2D-6 (parallel)| D, E, G, H            |
| G       | 2D-8, 2D-9 (parallel)| D, E, F, H            |
| H       | 2D-10, 2D-11, 2D-12  | D, E, F, G            |
