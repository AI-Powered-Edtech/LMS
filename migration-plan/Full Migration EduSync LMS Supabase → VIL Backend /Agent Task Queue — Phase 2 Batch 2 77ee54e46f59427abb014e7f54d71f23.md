# Agent Task Queue — Phase 2 Batch 2

<aside>
🧪

**BATCH PALING KOMPLEKS.** Quizzes (13 service files, timer, autosave, auto-grade), Assignments (submissions, group, file upload), Gradebook (aggregation, SpeedGrader), Question Bank. Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Task harus dikerjakan **berurutan per-group** (ada dependency intra-group). Cross-group bisa paralel kecuali disebutkan sebaliknya.

</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap Rust task
6. Jalankan `pnpm typecheck && pnpm lint` setelah setiap frontend task
7. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
8. **Quiz grading DLQ:** Pakai `quiz_submission_queue.status = 'dead_letter'` — BUKAN VIL general DLQ
9. **Idempotency key format quiz:** `quiz:{attempt_id}:{user_id}`
10. **SQL column names:** `quiz_questions.text` (BUKAN `question_text`), `quiz_options.text` (BUKAN `option_text`)
11. **DB Pool:** Grading worker pakai pool `grading` (max 10 connections), CRUD pakai pool `default`
12. **Pattern:** Gunakan Axum-style handlers (Pattern A dari Bootstrap Context), BUKAN VIL ShmSlice pattern
13. Jika menemukan coupling tak terduga > 5 file → **BLOCKED**
14. Jika perlu ubah contract / response shape → **ESCALATE**
15. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 2B-XX"`. Jika verify gagal: `git stash`. JANGAN lanjut dengan state setengah jadi.
16. **🛠️ Transaction wrapping (Gap #3):** Quiz submit (2B-07), start attempt (2B-05), dan grading worker (2B-11) WAJIB wrapped dalam `pool.begin()` → `tx.commit()`. Multi-table writes tanpa transaction = data corruption risk.
17. **🛠️ VilError type (Gap #4):** Gunakan `AppError` dari `crates/middleware/src/errors.rs`. JANGAN assume `VilError`.
18. **🛠️ offlineQueue.ts (Gap #6):** Task 2B-07 (quiz submit) WAJIB verify kompatibilitas dengan `src/utils/offlineQueue.ts`. Idempotency key format `quiz:{attempt_id}:{user_id}` harus diterima oleh VIL endpoint dengan 200 (bukan 409) jika sudah diproses.

---

## Dependency Map & Parallelism

| **Group**                        | **Tasks**     | **Depends On**                    | **Parallel?**                              |
| -------------------------------- | ------------- | --------------------------------- | ------------------------------------------ |
| A — Quiz Models                  | 2B-01 → 2B-02 | Phase 1A scaffold done            | ✅ Paralel dengan Group E, F, G            |
| B — Quiz Read                    | 2B-03 → 2B-04 | Group A                           | ✅ Paralel dengan Group C, D               |
| C — Quiz Autosave                | 2B-05 → 2B-06 | Group A                           | ✅ Paralel dengan Group B, D               |
| D — Quiz Submit                  | 2B-07 → 2B-08 | Group A                           | ✅ Paralel dengan Group B, C               |
| E — Quiz Timer                   | 2B-09 → 2B-10 | Group A + Group D                 | ⚠️ Setelah submit handler ada              |
| F — Quiz Grading Worker          | 2B-11 → 2B-13 | Group D (submit triggers grading) | ⚠️ Setelah submit handler ada              |
| G — Quiz Builder & Question Bank | 2B-14 → 2B-17 | Group A                           | ✅ Paralel dengan B, C, D                  |
| H — Quiz Analytics               | 2B-18 → 2B-19 | Group A + Group F                 | ⚠️ Setelah grading ada                     |
| I — Assignments                  | 2B-20 → 2B-24 | Phase 1A scaffold done            | ✅ Paralel dengan semua Quiz groups        |
| J — Gradebook                    | 2B-25 → 2B-28 | Group D + Group I                 | ⚠️ Setelah quiz submit + assignment submit |
| K — Frontend Refactor            | 2B-29 → 2B-38 | Corresponding Rust handlers done  | ✅ Per-service paralel                     |
| L — Test Packs                   | 2B-39 → 2B-42 | Group K done                      | ✅ Paralel per test pack                   |

---

# Pre-Group — Schema Introspection & Coordination

## Task 2B-00: Schema Introspection & Dual-Processing Guard

**TASK ID:** 2B-00

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Introspect actual DB schema untuk quiz tables + setup guards against dual-processing

**DEPENDENCY:** Phase 1A scaffold selesai

**READ FIRST:**

- `supabase/migrations/` — semua migration files terkait quiz
- Main plan CC6 — offline queue semantics
- Main plan Phase 3D — `grade-quiz-attempt` Edge Function

**EDIT ONLY:**

- `edusync-api/docs/schema-introspection-batch2.md` (buat baru)

**DO NOT TOUCH:**

- Database schema (read-only introspection)
- Supabase Edge Functions (hanya audit)

**IMPLEMENTATION STEPS:**

1. Run schema introspection dan catat hasilnya:

```sql
\d quizzes;
\d quiz_questions;
\d quiz_options;
\d quiz_attempts;
\d quiz_answers;
\d question_bank;
\d question_bank_options;
\d suspicious_attempts;
\d submission_files;
\d assignments;
\d assignment_submissions;
-- Check existing constraints:
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('quiz_answers'::regclass)
  AND contype = 'u';
-- Check for existing grading-related pg_cron jobs:
SELECT * FROM cron.job WHERE command ILIKE '%quiz%' OR command ILIKE '%attempt%' OR command ILIKE '%grade%';
-- Check for existing Edge Function triggers:
SELECT * FROM supabase_functions.hooks WHERE function_id IN (
  SELECT id FROM supabase_functions.functions WHERE name ILIKE '%grade%' OR name ILIKE '%quiz%'
);
```

1. Document actual schema vs assumed schema — list perbedaan
2. **⚠️ DUAL-PROCESSING GUARD:** List semua existing Supabase mechanisms yang process quiz grading:
   - pg_cron jobs yang auto-expire attempts
   - Edge Function `grade-quiz-attempt` trigger
   - Supabase DB triggers on quiz tables
3. For each mechanism → document how to disable saat VIL equivalent aktif
4. **Scan frontend quiz service files:** `ls src/features/quizzes/api/` → confirm exact count (expected: 13)
5. **Scan offline queue:** `grep -rn 'quiz\|attempt\|submit' src/utils/offlineQueue.ts` → document quiz-related paths

**VERIFY:**

```bash
cat edusync-api/docs/schema-introspection-batch2.md | wc -l
# Should be > 50 lines (comprehensive)
```

**STOP IF:**

- Schema sangat berbeda dari assumed structs (>5 missing columns) → BLOCKED, update models first
- Active pg_cron grading job found → MUST document disable procedure before Group F

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# ⚠️ Review Gaps — Fixes Applied

<aside>
⚠️

**10 gaps identified from review. Fixes:**

🔴 **Gap 1 (scope mismatch):** Task 2B-00 step 5 scans actual file count. Group K akan di-extend setelah scan.

🔴 **Gap 2 (offlineQueue.ts):** Task 2B-00 step 6 audits offline queue. Tambah Task 2B-29b di Group K.

🔴 **Gap 3 (schema introspection):** Task 2B-00 added above.

🟡 **Gap 4 (dual grading):** Task 2B-00 step 3-4 documents disable procedure. Group F tasks harus run disable SEBELUM start VIL worker.

🟡 **Gap 5 (dual timer cron):** Same as Gap 4 — covered in Task 2B-00 step 3.

🟡 **Gap 6 (Phase 0A ambiguity):** Group K tasks now say: "Jika sudah refactored di Phase 0A → verify only. Jika BELUM → full refactor."

🟡 **Gap 7 (autosave lock contention):** Task 2B-06 autosave TIDAK pakai `SELECT ... FOR UPDATE`. Pakai UPSERT (ON CONFLICT) saja — ini optimistic, bukan pessimistic. `FOR UPDATE` HANYA di submit (2B-07) dan auto-submit (2B-09).

🟢 **Gap 8 (Nginx):** Covered by Phase 1A Nginx config — setiap batch hanya perlu add routes ke existing config.

🟢 **Gap 9 (effort):** Estimasi ~60-80 jam untuk Batch 2 (dari 240 total Phase 2).

🟢 **Gap 10 (SpeedGrader):** Task 2B-27 expanded dengan note tentang SpeedGrader-specific RPCs.

</aside>

---

# Group A — Quiz Rust Models

## Task 2B-01: Quiz Domain Rust Models

**TASK ID:** 2B-01

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Buat semua Rust model structs untuk quiz domain tables

**DEPENDENCY:** Phase 1A scaffold selesai (workspace `edusync-api/` exist)

**READ FIRST:**

- `supabase/migrations/` — cari semua migration yang create quiz tables
- `src/features/quizzes/types/` — TypeScript types sebagai referensi
- Bootstrap Context §13 SQL Gotchas

**EDIT ONLY:**

- `edusync-api/crates/models/src/quiz.rs` (buat baru)
- `edusync-api/crates/models/src/lib.rs` (tambah `pub mod quiz;`)

**DO NOT TOUCH:**

- File lain di `crates/models/`
- Semua file frontend

**IMPLEMENTATION STEPS:**

1. Buat file `edusync-api/crates/models/src/quiz.rs`
2. Define structs untuk semua quiz tables
3. Tambah `pub mod quiz;` di `lib.rs`

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/quiz.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Main quiz definition
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Quiz {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub quiz_type: String,          // 'multiple_choice' | 'essay' | 'mixed'
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub passing_score: Option<f64>,
    pub shuffle_questions: bool,
    pub shuffle_options: bool,
    pub show_correct_answers: bool,
    pub is_published: bool,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Quiz question — GOTCHA: column is "text", NOT "question_text"
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizQuestion {
    pub id: Uuid,
    pub quiz_id: Uuid,
    pub text: String,               // WAJIB "text", bukan "question_text"
    pub question_type: String,      // 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' | 'fill_blank'
    pub points: f64,
    pub "order": i32,              // SQL reserved word — harus dikutip
    pub explanation: Option<String>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Quiz option — GOTCHA: column is "text", NOT "option_text"
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizOption {
    pub id: Uuid,
    pub question_id: Uuid,
    pub text: String,               // WAJIB "text", bukan "option_text"
    pub is_correct: bool,
    pub "order": i32,
    pub tenant_id: Uuid,
}

/// Quiz attempt by student
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizAttempt {
    pub id: Uuid,
    pub quiz_id: Uuid,
    pub user_id: Uuid,              // BUKAN student_id
    pub status: String,             // 'in_progress' | 'submitted' | 'graded' | 'expired'
    pub score: Option<f64>,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub graded_at: Option<DateTime<Utc>>,
    pub time_spent_seconds: Option<i32>,
    pub attempt_number: i32,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Student answer per question in an attempt
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizAnswer {
    pub id: Uuid,
    pub attempt_id: Uuid,
    pub question_id: Uuid,
    pub selected_option_id: Option<Uuid>,
    pub text_answer: Option<String>,
    pub is_correct: Option<bool>,
    pub points_earned: Option<f64>,
    pub graded_by: Option<Uuid>,
    pub feedback: Option<String>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Quiz submission queue (domain-specific DLQ)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuizSubmissionQueue {
    pub id: Uuid,
    pub attempt_id: Uuid,
    pub status: String,             // 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
    pub retry_count: i32,
    pub last_error: Option<String>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Question bank item
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestionBankItem {
    pub id: Uuid,
    pub text: String,
    pub question_type: String,
    pub points: f64,
    pub explanation: Option<String>,
    pub category: Option<String>,
    pub difficulty: Option<String>,  // 'easy' | 'medium' | 'hard'
    pub course_id: Option<Uuid>,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Question bank option
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuestionBankOption {
    pub id: Uuid,
    pub question_id: Uuid,
    pub text: String,
    pub is_correct: bool,
    pub "order": i32,
    pub tenant_id: Uuid,
}

/// Suspicious attempt flag
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SuspiciousAttempt {
    pub id: Uuid,
    pub attempt_id: Uuid,
    pub reason: String,
    pub details: Option<serde_json::Value>,
    pub reviewed: bool,
    pub reviewed_by: Option<Uuid>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}
```

**⚠️ CATATAN PENTING tentang `order` field:**

Rust tidak mengizinkan keyword sebagai field name. Gunakan `#[sqlx(rename = "order")]` dan rename field:

```rust
#[sqlx(rename = "order")]
pub sort_order: i32,
```

Dan tambahkan serde rename:

```rust
#[serde(rename = "order")]
#[sqlx(rename = "order")]
pub sort_order: i32,
```

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**STOP IF:**

- Migration files menunjukkan schema yang sangat berbeda dari struct di atas → BLOCKED, list perbedaan
- Ada > 3 tabel quiz tambahan yang belum terdaftar → tambahkan, tapi ESCALATE jika > 6

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-02: Quiz Request/Response DTOs

**TASK ID:** 2B-02

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Buat request/response DTOs yang match frontend expectations

**DEPENDENCY:** 2B-01

**READ FIRST:**

- `src/features/quizzes/types/` — semua TypeScript types
- Spec 2 §5 Error Shape Compatibility
- Bootstrap Context §13 Frontend Expectations

**EDIT ONLY:**

- `edusync-api/crates/models/src/quiz_dto.rs` (buat baru)
- `edusync-api/crates/models/src/lib.rs` (tambah `pub mod quiz_dto;`)

**DO NOT TOUCH:**

- `quiz.rs` (model DB, jangan ubah)
- Semua file frontend

**IMPLEMENTATION STEPS:**

1. Buat DTOs untuk setiap endpoint response
2. Pastikan field names match frontend TypeScript types
3. Error responses harus pakai format `{ code, message, details, hint }`

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/models/src/quiz_dto.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ===== REQUEST DTOs =====

#[derive(Debug, Deserialize)]
pub struct CreateQuizRequest {
    pub title: String,
    pub description: Option<String>,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub quiz_type: String,
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub passing_score: Option<f64>,
    pub shuffle_questions: Option<bool>,
    pub shuffle_options: Option<bool>,
    pub show_correct_answers: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuizRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub quiz_type: Option<String>,
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub passing_score: Option<f64>,
    pub shuffle_questions: Option<bool>,
    pub shuffle_options: Option<bool>,
    pub show_correct_answers: Option<bool>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct StartAttemptRequest {
    pub quiz_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct AutosaveAnswerRequest {
    pub question_id: Uuid,
    pub selected_option_id: Option<Uuid>,
    pub text_answer: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AutosaveBatchRequest {
    pub answers: Vec<AutosaveAnswerRequest>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitAttemptRequest {
    pub answers: Vec<AutosaveAnswerRequest>,
}

#[derive(Debug, Deserialize)]
pub struct GradeEssayRequest {
    pub answer_id: Uuid,
    pub points_earned: f64,
    pub feedback: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuestionRequest {
    pub text: String,
    pub question_type: String,
    pub points: f64,
    pub explanation: Option<String>,
    pub options: Option<Vec<CreateOptionRequest>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOptionRequest {
    pub text: String,
    pub is_correct: bool,
}

// ===== RESPONSE DTOs =====

#[derive(Debug, Serialize)]
pub struct QuizResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub quiz_type: String,
    pub time_limit_minutes: Option<i32>,
    pub max_attempts: Option<i32>,
    pub passing_score: Option<f64>,
    pub shuffle_questions: bool,
    pub shuffle_options: bool,
    pub show_correct_answers: bool,
    pub is_published: bool,
    pub question_count: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct QuizDetailResponse {
    pub quiz: QuizResponse,
    pub questions: Vec<QuestionResponse>,
}

#[derive(Debug, Serialize)]
pub struct QuestionResponse {
    pub id: Uuid,
    pub text: String,
    pub question_type: String,
    pub points: f64,
    pub sort_order: i32,
    pub explanation: Option<String>,
    pub options: Vec<OptionResponse>,
}

#[derive(Debug, Serialize)]
pub struct OptionResponse {
    pub id: Uuid,
    pub text: String,
    pub is_correct: bool,
    pub sort_order: i32,
}

/// Student-facing quiz (hides correct answers if configured)
#[derive(Debug, Serialize)]
pub struct StudentQuizResponse {
    pub quiz: QuizResponse,
    pub questions: Vec<StudentQuestionResponse>,
    pub attempt: Option<AttemptSummaryResponse>,
}

#[derive(Debug, Serialize)]
pub struct StudentQuestionResponse {
    pub id: Uuid,
    pub text: String,
    pub question_type: String,
    pub points: f64,
    pub sort_order: i32,
    pub options: Vec<StudentOptionResponse>,
}

#[derive(Debug, Serialize)]
pub struct StudentOptionResponse {
    pub id: Uuid,
    pub text: String,
    // is_correct EXCLUDED for student view
}

#[derive(Debug, Serialize)]
pub struct AttemptResponse {
    pub id: Uuid,
    pub quiz_id: Uuid,
    pub user_id: Uuid,
    pub status: String,
    pub score: Option<f64>,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub graded_at: Option<DateTime<Utc>>,
    pub time_spent_seconds: Option<i32>,
    pub attempt_number: i32,
    pub answers: Vec<AnswerResponse>,
}

#[derive(Debug, Serialize)]
pub struct AttemptSummaryResponse {
    pub id: Uuid,
    pub status: String,
    pub score: Option<f64>,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub attempt_number: i32,
    pub remaining_time_seconds: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AnswerResponse {
    pub id: Uuid,
    pub question_id: Uuid,
    pub selected_option_id: Option<Uuid>,
    pub text_answer: Option<String>,
    pub is_correct: Option<bool>,
    pub points_earned: Option<f64>,
    pub feedback: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AutosaveResponse {
    pub saved_count: usize,
    pub attempt_id: Uuid,
    pub saved_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SubmitResponse {
    pub attempt_id: Uuid,
    pub status: String,
    pub score: Option<f64>,
    pub grading_status: String,  // 'auto_graded' | 'pending_manual' | 'queued'
}

// ===== ERROR DTOs (PostgREST compatible) =====

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub hint: Option<String>,
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**STOP IF:**

- Frontend TypeScript types memiliki > 5 field yang tidak ada di DTO → BLOCKED, list perbedaan

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group B — Quiz Read Flow (Cutover Unit: `quiz.read`)

## Task 2B-03: Quiz CRUD Read Handlers

**TASK ID:** 2B-03

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement quiz list + detail read endpoints (teacher & student views)

**DEPENDENCY:** 2B-02

**READ FIRST:**

- `src/features/quizzes/api/quizCRUD.ts` — existing Supabase queries
- `src/features/quizzes/api/quizPlayer.service.ts` — student quiz load
- Bootstrap Context §4 JWT + RBAC
- Spec 3 §1.1 endpoint latency targets (quiz fetch: 200ms)

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_read.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah `pub mod quiz_read;`)
- `edusync-api/crates/server/src/routes.rs` (register routes)

**DO NOT TOUCH:**

- `crates/models/` (sudah final dari 2B-01, 2B-02)
- Semua file frontend
- Handler lain yang sudah ada

**IMPLEMENTATION STEPS:**

1. Implement `GET /api/v1/quizzes` — list quizzes (teacher: all for course, student: published only)
2. Implement `GET /api/v1/quizzes/:id` — quiz detail (teacher: with correct answers, student: without)
3. Implement `GET /api/v1/quizzes/:id/student` — student quiz load (load-quiz-data equivalent)
4. Apply TenantGuard + RbacGuard
5. Apply rate limit: 100/min per user

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_read.rs
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

#[derive(Debug, serde::Deserialize)]
pub struct ListQuizzesParams {
    pub course_id: Option<Uuid>,
    pub lesson_id: Option<Uuid>,
    pub is_published: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/v1/quizzes — List quizzes (tenant-scoped)
pub async fn list_quizzes(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<ListQuizzesParams>,
) -> Result<Json<Vec<QuizResponse>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);

    let is_teacher_or_admin = claims.has_any_role(&["teacher", "admin"]);

    let quizzes = if is_teacher_or_admin {
        sqlx::query_as!(
            QuizResponse,
            r#"SELECT q.id, q.title, q.description, q.course_id, q.lesson_id,
                   q.quiz_type, q.time_limit_minutes, q.max_attempts,
                   q.passing_score, q.shuffle_questions, q.shuffle_options,
                   q.show_correct_answers, q.is_published,
                   (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
                   q.created_at, q.updated_at
            FROM quizzes q
            WHERE q.tenant_id = $1
              AND ($2::UUID IS NULL OR q.course_id = $2)
              AND ($3::UUID IS NULL OR q.lesson_id = $3)
            ORDER BY q.created_at DESC
            LIMIT $4 OFFSET $5"#,
            tenant.0,
            params.course_id,
            params.lesson_id,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await?
    } else {
        // Students see only published quizzes
        sqlx::query_as!(
            QuizResponse,
            r#"SELECT q.id, q.title, q.description, q.course_id, q.lesson_id,
                   q.quiz_type, q.time_limit_minutes, q.max_attempts,
                   q.passing_score, q.shuffle_questions, q.shuffle_options,
                   q.show_correct_answers, q.is_published,
                   (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
                   q.created_at, q.updated_at
            FROM quizzes q
            WHERE q.tenant_id = $1
              AND q.is_published = true
              AND ($2::UUID IS NULL OR q.course_id = $2)
              AND ($3::UUID IS NULL OR q.lesson_id = $3)
            ORDER BY q.created_at DESC
            LIMIT $4 OFFSET $5"#,
            tenant.0,
            params.course_id,
            params.lesson_id,
            limit,
            offset,
        )
        .fetch_all(&state.db)
        .await?
    };

    Ok(Json(quizzes))
}

/// GET /api/v1/quizzes/:id — Quiz detail (teacher view with correct answers)
pub async fn get_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<QuizDetailResponse>, AppError> {
    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"SELECT q.id, q.title, q.description, q.course_id, q.lesson_id,
               q.quiz_type, q.time_limit_minutes, q.max_attempts,
               q.passing_score, q.shuffle_questions, q.shuffle_options,
               q.show_correct_answers, q.is_published,
               (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
               q.created_at, q.updated_at
        FROM quizzes q
        WHERE q.id = $1 AND q.tenant_id = $2"#,
        quiz_id,
        tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Quiz tidak ditemukan"))?;

    // Teacher/admin sees correct answers
    let is_teacher_or_admin = claims.has_any_role(&["teacher", "admin"]);
    if !is_teacher_or_admin && !quiz.is_published {
        return Err(AppError::forbidden("Anda tidak memiliki akses ke quiz ini"));
    }

    let questions = sqlx::query!(
        r#"SELECT id, text, question_type, points, "order" as sort_order, explanation
        FROM quiz_questions
        WHERE quiz_id = $1 AND tenant_id = $2
        ORDER BY "order" ASC"#,
        quiz_id,
        tenant.0,
    )
    .fetch_all(&state.db)
    .await?;

    let mut question_responses = Vec::new();
    for q in questions {
        let options = sqlx::query!(
            r#"SELECT id, text, is_correct, "order" as sort_order
            FROM quiz_options
            WHERE question_id = $1 AND tenant_id = $2
            ORDER BY "order" ASC"#,
            q.id,
            tenant.0,
        )
        .fetch_all(&state.db)
        .await?;

        question_responses.push(QuestionResponse {
            id: q.id,
            text: q.text,
            question_type: q.question_type,
            points: q.points,
            sort_order: q.sort_order,
            explanation: q.explanation,
            options: options.into_iter().map(|o| OptionResponse {
                id: o.id,
                text: o.text,
                is_correct: if is_teacher_or_admin { o.is_correct } else { false },
                sort_order: o.sort_order,
            }).collect(),
        });
    }

    Ok(Json(QuizDetailResponse {
        quiz,
        questions: question_responses,
    }))
}

/// GET /api/v1/quizzes/:id/student — Student quiz load
/// Replaces Edge Function `load-quiz-data`
pub async fn get_quiz_student(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<StudentQuizResponse>, AppError> {
    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"SELECT q.id, q.title, q.description, q.course_id, q.lesson_id,
               q.quiz_type, q.time_limit_minutes, q.max_attempts,
               q.passing_score, q.shuffle_questions, q.shuffle_options,
               q.show_correct_answers, q.is_published,
               (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
               q.created_at, q.updated_at
        FROM quizzes q
        WHERE q.id = $1 AND q.tenant_id = $2 AND q.is_published = true"#,
        quiz_id,
        tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Quiz tidak ditemukan"))?;

    // Check enrollment: student must be enrolled in the course
    let enrolled = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 AND tenant_id = $3)",
        claims.sub,
        quiz.course_id,
        tenant.0,
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !enrolled {
        return Err(AppError::forbidden("Anda belum terdaftar di kursus ini"));
    }

    // Get latest in-progress attempt if any
    let attempt = sqlx::query_as!(
        AttemptSummaryResponse,
        r#"SELECT id, status, score, started_at, submitted_at, attempt_number,
               CASE WHEN status = 'in_progress' AND $4::INT IS NOT NULL THEN
                   GREATEST(0, ($4 * 60) - EXTRACT(EPOCH FROM (NOW() - started_at))::BIGINT)
               ELSE NULL END as remaining_time_seconds
        FROM quiz_attempts
        WHERE quiz_id = $1 AND user_id = $2 AND tenant_id = $3
        ORDER BY attempt_number DESC
        LIMIT 1"#,
        quiz_id,
        claims.sub,
        tenant.0,
        quiz.time_limit_minutes,
    )
    .fetch_optional(&state.db)
    .await?;

    // Load questions (without correct answers for student)
    let questions = sqlx::query!(
        r#"SELECT id, text, question_type, points, "order" as sort_order
        FROM quiz_questions
        WHERE quiz_id = $1 AND tenant_id = $2
        ORDER BY "order" ASC"#,
        quiz_id,
        tenant.0,
    )
    .fetch_all(&state.db)
    .await?;

    let mut student_questions = Vec::new();
    for q in questions {
        let options = sqlx::query!(
            r#"SELECT id, text, "order" as sort_order
            FROM quiz_options
            WHERE question_id = $1 AND tenant_id = $2
            ORDER BY "order" ASC"#,
            q.id,
            tenant.0,
        )
        .fetch_all(&state.db)
        .await?;

        student_questions.push(StudentQuestionResponse {
            id: q.id,
            text: q.text,
            question_type: q.question_type,
            points: q.points,
            sort_order: q.sort_order,
            options: options.into_iter().map(|o| StudentOptionResponse {
                id: o.id,
                text: o.text,
            }).collect(),
        });
    }

    Ok(Json(StudentQuizResponse {
        quiz,
        questions: student_questions,
        attempt,
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `quizCRUD.ts` memiliki query pattern yang tidak bisa di-map ke SQL biasa → BLOCKED
- `load-quiz-data` Edge Function memiliki logic tambahan di luar query → list dan ESCALATE

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-04: Quiz CRUD Write Handlers (Create, Update, Delete, Publish)

**TASK ID:** 2B-04

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement quiz create, update, delete, publish endpoints (teacher/admin only)

**DEPENDENCY:** 2B-03

**READ FIRST:**

- `src/features/quizzes/api/quizCRUD.ts`
- `src/features/quizzes/api/quizBuilderService.ts`

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_write.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs` (tambah `pub mod quiz_write;`)
- `edusync-api/crates/server/src/routes.rs` (register routes)

**DO NOT TOUCH:**

- `quiz_read.rs`
- Semua file frontend

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/quizzes` — create quiz (teacher/admin)
2. `PUT /api/v1/quizzes/:id` — update quiz
3. `DELETE /api/v1/quizzes/:id` — delete quiz
4. `POST /api/v1/quizzes/:id/publish` — publish quiz
5. `POST /api/v1/quizzes/:id/unpublish` — unpublish quiz
6. All endpoints: TenantGuard + RbacGuard (teacher/admin only)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_write.rs
use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// POST /api/v1/quizzes
pub async fn create_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Json(req): Json<CreateQuizRequest>,
) -> Result<Json<QuizResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"INSERT INTO quizzes (id, title, description, course_id, lesson_id, quiz_type,
               time_limit_minutes, max_attempts, passing_score, shuffle_questions,
               shuffle_options, show_correct_answers, is_published, tenant_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, $14)
        RETURNING id, title, description, course_id, lesson_id, quiz_type,
                  time_limit_minutes, max_attempts, passing_score, shuffle_questions,
                  shuffle_options, show_correct_answers, is_published,
                  0::BIGINT as question_count, created_at, updated_at"#,
        Uuid::new_v4(),
        req.title,
        req.description,
        req.course_id,
        req.lesson_id,
        req.quiz_type,
        req.time_limit_minutes,
        req.max_attempts,
        req.passing_score,
        req.shuffle_questions.unwrap_or(false),
        req.shuffle_options.unwrap_or(false),
        req.show_correct_answers.unwrap_or(true),
        tenant.0,
        claims.sub,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(quiz))
}

/// PUT /api/v1/quizzes/:id
pub async fn update_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
    Json(req): Json<UpdateQuizRequest>,
) -> Result<Json<QuizResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Verify quiz exists and belongs to tenant
    let existing = sqlx::query!(
        "SELECT created_by FROM quizzes WHERE id = $1 AND tenant_id = $2",
        quiz_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Quiz tidak ditemukan"))?;

    // Teacher can only edit own quizzes, admin can edit all
    if !claims.has_role("admin") && existing.created_by != claims.sub {
        return Err(AppError::forbidden("Anda hanya bisa mengedit quiz Anda sendiri"));
    }

    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"UPDATE quizzes SET
            title = COALESCE($3, title),
            description = COALESCE($4, description),
            quiz_type = COALESCE($5, quiz_type),
            time_limit_minutes = COALESCE($6, time_limit_minutes),
            max_attempts = COALESCE($7, max_attempts),
            passing_score = COALESCE($8, passing_score),
            shuffle_questions = COALESCE($9, shuffle_questions),
            shuffle_options = COALESCE($10, shuffle_options),
            show_correct_answers = COALESCE($11, show_correct_answers),
            is_published = COALESCE($12, is_published),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, title, description, course_id, lesson_id, quiz_type,
                  time_limit_minutes, max_attempts, passing_score, shuffle_questions,
                  shuffle_options, show_correct_answers, is_published,
                  (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = quizzes.id) as question_count,
                  created_at, updated_at"#,
        quiz_id, tenant.0,
        req.title, req.description, req.quiz_type,
        req.time_limit_minutes, req.max_attempts, req.passing_score,
        req.shuffle_questions, req.shuffle_options, req.show_correct_answers,
        req.is_published,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(quiz))
}

/// DELETE /api/v1/quizzes/:id
pub async fn delete_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query!(
        "DELETE FROM quizzes WHERE id = $1 AND tenant_id = $2",
        quiz_id, tenant.0,
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Quiz tidak ditemukan"));
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}

/// POST /api/v1/quizzes/:id/publish
pub async fn publish_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<QuizResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Verify quiz has at least 1 question
    let question_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = $1 AND tenant_id = $2",
        quiz_id, tenant.0,
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    if question_count == 0 {
        return Err(AppError::bad_request("Quiz harus memiliki minimal 1 pertanyaan untuk dipublish"));
    }

    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"UPDATE quizzes SET is_published = true, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, title, description, course_id, lesson_id, quiz_type,
                  time_limit_minutes, max_attempts, passing_score, shuffle_questions,
                  shuffle_options, show_correct_answers, is_published,
                  $3::BIGINT as question_count, created_at, updated_at"#,
        quiz_id, tenant.0, question_count,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(quiz))
}

/// POST /api/v1/quizzes/:id/unpublish
pub async fn unpublish_quiz(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<QuizResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let quiz = sqlx::query_as!(
        QuizResponse,
        r#"UPDATE quizzes SET is_published = false, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, title, description, course_id, lesson_id, quiz_type,
                  time_limit_minutes, max_attempts, passing_score, shuffle_questions,
                  shuffle_options, show_correct_answers, is_published,
                  (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = quizzes.id) as question_count,
                  created_at, updated_at"#,
        quiz_id, tenant.0,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(quiz))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- Quiz delete memiliki cascading side-effects ke attempts/answers yang harus di-handle manual → ESCALATE

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group C — Quiz Autosave Flow (Cutover Unit: `quiz.autosave`)

## Task 2B-05: Quiz Attempt Start Handler

**TASK ID:** 2B-05

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement start quiz attempt endpoint — creates new attempt with timer

**DEPENDENCY:** 2B-02

**READ FIRST:**

- `src/features/quizzes/api/quizAttemptService.ts` — start attempt logic
- Spec 3 §4 Idempotency: `quiz:{attempt_id}:{user_id}` exactly-once

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_attempt.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_read.rs`, `quiz_write.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/quizzes/:id/attempts` — start new attempt
2. Check max_attempts limit
3. Check no in-progress attempt exists
4. Create attempt record with `status = 'in_progress'`
5. Return attempt with remaining_time_seconds

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_attempt.rs
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// POST /api/v1/quizzes/:quiz_id/attempts — Start a new quiz attempt
pub async fn start_attempt(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<AttemptResponse>, AppError> {
    // 1. Load quiz
    let quiz = sqlx::query!(
        "SELECT id, max_attempts, time_limit_minutes, is_published, tenant_id FROM quizzes WHERE id = $1 AND tenant_id = $2",
        quiz_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Quiz tidak ditemukan"))?;

    if !quiz.is_published {
        return Err(AppError::bad_request("Quiz belum dipublish"));
    }

    // 2. Check for existing in-progress attempt
    let in_progress = sqlx::query_scalar!(
        "SELECT id FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 AND tenant_id = $3 AND status = 'in_progress'",
        quiz_id, claims.sub, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?;

    if let Some(existing_id) = in_progress {
        // Return existing in-progress attempt instead of creating new
        return load_attempt_response(&state.db, existing_id, tenant.0).await;
    }

    // 3. Check max attempts
    let attempt_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 AND tenant_id = $3 AND status != 'expired'",
        quiz_id, claims.sub, tenant.0,
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    if let Some(max) = quiz.max_attempts {
        if attempt_count >= max as i64 {
            return Err(AppError::bad_request(
                format!("Anda sudah mencapai batas maksimal {} percobaan", max)
            ));
        }
    }

    // 4. Create new attempt
    let attempt_id = Uuid::new_v4();
    let attempt_number = (attempt_count + 1) as i32;

    sqlx::query!(
        r#"INSERT INTO quiz_attempts (id, quiz_id, user_id, status, attempt_number, started_at, tenant_id)
        VALUES ($1, $2, $3, 'in_progress', $4, NOW(), $5)"#,
        attempt_id, quiz_id, claims.sub, attempt_number, tenant.0,
    )
    .execute(&state.db)
    .await?;

    load_attempt_response(&state.db, attempt_id, tenant.0).await
}

async fn load_attempt_response(
    db: &sqlx::PgPool,
    attempt_id: Uuid,
    tenant_id: Uuid,
) -> Result<Json<AttemptResponse>, AppError> {
    let attempt = sqlx::query!(
        r#"SELECT a.id, a.quiz_id, a.user_id, a.status, a.score,
               a.started_at, a.submitted_at, a.graded_at,
               a.time_spent_seconds, a.attempt_number
        FROM quiz_attempts a
        WHERE a.id = $1 AND a.tenant_id = $2"#,
        attempt_id, tenant_id,
    )
    .fetch_one(db)
    .await?;

    let answers = sqlx::query!(
        r#"SELECT id, question_id, selected_option_id, text_answer,
               is_correct, points_earned, feedback
        FROM quiz_answers
        WHERE attempt_id = $1 AND tenant_id = $2"#,
        attempt_id, tenant_id,
    )
    .fetch_all(db)
    .await?;

    Ok(Json(AttemptResponse {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        user_id: attempt.user_id,
        status: attempt.status,
        score: attempt.score,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        graded_at: attempt.graded_at,
        time_spent_seconds: attempt.time_spent_seconds,
        attempt_number: attempt.attempt_number,
        answers: answers.into_iter().map(|a| AnswerResponse {
            id: a.id,
            question_id: a.question_id,
            selected_option_id: a.selected_option_id,
            text_answer: a.text_answer,
            is_correct: a.is_correct,
            points_earned: a.points_earned,
            feedback: a.feedback,
        }).collect(),
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- Start attempt logic di frontend memiliki side-effects tambahan (notifikasi, xAPI) → list dan lanjut, tapi catat

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-06: Quiz Autosave Handler

**TASK ID:** 2B-06

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement autosave answer endpoint — upsert answers every 30 seconds

**DEPENDENCY:** 2B-05

**READ FIRST:**

- `src/features/quizzes/api/quizAttemptService.ts` — autosave logic
- Spec 2 §3.2 Quiz Attempt Flow — autosave can stay on Supabase separately

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_autosave.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_attempt.rs`, `quiz_read.rs`, `quiz_write.rs`

**IMPLEMENTATION STEPS:**

1. `PUT /api/v1/attempts/:attempt_id/autosave` — batch upsert answers
2. Verify attempt is still `in_progress`
3. Verify attempt belongs to user
4. Check timer not expired (if timed quiz)
5. Upsert answers (insert if not exist, update if exist) in single transaction
6. Return save confirmation with timestamp

**⚠️ RACE CONDITION AREA: Concurrent autosave requests from same student**

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_autosave.rs
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// PUT /api/v1/attempts/:attempt_id/autosave
/// Called every ~30 seconds by frontend during quiz
/// RACE CONDITION MITIGATION: Use UPSERT (ON CONFLICT) to handle concurrent saves
pub async fn autosave_answers(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
    Json(req): Json<AutosaveBatchRequest>,
) -> Result<Json<AutosaveResponse>, AppError> {
    // 1. Verify attempt ownership + status
    let attempt = sqlx::query!(
        r#"SELECT id, user_id, status, quiz_id, started_at
        FROM quiz_attempts
        WHERE id = $1 AND tenant_id = $2"#,
        attempt_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Percobaan tidak ditemukan"))?;

    if attempt.user_id != claims.sub {
        return Err(AppError::forbidden("Anda tidak memiliki akses ke percobaan ini"));
    }

    if attempt.status != "in_progress" {
        return Err(AppError::bad_request("Percobaan sudah selesai atau expired"));
    }

    // 2. Check timer (if timed quiz)
    let quiz = sqlx::query!(
        "SELECT time_limit_minutes FROM quizzes WHERE id = $1 AND tenant_id = $2",
        attempt.quiz_id, tenant.0,
    )
    .fetch_one(&state.db)
    .await?;

    if let Some(time_limit) = quiz.time_limit_minutes {
        let elapsed = chrono::Utc::now()
            .signed_duration_since(attempt.started_at)
            .num_seconds();
        let limit_seconds = (time_limit as i64) * 60;
        if elapsed > limit_seconds + 30 {
            // 30s grace period for network latency
            // Auto-expire the attempt
            sqlx::query!(
                "UPDATE quiz_attempts SET status = 'expired', updated_at = NOW() WHERE id = $1",
                attempt_id,
            )
            .execute(&state.db)
            .await?;
            return Err(AppError::bad_request("Waktu quiz telah habis"));
        }
    }

    // 3. Batch upsert answers in a transaction
    let mut tx = state.db.begin().await?;
    let mut saved_count = 0;

    for answer in &req.answers {
        sqlx::query!(
            r#"INSERT INTO quiz_answers (id, attempt_id, question_id, selected_option_id, text_answer, tenant_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET
                selected_option_id = EXCLUDED.selected_option_id,
                text_answer = EXCLUDED.text_answer,
                updated_at = NOW()"#,
            Uuid::new_v4(),
            attempt_id,
            answer.question_id,
            answer.selected_option_id,
            answer.text_answer,
            tenant.0,
        )
        .execute(&mut *tx)
        .await?;
        saved_count += 1;
    }

    // Update time_spent
    let elapsed = chrono::Utc::now()
        .signed_duration_since(attempt.started_at)
        .num_seconds() as i32;
    sqlx::query!(
        "UPDATE quiz_attempts SET time_spent_seconds = $2, updated_at = NOW() WHERE id = $1",
        attempt_id, elapsed,
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(AutosaveResponse {
        saved_count,
        attempt_id,
        saved_at: chrono::Utc::now(),
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `quiz_answers` table tidak punya UNIQUE constraint `(attempt_id, question_id)` → BLOCKED, perlu migration dulu
- Autosave logic di frontend kirim format berbeda dari `AutosaveBatchRequest` → BLOCKED, list perbedaan

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group D — Quiz Submit Flow (Cutover Unit: `quiz.submit`)

## Task 2B-07: Quiz Submit Handler

**TASK ID:** 2B-07

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement quiz submission endpoint — finalize attempt, auto-grade MCQ, enqueue essay grading

**DEPENDENCY:** 2B-05

**READ FIRST:**

- `src/features/quizzes/api/quizAttemptService.ts` — submit logic
- Spec 3 §1.1 quiz submit max latency: 500ms
- Spec 3 §4 Idempotency: `quiz:{attempt_id}:{user_id}` exactly-once
- Spec 3 §1.2 grading worker: Tri-Lane Trigger from api → grader

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_submit.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_autosave.rs`, `quiz_attempt.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/attempts/:attempt_id/submit` — submit attempt
2. Idempotency check: if already submitted, return existing result
3. Verify attempt is `in_progress` and belongs to user
4. Save final answers (batch upsert)
5. Auto-grade MCQ/true-false/short-answer questions
6. Mark attempt as `submitted` (or `graded` if all auto-gradeable)
7. If essay questions exist → enqueue to `quiz_submission_queue` for manual/AI grading
8. Attempt snapshot is IMMUTABLE after submit
9. Rate limit: 5/min per user

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_submit.rs
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// POST /api/v1/attempts/:attempt_id/submit
/// Exactly-once: idempotency key = quiz:{attempt_id}:{user_id}
pub async fn submit_attempt(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
    Json(req): Json<SubmitAttemptRequest>,
) -> Result<Json<SubmitResponse>, AppError> {
    // 1. Idempotency: check if already submitted
    let attempt = sqlx::query!(
        r#"SELECT id, user_id, status, quiz_id, started_at, score
        FROM quiz_attempts
        WHERE id = $1 AND tenant_id = $2"#,
        attempt_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Percobaan tidak ditemukan"))?;

    if attempt.user_id != claims.sub {
        return Err(AppError::forbidden("Anda tidak memiliki akses ke percobaan ini"));
    }

    // Idempotency: already submitted → return existing result
    if attempt.status == "submitted" || attempt.status == "graded" {
        return Ok(Json(SubmitResponse {
            attempt_id,
            status: attempt.status.clone(),
            score: attempt.score,
            grading_status: if attempt.status == "graded" {
                "auto_graded".to_string()
            } else {
                "pending_manual".to_string()
            },
        }));
    }

    if attempt.status != "in_progress" {
        return Err(AppError::bad_request("Percobaan sudah expired atau tidak valid"));
    }

    // 2. Begin transaction
    let mut tx = state.db.begin().await?;

    // 3. Save final answers (upsert)
    for answer in &req.answers {
        sqlx::query!(
            r#"INSERT INTO quiz_answers (id, attempt_id, question_id, selected_option_id, text_answer, tenant_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET
                selected_option_id = EXCLUDED.selected_option_id,
                text_answer = EXCLUDED.text_answer,
                updated_at = NOW()"#,
            Uuid::new_v4(),
            attempt_id,
            answer.question_id,
            answer.selected_option_id,
            answer.text_answer,
            tenant.0,
        )
        .execute(&mut *tx)
        .await?;
    }

    // 4. Auto-grade MCQ / true-false questions
    let auto_gradeable = sqlx::query!(
        r#"SELECT qa.id as answer_id, qa.question_id, qa.selected_option_id,
               qq.question_type, qq.points,
               qo.is_correct
        FROM quiz_answers qa
        JOIN quiz_questions qq ON qq.id = qa.question_id
        LEFT JOIN quiz_options qo ON qo.id = qa.selected_option_id
        WHERE qa.attempt_id = $1 AND qa.tenant_id = $2
          AND qq.question_type IN ('multiple_choice', 'true_false')"#,
        attempt_id, tenant.0,
    )
    .fetch_all(&mut *tx)
    .await?;

    let mut total_auto_score: f64 = 0.0;
    let mut total_auto_points: f64 = 0.0;

    for row in &auto_gradeable {
        let is_correct = row.is_correct.unwrap_or(false);
        let points_earned = if is_correct { row.points } else { 0.0 };
        total_auto_score += points_earned;
        total_auto_points += row.points;

        sqlx::query!(
            "UPDATE quiz_answers SET is_correct = $2, points_earned = $3, updated_at = NOW() WHERE id = $1",
            row.answer_id, is_correct, points_earned,
        )
        .execute(&mut *tx)
        .await?;
    }

    // 5. Check if there are essay/manual-grade questions
    let has_essay = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM quiz_answers qa
            JOIN quiz_questions qq ON qq.id = qa.question_id
            WHERE qa.attempt_id = $1 AND qa.tenant_id = $2
              AND qq.question_type IN ('essay', 'short_answer', 'fill_blank')
        )"#,
        attempt_id, tenant.0,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(false);

    let (status, grading_status) = if has_essay {
        // Enqueue for manual/AI grading
        sqlx::query!(
            r#"INSERT INTO quiz_submission_queue (id, attempt_id, status, retry_count, tenant_id, created_at, updated_at)
            VALUES ($1, $2, 'pending', 0, $3, NOW(), NOW())"#,
            Uuid::new_v4(), attempt_id, tenant.0,
        )
        .execute(&mut *tx)
        .await?;
        ("submitted", "pending_manual")
    } else {
        // All auto-graded
        ("graded", "auto_graded")
    };

    // 6. Calculate total score
    let total_points = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(points), 0.0) FROM quiz_questions WHERE quiz_id = $1 AND tenant_id = $2",
        attempt.quiz_id, tenant.0,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0.0);

    let score = if total_points > 0.0 {
        Some((total_auto_score / total_points) * 100.0)
    } else {
        Some(0.0)
    };

    // 7. Finalize attempt
    let elapsed = chrono::Utc::now()
        .signed_duration_since(attempt.started_at)
        .num_seconds() as i32;

    sqlx::query!(
        r#"UPDATE quiz_attempts SET
            status = $2, score = $3, submitted_at = NOW(),
            graded_at = CASE WHEN $2 = 'graded' THEN NOW() ELSE NULL END,
            time_spent_seconds = $4, updated_at = NOW()
        WHERE id = $1"#,
        attempt_id, status, score, elapsed,
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(SubmitResponse {
        attempt_id,
        status: status.to_string(),
        score,
        grading_status: grading_status.to_string(),
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `quiz_submission_queue` table belum ada di migration → BLOCKED, create migration first
- Submit logic di frontend expects different response shape → BLOCKED, list perbedaan
- Unique constraint `(attempt_id, question_id)` on `quiz_answers` missing → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-08: Quiz Attempt History & Results Handler

**TASK ID:** 2B-08

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement attempt history and result viewing endpoints

**DEPENDENCY:** 2B-07

**READ FIRST:**

- `src/features/quizzes/api/quizAttemptService.ts` — get attempts, get results

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_results.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_submit.rs`, `quiz_autosave.rs`

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/quizzes/:quiz_id/attempts` — list attempts for a quiz (student: own, teacher: all)
2. `GET /api/v1/attempts/:attempt_id` — get attempt detail with answers
3. `GET /api/v1/attempts/:attempt_id/review` — review attempt (show correct answers if quiz allows)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_results.rs
use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

#[derive(Debug, serde::Deserialize)]
pub struct ListAttemptsParams {
    pub user_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/v1/quizzes/:quiz_id/attempts
pub async fn list_attempts(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
    Query(params): Query<ListAttemptsParams>,
) -> Result<Json<Vec<AttemptSummaryResponse>>, AppError> {
    let is_teacher_or_admin = claims.has_any_role(&["teacher", "admin"]);
    let target_user = if is_teacher_or_admin {
        params.user_id.unwrap_or(claims.sub)
    } else {
        claims.sub // Students can only see own attempts
    };

    let limit = params.limit.unwrap_or(20).min(50);
    let offset = params.offset.unwrap_or(0);

    let attempts = sqlx::query_as!(
        AttemptSummaryResponse,
        r#"SELECT id, status, score, started_at, submitted_at, attempt_number,
               NULL::BIGINT as remaining_time_seconds
        FROM quiz_attempts
        WHERE quiz_id = $1 AND user_id = $2 AND tenant_id = $3
        ORDER BY attempt_number DESC
        LIMIT $4 OFFSET $5"#,
        quiz_id, target_user, tenant.0, limit, offset,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(attempts))
}

/// GET /api/v1/attempts/:attempt_id
pub async fn get_attempt_detail(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
) -> Result<Json<AttemptResponse>, AppError> {
    let attempt = sqlx::query!(
        r#"SELECT id, quiz_id, user_id, status, score, started_at,
               submitted_at, graded_at, time_spent_seconds, attempt_number
        FROM quiz_attempts
        WHERE id = $1 AND tenant_id = $2"#,
        attempt_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Percobaan tidak ditemukan"))?;

    // Access check: student can see own, teacher/admin can see all in tenant
    let is_teacher_or_admin = claims.has_any_role(&["teacher", "admin"]);
    if !is_teacher_or_admin && attempt.user_id != claims.sub {
        return Err(AppError::forbidden("Anda tidak memiliki akses ke percobaan ini"));
    }

    let answers = sqlx::query!(
        r#"SELECT id, question_id, selected_option_id, text_answer,
               is_correct, points_earned, feedback
        FROM quiz_answers
        WHERE attempt_id = $1 AND tenant_id = $2
        ORDER BY created_at ASC"#,
        attempt_id, tenant.0,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(AttemptResponse {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        user_id: attempt.user_id,
        status: attempt.status,
        score: attempt.score,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        graded_at: attempt.graded_at,
        time_spent_seconds: attempt.time_spent_seconds,
        attempt_number: attempt.attempt_number,
        answers: answers.into_iter().map(|a| AnswerResponse {
            id: a.id,
            question_id: a.question_id,
            selected_option_id: a.selected_option_id,
            text_answer: a.text_answer,
            is_correct: a.is_correct,
            points_earned: a.points_earned,
            feedback: a.feedback,
        }).collect(),
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- Frontend expects review endpoint to include question + option data inline → extend DTO, tapi jangan ubah DB model

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group E — Quiz Timer Flow (Cutover Unit: `quiz.timer`)

## Task 2B-09: Quiz Timer Expiry Handler

**TASK ID:** 2B-09

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement timer expiry check + auto-submit endpoint

**DEPENDENCY:** 2B-07 (submit handler must exist)

**READ FIRST:**

- `src/features/quizzes/api/quizTimerService.ts` — timer pause/resume logic
- Spec 3 §1.3 Cron: xAPI queue flush setiap 30 detik (referensi pola timer)

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_timer.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_submit.rs`, `quiz_autosave.rs`

**⚠️ RACE CONDITION AREA:** Timer expiry + concurrent autosave + manual submit can all fire at once.

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/attempts/:attempt_id/timer` — get remaining time
2. `POST /api/v1/attempts/:attempt_id/timer/pause` — pause timer (teacher only for accommodations)
3. `POST /api/v1/attempts/:attempt_id/timer/resume` — resume timer
4. `POST /api/v1/attempts/:attempt_id/auto-submit` — auto-submit when timer expires
5. **⚠️ Auto-submit uses `SELECT ... FOR UPDATE` to prevent race with manual submit**

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_timer.rs
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, serde::Serialize)]
pub struct TimerResponse {
    pub attempt_id: Uuid,
    pub remaining_seconds: i64,
    pub is_paused: bool,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub time_limit_seconds: Option<i64>,
}

/// GET /api/v1/attempts/:attempt_id/timer
pub async fn get_timer(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
) -> Result<Json<TimerResponse>, AppError> {
    let row = sqlx::query!(
        r#"SELECT a.id, a.user_id, a.status, a.started_at,
               a.time_spent_seconds,
               q.time_limit_minutes,
               a.updated_at
        FROM quiz_attempts a
        JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.id = $1 AND a.tenant_id = $2"#,
        attempt_id, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Percobaan tidak ditemukan"))?;

    if row.user_id != claims.sub && !claims.has_any_role(&["teacher", "admin"]) {
        return Err(AppError::forbidden("Akses ditolak"));
    }

    let time_limit_seconds = row.time_limit_minutes.map(|m| (m as i64) * 60);
    let elapsed = chrono::Utc::now()
        .signed_duration_since(row.started_at)
        .num_seconds();

    let remaining = time_limit_seconds
        .map(|limit| (limit - elapsed).max(0))
        .unwrap_or(-1); // -1 means no time limit

    let is_paused = row.status == "paused";

    Ok(Json(TimerResponse {
        attempt_id: row.id,
        remaining_seconds: remaining,
        is_paused,
        started_at: row.started_at,
        time_limit_seconds,
    }))
}

/// POST /api/v1/attempts/:attempt_id/auto-submit
/// Called by frontend when timer reaches zero
/// RACE CONDITION PROTECTION: SELECT ... FOR UPDATE
pub async fn auto_submit_expired(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut tx = state.db.begin().await?;

    // Lock the attempt row to prevent race with manual submit
    let attempt = sqlx::query!(
        r#"SELECT id, user_id, status, quiz_id, started_at
        FROM quiz_attempts
        WHERE id = $1 AND tenant_id = $2
        FOR UPDATE"#,
        attempt_id, tenant.0,
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::not_found("Percobaan tidak ditemukan"))?;

    if attempt.user_id != claims.sub {
        return Err(AppError::forbidden("Akses ditolak"));
    }

    // Already submitted/graded — idempotent return
    if attempt.status == "submitted" || attempt.status == "graded" || attempt.status == "expired" {
        tx.commit().await?;
        return Ok(Json(serde_json::json!({
            "attempt_id": attempt_id,
            "status": attempt.status,
            "auto_submitted": false,
            "message": "Percobaan sudah diselesaikan sebelumnya"
        })));
    }

    if attempt.status != "in_progress" {
        tx.commit().await?;
        return Err(AppError::bad_request("Status percobaan tidak valid"));
    }

    // Auto-grade MCQ
    let auto_graded = sqlx::query!(
        r#"UPDATE quiz_answers qa SET
            is_correct = qo.is_correct,
            points_earned = CASE WHEN qo.is_correct THEN qq.points ELSE 0.0 END,
            updated_at = NOW()
        FROM quiz_questions qq
        LEFT JOIN quiz_options qo ON qo.id = qa.selected_option_id
        WHERE qa.attempt_id = $1 AND qa.question_id = qq.id
          AND qq.question_type IN ('multiple_choice', 'true_false')
        RETURNING qa.id"#,
        attempt_id,
    )
    .fetch_all(&mut *tx)
    .await?;

    // Check for essay questions
    let has_essay = sqlx::query_scalar!(
        r#"SELECT EXISTS(
            SELECT 1 FROM quiz_answers qa
            JOIN quiz_questions qq ON qq.id = qa.question_id
            WHERE qa.attempt_id = $1
              AND qq.question_type IN ('essay', 'short_answer', 'fill_blank')
        )"#,
        attempt_id,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(false);

    let status = if has_essay {
        // Enqueue for grading
        sqlx::query!(
            r#"INSERT INTO quiz_submission_queue (id, attempt_id, status, retry_count, tenant_id, created_at, updated_at)
            VALUES ($1, $2, 'pending', 0, $3, NOW(), NOW())
            ON CONFLICT (attempt_id) DO NOTHING"#,
            Uuid::new_v4(), attempt_id, tenant.0,
        )
        .execute(&mut *tx)
        .await?;
        "submitted"
    } else {
        "graded"
    };

    // Calculate score
    let total_earned = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(points_earned), 0.0) FROM quiz_answers WHERE attempt_id = $1",
        attempt_id,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0.0);

    let total_points = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(points), 0.0) FROM quiz_questions WHERE quiz_id = $1",
        attempt.quiz_id,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0.0);

    let score = if total_points > 0.0 {
        (total_earned / total_points) * 100.0
    } else {
        0.0
    };

    let elapsed = chrono::Utc::now()
        .signed_duration_since(attempt.started_at)
        .num_seconds() as i32;

    sqlx::query!(
        r#"UPDATE quiz_attempts SET
            status = $2, score = $3, submitted_at = NOW(),
            graded_at = CASE WHEN $2 = 'graded' THEN NOW() ELSE NULL END,
            time_spent_seconds = $4, updated_at = NOW()
        WHERE id = $1"#,
        attempt_id, status, score, elapsed,
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "attempt_id": attempt_id,
        "status": status,
        "score": score,
        "auto_submitted": true,
        "message": "Quiz otomatis dikumpulkan karena waktu habis"
    })))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `quiz_submission_queue` needs UNIQUE constraint on `attempt_id` for `ON CONFLICT` → BLOCKED, perlu migration
- Timer pause/resume membutuhkan kolom tambahan (`paused_at`, `total_paused_seconds`) yang belum ada → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-10: Quiz Timer Expiry Cron Job

**TASK ID:** 2B-10

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement cron job yang auto-expire attempt yang sudah lewat time limit

**DEPENDENCY:** 2B-09

**READ FIRST:**

- Bootstrap Context §9 Cron Jobs
- Spec 3 §1.3 Cron schedules

**EDIT ONLY:**

- `edusync-api/crates/server/src/jobs/quiz_timer_expiry.rs` (buat baru)
- `edusync-api/crates/server/src/jobs/mod.rs`

**DO NOT TOUCH:**

- Handler files

**IMPLEMENTATION STEPS:**

1. Cron job runs every 60 seconds
2. Find all `in_progress` attempts where time has expired
3. Auto-submit each (reuse submit logic)
4. Use DB pool `cron` (5 max connections)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/jobs/quiz_timer_expiry.rs
use sqlx::PgPool;
use uuid::Uuid;

/// Run every 60 seconds. Finds expired in-progress attempts and auto-submits them.
/// Uses pool "cron" (5 max connections) — NOT the default pool.
pub async fn expire_timed_out_attempts(db: &PgPool) -> Result<u64, sqlx::Error> {
    // Find all in_progress attempts that have exceeded their time limit
    let expired = sqlx::query!(
        r#"SELECT a.id as attempt_id, a.quiz_id, a.tenant_id, a.started_at
        FROM quiz_attempts a
        JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.status = 'in_progress'
          AND q.time_limit_minutes IS NOT NULL
          AND a.started_at + (q.time_limit_minutes || ' minutes')::INTERVAL < NOW()
        LIMIT 100"#,  -- Process in batches to avoid long locks
    )
    .fetch_all(db)
    .await?;

    let count = expired.len() as u64;

    for attempt in expired {
        // Use transaction with FOR UPDATE to prevent race
        let mut tx = db.begin().await?;

        let locked = sqlx::query!(
            "SELECT status FROM quiz_attempts WHERE id = $1 FOR UPDATE",
            attempt.attempt_id,
        )
        .fetch_optional(&mut *tx)
        .await?;

        if let Some(row) = locked {
            if row.status == "in_progress" {
                // Auto-grade MCQ answers
                sqlx::query!(
                    r#"UPDATE quiz_answers qa SET
                        is_correct = qo.is_correct,
                        points_earned = CASE WHEN qo.is_correct THEN qq.points ELSE 0.0 END,
                        updated_at = NOW()
                    FROM quiz_questions qq
                    LEFT JOIN quiz_options qo ON qo.id = qa.selected_option_id
                    WHERE qa.attempt_id = $1 AND qa.question_id = qq.id
                      AND qq.question_type IN ('multiple_choice', 'true_false')"#,
                    attempt.attempt_id,
                )
                .execute(&mut *tx)
                .await?;

                // Calculate score
                let total_earned = sqlx::query_scalar!(
                    "SELECT COALESCE(SUM(points_earned), 0.0) FROM quiz_answers WHERE attempt_id = $1",
                    attempt.attempt_id,
                )
                .fetch_one(&mut *tx)
                .await?
                .unwrap_or(0.0);

                let total_points = sqlx::query_scalar!(
                    "SELECT COALESCE(SUM(points), 0.0) FROM quiz_questions WHERE quiz_id = $1",
                    attempt.quiz_id,
                )
                .fetch_one(&mut *tx)
                .await?
                .unwrap_or(0.0);

                let score = if total_points > 0.0 {
                    (total_earned / total_points) * 100.0
                } else {
                    0.0
                };

                sqlx::query!(
                    r#"UPDATE quiz_attempts SET
                        status = 'expired', score = $2, submitted_at = NOW(),
                        time_spent_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT,
                        updated_at = NOW()
                    WHERE id = $1"#,
                    attempt.attempt_id, score,
                )
                .execute(&mut *tx)
                .await?;

                vil_log::vil_info!("Quiz attempt auto-expired",
                    attempt_id = %attempt.attempt_id,
                    tenant_id = %attempt.tenant_id,
                    score = score,
                );
            }
        }

        tx.commit().await?;
    }

    Ok(count)
}
```

Register di scheduler:

```rust
// Di main.rs atau scheduler setup
use vil_trigger_cron::CronScheduler;

let mut scheduler = CronScheduler::new();
scheduler.add("*/60 * * * * *", || async {
    if let Err(e) = expire_timed_out_attempts(&cron_pool).await {
        vil_log::vil_error!("Quiz timer expiry job failed", error = %e);
    }
});
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- Interval arithmetic di SQL tidak compile → fix syntax, bukan BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group F — Quiz Grading Worker (Cutover Unit: `quiz.grade`)

## Task 2B-11: Quiz Grading Worker — Queue Processor

**TASK ID:** 2B-11

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Implement background grading worker yang poll `quiz_submission_queue`

**DEPENDENCY:** 2B-07 (submit handler enqueues to queue)

**READ FIRST:**

- Spec 3 §1.2 Grading worker: 2 min max, 3x exponential (30s→2m→10m)
- Spec 3 §2 Tri-Lane: api → grader via Trigger lane
- Spec 3 §3 DB Pool: grading pool (10 connections)
- Main plan CC7: Domain-specific DLQ di DB

**EDIT ONLY:**

- `edusync-api/crates/server/src/workers/quiz_grader.rs` (buat baru)
- `edusync-api/crates/server/src/workers/mod.rs`

**DO NOT TOUCH:**

- Handler files
- Main DB pool config

**IMPLEMENTATION STEPS:**

1. Poll `quiz_submission_queue` for `status = 'pending'` items
2. Process: auto-grade what's possible, mark essay for manual grading
3. On success: update queue status to `completed`, update attempt `graded_at`
4. On failure: increment retry_count, set next_retry_at with exponential backoff
5. After 3 retries: mark `status = 'dead_letter'`
6. Use `grading` DB pool (10 connections)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/workers/quiz_grader.rs
use sqlx::PgPool;
use uuid::Uuid;
use std::time::Duration;

const MAX_RETRIES: i32 = 3;
const RETRY_DELAYS: [Duration; 3] = [
    Duration::from_secs(30),
    Duration::from_secs(120),
    Duration::from_secs(600),
];

pub struct QuizGraderWorker {
    grading_pool: PgPool,  // Dedicated grading pool (10 connections)
}

impl QuizGraderWorker {
    pub fn new(grading_pool: PgPool) -> Self {
        Self { grading_pool }
    }

    /// Main loop: poll queue and process
    pub async fn run(&self) {
        loop {
            match self.process_next().await {
                Ok(processed) => {
                    if !processed {
                        // No items in queue, sleep
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
                Err(e) => {
                    vil_log::vil_error!("Grader worker error", error = %e);
                    tokio::time::sleep(Duration::from_secs(10)).await;
                }
            }
        }
    }

    async fn process_next(&self) -> Result<bool, sqlx::Error> {
        let mut tx = self.grading_pool.begin().await?;

        // Claim next pending item with lock
        let item = sqlx::query!(
            r#"UPDATE quiz_submission_queue SET
                status = 'processing', updated_at = NOW()
            WHERE id = (
                SELECT id FROM quiz_submission_queue
                WHERE status = 'pending'
                  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                ORDER BY created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, attempt_id, retry_count, tenant_id"#,
        )
        .fetch_optional(&mut *tx)
        .await?;

        let item = match item {
            Some(i) => i,
            None => {
                tx.commit().await?;
                return Ok(false);
            }
        };

        tx.commit().await?;

        // Process grading
        match self.grade_attempt(item.attempt_id, item.tenant_id).await {
            Ok(()) => {
                // Mark completed
                sqlx::query!(
                    "UPDATE quiz_submission_queue SET status = 'completed', updated_at = NOW() WHERE id = $1",
                    item.id,
                )
                .execute(&self.grading_pool)
                .await?;

                vil_log::vil_info!("Quiz graded successfully",
                    attempt_id = %item.attempt_id,
                    queue_id = %item.id,
                );
            }
            Err(e) => {
                let new_retry = item.retry_count + 1;
                if new_retry >= MAX_RETRIES {
                    // Dead letter
                    sqlx::query!(
                        r#"UPDATE quiz_submission_queue SET
                            status = 'dead_letter',
                            last_error = $2,
                            retry_count = $3,
                            updated_at = NOW()
                        WHERE id = $1"#,
                        item.id,
                        format!("{}", e),
                        new_retry,
                    )
                    .execute(&self.grading_pool)
                    .await?;

                    vil_log::vil_error!("Quiz grading dead-lettered",
                        attempt_id = %item.attempt_id,
                        queue_id = %item.id,
                        error = %e,
                        retry_count = new_retry,
                    );
                } else {
                    // Retry with backoff
                    let delay = RETRY_DELAYS[new_retry as usize - 1];
                    let next_retry = chrono::Utc::now() + chrono::Duration::from_std(delay).unwrap();

                    sqlx::query!(
                        r#"UPDATE quiz_submission_queue SET
                            status = 'pending',
                            last_error = $2,
                            retry_count = $3,
                            next_retry_at = $4,
                            updated_at = NOW()
                        WHERE id = $1"#,
                        item.id,
                        format!("{}", e),
                        new_retry,
                        next_retry,
                    )
                    .execute(&self.grading_pool)
                    .await?;

                    vil_log::vil_warn!("Quiz grading retrying",
                        attempt_id = %item.attempt_id,
                        retry_count = new_retry,
                        next_retry = %next_retry,
                    );
                }
            }
        }

        Ok(true)
    }

    async fn grade_attempt(
        &self,
        attempt_id: Uuid,
        tenant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Auto-grade remaining auto-gradeable questions
        sqlx::query!(
            r#"UPDATE quiz_answers qa SET
                is_correct = qo.is_correct,
                points_earned = CASE WHEN qo.is_correct THEN qq.points ELSE 0.0 END,
                updated_at = NOW()
            FROM quiz_questions qq
            LEFT JOIN quiz_options qo ON qo.id = qa.selected_option_id
            WHERE qa.attempt_id = $1 AND qa.question_id = qq.id
              AND qa.is_correct IS NULL
              AND qq.question_type IN ('multiple_choice', 'true_false')"#,
            attempt_id,
        )
        .execute(&self.grading_pool)
        .await?;

        // Calculate final score
        let total_earned = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(points_earned), 0.0) FROM quiz_answers WHERE attempt_id = $1",
            attempt_id,
        )
        .fetch_one(&self.grading_pool)
        .await?
        .unwrap_or(0.0);

        let quiz_id = sqlx::query_scalar!(
            "SELECT quiz_id FROM quiz_attempts WHERE id = $1",
            attempt_id,
        )
        .fetch_one(&self.grading_pool)
        .await?;

        let total_points = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(points), 0.0) FROM quiz_questions WHERE quiz_id = $1",
            quiz_id,
        )
        .fetch_one(&self.grading_pool)
        .await?
        .unwrap_or(0.0);

        let score = if total_points > 0.0 {
            (total_earned / total_points) * 100.0
        } else {
            0.0
        };

        // Check if all questions are graded
        let ungraded_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM quiz_answers qa
            JOIN quiz_questions qq ON qq.id = qa.question_id
            WHERE qa.attempt_id = $1 AND qa.is_correct IS NULL
              AND qq.question_type NOT IN ('essay')"#,
            attempt_id,
        )
        .fetch_one(&self.grading_pool)
        .await?
        .unwrap_or(0);

        let status = if ungraded_count == 0 { "graded" } else { "submitted" };

        sqlx::query!(
            r#"UPDATE quiz_attempts SET
                status = $2, score = $3,
                graded_at = CASE WHEN $2 = 'graded' THEN NOW() ELSE graded_at END,
                updated_at = NOW()
            WHERE id = $1"#,
            attempt_id, status, score,
        )
        .execute(&self.grading_pool)
        .await?;

        Ok(())
    }
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `quiz_submission_queue` table schema doesn't match (needs `next_retry_at`, `last_error` columns) → BLOCKED, create migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-12: Quiz Manual Grade Handler (Teacher grades essay)

**TASK ID:** 2B-12

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Teacher/admin can manually grade essay answers

**DEPENDENCY:** 2B-11

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_manual_grade.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- `quiz_grader.rs` worker, semua file lain

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/answers/:answer_id/grade` — grade a single answer
2. `POST /api/v1/attempts/:attempt_id/grade-batch` — batch grade multiple answers
3. After all questions graded → update attempt status to `graded`
4. Only teacher/admin

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_manual_grade.rs
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// POST /api/v1/answers/:answer_id/grade
pub async fn grade_answer(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(answer_id): Path<Uuid>,
    Json(req): Json<GradeEssayRequest>,
) -> Result<Json<AnswerResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let answer = sqlx::query!(
        r#"UPDATE quiz_answers SET
            points_earned = $2,
            feedback = $3,
            is_correct = $4,
            graded_by = $5,
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, question_id, selected_option_id, text_answer,
                  is_correct, points_earned, feedback"#,
        answer_id,
        req.points_earned,
        req.feedback,
        req.points_earned > 0.0,
        claims.sub,
        tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Jawaban tidak ditemukan"))?;

    // Check if all answers for this attempt are now graded
    let attempt_id = sqlx::query_scalar!(
        "SELECT attempt_id FROM quiz_answers WHERE id = $1",
        answer_id,
    )
    .fetch_one(&state.db)
    .await?;

    let ungraded = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM quiz_answers WHERE attempt_id = $1 AND is_correct IS NULL",
        attempt_id,
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    if ungraded == 0 {
        // All graded — recalculate score and update attempt
        let total_earned = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(points_earned), 0.0) FROM quiz_answers WHERE attempt_id = $1",
            attempt_id,
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0.0);

        let quiz_id = sqlx::query_scalar!(
            "SELECT quiz_id FROM quiz_attempts WHERE id = $1",
            attempt_id,
        )
        .fetch_one(&state.db)
        .await?;

        let total_points = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(points), 0.0) FROM quiz_questions WHERE quiz_id = $1",
            quiz_id,
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0.0);

        let score = if total_points > 0.0 {
            (total_earned / total_points) * 100.0
        } else {
            0.0
        };

        sqlx::query!(
            "UPDATE quiz_attempts SET status = 'graded', score = $2, graded_at = NOW(), updated_at = NOW() WHERE id = $1",
            attempt_id, score,
        )
        .execute(&state.db)
        .await?;
    }

    Ok(Json(AnswerResponse {
        id: answer.id,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id,
        text_answer: answer.text_answer,
        is_correct: answer.is_correct,
        points_earned: answer.points_earned,
        feedback: answer.feedback,
    }))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-13: Quiz Submission Queue Migration

**TASK ID:** 2B-13

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Create SQL migration for `quiz_submission_queue` table (domain-specific DLQ)

**DEPENDENCY:** Tidak ada (bisa paralel)

**EDIT ONLY:**

- `edusync-api/migrations/YYYYMMDDHHMMSS_create_quiz_submission_queue.sql` (buat baru)

**DO NOT TOUCH:**

- Existing migrations
- Supabase migrations

**COPY-PASTE STARTER:**

```sql
-- edusync-api/migrations/20260409000001_create_quiz_submission_queue.sql
-- Domain-specific DLQ for quiz grading (NOT VIL general DLQ)

CREATE TABLE IF NOT EXISTS quiz_submission_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quiz_submission_queue_attempt UNIQUE (attempt_id)
);

CREATE INDEX idx_quiz_sub_queue_status ON quiz_submission_queue(status, next_retry_at)
    WHERE status = 'pending';
CREATE INDEX idx_quiz_sub_queue_tenant ON quiz_submission_queue(tenant_id);
CREATE INDEX idx_quiz_sub_queue_dead_letter ON quiz_submission_queue(status)
    WHERE status = 'dead_letter';
```

**VERIFY:**

```bash
cd edusync-api && cargo sqlx migrate run
```

**STOP IF:**

- `quiz_attempts` table tidak ada → BLOCKED, buat migration untuk quiz_attempts dulu

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group G — Quiz Builder & Question Bank

## Task 2B-14: Question CRUD Handlers

**TASK ID:** 2B-14

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** CRUD for quiz questions and options

**DEPENDENCY:** 2B-02

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_questions.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- Handler files lain

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/quizzes/:quiz_id/questions` — list questions with options
2. `POST /api/v1/quizzes/:quiz_id/questions` — add question with options
3. `PUT /api/v1/questions/:id` — update question
4. `DELETE /api/v1/questions/:id` — delete question
5. `PUT /api/v1/quizzes/:quiz_id/questions/reorder` — reorder questions
6. **GOTCHA:** Column `"order"` harus dikutip di SQL

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_questions.rs
use axum::{extract::{Path, State}, Json};
use uuid::Uuid;
use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;
use models::quiz_dto::*;

/// POST /api/v1/quizzes/:quiz_id/questions
pub async fn create_question(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
    Json(req): Json<CreateQuestionRequest>,
) -> Result<Json<QuestionResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Get next order number
    let next_order = sqlx::query_scalar!(
        r#"SELECT COALESCE(MAX("order"), 0) + 1 FROM quiz_questions WHERE quiz_id = $1 AND tenant_id = $2"#,
        quiz_id, tenant.0,
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(1);

    let mut tx = state.db.begin().await?;

    let question_id = Uuid::new_v4();
    sqlx::query!(
        r#"INSERT INTO quiz_questions (id, quiz_id, text, question_type, points, "order", explanation, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
        question_id, quiz_id, req.text, req.question_type, req.points, next_order, req.explanation, tenant.0,
    )
    .execute(&mut *tx)
    .await?;

    let mut option_responses = Vec::new();
    if let Some(options) = &req.options {
        for (i, opt) in options.iter().enumerate() {
            let opt_id = Uuid::new_v4();
            sqlx::query!(
                r#"INSERT INTO quiz_options (id, question_id, text, is_correct, "order", tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6)"#,
                opt_id, question_id, opt.text, opt.is_correct, (i + 1) as i32, tenant.0,
            )
            .execute(&mut *tx)
            .await?;

            option_responses.push(OptionResponse {
                id: opt_id,
                text: opt.text.clone(),
                is_correct: opt.is_correct,
                sort_order: (i + 1) as i32,
            });
        }
    }

    tx.commit().await?;

    Ok(Json(QuestionResponse {
        id: question_id,
        text: req.text,
        question_type: req.question_type,
        points: req.points,
        sort_order: next_order,
        explanation: req.explanation,
        options: option_responses,
    }))
}

#[derive(Debug, serde::Deserialize)]
pub struct ReorderRequest {
    pub question_ids: Vec<Uuid>,
}

/// PUT /api/v1/quizzes/:quiz_id/questions/reorder
pub async fn reorder_questions(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
    Json(req): Json<ReorderRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let mut tx = state.db.begin().await?;
    for (i, qid) in req.question_ids.iter().enumerate() {
        sqlx::query!(
            r#"UPDATE quiz_questions SET "order" = $3, updated_at = NOW()
            WHERE id = $1 AND quiz_id = $2 AND tenant_id = $4"#,
            qid, quiz_id, (i + 1) as i32, tenant.0,
        )
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    Ok(Json(serde_json::json!({ "reordered": true })))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-15: Question Bank CRUD Handlers

**TASK ID:** 2B-15

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** CRUD for question bank + import into quiz

**DEPENDENCY:** 2B-14

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/question_bank.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/question-bank` — list with filters (category, difficulty, course)
2. `POST /api/v1/question-bank` — add to bank
3. `PUT /api/v1/question-bank/:id` — update
4. `DELETE /api/v1/question-bank/:id` — delete
5. `POST /api/v1/quizzes/:quiz_id/import-from-bank` — copy questions from bank into quiz

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/question_bank.rs
use axum::{extract::{Path, Query, State}, Json};
use uuid::Uuid;
use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct QuestionBankFilter {
    pub category: Option<String>,
    pub difficulty: Option<String>,
    pub course_id: Option<Uuid>,
    pub question_type: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, serde::Deserialize)]
pub struct ImportFromBankRequest {
    pub question_ids: Vec<Uuid>,
}

/// GET /api/v1/question-bank
pub async fn list_question_bank(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Query(params): Query<QuestionBankFilter>,
) -> Result<Json<Vec<models::quiz::QuestionBankItem>>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);

    let items = sqlx::query_as!(
        models::quiz::QuestionBankItem,
        r#"SELECT id, text, question_type, points, explanation, category, difficulty,
               course_id, tenant_id, created_by, created_at, updated_at
        FROM question_bank
        WHERE tenant_id = $1
          AND ($2::TEXT IS NULL OR category = $2)
          AND ($3::TEXT IS NULL OR difficulty = $3)
          AND ($4::UUID IS NULL OR course_id = $4)
          AND ($5::TEXT IS NULL OR question_type = $5)
          AND ($6::TEXT IS NULL OR text ILIKE '%' || $6 || '%')
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8"#,
        tenant.0, params.category, params.difficulty, params.course_id,
        params.question_type, params.search, limit, offset,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(items))
}

/// POST /api/v1/quizzes/:quiz_id/import-from-bank
pub async fn import_from_bank(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
    Json(req): Json<ImportFromBankRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let mut tx = state.db.begin().await?;
    let mut imported = 0;

    let current_max_order = sqlx::query_scalar!(
        r#"SELECT COALESCE(MAX("order"), 0) FROM quiz_questions WHERE quiz_id = $1 AND tenant_id = $2"#,
        quiz_id, tenant.0,
    )
    .fetch_one(&mut *tx)
    .await?
    .unwrap_or(0);

    for (i, bank_id) in req.question_ids.iter().enumerate() {
        let bank_q = sqlx::query!(
            "SELECT text, question_type, points, explanation FROM question_bank WHERE id = $1 AND tenant_id = $2",
            bank_id, tenant.0,
        )
        .fetch_optional(&mut *tx)
        .await?;

        if let Some(bq) = bank_q {
            let new_q_id = Uuid::new_v4();
            sqlx::query!(
                r#"INSERT INTO quiz_questions (id, quiz_id, text, question_type, points, "order", explanation, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
                new_q_id, quiz_id, bq.text, bq.question_type, bq.points,
                current_max_order + (i as i32) + 1, bq.explanation, tenant.0,
            )
            .execute(&mut *tx)
            .await?;

            // Copy options
            let bank_opts = sqlx::query!(
                r#"SELECT text, is_correct, "order" as sort_order FROM question_bank_options
                WHERE question_id = $1 AND tenant_id = $2 ORDER BY "order""#,
                bank_id, tenant.0,
            )
            .fetch_all(&mut *tx)
            .await?;

            for opt in bank_opts {
                sqlx::query!(
                    r#"INSERT INTO quiz_options (id, question_id, text, is_correct, "order", tenant_id)
                    VALUES ($1, $2, $3, $4, $5, $6)"#,
                    Uuid::new_v4(), new_q_id, opt.text, opt.is_correct, opt.sort_order, tenant.0,
                )
                .execute(&mut *tx)
                .await?;
            }

            imported += 1;
        }
    }

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "imported": imported,
        "total_requested": req.question_ids.len()
    })))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:**

- `question_bank` dan `question_bank_options` tables belum ada → BLOCKED, create migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-16: Suspicious Attempt Service

**TASK ID:** 2B-16

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Flag and review suspicious quiz attempts

**DEPENDENCY:** 2B-02

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_suspicious.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/attempts/:attempt_id/flag-suspicious` — flag attempt (system or teacher)
2. `GET /api/v1/quizzes/:quiz_id/suspicious` — list suspicious attempts
3. `PUT /api/v1/suspicious/:id/review` — mark as reviewed

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_suspicious.rs
use axum::{extract::{Path, State}, Json};
use uuid::Uuid;
use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct FlagSuspiciousRequest {
    pub reason: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, serde::Serialize)]
pub struct SuspiciousResponse {
    pub id: Uuid,
    pub attempt_id: Uuid,
    pub reason: String,
    pub details: Option<serde_json::Value>,
    pub reviewed: bool,
    pub reviewed_by: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// POST /api/v1/attempts/:attempt_id/flag-suspicious
pub async fn flag_suspicious(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(attempt_id): Path<Uuid>,
    Json(req): Json<FlagSuspiciousRequest>,
) -> Result<Json<SuspiciousResponse>, AppError> {
    let row = sqlx::query_as!(
        SuspiciousResponse,
        r#"INSERT INTO suspicious_attempts (id, attempt_id, reason, details, reviewed, tenant_id)
        VALUES ($1, $2, $3, $4, false, $5)
        RETURNING id, attempt_id, reason, details, reviewed, reviewed_by, created_at"#,
        Uuid::new_v4(), attempt_id, req.reason, req.details, tenant.0,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(row))
}

/// GET /api/v1/quizzes/:quiz_id/suspicious
pub async fn list_suspicious(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<Vec<SuspiciousResponse>>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let rows = sqlx::query_as!(
        SuspiciousResponse,
        r#"SELECT s.id, s.attempt_id, s.reason, s.details, s.reviewed, s.reviewed_by, s.created_at
        FROM suspicious_attempts s
        JOIN quiz_attempts a ON a.id = s.attempt_id
        WHERE a.quiz_id = $1 AND s.tenant_id = $2
        ORDER BY s.created_at DESC"#,
        quiz_id, tenant.0,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

/// PUT /api/v1/suspicious/:id/review
pub async fn review_suspicious(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(suspicious_id): Path<Uuid>,
) -> Result<Json<SuspiciousResponse>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let row = sqlx::query_as!(
        SuspiciousResponse,
        r#"UPDATE suspicious_attempts SET reviewed = true, reviewed_by = $2
        WHERE id = $1 AND tenant_id = $3
        RETURNING id, attempt_id, reason, details, reviewed, reviewed_by, created_at"#,
        suspicious_id, claims.sub, tenant.0,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::not_found("Data tidak ditemukan"))?;

    Ok(Json(row))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** `suspicious_attempts` table belum ada → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-17: Quiz Analytics RPC Bridge

**TASK ID:** 2B-17

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Thin Rust handlers that call quiz analytics stored procedures via sqlx

**DEPENDENCY:** 2B-02

**READ FIRST:**

- `src/features/quizzes/api/quizAnalyticsService.ts`
- `src/features/quizzes/api/quizAnalytics.service.ts`
- Phase 2 detail: "KEEP stored procedures, call via sqlx::query!"

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_analytics_rpc.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- Stored procedures di PostgreSQL — KEEP as-is

**IMPLEMENTATION STEPS:**

1. List all quiz analytics RPCs dari `quizAnalyticsService.ts` dan `quizAnalytics.service.ts`
2. For each RPC → create thin Rust handler that calls `sqlx::query!` on the stored procedure
3. Parse result → return as JSON
4. Use `analytics` DB pool (20 connections)

**COPY-PASTE STARTER:**

```rust
// edusync-api/crates/server/src/handlers/quiz_analytics_rpc.rs
// RPC BRIDGE PATTERN: Thin handlers that call stored procedures
// DO NOT rewrite the SQL logic — just proxy to PostgreSQL RPCs
use axum::{extract::{Path, Query, State}, Json};
use uuid::Uuid;
use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, serde::Deserialize)]
pub struct QuizStatsParams {
    pub quiz_id: Uuid,
}

/// GET /api/v1/analytics/quiz/:quiz_id/stats
/// RPC Bridge → calls get_quiz_statistics() stored procedure
pub async fn get_quiz_statistics(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    // Call stored procedure directly — DO NOT rewrite the SQL
    let result = sqlx::query_scalar!(
        "SELECT row_to_json(t) FROM get_quiz_statistics($1, $2) t",
        quiz_id, tenant.0,
    )
    .fetch_optional(&state.analytics_pool)  // Use analytics pool!
    .await?
    .flatten()
    .unwrap_or(serde_json::Value::Null);

    Ok(Json(result))
}

/// GET /api/v1/analytics/quiz/:quiz_id/question-analysis
/// RPC Bridge → calls get_question_difficulty_analysis()
pub async fn get_question_analysis(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(quiz_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query_scalar!(
        "SELECT json_agg(t) FROM get_question_difficulty_analysis($1, $2) t",
        quiz_id, tenant.0,
    )
    .fetch_optional(&state.analytics_pool)
    .await?
    .flatten()
    .unwrap_or(serde_json::json!([]));

    Ok(Json(result))
}

// Add more RPC bridges as needed:
// - get_quiz_attempt_distribution
// - get_quiz_score_histogram
// - get_student_quiz_performance
// Pattern: always call stored procedure, return JSON
```

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**STOP IF:**

- Stored procedures belum ada di migration → BLOCKED, list yang dibutuhkan
- `analytics_pool` belum ada di `AppState` → tambahkan, tapi catat sebagai prerequisite

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group H — Quiz Analytics (Lanjutan)

## Task 2B-18: Quiz Analytics Additional RPCs

**TASK ID:** 2B-18

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Complete remaining quiz analytics RPC bridges

**DEPENDENCY:** 2B-17

**READ FIRST:**

- `src/features/quizzes/api/quizAnalyticsService.ts` — list ALL RPC calls
- `src/features/quizzes/api/quizAnalytics.service.ts`

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/quiz_analytics_rpc.rs` (extend)
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. Grep all `supabase.rpc(` calls in both analytics service files
2. For each → add thin Rust handler following RPC bridge pattern from 2B-17
3. All use `analytics_pool`

**VERIFY:**

```bash
cd edusync-api && cargo check
grep -c 'pub async fn' edusync-api/crates/server/src/handlers/quiz_analytics_rpc.rs
# Should match count of RPCs in quizAnalyticsService.ts + quizAnalytics.service.ts
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-19: Quiz Route Registration

**TASK ID:** 2B-19

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Register all quiz endpoints in VIL ServiceProcess

**DEPENDENCY:** 2B-03 sampai 2B-18

**EDIT ONLY:**

- `edusync-api/crates/server/src/routes.rs`

**COPY-PASTE STARTER:**

```rust
// Di routes.rs — tambahkan quiz routes
let quizzes = ServiceProcess::new("quizzes")
    .prefix("/api/v1")
    // Quiz CRUD
    .endpoint(Method::GET, "/quizzes", get(quiz_read::list_quizzes))
    .endpoint(Method::GET, "/quizzes/:id", get(quiz_read::get_quiz))
    .endpoint(Method::GET, "/quizzes/:id/student", get(quiz_read::get_quiz_student))
    .endpoint(Method::POST, "/quizzes", post(quiz_write::create_quiz))
    .endpoint(Method::PUT, "/quizzes/:id", put(quiz_write::update_quiz))
    .endpoint(Method::DELETE, "/quizzes/:id", delete(quiz_write::delete_quiz))
    .endpoint(Method::POST, "/quizzes/:id/publish", post(quiz_write::publish_quiz))
    .endpoint(Method::POST, "/quizzes/:id/unpublish", post(quiz_write::unpublish_quiz))
    // Questions
    .endpoint(Method::GET, "/quizzes/:quiz_id/questions", get(quiz_questions::list_questions))
    .endpoint(Method::POST, "/quizzes/:quiz_id/questions", post(quiz_questions::create_question))
    .endpoint(Method::PUT, "/questions/:id", put(quiz_questions::update_question))
    .endpoint(Method::DELETE, "/questions/:id", delete(quiz_questions::delete_question))
    .endpoint(Method::PUT, "/quizzes/:quiz_id/questions/reorder", put(quiz_questions::reorder_questions))
    // Attempts
    .endpoint(Method::POST, "/quizzes/:quiz_id/attempts", post(quiz_attempt::start_attempt))
    .endpoint(Method::GET, "/quizzes/:quiz_id/attempts", get(quiz_results::list_attempts))
    .endpoint(Method::GET, "/attempts/:attempt_id", get(quiz_results::get_attempt_detail))
    // Autosave
    .endpoint(Method::PUT, "/attempts/:attempt_id/autosave", put(quiz_autosave::autosave_answers))
    // Submit
    .endpoint(Method::POST, "/attempts/:attempt_id/submit", post(quiz_submit::submit_attempt))
    // Timer
    .endpoint(Method::GET, "/attempts/:attempt_id/timer", get(quiz_timer::get_timer))
    .endpoint(Method::POST, "/attempts/:attempt_id/auto-submit", post(quiz_timer::auto_submit_expired))
    // Manual grading
    .endpoint(Method::POST, "/answers/:answer_id/grade", post(quiz_manual_grade::grade_answer))
    // Suspicious
    .endpoint(Method::POST, "/attempts/:attempt_id/flag-suspicious", post(quiz_suspicious::flag_suspicious))
    .endpoint(Method::GET, "/quizzes/:quiz_id/suspicious", get(quiz_suspicious::list_suspicious))
    .endpoint(Method::PUT, "/suspicious/:id/review", put(quiz_suspicious::review_suspicious))
    // Question bank
    .endpoint(Method::GET, "/question-bank", get(question_bank::list_question_bank))
    .endpoint(Method::POST, "/question-bank", post(question_bank::create_question_bank_item))
    .endpoint(Method::POST, "/quizzes/:quiz_id/import-from-bank", post(question_bank::import_from_bank))
    // Analytics
    .endpoint(Method::GET, "/analytics/quiz/:quiz_id/stats", get(quiz_analytics_rpc::get_quiz_statistics))
    .endpoint(Method::GET, "/analytics/quiz/:quiz_id/question-analysis", get(quiz_analytics_rpc::get_question_analysis));
```

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group I — Assignments

## Task 2B-20: Assignment Rust Models & DTOs

**TASK ID:** 2B-20

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Buat Rust model structs untuk assignment domain

**DEPENDENCY:** Phase 1A scaffold

**EDIT ONLY:**

- `edusync-api/crates/models/src/assignment.rs` (buat baru)
- `edusync-api/crates/models/src/lib.rs`

**COPY-PASTE STARTER:**

Lihat `src/features/assignments/types/` untuk TypeScript types dan buat matching Rust structs. Pattern sama dengan Task 2B-01 (Quiz Models).

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**STOP IF:** Migration schema sangat berbeda → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-21: Assignment CRUD Handlers

**TASK ID:** 2B-21

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** CRUD endpoints for assignments (teacher/admin)

**DEPENDENCY:** 2B-20

**READ FIRST:**

- `src/features/assignments/api/assignmentService.ts`

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment_crud.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/assignments` — list (tenant-scoped, role-filtered)
2. `GET /api/v1/assignments/:id` — detail
3. `POST /api/v1/assignments` — create (teacher/admin)
4. `PUT /api/v1/assignments/:id` — update
5. `DELETE /api/v1/assignments/:id` — delete
6. `POST /api/v1/assignments/:id/publish` — publish
7. Pattern: sama dengan quiz CRUD (TenantGuard + RbacGuard)

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-22: Assignment Submission Handler

**TASK ID:** 2B-22

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Student submission endpoints + file upload integration

**DEPENDENCY:** 2B-21

**READ FIRST:**

- `src/features/assignments/api/assignmentService.ts` — submit logic
- Spec 3 §4 Idempotency: `assignment:{submission_id}` at-least-once

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment_submit.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/assignments/:id/submissions` — create/update draft submission
2. `POST /api/v1/submissions/:id/submit` — finalize submission
3. `GET /api/v1/assignments/:id/submissions` — list (student: own, teacher: all)
4. `GET /api/v1/submissions/:id` — submission detail
5. Late submission check (if `allow_late_submission` false, reject after `due_date`)
6. File attachment: accept `file_urls[]` array (files already uploaded via storage presigned URL)

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** File upload requires storage integration not yet built → note dependency, continue with text-only submit

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-23: Assignment Grading Handler (SpeedGrader Backend)

**TASK ID:** 2B-23

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Teacher grading endpoints for SpeedGrader UI

**DEPENDENCY:** 2B-22

**READ FIRST:**

- `src/features/assignments/api/assignmentService.ts` — grade logic
- `src/features/gradebook/api/` — SpeedGrader integration

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment_grade.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/submissions/:id/grade` — grade submission (score + feedback)
2. `POST /api/v1/submissions/:id/return` — return to student for revision
3. `GET /api/v1/assignments/:id/grading-queue` — list ungraded submissions (SpeedGrader)
4. Update submission status: `graded`, set `graded_at`, `graded_by`
5. Only teacher/admin

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-24: Group Assignment Handler

**TASK ID:** 2B-24

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Group assignment logic — shared submission per group

**DEPENDENCY:** 2B-22

**READ FIRST:**

- `src/features/assignments/api/groupAssignmentService.ts`

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/assignment_group.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/assignments/:id/groups` — create groups for assignment
2. `GET /api/v1/assignments/:id/groups` — list groups
3. `PUT /api/v1/groups/:id/members` — add/remove members
4. Group submission: one submission per group, any member can submit
5. All group members get same score when graded

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Group tables don't exist → BLOCKED, create migration

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group J — Gradebook

## Task 2B-25: Gradebook RPC Bridge Handlers

**TASK ID:** 2B-25

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Thin Rust handlers calling gradebook stored procedures via sqlx

**DEPENDENCY:** Group D + Group I (quiz + assignment data needed)

**READ FIRST:**

- `src/features/gradebook/api/` — all service files
- Phase 2 detail §Batch 2: "Complex gradebook queries example"

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook_rpc.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**DO NOT TOUCH:**

- Stored procedures — KEEP as-is

**IMPLEMENTATION STEPS:**

1. Grep all `supabase.rpc(` in gradebook service files
2. For each RPC → thin Rust handler calling stored procedure
3. Use `analytics` DB pool for heavy aggregation queries
4. Use `default` pool for simple CRUD
5. Endpoints:
   - `GET /api/v1/gradebook/:class_id` — class gradebook summary
   - `GET /api/v1/gradebook/:class_id/student/:student_id` — individual student grades
   - `GET /api/v1/gradebook/:class_id/export` — export as CSV/JSON

**COPY-PASTE STARTER (example pattern):**

```rust
// edusync-api/crates/server/src/handlers/gradebook_rpc.rs
use axum::{extract::{Path, Query, State}, Json};
use uuid::Uuid;
use crate::middleware::{Claims, TenantId};
use crate::error::AppError;
use crate::state::AppState;

/// GET /api/v1/gradebook/:class_id
/// RPC Bridge → calls get_gradebook_summary()
pub async fn get_gradebook_summary(
    State(state): State<AppState>,
    tenant: TenantId,
    claims: Claims,
    Path(class_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    claims.require_any_role(&["teacher", "admin"])?;

    let result = sqlx::query_scalar!(
        "SELECT json_agg(t) FROM get_gradebook_summary($1, $2) t",
        class_id, tenant.0,
    )
    .fetch_optional(&state.analytics_pool)
    .await?
    .flatten()
    .unwrap_or(serde_json::json!([]));

    Ok(Json(result))
}
```

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**STOP IF:** Stored procedures don't exist → BLOCKED, list which ones needed

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-26: Gradebook Write Handlers (Score Override, What-If)

**TASK ID:** 2B-26

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Score override and What-If grades calculation

**DEPENDENCY:** 2B-25

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/gradebook_write.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `PUT /api/v1/gradebook/grades/:grade_id` — manual score override (teacher)
2. `POST /api/v1/gradebook/what-if` — calculate what-if score without saving
3. Audit log for score overrides

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-27: SpeedGrader Annotation Handlers

**TASK ID:** 2B-27

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** SpeedGrader inline annotation read/write

**DEPENDENCY:** 2B-23

**EDIT ONLY:**

- `edusync-api/crates/server/src/handlers/speedgrader.rs` (buat baru)
- `edusync-api/crates/server/src/handlers/mod.rs`
- `edusync-api/crates/server/src/routes.rs`

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/submissions/:id/annotations` — list annotations
2. `POST /api/v1/submissions/:id/annotations` — add annotation
3. `PUT /api/v1/annotations/:id` — update
4. `DELETE /api/v1/annotations/:id` — delete
5. Only teacher/admin

**VERIFY:**

```bash
cd edusync-api && cargo check && cargo clippy -- -D warnings
```

**STOP IF:** Annotations table doesn't exist → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-28: Assignment + Gradebook Route Registration

**TASK ID:** 2B-28

**OWNER TYPE:** Rust CRUD Agent

**GOAL:** Register all assignment & gradebook endpoints

**DEPENDENCY:** 2B-20 sampai 2B-27

**EDIT ONLY:**

- `edusync-api/crates/server/src/routes.rs`

**VERIFY:**

```bash
cd edusync-api && cargo check
```

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group K — Frontend Refactor (Per-Service)

Semua task di group ini mengikuti pattern yang SAMA dari Task 0A-8 (courseService refactor).

## Task 2B-29: Refactor quizCRUD.ts

**TASK ID:** 2B-29

**OWNER TYPE:** Frontend Refactor Agent

**GOAL:** Replace `supabase` import with `getApiClient()` in quizCRUD.ts

**DEPENDENCY:** Group B selesai (quiz read/write handlers exist di VIL)

**EDIT ONLY:**

- `src/features/quizzes/api/quizCRUD.ts`

**DO NOT TOUCH:**

- Files lain di `src/features/quizzes/`
- `src/services/api/` (sudah final)

**IMPLEMENTATION STEPS:**

1. Replace `import { supabase } from '@/services/supabase/client'` → `import { getApiClient } from '@/services/api'`
2. Di setiap method: `const db = getApiClient()`
3. Replace semua `supabase.from(...)` → `db.from(...)`
4. Replace semua `supabase.rpc(...)` → `db.rpc(...)`
5. Verify return types unchanged

**VERIFY:**

```bash
pnpm typecheck && pnpm lint
grep -n "from '@/services/supabase/client'" src/features/quizzes/api/quizCRUD.ts
# Expected: 0 results
```

**STOP IF:** Type mismatch setelah replace → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-30 sampai 2B-38: Refactor Remaining Quiz + Assignment Service Files

Setiap task berikut ikuti **pattern identik** dengan 2B-29:

| **Task ID** | **File**                                            | **Dependency** |
| ----------- | --------------------------------------------------- | -------------- |
| 2B-30       | `src/features/quizzes/api/quizAttemptService.ts`    | Group C + D    |
| 2B-31       | `src/features/quizzes/api/quizPlayer.service.ts`    | Group B        |
| 2B-32       | `src/features/quizzes/api/quizTimerService.ts`      | Group E        |
| 2B-33       | `src/features/quizzes/api/quizBuilderService.ts`    | Group G        |
| 2B-34       | `src/features/quizzes/api/quizAnalyticsService.ts`  | Group H        |
| 2B-35       | `src/features/quizzes/api/quizAnalytics.service.ts` | Group H        |
| 2B-36       | `src/features/quizzes/api/questionBankService.ts`   | Group G        |
| 2B-37       | `src/features/assignments/api/assignmentService.ts` | Group I        |
| 2B-38       | `src/features/gradebook/api/` (all files)           | Group J        |

Untuk setiap task:

- **OWNER TYPE:** Frontend Refactor Agent
- **GOAL:** Replace `supabase` → `getApiClient()`
- **EDIT ONLY:** Hanya file yang tercantum
- **VERIFY:** `pnpm typecheck && pnpm lint && grep -n "from '@/services/supabase/client'" <file>` = 0
- **STOP IF:** Type mismatch → BLOCKED
- **OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Group L — Test Packs

## Task 2B-39: Quiz Timer Race Condition Tests

**TASK ID:** 2B-39

**OWNER TYPE:** Test Agent

**GOAL:** Integration tests untuk quiz timer race conditions

**DEPENDENCY:** Group E + Group K

**EDIT ONLY:**

- `edusync-api/tests/quiz_timer_test.rs` (buat baru)

**IMPLEMENTATION STEPS:**

1. Test: concurrent auto-submit + manual submit → only one succeeds
2. Test: autosave after timer expired → rejected
3. Test: start attempt after max attempts reached → rejected
4. Test: cron job expires timed-out attempts correctly
5. Test: submit is idempotent (double submit returns same result)

**COPY-PASTE STARTER:**

```rust
// edusync-api/tests/quiz_timer_test.rs
#[tokio::test]
async fn test_concurrent_submit_and_auto_submit() {
    // Setup: create quiz with 1-minute timer, create attempt
    // Spawn 2 concurrent tasks: manual submit + auto-submit
    // Assert: exactly one succeeds, the other returns idempotent result
    // Assert: attempt status is 'submitted' or 'graded' (not 'in_progress')
}

#[tokio::test]
async fn test_autosave_after_timer_expired() {
    // Setup: create quiz with 0-minute timer (already expired)
    // Attempt to autosave → should return error
}

#[tokio::test]
async fn test_submit_idempotency() {
    // Submit same attempt twice
    // Both should return 200 with same data
}

#[tokio::test]
async fn test_max_attempts_enforcement() {
    // Set max_attempts = 1, complete 1 attempt
    // Try to start new attempt → should fail
}
```

**VERIFY:**

```bash
cd edusync-api && cargo test quiz_timer
```

**STOP IF:** Test infra belum setup → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-40: Quiz Grading Worker Tests

**TASK ID:** 2B-40

**OWNER TYPE:** Test Agent

**GOAL:** Tests untuk grading worker queue processing + DLQ

**DEPENDENCY:** Group F

**EDIT ONLY:**

- `edusync-api/tests/quiz_grader_test.rs` (buat baru)

**IMPLEMENTATION STEPS:**

1. Test: submit MCQ quiz → auto-graded immediately, score correct
2. Test: submit essay quiz → enqueued to `quiz_submission_queue`
3. Test: worker processes queue → attempt status updated to `graded`
4. Test: worker failure → retry with exponential backoff
5. Test: 3 failures → moved to dead_letter
6. Test: manual grade essay → recalculates total score

**VERIFY:**

```bash
cd edusync-api && cargo test quiz_grader
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-41: Assignment + Gradebook Parity Tests

**TASK ID:** 2B-41

**OWNER TYPE:** Test Agent

**GOAL:** Parity tests — VIL output matches Supabase output

**DEPENDENCY:** Group I + Group J + Group K

**EDIT ONLY:**

- `edusync-api/tests/assignment_parity_test.rs` (buat baru)

**IMPLEMENTATION STEPS:**

1. Test: CRUD assignment → response shape matches frontend expectations
2. Test: submit assignment → submission record created correctly
3. Test: grade assignment → score reflected in gradebook
4. Test: gradebook aggregation → matches stored procedure output
5. Test: tenant isolation → user A cannot see user B data

**VERIFY:**

```bash
cd edusync-api && cargo test assignment_parity && cargo test gradebook_parity
```

**STOP IF:** Tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 2B-42: Frontend E2E Tests (Quiz Flow)

**TASK ID:** 2B-42

**OWNER TYPE:** Test Agent

**GOAL:** E2E Playwright tests for quiz flows via VIL backend

**DEPENDENCY:** Group K selesai

**EDIT ONLY:**

- `tests/e2e/quiz-flow.spec.ts` (buat baru atau extend existing)

**IMPLEMENTATION STEPS:**

1. Test: teacher creates quiz → visible in quiz list
2. Test: student starts quiz → attempt created
3. Test: student answers + autosave → answers persisted
4. Test: student submits → score calculated
5. Test: teacher views gradebook → scores visible
6. Run with `VITE_API_BACKEND=vil`

**VERIFY:**

```bash
VITE_API_BACKEND=vil pnpm test:e2e -- --grep quiz
```

**STOP IF:** E2E infra belum support VIL backend → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 📊 Batch 2 Completion Checklist

| **Criteria**                                  | **Target**                                                              | **Status** |
| --------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| All quiz CRUD endpoints                       | VIL handles read/write                                                  | ⬜         |
| Quiz attempt flow (start → autosave → submit) | End-to-end via VIL                                                      | ⬜         |
| Quiz timer + auto-expiry                      | Cron job + race protection                                              | ⬜         |
| Quiz grading worker                           | Domain-specific DLQ, 3x retry                                           | ⬜         |
| Manual essay grading                          | Teacher grades via VIL                                                  | ⬜         |
| Question bank + import                        | CRUD + import to quiz                                                   | ⬜         |
| Quiz analytics RPCs                           | Bridge pattern, analytics pool                                          | ⬜         |
| Assignment CRUD + submit                      | Individual + group                                                      | ⬜         |
| Gradebook aggregation                         | RPC bridge + SpeedGrader                                                | ⬜         |
| Frontend: 0 direct Supabase imports           | All quiz/assignment/gradebook files                                     | ⬜         |
| Race condition tests pass                     | Timer + concurrent submit                                               | ⬜         |
| E2E pass with VIL backend                     | `VITE_API_BACKEND=vil`                                                  | ⬜         |
| Per-flow rollback tested                      | [quiz.read](http://quiz.read), quiz.autosave, quiz.submit independently | ⬜         |

---

## Catatan untuk Agent Selanjutnya

Setelah Batch 2 selesai, lanjut ke:

- **Batch 3:** Users, Analytics (21+ RPCs), Progress, xAPI, Administration
- **Batch 4:** Discussions, Notifications, Calendar, Attendance, Certificates, Gamification, Parent, Principal

```rust

```
