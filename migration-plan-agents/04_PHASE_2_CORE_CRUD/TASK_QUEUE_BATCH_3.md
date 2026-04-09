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

## Task Detail

### 2C-1: Analytics Models + Executive Overview RPC Handler

**Goal:** Buat Rust model structs untuk analytics responses + handler executive overview RPC

**Dependencies:** Phase 1A scaffold selesai, Phase 2 Batch 1-2 selesai

**CATATAN:** Analytics RPCs tetap sebagai stored procedures — thin Rust handler memanggil `sqlx::query!` ke stored procedure, TIDAK port logic ke Rust.

**Files:**

- `edusync-api/crates/models/src/analytics.rs` — Response structs
- `edusync-api/crates/server/src/handlers/analytics.rs` — Handlers

**Endpoint:**

- `GET /api/v1/analytics/executive` — Role: admin, principal
- `GET /api/v1/analytics/principal-overview` — Role: admin, principal

---

### 2C-2: Analytics Teacher + Student RPC Handlers

**Goal:** Handler untuk teacher dashboard + student progress RPCs

**Dependencies:** Task 2C-1 selesai

**Endpoints:**

- `GET /api/v1/analytics/teacher-dashboard` — Role: teacher, admin
- `GET /api/v1/analytics/student-progress` — Role: student, teacher, admin, parent
- `GET /api/v1/analytics/course/:course_id` — Role: teacher, admin

**GOTCHA:** Saat check teacher role di analytics RPCs, query `user_roles` table langsung — JANGAN pakai `has_role()` karena fails saat JWT missing tenant claim

---

### 2C-3: Analytics Remaining RPCs (Bulk Handler Registration)

**Goal:** Register semua remaining 15+ analytics RPC handlers sebagai thin wrappers ke stored procedures

**Dependencies:** Task 2C-2 selesai

**Endpoints:**

- `GET /api/v1/analytics/attendance`
- `GET /api/v1/analytics/quiz`
- `GET /api/v1/analytics/assignment`
- `GET /api/v1/analytics/engagement`
- `GET /api/v1/analytics/class-performance`
- `GET /api/v1/analytics/student-ranking`
- `GET /api/v1/analytics/learning-path`
- `GET /api/v1/analytics/gamification-leaderboard`

---

### 2C-4: User Management CRUD Endpoints

**Goal:** Admin user CRUD endpoints — list, get, update, deactivate users per tenant

**Dependencies:** Phase 1A scaffold + Phase 1B auth selesai

**Endpoints:**

- `GET /api/v1/users` — Role: admin
- `GET /api/v1/users/:id` — Role: admin, teacher (limited), self
- `PUT /api/v1/users/:id` — Role: admin, self (limited)
- `DELETE /api/v1/users/:id` (soft delete) — Role: admin

**GOTCHA:** Role datang dari `user_roles` table, BUKAN `profiles.role`

---

### 2C-5: Bulk Import Service Endpoints

**Goal:** Bulk CSV import endpoint for admin — chunk-based, resumable

**Dependencies:** Task 2C-4 selesai

**Endpoints:**

- `POST /api/v1/admin/bulk-import` — Start import job
- `GET /api/v1/admin/bulk-import/:job_id` — Check job status
- `POST /api/v1/admin/bulk-import/:job_id/retry` — Retry failed chunks

**Processing:** Chunk-based (50 rows per chunk), insert via transaction

---

### 2C-6: Progress Tracking Endpoints

**Goal:** Progress tracking CRUD — lesson progress, course completion, student_lesson_signals

**Dependencies:** Phase 2 Batch 1 courses/lessons selesai

**Endpoints:**

- `POST /api/v1/progress/lesson` — Upsert lesson progress (last-write-wins)
- `GET /api/v1/progress/course/:course_id` — Get course completion
- `GET /api/v1/progress/student/:student_id` — Get all progress for student
- `POST /api/v1/progress/signals` — Batch upsert student lesson signals

**GOTCHA:** Column names: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (BUKAN `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)

**Delivery:** Last-write-wins (CC6)

---

### 2C-7: xAPI Statement Endpoints

**Goal:** xAPI statement ingestion with idempotency keys — at-least-once delivery

**Dependencies:** Task 2C-6 selesai

**PREREQUISITE:** Verify `src/utils/offlineQueue.ts` sudah pakai `getApiClient()` (Phase 0A refactor)

**Endpoints:**

- `POST /api/v1/xapi/statements` — Single statement with idempotency
- `POST /api/v1/xapi/statements/batch` — Batch statements from offline queue

**Idempotency Key Format:** `xapi:{verb}:{objectType}:{objectId}:{userId}`

**Delivery:** At-least-once — server HARUS accept duplicate tanpa error (return 200, BUKAN 409)

---

## Parallelism

Batch 3 bisa paralel antar cluster:

- Cluster A (Analytics): 2C-1 → 2C-2 → 2C-3
- Cluster B (User Management): 2C-4 → 2C-5
- Cluster C (Progress + xAPI): 2C-6 → 2C-7
