# Task Queue — Phase 2 Batch 2

**Modul:** Quizzes, Assignments, Gradebook  
**Durasi:** Minggu 28–32 | **Effort:** ~60–80 jam

**CATATAN:** Batch ini paling kompleks — Quizzes memiliki 13 service files, timer, autosave, dan auto-grade.

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
Group A (Quiz Models):
2B-01 → 2B-02

Group B (Quiz Read):
2B-02 → 2B-03

Group C (Quiz Autosave):
2B-02 → 2B-05 → 2B-06

Group D (Quiz Submit):
2B-02 → 2B-07

Group E (Quiz Timer):
2B-07 → 2B-08

Group F (Quiz Grading):
2B-07 → 2B-09 → 2B-10 → 2B-11 → 2B-12 → 2B-13

Group G (Quiz Builder & Question Bank):
2B-02 → 2B-14 → 2B-15 → 2B-16 → 2B-17

Group H (Quiz Analytics):
Group F → 2B-18 → 2B-19

Group I (Assignments):
2B-01 → 2B-20 → 2B-21 → 2B-22 → 2B-23 → 2B-24

Group J (Gradebook):
2B-07 + 2B-21 → 2B-25 → 2B-26 → 2B-27 → 2B-28

Group K (Frontend Refactor):
Corresponding Rust handlers must be done first

Group L (Test Packs):
Group K done → 2B-39 → 2B-40 → 2B-41 → 2B-42
```

---

## Task Detail

### 2B-00: Schema Introspection

**Goal:** Introspect actual DB schema untuk quiz tables + setup guards against dual-processing

**Dependencies:** Phase 1A scaffold selesai

**SQL Introspection:**

```sql
-- Quiz tables
\d quizzes;
\d quiz_questions;
\d quiz_options;
\d quiz_attempts;
\d quiz_answers;
\d question_bank;
\d question_bank_options;
\d suspicious_attempts;
\d submission_files;

-- Assignment tables
\d assignments;
\d assignment_submissions;

-- Check existing constraints
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('quiz_answers'::regclass)
  AND contype = 'u';

-- Check for existing grading-related pg_cron jobs
SELECT * FROM cron.job WHERE command ILIKE '%quiz%' OR command ILIKE '%attempt%';

-- Scan frontend quiz service files
ls src/features/quizzes/api/
```

---

### 2B-01: Quiz Domain Rust Models

**Goal:** Buat semua Rust model structs untuk quiz domain tables

**Dependencies:** Phase 1A scaffold selesai

**Files:**

- `edusync-api/crates/models/src/quiz.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod quiz;`)

**Gotchas:**

- `quiz_questions.text` — BUKAN `question_text`
- `quiz_options.text` — BUKAN `option_text`
- `quiz_attempts.user_id` — BUKAN `student_id`

---

### 2B-02: Quiz Request/Response DTOs

**Goal:** Buat request/response DTOs yang match frontend expectations

**Dependencies:** 2B-01

**Files:**

- `edusync-api/crates/models/src/quiz_dto.rs`
- `edusync-api/crates/models/src/lib.rs` (add `pub mod quiz_dto;`)

---

### 2B-03: Quiz CRUD Read Handlers

**Goal:** Implement quiz list + detail read endpoints (teacher & student views)

**Dependencies:** 2B-02

**Endpoints:**

- `GET /api/v1/quizzes` — List quizzes
- `GET /api/v1/quizzes/:id` — Quiz detail
- `GET /api/v1/quizzes/:id/student` — Student quiz load

---

### 2B-04: Quiz CRUD Write Handlers

**Goal:** Implement quiz create, update, delete, publish endpoints

**Dependencies:** 2B-03

**Endpoints:**

- `POST /api/v1/quizzes` — Create quiz
- `PUT /api/v1/quizzes/:id` — Update quiz
- `DELETE /api/v1/quizzes/:id` — Delete quiz
- `POST /api/v1/quizzes/:id/publish` — Publish quiz
- `POST /api/v1/quizzes/:id/unpublish` — Unpublish quiz

---

### 2B-05: Quiz Attempt Start Handler

**Goal:** Implement start quiz attempt endpoint — creates new attempt with timer

**Dependencies:** 2B-02

**Endpoint:**

- `POST /api/v1/quizzes/:id/attempts` — Start new attempt

---

### 2B-06: Quiz Autosave Handler

**Goal:** Implement autosave answer endpoint — upsert answers every 30 seconds

**Dependencies:** 2B-05

**Endpoint:**

- `PUT /api/v1/attempts/:attempt_id/autosave` — Batch upsert answers

**Gotcha:** Use UPSERT (ON CONFLICT) — BUKAN `SELECT ... FOR UPDATE` (yang hanya untuk submit)

---

### 2B-07: Quiz Submit Handler

**Goal:** Implement quiz submission endpoint — finalize attempt, auto-grade MCQ, enqueue essay grading

**Dependencies:** 2B-05

**Endpoint:**

- `POST /api/v1/attempts/:attempt_id/submit` — Submit attempt

**Idempotency:** Key format `quiz:{attempt_id}:{user_id}`

---

### 2B-08: Quiz Timer Handler

**Goal:** Auto-submit handler untuk timed quizzes

**Dependencies:** 2B-07

---

### 2B-09: Quiz Grading Worker Setup

**Goal:** Setup grading worker infrastructure

**Dependencies:** 2B-07

---

### 2B-10: Quiz Grading Logic

**Goal:** Auto-grade MCQ, true/false, short-answer questions

**Dependencies:** 2B-09

---

### 2B-11: Essay Grading Queue Handler

**Goal:** Handle manual/AI grading queue

**Dependencies:** 2B-10

---

### 2B-12: Grade Review Handler

**Goal:** Teacher review and override grades

**Dependencies:** 2B-11

---

### 2B-13: Suspicious Attempt Handler

**Goal:** Flag and review suspicious attempts

**Dependencies:** 2B-12

---

### 2B-14: Quiz Builder Endpoints

**Goal:** Quiz builder endpoints

**Dependencies:** 2B-02

---

### 2B-15: Question Bank CRUD

**Goal:** Question bank management

**Dependencies:** 2B-14

---

### 2B-16: Question Bank Import/Export

**Dependencies:** 2B-15

---

### 2B-17: Question Randomization

**Dependencies:** 2B-16

---

### 2B-18: Quiz Analytics Endpoints

**Dependencies:** 2B-13

---

### 2B-19: Student Quiz History

**Dependencies:** 2B-18

---

### 2B-20: Assignment CRUD

**Goal:** Assignment CRUD endpoints

**Dependencies:** Phase 1A scaffold done

---

### 2B-21: Assignment Submissions

**Goal:** Submission handling

**Dependencies:** 2B-20

---

### 2B-22: File Upload Handler

**Dependencies:** 2B-21

---

### 2B-23: Assignment Group Support

**Dependencies:** 2B-22

---

### 2B-24: Assignment Rubric Handler

**Dependencies:** 2B-23

---

### 2B-25: Gradebook Aggregation

**Goal:** Gradebook aggregation from quizzes + assignments

**Dependencies:** 2B-07 + 2B-21

---

### 2B-26: Grade Override Handler

**Dependencies:** 2B-25

---

### 2B-27: SpeedGrader Endpoints

**Dependencies:** 2B-26

---

### 2B-28: Grade Export Handler

**Dependencies:** 2B-27

---

### 2B-29 to 2B-38: Frontend Refactor

**Goal:** Refactor frontend service files untuk menggunakan VIL API

**Dependencies:** Corresponding Rust handlers done

**Files to refactor:**

- `quizCRUD.ts`
- `quizPlayerService.ts`
- `quizAttemptService.ts`
- `quizBuilderService.ts`
- `assignmentService.ts`
- `submissionService.ts`
- `gradebookService.ts`
- `questionBankService.ts`
- `offlineQueue.ts` (compatibility check)
- Remaining service files

---

### 2B-39 to 2B-42: Tests

**Goal:** Integration tests dan shadow mode verification

**Dependencies:** Frontend refactor done

---

## Parallelism Map

| Group              | Tasks         | Parallel With        |
| ------------------ | ------------- | -------------------- |
| A — Quiz Models    | 2B-01 → 2B-02 | E, F, G              |
| B — Quiz Read      | 2B-03 → 2B-04 | C, D                 |
| C — Quiz Autosave  | 2B-05 → 2B-06 | B, D                 |
| D — Quiz Submit    | 2B-07 → 2B-08 | B, C                 |
| E — Quiz Timer     | 2B-09 → 2B-10 | A                    |
| F — Quiz Grading   | 2B-11 → 2B-13 | A                    |
| G — Quiz Builder   | 2B-14 → 2B-17 | B, C, D              |
| H — Quiz Analytics | 2B-18 → 2B-19 | F                    |
| I — Assignments    | 2B-20 → 2B-24 | All                  |
| J — Gradebook      | 2B-25 → 2B-28 | D + I                |
| K — Frontend       | 2B-29 → 2B-38 | Per-service parallel |
| L — Tests          | 2B-39 → 2B-42 | K done               |
