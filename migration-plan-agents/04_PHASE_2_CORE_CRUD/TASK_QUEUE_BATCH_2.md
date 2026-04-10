# Task Queue — Phase 2 Batch 2

**Modul:** Quizzes, Assignments, Gradebook
**Durasi:** Minggu 28–32 | **Effort:** ~60–80 jam

**CATATAN:** Batch ini paling kompleks — Quizzes memiliki timer, autosave, dan auto-grade.

---

## Task IDs

| ID    | Modul          | Deskripsi                                    |
| ----- | -------------- | -------------------------------------------- |
| 2B-00 | Foundation     | Schema Introspection + Dual-Processing Guard |
| 2B-01 | Quiz Models    | Quiz Domain Rust Models                      |
| 2B-02 | Quiz DTOs      | Quiz Request/Response DTOs                   |
| 2B-03 | Quiz Read      | Quiz CRUD Read Handlers                      |
| 2B-04 | Quiz Write     | Quiz CRUD Write Handlers                     |
| 2B-05 | Quiz Attempt   | Start Attempt Handler                        |
| 2B-06 | Quiz Autosave  | Autosave Handler                             |
| 2B-07 | Quiz Submit    | Submit Handler                               |
| 2B-08 | Quiz Timer     | Auto-submit Timer Handler                    |
| 2B-09 | Quiz Grading   | Grading Worker Setup                         |
| 2B-10 | Quiz Grading   | Quiz Grading Logic                           |
| 2B-11 | Quiz Grading   | Essay Grading Queue Handler                  |
| 2B-12 | Quiz Grading   | Grade Review Handler                         |
| 2B-13 | Quiz Grading   | Suspicious Attempt Handler                   |
| 2B-14 | Quiz Builder   | Quiz Builder Endpoints                       |
| 2B-15 | Question Bank  | Question Bank CRUD                           |
| 2B-16 | Question Bank  | Import/Export Questions                      |
| 2B-17 | Question Bank  | Question Randomization                       |
| 2B-18 | Quiz Analytics | Quiz Analytics Endpoints                     |
| 2B-19 | Quiz Analytics | Student Quiz History                         |
| 2B-20 | Assignments    | Assignment CRUD                              |
| 2B-21 | Assignments    | Assignment Submissions                       |
| 2B-22 | Assignments    | File Upload Handler                          |
| 2B-23 | Assignments    | Assignment Group Support                     |
| 2B-24 | Assignments    | Assignment Rubric Handler                    |
| 2B-25 | Gradebook      | Gradebook Aggregation                        |
| 2B-26 | Gradebook      | Grade Override Handler                       |
| 2B-27 | Gradebook      | SpeedGrader Endpoints                        |
| 2B-28 | Gradebook      | Grade Export Handler                         |
| 2B-29 | Frontend       | quizCRUD.ts → VIL                            |
| 2B-30 | Frontend       | quizPlayerService.ts → VIL                   |
| 2B-31 | Frontend       | quizAttemptService.ts → VIL                  |
| 2B-32 | Frontend       | quizBuilderService.ts → VIL                  |
| 2B-33 | Frontend       | assignmentService.ts → VIL                   |
| 2B-34 | Frontend       | submissionService.ts → VIL                   |
| 2B-35 | Frontend       | gradebookService.ts → VIL                    |
| 2B-36 | Frontend       | questionBankService.ts → VIL                 |
| 2B-37 | Frontend       | offlineQueue.ts Compatibility Check          |
| 2B-38 | Frontend       | Remaining Service Files                      |
| 2B-39 | Tests          | Quiz Integration Tests                       |
| 2B-40 | Tests          | Assignment Integration Tests                 |
| 2B-41 | Tests          | Gradebook Integration Tests                  |
| 2B-42 | Tests          | Shadow Mode + Cutover                        |

---

## Dependency Map

```
Group A (Quiz Foundation):
2B-01 → 2B-02

Group B (Quiz Read/Write):
2B-02 → 2B-03 → 2B-04

Group C (Attempt Lifecycle):
2B-02 → 2B-05 → 2B-06
2B-05 → 2B-07 → 2B-08

Group D (Grading):
2B-07 → 2B-09 → 2B-10 → 2B-11 → 2B-12 → 2B-13

Group E (Builder & Question Bank):
2B-02 → 2B-14 → 2B-15 → 2B-16 → 2B-17

Group F (Quiz Analytics):
2B-13 → 2B-18 → 2B-19

Group G (Assignments):
2B-01 → 2B-20 → 2B-21 → 2B-22 → 2B-23 → 2B-24

Group H (Gradebook):
2B-07 + 2B-21 → 2B-25 → 2B-26 → 2B-27 → 2B-28

Group K (Frontend):
Corresponding Rust handlers done → 2B-29...2B-38

Group L (Tests):
Group K done → 2B-39 → 2B-40 → 2B-41 → 2B-42
```

---

## Task Detail

### 2B-00: Schema Introspection

**Goal:** Introspect actual DB schema untuk quiz tables

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:** No file edits — run psql queries, save to `edusync-api/docs/schema-batch2.md`

**SQL Introspection:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('quizzes','quiz_questions','quiz_options','quiz_attempts',
                     'quiz_answers','question_bank','assignments','assignment_submissions')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check for existing pg_cron grading jobs (disable before starting worker)
SELECT * FROM cron.job WHERE command ILIKE '%quiz%' OR command ILIKE '%attempt%';
```

**Verify:**

```bash
test -s edusync-api/docs/schema-batch2.md && echo "PASS" || echo "FAIL: schema doc missing"
```

---

### 2B-01: Quiz Domain Rust Models

**Goal:** Buat semua Rust model structs untuk quiz domain tables

**Dependencies:** Phase 1A scaffold selesai

**EDIT ONLY:**

- `edusync-api/crates/models/src/quiz.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod quiz;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/quiz.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// GOTCHA: quiz_questions.text — column is 'text', NOT 'question_text'
// GOTCHA: quiz_options.text — column is 'text', NOT 'option_text'
// GOTCHA: quiz_attempts.user_id — NOT 'student_id'

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Quiz {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub lesson_id: Option<Uuid>,
    pub course_id: Option<Uuid>,
    pub status: String,            // "draft" | "published" | "archived"
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub shuffle_questions: bool,
    pub shuffle_options: bool,
    pub show_feedback: bool,
    pub pass_percentage: Option<f64>,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizQuestion {
    pub id: Uuid,
    pub quiz_id: Uuid,
    pub text: String,              // GOTCHA: 'text' NOT 'question_text'
    pub question_type: String,     // "mcq" | "true_false" | "essay" | "short_answer"
    pub points: Option<f64>,
    pub order_index: i32,
    pub explanation: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizOption {
    pub id: Uuid,
    pub question_id: Uuid,
    pub text: String,              // GOTCHA: 'text' NOT 'option_text'
    pub is_correct: bool,
    pub points: Option<f64>,
    pub explanation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizAttempt {
    pub id: Uuid,
    pub quiz_id: Uuid,
    pub user_id: Uuid,             // GOTCHA: NOT 'student_id'
    pub status: String,            // "in_progress" | "submitted" | "graded" | "timed_out"
    pub score: Option<f64>,
    pub max_score: Option<f64>,
    pub percentage: Option<f64>,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub graded_at: Option<DateTime<Utc>>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizAnswer {
    pub id: Uuid,
    pub attempt_id: Uuid,
    pub question_id: Uuid,
    pub selected_option_id: Option<Uuid>,
    pub answer_text: Option<String>,
    pub is_correct: Option<bool>,
    pub points_awarded: Option<f64>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Assignment {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub lesson_id: Option<Uuid>,
    pub course_id: Option<Uuid>,
    pub due_date: Option<DateTime<Utc>>,
    pub max_score: Option<f64>,
    pub submission_type: String,   // "file" | "text" | "url"
    pub allow_late: bool,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssignmentSubmission {
    pub id: Uuid,
    pub assignment_id: Uuid,
    pub student_id: Uuid,
    pub content: Option<String>,
    pub file_url: Option<String>,
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub status: String,            // "draft" | "submitted" | "graded" | "returned"
    pub submitted_at: Option<DateTime<Utc>>,
    pub graded_at: Option<DateTime<Utc>>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestionBank {
    pub id: Uuid,
    pub text: String,
    pub question_type: String,
    pub difficulty: Option<String>,
    pub tags: Option<Vec<String>>,
    pub subject: Option<String>,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}
```

**Verify:**

```bash
cargo check -p edusync-models && echo "PASS: 2B-01 quiz models OK"
```

---

### 2B-02: Quiz Request/Response DTOs

**Goal:** Buat request/response DTOs yang match frontend expectations

**Dependencies:** 2B-01

**EDIT ONLY:**

- `edusync-api/crates/models/src/quiz_dto.rs` (create)
- `edusync-api/crates/models/src/lib.rs` (add `pub mod quiz_dto;`)

**Concrete Code:**

```rust
// === edusync-api/crates/models/src/quiz_dto.rs ===
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct AnswerInput {
    pub question_id: Uuid,
    pub selected_option_id: Option<Uuid>,
    pub answer_text: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AutosaveRequest {
    pub answers: Vec<AnswerInput>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitAttemptRequest {
    pub answers: Vec<AnswerInput>,
}

#[derive(Debug, Serialize)]
pub struct AttemptStartResponse {
    pub attempt_id: Uuid,
    pub quiz_id: Uuid,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub time_limit_minutes: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuizRequest {
    pub title: String,
    pub description: Option<String>,
    pub lesson_id: Option<Uuid>,
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub shuffle_questions: Option<bool>,
    pub shuffle_options: Option<bool>,
    pub pass_percentage: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuestionRequest {
    pub text: String,
    pub question_type: String,
    pub points: Option<f64>,
    pub order_index: Option<i32>,
    pub explanation: Option<String>,
    pub options: Option<Vec<CreateOptionRequest>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOptionRequest {
    pub text: String,
    pub is_correct: bool,
    pub points: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct GradebookEntry {
    pub student_id: Uuid,
    pub student_name: String,
    pub quiz_avg: Option<f64>,
    pub quizzes_completed: i64,
    pub assignment_avg: Option<f64>,
    pub assignments_submitted: i64,
}

#[derive(Debug, Deserialize)]
pub struct GradeOverrideRequest {
    pub score: f64,
    pub feedback: Option<String>,
    pub reason: String,
}
```

**Verify:**

```bash
cargo check -p edusync-models && echo "PASS: 2B-02 quiz DTOs OK"
```

---

### 2B-03: Quiz CRUD Read Handlers

**Goal:** Implement quiz list + detail endpoints

**Dependencies:** 2B-02

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add quiz routes)

**Endpoints:**

- `GET /api/v1/quizzes` — paginated, tenant-scoped
- `GET /api/v1/quizzes/:id` — Quiz detail

**Concrete Code:**

```rust
use axum::{extract::{Path, Query, State}, http::StatusCode, response::IntoResponse, Json};
use sqlx::PgPool;
use uuid::Uuid;
use std::collections::HashMap;

pub async fn list_quizzes(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(20).min(100);
    let offset = params.get("offset").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);
    let tenant_id = Uuid::nil(); // TODO: from JWT claims

    match sqlx::query!(
        "SELECT id, title, description, status, time_limit_minutes, lesson_id, course_id, created_at
         FROM quizzes WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        tenant_id, limit, offset
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows, "limit": limit, "offset": offset })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn get_quiz(Path(quiz_id): Path<Uuid>, State(pool): State<PgPool>) -> impl IntoResponse {
    match sqlx::query!(
        "SELECT id, title, description, status, time_limit_minutes, max_attempts,
                shuffle_questions, shuffle_options, pass_percentage, lesson_id, course_id
         FROM quizzes WHERE id = $1",
        quiz_id
    ).fetch_optional(&pool).await {
        Ok(Some(q)) => Json(q).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Kuis tidak ditemukan").into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-03 quiz read OK"
```

---

### 2B-04: Quiz CRUD Write Handlers

**Goal:** Create, update, delete, publish endpoints

**Dependencies:** 2B-03

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz.rs` (add to existing)

**Endpoints:**

- `POST /api/v1/quizzes` — Create
- `PUT /api/v1/quizzes/:id` — Update
- `DELETE /api/v1/quizzes/:id` — Soft delete (status='archived')
- `POST /api/v1/quizzes/:id/publish` — Set status='published'
- `POST /api/v1/quizzes/:id/unpublish` — Set status='draft'

```rust
use crate::models::quiz_dto::CreateQuizRequest;

pub async fn create_quiz(State(pool): State<PgPool>, Json(req): Json<CreateQuizRequest>) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); let user_id = Uuid::nil(); // TODO: from JWT
    match sqlx::query!(
        "INSERT INTO quizzes (title, description, lesson_id, time_limit_minutes, max_attempts,
                              shuffle_questions, shuffle_options, pass_percentage, status, tenant_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10) RETURNING id",
        req.title, req.description, req.lesson_id, req.time_limit_minutes, req.max_attempts,
        req.shuffle_questions.unwrap_or(false), req.shuffle_options.unwrap_or(false),
        req.pass_percentage, tenant_id, user_id,
    ).fetch_one(&pool).await {
        Ok(r) => (StatusCode::CREATED, Json(serde_json::json!({ "id": r.id }))).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn publish_quiz(Path(quiz_id): Path<Uuid>, State(pool): State<PgPool>) -> impl IntoResponse {
    sqlx::query!("UPDATE quizzes SET status='published', updated_at=NOW() WHERE id=$1", quiz_id)
        .execute(&pool).await
        .map(|_| StatusCode::NO_CONTENT)
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-04 quiz write OK"
```

---

### 2B-05: Quiz Attempt Start Handler

**Goal:** Create new attempt, enforce max_attempts, calculate expiry

**Dependencies:** 2B-02

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_attempt.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add attempt routes)

**Endpoint:** `POST /api/v1/quizzes/:quiz_id/attempts`

**Concrete Code:**

```rust
use axum::{extract::{Path, State}, http::StatusCode, response::IntoResponse, Json};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Duration;

pub async fn start_attempt(Path(quiz_id): Path<Uuid>, State(pool): State<PgPool>) -> impl IntoResponse {
    let user_id = Uuid::nil(); let tenant_id = Uuid::nil(); // TODO: from JWT

    // 1. Quiz must be published
    let quiz = match sqlx::query!(
        "SELECT id, time_limit_minutes, max_attempts FROM quizzes WHERE id=$1 AND status='published'",
        quiz_id
    ).fetch_optional(&pool).await {
        Ok(Some(q)) => q,
        Ok(None) => return (StatusCode::NOT_FOUND, "Kuis tidak tersedia").into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    // 2. Enforce max_attempts
    if let Some(max) = quiz.max_attempts {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2",
            quiz_id, user_id
        ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);
        if count >= max as i64 {
            return (StatusCode::FORBIDDEN, Json(serde_json::json!({"error":"Batas percobaan tercapai"}))).into_response();
        }
    }

    // 3. Create attempt
    match sqlx::query!(
        "INSERT INTO quiz_attempts (quiz_id, user_id, status, started_at, tenant_id)
         VALUES ($1,$2,'in_progress',NOW(),$3) RETURNING id, started_at",
        quiz_id, user_id, tenant_id
    ).fetch_one(&pool).await {
        Ok(a) => Json(serde_json::json!({
            "attempt_id": a.id,
            "quiz_id": quiz_id,
            "status": "in_progress",
            "started_at": a.started_at,
            "time_limit_minutes": quiz.time_limit_minutes,
            "expires_at": quiz.time_limit_minutes.map(|m| a.started_at + Duration::minutes(m as i64)),
        })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-05 start attempt OK"
```

---

### 2B-06: Quiz Autosave Handler

**Goal:** Batch upsert answers — no locking, runs every 30s from frontend

**Dependencies:** 2B-05

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_attempt.rs` (add to existing)

**Endpoint:** `PUT /api/v1/attempts/:attempt_id/autosave`

**GOTCHA: UPSERT (ON CONFLICT), NOT `SELECT FOR UPDATE` — that is only for final submit**

```rust
use crate::models::quiz_dto::AutosaveRequest;

pub async fn autosave_answers(
    Path(attempt_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<AutosaveRequest>,
) -> impl IntoResponse {
    // Verify in_progress
    let status: Option<String> = sqlx::query_scalar!(
        "SELECT status FROM quiz_attempts WHERE id=$1", attempt_id
    ).fetch_optional(&pool).await.ok().flatten();

    match status.as_deref() {
        Some("in_progress") => {},
        Some(_) => return (StatusCode::CONFLICT, "Percobaan sudah selesai").into_response(),
        None => return StatusCode::NOT_FOUND.into_response(),
    }

    for answer in &req.answers {
        let _ = sqlx::query!(
            "INSERT INTO quiz_answers (attempt_id, question_id, selected_option_id, answer_text, updated_at)
             VALUES ($1,$2,$3,$4,NOW())
             ON CONFLICT (attempt_id, question_id) DO UPDATE SET
                 selected_option_id=EXCLUDED.selected_option_id,
                 answer_text=EXCLUDED.answer_text,
                 updated_at=NOW()",
            attempt_id, answer.question_id, answer.selected_option_id, answer.answer_text,
        ).execute(&pool).await;
    }
    StatusCode::NO_CONTENT
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-06 autosave OK"
```

---

### 2B-07: Quiz Submit Handler

**Goal:** Finalize attempt with SELECT FOR UPDATE, idempotent on double-submit

**Dependencies:** 2B-05

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_attempt.rs` (add to existing)

**Endpoint:** `POST /api/v1/attempts/:attempt_id/submit`

**Idempotency:** Return 200 if already submitted (NOT 409)

```rust
use crate::models::quiz_dto::SubmitAttemptRequest;

pub async fn submit_attempt(
    Path(attempt_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<SubmitAttemptRequest>,
) -> impl IntoResponse {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    // SELECT FOR UPDATE prevents concurrent double-submit
    let attempt = sqlx::query!(
        "SELECT id, status FROM quiz_attempts WHERE id=$1 FOR UPDATE",
        attempt_id
    ).fetch_optional(&mut *tx).await;

    match attempt {
        Ok(Some(a)) if a.status == "in_progress" => {
            for answer in &req.answers {
                let _ = sqlx::query!(
                    "INSERT INTO quiz_answers (attempt_id,question_id,selected_option_id,answer_text,updated_at)
                     VALUES ($1,$2,$3,$4,NOW())
                     ON CONFLICT (attempt_id,question_id) DO UPDATE SET
                         selected_option_id=EXCLUDED.selected_option_id,
                         answer_text=EXCLUDED.answer_text, updated_at=NOW()",
                    attempt_id, answer.question_id, answer.selected_option_id, answer.answer_text,
                ).execute(&mut *tx).await;
            }
            let _ = sqlx::query!(
                "UPDATE quiz_attempts SET status='submitted', submitted_at=NOW() WHERE id=$1",
                attempt_id
            ).execute(&mut *tx).await;
            let _ = tx.commit().await;
            Json(serde_json::json!({
                "attempt_id": attempt_id,
                "status": "submitted",
                "message": "Jawaban berhasil dikumpulkan. Penilaian sedang diproses."
            })).into_response()
        }
        // Idempotent — already submitted
        Ok(Some(_)) => {
            let _ = tx.rollback().await;
            (StatusCode::OK, Json(serde_json::json!({"message":"Sudah dikumpulkan sebelumnya"}))).into_response()
        }
        Ok(None) => { let _ = tx.rollback().await; StatusCode::NOT_FOUND.into_response() }
        Err(_) => { let _ = tx.rollback().await; StatusCode::INTERNAL_SERVER_ERROR.into_response() }
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-07 submit attempt OK"
```

---

### 2B-08: Quiz Timer Auto-Submit

**Goal:** Background task that auto-submits expired in_progress attempts

**Dependencies:** 2B-07

**EDIT ONLY:**

- `edusync-api/crates/services/src/quiz_timer.rs` (create)
- `edusync-api/crates/services/src/lib.rs` (add `pub mod quiz_timer;`)

**Runs:** Every 60 seconds via cron scheduler (Task 3E-1)

```rust
// === edusync-api/crates/services/src/quiz_timer.rs ===
use sqlx::PgPool;

pub async fn auto_submit_timed_out_attempts(pool: &PgPool) -> Result<usize, sqlx::Error> {
    let rows = sqlx::query!(
        r#"UPDATE quiz_attempts SET status='timed_out', submitted_at=NOW()
           WHERE status='in_progress'
             AND started_at + (
                 SELECT (time_limit_minutes || ' minutes')::interval
                 FROM quizzes WHERE id=quiz_attempts.quiz_id AND time_limit_minutes IS NOT NULL
             ) < NOW()
           RETURNING id"#
    ).fetch_all(pool).await?;
    if !rows.is_empty() { tracing::info!("Auto-submitted {} timed-out attempts", rows.len()); }
    Ok(rows.len())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 2B-08 timer OK"
```

---

### 2B-09: Grading Worker Setup

**Goal:** Spawn background grading worker via tokio::spawn

**Dependencies:** 2B-07

**EDIT ONLY:**

- `edusync-api/crates/services/src/grading/mod.rs` (create, stub only)
- `edusync-api/crates/api-server/src/main.rs` (spawn worker)

```rust
// In main.rs:
let pool_clone = pool.clone();
tokio::spawn(async move {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
    loop {
        interval.tick().await;
        match edusync_services::grading::grade_pending_attempts(&pool_clone).await {
            Ok(n) if n > 0 => tracing::info!("Graded {} quiz attempts", n),
            Ok(_) => {},
            Err(e) => tracing::error!("Grading worker error: {}", e),
        }
    }
});
```

**Verify:**

```bash
cargo check -p edusync-api-server && echo "PASS: 2B-09 worker setup OK"
```

---

### 2B-10: Quiz Grading Logic

**Goal:** Auto-grade MCQ/true_false. Essay → leave for manual review

**Dependencies:** 2B-09

**EDIT ONLY:**

- `edusync-api/crates/services/src/grading/mod.rs` (implement grading)

```rust
// === edusync-api/crates/services/src/grading/mod.rs ===
use sqlx::PgPool;
use uuid::Uuid;

pub async fn grade_pending_attempts(pool: &PgPool) -> Result<usize, sqlx::Error> {
    // SKIP LOCKED for concurrent safety
    let pending = sqlx::query!(
        "SELECT id, quiz_id FROM quiz_attempts
         WHERE status='submitted' AND graded_at IS NULL
         LIMIT 50 FOR UPDATE SKIP LOCKED"
    ).fetch_all(pool).await?;

    let mut graded = 0;
    for a in &pending {
        if grade_single(pool, a.id, a.quiz_id).await.is_ok() { graded += 1; }
    }
    Ok(graded)
}

async fn grade_single(pool: &PgPool, attempt_id: Uuid, _quiz_id: Uuid) -> Result<(), sqlx::Error> {
    let answers = sqlx::query!(
        "SELECT qa.question_id, qa.selected_option_id, qq.question_type, qq.points
         FROM quiz_answers qa
         JOIN quiz_questions qq ON qq.id=qa.question_id
         WHERE qa.attempt_id=$1",
        attempt_id
    ).fetch_all(pool).await?;

    let mut total = 0.0f64;
    let mut max = 0.0f64;
    let mut has_essay = false;

    for a in &answers {
        let pts = a.points.unwrap_or(1.0);
        match a.question_type.as_str() {
            "mcq" | "true_false" => {
                max += pts;
                if let Some(opt_id) = a.selected_option_id {
                    let is_correct: bool = sqlx::query_scalar!(
                        // GOTCHA: quiz_options.text is 'text' — but we only need is_correct here
                        "SELECT is_correct FROM quiz_options WHERE id=$1", opt_id
                    ).fetch_one(pool).await.unwrap_or(false);
                    if is_correct { total += pts; }
                }
            }
            "essay" | "short_answer" => { has_essay = true; max += pts; }
            _ => {}
        }
    }

    let pct = if max > 0.0 { total / max * 100.0 } else { 0.0 };
    let new_status = if has_essay { "submitted" } else { "graded" };
    sqlx::query!(
        "UPDATE quiz_attempts SET score=$1, max_score=$2, percentage=$3, status=$4,
                                  graded_at=CASE WHEN $4='graded' THEN NOW() ELSE NULL END
         WHERE id=$5",
        total, max, pct, new_status, attempt_id,
    ).execute(pool).await?;
    Ok(())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 2B-10 grading logic OK"
```

---

### 2B-11: Essay Grading Queue Handler

**Goal:** Endpoint for teachers to review and grade essay answers

**Dependencies:** 2B-10

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_grading.rs` (create)

**Endpoints:**

- `GET /api/v1/grading/pending` — List pending essay answers (teacher only)
- `POST /api/v1/grading/answers/:answer_id/grade` — Grade single essay answer

```rust
pub async fn list_pending_essays(State(pool): State<PgPool>) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); // TODO: from JWT
    match sqlx::query!(
        "SELECT qa.id, qa.attempt_id, qa.answer_text,
                qq.text as question_text, qq.points as max_points,
                p.full_name as student_name
         FROM quiz_answers qa
         JOIN quiz_questions qq ON qq.id=qa.question_id
         JOIN quiz_attempts qat ON qat.id=qa.attempt_id
         JOIN profiles p ON p.id=qat.user_id
         WHERE qq.question_type IN ('essay','short_answer')
           AND qa.is_correct IS NULL AND qat.status='submitted'
           AND qat.tenant_id=$1 LIMIT 50",
        tenant_id
    ).fetch_all(&pool).await {
        Ok(rows) => Json(serde_json::json!({ "data": rows })).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-11 essay grading OK"
```

---

### 2B-12: Grade Review Handler

**Goal:** Teacher override of existing grades

**Dependencies:** 2B-11

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_grading.rs` (add to existing)

**Endpoint:** `PUT /api/v1/grading/attempts/:attempt_id/override`

```rust
pub async fn override_grade(
    Path(attempt_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<crate::models::quiz_dto::GradeOverrideRequest>,
) -> impl IntoResponse {
    sqlx::query!(
        "UPDATE quiz_attempts SET score=$1, status='graded', graded_at=NOW() WHERE id=$2",
        req.score, attempt_id
    ).execute(&pool).await
     .map(|_| StatusCode::NO_CONTENT)
     .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-12 grade review OK"
```

---

### 2B-13: Suspicious Attempt Handler

**Goal:** Flag + review suspicious quiz attempts

**Dependencies:** 2B-12

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_grading.rs` (add to existing)

**Endpoints:**

- `POST /api/v1/attempts/:attempt_id/flag` — Flag with reason + metadata
- `GET /api/v1/grading/suspicious` — List flagged (admin only)

```rust
pub async fn flag_attempt(
    Path(attempt_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _ = sqlx::query!(
        "INSERT INTO suspicious_attempts (attempt_id, user_id, reason, metadata, tenant_id)
         SELECT $1, user_id, $2, $3, tenant_id FROM quiz_attempts WHERE id=$1
         ON CONFLICT DO NOTHING",
        attempt_id,
        req["reason"].as_str().unwrap_or("unknown"),
        req["metadata"],
    ).execute(&pool).await;
    StatusCode::CREATED
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-13 suspicious attempt OK"
```

---

### 2B-14: Quiz Builder Endpoints

**Goal:** Endpoints for adding/editing questions and options in quiz builder

**Dependencies:** 2B-02

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_builder.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add builder routes)

**Endpoints:**

- `POST /api/v1/quizzes/:id/questions` — Add question
- `PUT /api/v1/quizzes/:id/questions/:q_id` — Update question
- `DELETE /api/v1/quizzes/:id/questions/:q_id` — Delete question
- `POST /api/v1/quizzes/:id/questions/:q_id/options` — Add option
- `PUT /api/v1/quizzes/:id/questions/reorder` — Batch reorder (array of {id, order_index})

```rust
use crate::models::quiz_dto::CreateQuestionRequest;

pub async fn add_question(
    Path(quiz_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<CreateQuestionRequest>,
) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); // TODO: from JWT
    match sqlx::query!(
        // GOTCHA: column is 'text' NOT 'question_text'
        "INSERT INTO quiz_questions (quiz_id, text, question_type, points, order_index, explanation, tenant_id)
         VALUES ($1,$2,$3,$4,
                 COALESCE($5,(SELECT COALESCE(MAX(order_index)+1,1) FROM quiz_questions WHERE quiz_id=$1)),
                 $6,$7)
         RETURNING id",
        quiz_id, req.text, req.question_type, req.points, req.order_index, req.explanation, tenant_id,
    ).fetch_one(&pool).await {
        Ok(q) => (StatusCode::CREATED, Json(serde_json::json!({ "id": q.id }))).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-14 quiz builder OK"
```

---

### 2B-15: Question Bank CRUD

**Goal:** Shared question bank — add/list/filter/delete

**Dependencies:** 2B-14

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/question_bank.rs` (create)

**Endpoints:**

- `GET /api/v1/question-bank` — List (filter: subject, difficulty, tags, q_type)
- `POST /api/v1/question-bank` — Add
- `DELETE /api/v1/question-bank/:id` — Delete
- `POST /api/v1/quizzes/:id/import-from-bank` — Import selected question IDs

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-15 question bank OK"
```

---

### 2B-16: Import/Export Questions

**Goal:** Export quiz questions as JSON/CSV; import from file

**Dependencies:** 2B-15

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/question_bank.rs` (add to existing)
- `edusync-api/crates/services/Cargo.toml` (`csv = "1.3"`)

**Endpoints:**

- `GET /api/v1/quizzes/:id/export` — Returns JSON array of questions with options
- `POST /api/v1/question-bank/import` — Multipart CSV upload

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-16 import/export OK"
```

---

### 2B-17: Question Randomization

**Goal:** Shuffle question/option order at attempt start based on quiz settings

**Dependencies:** 2B-16

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_attempt.rs` (update start_attempt)

**Logic:** If `quiz.shuffle_questions=true`, use `rand::seq::SliceRandom` to shuffle question order. Store order in attempt metadata or apply ORDER BY RANDOM() in quiz load query.

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-17 randomization OK"
```

---

### 2B-18: Quiz Analytics Endpoints

**Goal:** Quiz performance analytics

**Dependencies:** 2B-13

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_analytics.rs` (create)

**Endpoints:**

- `GET /api/v1/quizzes/:id/analytics` — Avg score, completion rate, pass rate
- `GET /api/v1/courses/:id/quiz-summary` — All quizzes in course

**SQL:**

```sql
SELECT COUNT(*) as total_attempts,
       AVG(percentage) FILTER (WHERE status='graded') as avg_pct,
       COUNT(*) FILTER (WHERE percentage >= $2 AND status='graded') as passed_count
FROM quiz_attempts WHERE quiz_id=$1 AND tenant_id=$3;
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-18 quiz analytics OK"
```

---

### 2B-19: Student Quiz History

**Goal:** Student's own quiz attempt history

**Dependencies:** 2B-18

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_analytics.rs` (add to existing)

**Endpoint:** `GET /api/v1/me/quiz-history?course_id=...`

```sql
SELECT qa.id, qa.quiz_id, q.title as quiz_title, qa.status,
       qa.score, qa.percentage, qa.started_at, qa.submitted_at
FROM quiz_attempts qa
JOIN quizzes q ON q.id=qa.quiz_id
WHERE qa.user_id=$1
ORDER BY qa.started_at DESC LIMIT 50;
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-19 quiz history OK"
```

---

### 2B-20: Assignment CRUD

**Goal:** Assignment CRUD endpoints

**Dependencies:** Phase 1A scaffold done

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add assignment routes)

**Endpoints:** GET list, POST create, GET :id, PUT :id, DELETE :id (soft)

```rust
pub async fn create_assignment(
    State(pool): State<PgPool>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    let tenant_id = Uuid::nil(); let user_id = Uuid::nil();
    match sqlx::query!(
        "INSERT INTO assignments (title, description, lesson_id, course_id, due_date,
                                  max_score, submission_type, allow_late, tenant_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9) RETURNING id",
        req["title"].as_str().unwrap_or(""),
        req["description"].as_str(),
        req["lesson_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()),
        req["course_id"].as_str().and_then(|s| s.parse::<Uuid>().ok()),
        req["due_date"].as_str().and_then(|s| s.parse::<chrono::DateTime<chrono::Utc>>().ok()),
        req["max_score"].as_f64(),
        req["submission_type"].as_str().unwrap_or("text"),
        tenant_id, user_id,
    ).fetch_one(&pool).await {
        Ok(r) => (StatusCode::CREATED, Json(serde_json::json!({"id":r.id}))).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-20 assignment CRUD OK"
```

---

### 2B-21: Assignment Submissions

**Goal:** Submit, list, get own submission

**Dependencies:** 2B-20

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment.rs` (add to existing)

**Endpoints:**

- `POST /api/v1/assignments/:id/submit`
- `GET /api/v1/assignments/:id/submissions` (teacher/admin)
- `GET /api/v1/assignments/:id/my-submission` (student)

```sql
-- Upsert: student can resubmit until due_date
INSERT INTO assignment_submissions
    (assignment_id, student_id, content, file_url, status, submitted_at, tenant_id)
VALUES ($1, $2, $3, $4, 'submitted', NOW(), $5)
ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    content=EXCLUDED.content, file_url=EXCLUDED.file_url,
    status='submitted', submitted_at=NOW();
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-21 submissions OK"
```

---

### 2B-22: File Upload Handler

**Goal:** Multipart file upload → MinIO placeholder (Phase 5 implements actual MinIO)

**Dependencies:** 2B-21

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment.rs` (add file upload)
- `edusync-api/crates/server/Cargo.toml` (add `axum = { features = ["multipart"] }`)

**Endpoint:** `POST /api/v1/assignments/:id/upload` → returns `{ file_url }`

**NOTE:** In Phase 2, upload to Supabase Storage via HTTP client. Phase 5 migrates to MinIO.

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-22 file upload OK"
```

---

### 2B-23: Assignment Group Support

**Goal:** Assign to class groups

**Dependencies:** 2B-22

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment.rs` (add group endpoint)

**Endpoint:** `POST /api/v1/assignments/:id/groups` — body: `{ class_ids: [Uuid] }`

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-23 assignment groups OK"
```

---

### 2B-24: Assignment Rubric Handler

**Goal:** Rubric CRUD

**Dependencies:** 2B-23

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment.rs` (add rubric endpoints)

**Endpoints:**

- `POST /api/v1/assignments/:id/rubric` — Set rubric criteria
- `GET /api/v1/assignments/:id/rubric` — Get rubric

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-24 rubric OK"
```

---

### 2B-25: Gradebook Aggregation

**Goal:** Aggregate grades per student per course

**Dependencies:** 2B-07 + 2B-21

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook.rs` (create)
- `edusync-api/crates/server/src/router.rs` (add gradebook routes)

**Endpoint:** `GET /api/v1/courses/:course_id/gradebook`

**Concrete SQL:**

```sql
-- GOTCHA: enrollments.user_id NOT student_id
SELECT
    p.id as student_id,
    p.full_name,
    COUNT(DISTINCT qa.quiz_id) FILTER (WHERE qa.status='graded') as quizzes_completed,
    AVG(qa.percentage) FILTER (WHERE qa.status='graded') as quiz_avg,
    COUNT(DISTINCT sub.assignment_id) FILTER (WHERE sub.status='graded') as assignments_graded,
    AVG(CASE WHEN a.max_score>0 THEN sub.score/a.max_score*100 END)
        FILTER (WHERE sub.status='graded') as assignment_avg
FROM enrollments e
JOIN profiles p ON p.id=e.user_id
LEFT JOIN quiz_attempts qa ON qa.user_id=p.id
    AND qa.quiz_id IN (SELECT id FROM quizzes WHERE course_id=$1)
LEFT JOIN assignment_submissions sub ON sub.student_id=p.id
    AND sub.assignment_id IN (SELECT id FROM assignments WHERE course_id=$1)
LEFT JOIN assignments a ON a.id=sub.assignment_id
WHERE e.course_id=$1 AND e.tenant_id=$2
GROUP BY p.id, p.full_name
ORDER BY p.full_name;
```

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-25 gradebook OK"
```

---

### 2B-26: Grade Override Handler

**Goal:** Teacher override individual grades

**Dependencies:** 2B-25

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook.rs` (add to existing)

**Endpoints:**

- `PUT /api/v1/gradebook/quiz/:attempt_id/override` — body: `{ score, feedback, reason }`
- `PUT /api/v1/gradebook/assignment/:submission_id/grade` — body: `{ score, feedback }`

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-26 grade override OK"
```

---

### 2B-27: SpeedGrader Endpoints

**Goal:** Fast grading interface — next ungraded, grade + advance

**Dependencies:** 2B-26

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook.rs` (add to existing)

**Endpoints:**

- `GET /api/v1/assignments/:id/speedgrader` — Next ungraded submission
- `POST /api/v1/assignments/:id/speedgrader/:submission_id` — Grade and advance (returns next)

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-27 SpeedGrader OK"
```

---

### 2B-28: Grade Export

**Goal:** Export gradebook as CSV download

**Dependencies:** 2B-27

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook.rs` (add export)
- `edusync-api/crates/services/Cargo.toml` (`csv = "1.3"` if not already added)

**Endpoint:** `GET /api/v1/courses/:id/gradebook/export` → CSV response

**Response headers:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="gradebook.csv"`

**Columns:** student_name, email, quiz_avg, quizzes_completed, assignment_avg, overall_grade

**Verify:**

```bash
cargo check -p edusync-server && echo "PASS: 2B-28 grade export OK"
```

---

### 2B-29 to 2B-38: Frontend Service Refactor

**Goal:** Refactor all quiz/assignment/gradebook service files to use `getApiClient()`

**Dependencies:** Corresponding Rust handlers done

**Pattern:**

```typescript
// BEFORE (Supabase direct):
import { supabase } from '@/services/supabase/client'
const { data } = await supabase.from('quiz_attempts').insert({ quiz_id, user_id })

// AFTER (via getApiClient):
import { getApiClient } from '@/services/api'
const api = getApiClient()
// Supabase-compatible ops (while in shadow mode):
const { data } = await api.from('quiz_attempts').insert({ quiz_id, user_id })
// VIL-specific endpoints:
const res = await fetch(`/api/v1/quizzes/${quizId}/attempts`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }
})
```

**Files to EDIT ONLY (one task per file):**

| Task  | File                                                |
| ----- | --------------------------------------------------- |
| 2B-29 | `src/features/quizzes/api/quizCRUD.ts`              |
| 2B-30 | `src/features/quizzes/api/quizPlayerService.ts`     |
| 2B-31 | `src/features/quizzes/api/quizAttemptService.ts`    |
| 2B-32 | `src/features/quizzes/api/quizBuilderService.ts`    |
| 2B-33 | `src/features/assignments/api/assignmentService.ts` |
| 2B-34 | `src/features/assignments/api/submissionService.ts` |
| 2B-35 | `src/features/gradebook/api/gradebookService.ts`    |
| 2B-36 | `src/features/quizzes/api/questionBankService.ts`   |
| 2B-37 | `src/utils/offlineQueue.ts` (verify getApiClient — update if needed) |
| 2B-38 | Any remaining files in `src/features/quizzes/api/`  |

**Verify per file:**

```bash
pnpm typecheck && echo "PASS: TypeScript OK"
grep -r "from '@/services/supabase" src/features/quizzes/ src/features/assignments/ src/features/gradebook/ | wc -l
# Expected: 0 after all refactors
```

---

### 2B-39 to 2B-42: Integration Tests + Shadow Mode

**Goal:** Integration tests dan shadow mode verification sebelum cutover

**Dependencies:** 2B-29 to 2B-38

**EDIT ONLY:**

- `edusync-api/crates/server/tests/quiz_integration.rs` (create)
- `edusync-api/crates/server/tests/assignment_integration.rs` (create)
- `edusync-api/crates/server/tests/gradebook_integration.rs` (create)

**Test Pattern:**

```rust
#[sqlx::test]
async fn test_quiz_full_lifecycle(pool: sqlx::PgPool) {
    // 1. Start attempt → 2. Autosave → 3. Submit → 4. Grade → 5. Check score
}

#[sqlx::test]
async fn test_double_submit_idempotent(pool: sqlx::PgPool) {
    // Submit twice → both return 200, not 409
}

#[sqlx::test]
async fn test_autosave_upserts(pool: sqlx::PgPool) {
    // Autosave same question twice → quiz_answers count = 1
}
```

**Shadow Mode (2B-42):**

```bash
# Run diff on key endpoints between Supabase and VIL
diff <(curl -s "$SUPABASE_URL/rest/v1/quizzes" -H "apikey: $ANON_KEY") \
     <(curl -s http://localhost:8080/api/v1/quizzes -H "Authorization: Bearer $TOKEN") \
  | grep -v "created_at\|updated_at" | wc -l
# Expected: 0
```

**Verify:**

```bash
cargo test -p edusync-server && echo "PASS: quiz/assignment/gradebook tests OK"
```

---

## Parallelism Map

| Group       | Tasks         | Parallel With   |
| ----------- | ------------- | --------------- |
| A — Models  | 2B-01 → 2B-02 | G (Assignments) |
| B — Read    | 2B-03 → 2B-04 | C, D            |
| C — Attempt | 2B-05 → 2B-06 | B, D            |
| D — Submit  | 2B-07 → 2B-08 | B, C            |
| E — Grading | 2B-09 → 2B-13 | B, C, D         |
| F — Builder | 2B-14 → 2B-17 | E               |
| G — Assign  | 2B-20 → 2B-24 | All             |
| H — Grade   | 2B-25 → 2B-28 | D + G           |
| J — Frontend| 2B-29 → 2B-38 | Per-file        |
| K — Tests   | 2B-39 → 2B-42 | J done          |
