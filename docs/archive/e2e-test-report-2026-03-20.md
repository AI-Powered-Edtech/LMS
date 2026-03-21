# EduSync LMS — E2E Test Report

**Date:** 2026-03-20  
**Test Method:** Supabase REST API (teacher + student JWT tokens)  
**Status:** ✅ ALL CRITICAL BUGS FIXED

---

## Migration Chain Applied

| Migration | Description                                                                      | Status     |
| --------- | -------------------------------------------------------------------------------- | ---------- |
| 291       | Fix v1_submit_quiz_attempt grading logic (jsonb, table names)                    | ✅ Applied |
| 292       | Fix analytics rate limit null tenant crash                                       | ✅ Applied |
| 293       | Fix v1_submit_quiz_attempt: enum values, column names (time_spent, no graded_at) | ✅ Applied |
| 294       | Fix state machine: allow in_progress→graded; fix get_teacher_analytics auth      | ✅ Applied |
| 295       | Fix course_enrollments join: student_id → user_id                                | ✅ Applied |
| 296       | Fix trigger_quiz_passed_v2: NEW.student_id; fix student_lesson_signals columns   | ✅ Applied |
| 297       | Fix trigger_quiz_passed_v2: add entity_type='quiz', entity_id=NEW.quiz_id        | ✅ Applied |

---

## BUG-001: Quiz Submit — FIXED ✅

**Test:** `student@edusync.dev` starts quiz `f5521ccc-a6cf-43be-9999-ec2bdf115fd0`, saves all correct answers, submits.

**Result:** `score=100, passed=true, correct=3/3, status=graded`

**Root causes fixed (4 migrations):**

1. Wrong enum: `'MULTIPLE_CHOICE'` → `'MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'` (migration 293)
2. Wrong column: `time_spent_seconds` → `time_spent`, removed non-existent `graded_at` (migration 293)
3. State machine: `in_progress → graded` was blocked (migration 294)
4. Trigger column: `NEW.user_id` → `NEW.student_id` in `trigger_quiz_passed_v2` (migration 296)
5. Missing NOT NULL: `entity_type='quiz'`, `entity_id=NEW.quiz_id` in trigger INSERT (migration 297)

---

## BUG-002: Teacher Analytics — FIXED ✅

**Test:** `teacher@edusync.dev` calls `get_teacher_analytics(p_course_id='4022d60f-...')`

**Result:** Returns 5 rows with `student_id`, `student_name`, `completion_pct`, `struggle_score`, `time_spent_minutes`, `last_active`, `quiz_avg_score`

**Root causes fixed (3 migrations):**

1. `has_role()` fails when JWT missing tenant claim → use `user_roles` table directly with profile fallback (migration 294)
2. `course_enrollments.student_id` doesn't exist → `user_id` (migration 295)
3. `student_lesson_signals` wrong columns: `time_spent_seconds`→`total_time_spent`, `last_event_at`→`last_accessed_at`, `quiz_avg_score`→`latest_quiz_score` (migration 296)

---

## Correct API Signatures (verified)

```
v1_start_quiz_attempt(p_quiz_id UUID, p_assignment_id UUID DEFAULT NULL)
v1_save_partial_answers(p_attempt_id UUID, p_answers JSONB)
  → p_answers format: [{"question_id": "...", "student_answers": ["option_id"]}]
v1_submit_quiz_attempt(p_attempt_id UUID, p_final_answers JSONB DEFAULT '[]', p_telemetry_data JSONB DEFAULT '{}')
get_teacher_analytics(p_course_id UUID, p_limit INT DEFAULT 50, p_cursor_student_id UUID DEFAULT NULL)
record_xp_transaction(p_user_id UUID, p_xp_amount INT, p_source_type TEXT, p_source_id UUID DEFAULT NULL)
get_student_recommendations(p_user_id UUID, p_limit INT)
get_student_path(p_user_id UUID, p_course_id UUID)
get_student_signals(p_course_id UUID, p_lesson_id UUID DEFAULT NULL)
```

---

## Dev Credentials

- **Student:** `student@edusync.dev` / `password123`
- **Teacher:** `teacher@edusync.dev` / `password123`
- **Anon Key:** use the one in memory file `reference_supabase_credentials.md`
- **Quiz ID (test):** `f5521ccc-a6cf-43be-9999-ec2bdf115fd0`
- **Course ID (test):** `4022d60f-68d7-40ef-bac1-e58222d1ed1e`
- **Tenant ID:** `00000000-0000-0000-0000-00000000000d`
