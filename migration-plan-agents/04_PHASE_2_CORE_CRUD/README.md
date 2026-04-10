# Phase 2 — Core CRUD Migration

Dokumentasi ini mencakup migrasi endpoint EduSync LMS dari Supabase PostgREST ke VIL REST API untuk modul-modul inti: Courses, Classes, Lessons, Quizzes, Assignments, Gradebook, Analytics, Users, dan Progress.

---

## Overview

| Aspek         | Detail                    |
| ------------- | ------------------------- |
| **Durasi**    | Minggu 23–38 (~16 minggu) |
| **Effort**    | ~240 jam                  |
| **Resources** | 4 (Batch 1–4)             |

---

## Batch Overview

### Batch 1: Courses, Classes, Lessons (Minggu 23–28)

**File:** [`TASK_QUEUE_BATCH_1.md`](TASK_QUEUE_BATCH_1.md)  
**Effort:** ~80–100 jam  
**Task Count:** 27 tasks (2B1-00 through 2B1-26)

| Modul             | Tables                                               | Task IDs          |
| ----------------- | ---------------------------------------------------- | ----------------- |
| Courses           | `courses`, `course_versions`, `course_collaborators` | 2B1-00 → 2B1-09   |
| Lessons + Modules | `lessons`, `course_modules`                          | 2B1-10 → 2B1-14   |
| Classrooms        | `classes`, `enrollments`                             | 2B1-15 → 2B1-19   |
| Course Builder    | Builder API                                          | 2B1-20 → 2B1-22   |
| Shadow Mode       | Integration                                          | 2B1-23 → 2B1-26   |

### Batch 2: Quizzes, Assignments, Gradebook (Minggu 28–32)

**File:** [`TASK_QUEUE_BATCH_2.md`](TASK_QUEUE_BATCH_2.md)  
**Effort:** ~60–80 jam  
**Task Count:** 42 tasks (2B-01 through 2B-42)

| Modul             | Tables                                                       | Task IDs      |
| ----------------- | ------------------------------------------------------------ | ------------- |
| Quiz Models       | `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts` | 2B-01 → 2B-02 |
| Quiz CRUD         | Read, Write                                                  | 2B-03 → 2B-04 |
| Quiz Attempt      | Start, Autosave                                              | 2B-05 → 2B-06 |
| Quiz Submit       | Submit, Timer, Grading Worker                                | 2B-07 → 2B-13 |
| Quiz Builder      | Question Bank                                                | 2B-14 → 2B-17 |
| Quiz Analytics    | Analytics                                                    | 2B-18 → 2B-19 |
| Assignments       | CRUD, Submissions                                            | 2B-20 → 2B-24 |
| Gradebook         | Aggregation, SpeedGrader                                     | 2B-25 → 2B-28 |
| Frontend Refactor | 13 service files                                             | 2B-29 → 2B-38 |
| Tests             | Integration                                                  | 2B-39 → 2B-42 |

### Batch 3: Analytics, Users, Progress (Minggu 32–36)

**File:** [`TASK_QUEUE_BATCH_3.md`](TASK_QUEUE_BATCH_3.md)  
**Effort:** ~50–60 jam  
**Task Count:** 7 tasks (2C-1 through 2C-7)

| Modul           | Tables                                      | Task IDs    |
| --------------- | ------------------------------------------- | ----------- |
| Analytics       | RPCs (stored procedures)                    | 2C-1 → 2C-3 |
| User Management | `profiles`, `user_roles`                    | 2C-4        |
| Bulk Import     | CSV import                                  | 2C-5        |
| Progress        | `lesson_progress`, `student_lesson_signals` | 2C-6        |
| xAPI            | `xapi_statements`                           | 2C-7        |

### Batch 4: Remaining Modules (Minggu 36–38)

**File:** [`TASK_QUEUE_BATCH_4.md`](TASK_QUEUE_BATCH_4.md)  
**Effort:** ~40–50 jam

| Modul               | Tables                                      | Task IDs |
| ------------------- | ------------------------------------------- | -------- |
| Notifications       | `notifications`                             | 2D-1     |
| Discussions         | `discussion_threads`, `discussion_comments` | 2D-2     |
| Calendar            | `calendar_events`                           | 2D-3     |
| Attendance          | `attendance_records`                        | 2D-4     |
| Certificates        | `certificates`                              | 2D-5     |
| Gamification        | `user_xp`, `badges`, `user_badges`          | 2D-6     |
| Parent Portal       | `parent_children`, `parent_messages`        | 2D-7     |
| Principal Dashboard | Reuse analytics RPCs                        | 2D-8     |
| Onboarding          | `onboarding_progress`                       | 2D-9     |
| Surveys             | `surveys`, `survey_responses`               | 2D-10    |
| Finance (SPP)       | `spp_records`                               | 2D-11    |
| Search + Moderation | `moderation_reports`                        | 2D-12    |

---

## Per-Batch Workflow

Setiap batch mengikuti workflow yang sama:

```
1. Schema Introspection → Document actual column names/types
2. Rust Model Structs → Define DB models + DTOs
3. Handler Implementation → CRUD endpoints
4. RLS Guards → Port Supabase RLS policies ke Rust middleware
5. Shadow Mode → Dual-write ke Supabase + VIL, log divergence
6. Integration Tests → Verify VIL responses match Supabase
7. Frontend Refactor → Update service layer to use VIL
```

---

## Gate 3: RLS → Middleware Security Check

Sebelum cutover setiap modul, wajib lakukan security review:

1. **Tenant Isolation:**
   - Semua query wajib filter `tenant_id = $1`
   - Tenant ID diambil dari JWT claims via `TenantGuard`

2. **Role-Based Access Control:**
   - Role dari `user_roles` table (BUKAN `profiles.role`)
   - Gunakan `Claims::require_any_role()` untuk authorization

3. **Ownership Checks:**
   - UPDATE/DELETE wajib verify ownership: `created_by = auth.uid() OR has_role('admin')`

4. **Input Validation:**
   - Semua request DTOs wajib divalidasi
   - SQL injection prevention: gunakan `$N` bind parameters, BUKAN string interpolation

---

## SQL Gotchas

- `courses.status` — gunakan `status = 'published'`, BUKAN `is_published` (kolom tidak ada)
- `courses.status` enum — includes `'draft'`, `'published'`, `'archived'`, `'in_review'`, `'approved'`
- `course_modules."order"` — reserved word, wajib quoted dalam SQL
- `lessons."order"` — sama, wajib quoted
- `quiz_questions.text` — BUKAN `question_text`
- `quiz_options.text` — BUKAN `option_text`
- `enrollments.user_id` — BUKAN `student_id`
- `student_lesson_signals`: gunakan `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (BUKAN `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)
- Analytics RPCs: query `user_roles` table langsung, JANGAN pakai `has_role()` (fails saat JWT missing tenant claim)
- `course_collaborators`: trigger `auto_set_tenant_id()`, BUKAN `set_tenant_id_from_user()`

---

## Error Format

Semua endpoint wajib return format PostgREST-compatible:

```json
{
  "code": "PGRST116",
  "message": "Resource not found",
  "details": null,
  "hint": null
}
```

---

## Offline Queue Semantics

- **Quiz submit:** Idempotency key `quiz:{attempt_id}:{user_id}`
- **xAPI statements:** Idempotency key `xapi:{verb}:{objectType}:{objectId}:{userId}`
- **Progress:** Last-write-wins (latest timestamp wins)

---

## Nginx Routes

Setiap batch menambah route baru di `nginx/default.conf`:

```
/api/v1/courses     → VIL (Batch 1)
/api/v1/classes     → VIL (Batch 1)
/api/v1/modules     → VIL (Batch 1)
/api/v1/lessons     → VIL (Batch 1)
/api/v1/quizzes     → VIL (Batch 2)
/api/v1/assignments → VIL (Batch 2)
/api/v1/analytics   → VIL (Batch 3)
/api/v1/users       → VIL (Batch 3)
/api/v1/progress    → VIL (Batch 3)
/api/v1/* (remaining) → VIL (Batch 4)
```

---

## Exit Criteria (Phase 2)

See [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md) for full bash-executable verification.

1. Semua CRUD endpoint untuk Batch 1–4 ter-implement di VIL
2. Shadow mode berjalan untuk semua modul dengan dual-write
3. Integration tests passed
4. Frontend service layer refactored ke VIL
5. Security review passed (Gate 3)
6. RLS policies di-supports oleh Rust middleware
