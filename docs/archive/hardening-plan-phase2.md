# Final Schema Hardening & Optimization Plan

This plan addresses identified security vulnerabilities and performance bottlenecks in the EduSync database schema.

## Proposed Changes

### 1. Hardening Function Search Paths

Setting `search_path = public, extensions` for the following functions to prevent search path hijacking:

- `handle_updated_at()`
- `set_updated_at()`
- `trigger_lesson_completed()`
- `trigger_quiz_passed()`
- `trigger_update_course_progress()`
- `recompute_course_progress_trigger()`
- `update_lesson_resource_search_vector()`

### 2. Missing Foreign Key Indexes

Adding covering indexes for the following unindexed foreign keys to improve query performance:

- `ai_tutor_cache(tenant_id)`
- `quiz_answers(tenant_id)`
- `recommendations(tenant_id, user_id)`
- `grades(tenant_id, student_id)`
- `user_points(tenant_id, user_id)`
- `notifications(tenant_id, user_id)`
- `payments(tenant_id, user_id)`
- `activity_logs(tenant_id, user_id)`
- `course_modules(course_id)`
- `lesson_resources(lesson_id)`
- `lesson_progress(lesson_id, user_id)`
- `quiz_attempts(user_id, quiz_id)`
- `attendance_records(class_id, student_id)`
- `assignment_submissions(assignment_id, student_id)`

### 3. RLS Policy Optimization

Rewriting RLS policies to use scalar subqueries for `auth.uid()` and `get_my_tenant_id()`. This prevents Postgres from re-evaluating these functions for every row in a result set.
Affected tables include: `profiles`, `courses`, `classes`, `enrollments`, `lesson_progress`, `quiz_attempts`, `assignment_submissions`, `grades`, and several others.

### 4. Security Configuration

- Enable `auth.leaked_password_protection` (Manual verification/instruction).

## Verification Plan

### Automated Tests

- `npx supabase db lint`: Check for any schema issues.
- Re-run Supabase Advisors to confirm all flagged items are resolved.

### Manual Verification

- Verify that data isolation (tenant_id) remains strictly enforced.
- Test course progression and quiz submission triggers.
