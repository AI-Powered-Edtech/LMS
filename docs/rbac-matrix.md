# EduSync LMS -- RBAC Matrix

> Role-Based Access Control reference for all routes, RPCs, and RLS policies.
> Generated from `src/app/routes.tsx` and `supabase/migrations/000_baseline.sql`.

---

## 1. Route x Role Access Matrix

All authenticated routes sit behind `AuthGuard` + `TenantGuard`.
Route guards are either `RoleGuard` (layout-level) or `RoleRoute` (per-route wrapper).
Both delegate to the same check: `allowedRoles.includes(currentRole)`.

Legend: **S** = student, **T** = teacher, **A** = admin

### 1.1 Public Routes (no auth required)

| Route              | Component            | Guard |
| ------------------ | -------------------- | ----- |
| `/login`           | Login                | None  |
| `/forgot-password` | ForgotPassword       | None  |
| `/reset-password`  | ResetPassword        | None  |
| `/unauthorized`    | Unauthorized         | None  |
| `*` (fallback)     | Redirect to `/login` | None  |

### 1.2 Auth-Only Routes (no role check)

| Route                 | Component         | Guard                                      |
| --------------------- | ----------------- | ------------------------------------------ |
| `/verify-email`       | VerifyEmail       | AuthGuard (no email verification required) |
| `/workspace-selector` | WorkspaceSelector | AuthGuard                                  |

### 1.3 Student Routes (`/app/student/*`)

Wrapped in `RoleGuard allowedRoles={["student"]}`.

| Route                            | Component    |  S  |  T  |  A  | Notes                   |
| -------------------------------- | ------------ | :-: | :-: | :-: | ----------------------- |
| `/app/student`                   | Dashboard    |  x  |     |     | Index redirect          |
| `/app/student/dashboard`         | Dashboard    |  x  |     |     |                         |
| `/app/student/courses`           | LessonViewer |  x  |     |     | Course catalog          |
| `/app/student/courses/:courseId` | LessonViewer |  x  |     |     | + CourseEnrollmentGuard |
| `/app/student/quizzes`           | QuizModule   |  x  |     |     |                         |
| `/app/student/assignments`       | Assignments  |  x  |     |     |                         |

### 1.4 Teacher Routes (`/app/teacher/*`)

Wrapped in `RoleGuard allowedRoles={["teacher"]}`.

| Route                       | Component        |  S  |  T  |  A  | Notes          |
| --------------------------- | ---------------- | :-: | :-: | :-: | -------------- |
| `/app/teacher`              | TeacherDashboard |     |  x  |     | Index redirect |
| `/app/teacher/dashboard`    | TeacherDashboard |     |  x  |     |                |
| `/app/teacher/quiz-manager` | QuizManager      |     |  x  |     |                |
| `/app/teacher/courses`      | Courses          |     |  x  |     |                |

### 1.5 Admin Routes (`/app/admin/*`)

Wrapped in `RoleGuard allowedRoles={["admin"]}`.

| Route                  | Component               |  S  |  T  |  A  | Notes          |
| ---------------------- | ----------------------- | :-: | :-: | :-: | -------------- |
| `/app/admin`           | AdministrationDashboard |     |     |  x  | Index redirect |
| `/app/admin/dashboard` | AdministrationDashboard |     |     |  x  |                |
| `/app/admin/users`     | UserManagement          |     |     |  x  |                |

### 1.6 Teaching Hub Routes (`/teaching/*`)

| Route                            | Component           |  S  |  T  |  A  | Guard                         |
| -------------------------------- | ------------------- | :-: | :-: | :-: | ----------------------------- |
| `/teaching`                      | TeachingHub         |     |  x  |     | RoleRoute "teacher"           |
| `/teaching/courses`              | Courses             |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/course-builder`       | CourseBuilder       |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/quiz-manager`         | QuizManager         |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/question-bank`        | QuestionBankPage    |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/quiz-gradebook`       | QuizGradebook       |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/assignment-gradebook` | AssignmentGradebook |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/course-analytics`     | CourseAnalytics     |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/dashboards`           | Dashboards          |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/teaching/classes`              | ClassManagement     |     |  x  |  x  | RoleRoute ["teacher","admin"] |

### 1.7 Hub Routes

| Route               | Component       |  S  |  T  |  A  | Guard                                   |
| ------------------- | --------------- | :-: | :-: | :-: | --------------------------------------- |
| `/social-hub`       | SocialHub       |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/gamification-hub` | GamificationHub |  x  |     |     | RoleRoute "student"                     |
| `/admin-hub`        | AdminHub        |     |     |  x  | RoleRoute "admin"                       |

### 1.8 Admin Management Routes (`/admin/*`)

| Route                   | Component               |  S  |  T  |  A  | Guard                         |
| ----------------------- | ----------------------- | :-: | :-: | :-: | ----------------------------- |
| `/admin/moderation`     | ModerationDashboard     |     |  x  |  x  | RoleRoute ["teacher","admin"] |
| `/admin/finance`        | FinanceDashboard        |     |     |  x  | RoleRoute "admin"             |
| `/admin/ppdb`           | PPDBDashboard           |     |     |  x  | RoleRoute "admin"             |
| `/admin/administration` | AdministrationDashboard |     |     |  x  | RoleRoute "admin"             |
| `/admin/users`          | UserManagement          |     |     |  x  | RoleRoute "admin"             |
| `/admin/audit`          | AuditDashboard          |     |     |  x  | RoleRoute "admin"             |
| `/admin/analytics`      | AdminAnalyticsDashboard |     |     |  x  | RoleRoute "admin"             |

### 1.9 Shared / Multi-Role Routes

| Route                          | Component         |  S  |  T  |  A  | Guard                                   |
| ------------------------------ | ----------------- | :-: | :-: | :-: | --------------------------------------- |
| `/dashboard`                   | Dashboard         |  x  |     |     | RoleRoute "student"                     |
| `/teacher-dashboard`           | TeacherDashboard  |     |  x  |     | RoleRoute "teacher"                     |
| `/directory`                   | Directory         |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/lesson`                      | LessonViewer      |  x  |     |     | RoleRoute "student"                     |
| `/quiz`                        | QuizModule        |  x  |     |     | RoleRoute "student"                     |
| `/courses`                     | LessonViewer      |  x  |     |     | RoleRoute "student"                     |
| `/courses/:courseId`           | LessonViewer      |  x  |  x  |  x  | RoleRoute all + CourseEnrollmentGuard   |
| `/classes/:classId`            | StudentClassPage  |  x  |     |     | RoleRoute "student"                     |
| `/creator`                     | Creator           |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/grader`                      | SpeedGrader       |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/leaderboard`                 | Leaderboard       |  x  |  x  |     | RoleRoute ["student","teacher"]         |
| `/forum`                       | Forum             |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/profile`                     | Profile           |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/p/:username`                 | PublicProfile     |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/settings`                    | Settings          |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/analytics`                   | Analytics         |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/scan-attendance`             | ScanAttendance    |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/documents`                   | DocumentManager   |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/gradebook`                   | Gradebook         |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/billing`                     | BillingDashboard  |     |     |  x  | RoleRoute "admin"                       |
| `/certificates`                | Certificates      |  x  |     |     | RoleRoute "student"                     |
| `/calendar`                    | Calendar          |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/schedule`                    | Calendar          |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/announcements`               | Announcements     |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/assignments`                 | Assignments       |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/student-progress/:studentId` | StudentProgress   |     |  x  |  x  | RoleRoute ["teacher","admin"]           |
| `/group-assignment`            | GroupAssignment   |  x  |  x  |  x  | RoleRoute ["teacher","student","admin"] |
| `/grades`                      | Grades            |  x  |     |     | RoleRoute ["student"]                   |
| `/attendance`                  | StudentAttendance |  x  |     |     | RoleRoute ["student"]                   |

---

## 2. RPC / SQL Function x Role Permission Matrix

All RPC functions use `SECURITY DEFINER` and enforce `auth.uid() IS NOT NULL` implicitly
via `get_my_tenant_id()` or direct `auth.uid()` calls. Role checks are done inside
the function body using `has_role()` or direct `user_roles` table queries.

### 2.1 Helper Functions (used by RPCs and RLS policies)

| Function                         | Purpose                                         | Callable By                           |
| -------------------------------- | ----------------------------------------------- | ------------------------------------- |
| `get_my_tenant_id()`             | Returns caller's tenant_id from JWT or profiles | Any authenticated user                |
| `has_role(role)`                 | Checks if caller has given role in their tenant | Any authenticated user (returns bool) |
| `is_class_teacher(class_id)`     | Checks if caller is teacher of a class          | Any (returns bool)                    |
| `is_class_member(class_id)`      | Teacher OR enrolled student in class            | Any (returns bool)                    |
| `is_enrolled_in_class(class_id)` | Checks enrollment record                        | Any (returns bool)                    |
| `is_course_creator(course_id)`   | Checks if caller created the course             | Any (returns bool)                    |
| `has_feature(feature)`           | Checks JWT for feature flags                    | Any (returns bool)                    |
| `is_module_enabled(slug)`        | Checks if tenant module is enabled              | Any (returns bool)                    |

### 2.2 Admin-Only RPCs

| Function                                 | Purpose                     | Role Check                                      |
| ---------------------------------------- | --------------------------- | ----------------------------------------------- |
| `admin_activate_user(user_id)`           | Reactivate a suspended user | `has_role('ADMIN')`                             |
| `admin_suspend_user(user_id)`            | Suspend a user account      | `has_role('ADMIN')`                             |
| `admin_assign_role(user_id, role)`       | Assign a role to a user     | `has_role('ADMIN')`                             |
| `admin_create_invitation(email, role)`   | Create tenant invitation    | `has_role('ADMIN')`                             |
| `admin_revoke_invitation(invitation_id)` | Revoke pending invitation   | `has_role('ADMIN')`                             |
| `admin_list_users(...)`                  | Paginated user listing      | `has_role('ADMIN')`                             |
| `admin_list_tenants(...)`                | Paginated tenant listing    | `has_role('ADMIN')`                             |
| `log_admin_action(...)`                  | Write to admin audit log    | `has_role('ADMIN')` (implicit via tenant check) |

### 2.3 Teacher / Admin RPCs

| Function                                   | Purpose                        | Role Check                                     |
| ------------------------------------------ | ------------------------------ | ---------------------------------------------- |
| `create_class(name, ...)`                  | Create a new class             | `has_role('TEACHER') OR has_role('ADMIN')`     |
| `create_question(...)`                     | Add question to question bank  | `has_role('TEACHER') OR has_role('ADMIN')`     |
| `update_question(...)`                     | Edit question bank entry       | `has_role('TEACHER') OR has_role('ADMIN')`     |
| `archive_question(question_id)`            | Archive a question             | tenant_id check (teacher implied)              |
| `add_question_to_quiz(...)`                | Link question bank to quiz     | tenant_id check                                |
| `save_quiz_builder(...)`                   | Create/update quiz via builder | tenant_id match from JWT                       |
| `grade_attempt_question(...)`              | Grade a student's quiz answer  | Admin, class teacher, or course creator        |
| `recalculate_attempt_score(attempt_id)`    | Recompute quiz attempt score   | Called internally by grading RPCs              |
| `get_teacher_analytics(course_id)`         | Course analytics bundle        | JWT role = 'teacher' or 'admin' + tenant match |
| `get_question_difficulty(assignment_id)`   | Item analysis for quiz         | teacher/admin via RLS                          |
| `rpc_publish_course(course_id)`            | Publish a course               | Course creator check                           |
| `rpc_reorder_course_modules(...)`          | Reorder modules                | Course creator check                           |
| `rpc_reorder_module_lessons(...)`          | Reorder lessons                | Module owner check                             |
| `rpc_reorder_lesson_resources(...)`        | Reorder resources              | Lesson owner check                             |
| `v1_get_quiz_results(quiz_id)`             | Quiz results for grading       | teacher via `user_roles` table query           |
| `v1_get_assignment_results(assignment_id)` | Assignment results for grading | teacher via `user_roles` table query           |

### 2.4 Student RPCs

| Function                                  | Purpose                          | Role Check                                   |
| ----------------------------------------- | -------------------------------- | -------------------------------------------- |
| `enroll_student(join_code)`               | Join a class via code            | Any authenticated user (student implied)     |
| `mark_lesson_complete(lesson_id)`         | Mark lesson done, award XP       | Any authenticated user (lesson tenant check) |
| `v1_start_attempt(quiz_id)`               | Start a new quiz attempt         | Any authenticated (student_id = auth.uid())  |
| `v1_start_quiz_attempt(quiz_id, ...)`     | Start quiz (v2, with assignment) | Any authenticated (student_id = auth.uid())  |
| `v1_save_answer(...)`                     | Save a single quiz answer        | Attempt owner (student_id check)             |
| `v1_save_partial_answers(...)`            | Batch save quiz answers          | Attempt owner (student_id check)             |
| `batch_save_answers(...)`                 | Legacy batch save                | Attempt owner check                          |
| `v1_submit_quiz_attempt(attempt_id, ...)` | Submit completed quiz            | Attempt owner (student_id check)             |
| `record_cheating_signal(attempt_id, ...)` | Log suspicious behavior          | Attempt owner check                          |
| `record_quiz_heartbeat(attempt_id)`       | Keep attempt alive               | Attempt owner check                          |
| `get_attempt_detail(attempt_id)`          | Review graded attempt            | Attempt owner or teacher/admin               |

### 2.5 Any Authenticated User RPCs

| Function                                  | Purpose                       | Role Check                 |
| ----------------------------------------- | ----------------------------- | -------------------------- |
| `get_my_classes()`                        | List classes for current user | tenant_id check only       |
| `get_my_roles()`                          | Return caller's roles         | `auth.uid()` only          |
| `get_lesson_viewer_payload(lesson_id)`    | Full lesson data for player   | tenant_id check            |
| `get_student_progress_bundle(student_id)` | Student progress summary      | tenant_id check            |
| `get_tutor_context(...)`                  | AI Tutor context              | tenant_id check            |
| `analytics_health_check()`                | Analytics system status       | No role check (diagnostic) |
| `search_lesson_resources(...)`            | Full-text search lessons      | tenant_id check            |

### 2.6 System / Background RPCs

| Function                            | Purpose                          | Invoked By                          |
| ----------------------------------- | -------------------------------- | ----------------------------------- |
| `refresh_all_course_stats()`        | Refresh all course stats         | pg_cron / admin                     |
| `refresh_course_stats(course_id)`   | Refresh single course stats      | Trigger / RPC                       |
| `refresh_course_analytics_mv()`     | Refresh materialized view        | pg_cron                             |
| `refresh_weekly_leaderboard(...)`   | Recompute weekly leaderboard     | pg_cron                             |
| `recompute_leaderboard(tenant_id)`  | Recompute all-time leaderboard   | Trigger                             |
| `cleanup_stale_quiz_attempts()`     | Expire abandoned attempts        | pg_cron                             |
| `expire_dead_attempt(attempt_id)`   | Mark single attempt expired      | Internal                            |
| `add_user_points(user_id, points)`  | Award XP to a user               | Triggers (enrollment, lesson, quiz) |
| `award_badge_if_qualified(...)`     | Check and award badges           | Triggers                            |
| `update_streak(user_id, tenant_id)` | Update login/activity streak     | Triggers                            |
| `create_activity_event(...)`        | Insert activity event            | Triggers                            |
| `custom_access_token_hook(event)`   | Inject tenant_id + role into JWT | Supabase Auth hook                  |

---

## 3. Database Table x RLS Policy Summary

EduSync has **54 tables with RLS enabled** and **194 RLS policies**.
An `rls_auto_enable` event trigger automatically enables RLS on all new tables.

### 3.1 Tenant Isolation Patterns

Every tenant-scoped table uses one of these patterns in its RLS policies:

| Pattern                                          | Usage                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `tenant_id = get_my_tenant_id()`                 | Primary pattern -- function reads JWT then falls back to profiles |
| `tenant_id::text = (auth.jwt() ->> 'tenant_id')` | Direct JWT read (used in newer policies)                          |
| `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` | Cast variant of the above                                         |

Both patterns resolve to the same tenant. The `get_my_tenant_id()` function is `SECURITY DEFINER`
and checks JWT first, then falls back to the `profiles` table.

### 3.2 Core Table RLS Summary

#### courses

| Operation | Policy                            | Who                                      |
| --------- | --------------------------------- | ---------------------------------------- |
| SELECT    | `courses_select`                  | Same tenant (any role)                   |
| SELECT    | `anyone_read_published_courses`   | Same tenant, status = 'published'        |
| SELECT    | `courses_select_own_tenant_admin` | Teacher / Admin in tenant                |
| INSERT    | `courses_insert`                  | Teacher or Admin                         |
| UPDATE    | `courses_update`                  | Teacher or Admin                         |
| UPDATE    | `courses_update_owner`            | Course creator (created_by = auth.uid()) |
| DELETE    | `courses_delete`                  | Admin only                               |
| DELETE    | `courses_delete_owner`            | Course creator                           |

#### classes

| Operation | Policy           | Who                    |
| --------- | ---------------- | ---------------------- |
| SELECT    | `classes_select` | Same tenant (any role) |
| INSERT    | `classes_insert` | Teacher or Admin       |
| UPDATE    | `classes_update` | Teacher or Admin       |
| DELETE    | `classes_delete` | Admin only             |

#### enrollments

| Operation | Policy               | Who                                     |
| --------- | -------------------- | --------------------------------------- |
| SELECT    | `enrollments_select` | Own enrollment, class teacher, or Admin |
| INSERT    | `enrollments_insert` | Same tenant (any role)                  |

#### course_enrollments

| Operation | Policy                       | Who              |
| --------- | ---------------------------- | ---------------- |
| SELECT    | `enrollments_select_own`     | Own enrollment   |
| SELECT    | `enrollments_select_teacher` | Teacher or Admin |
| INSERT    | `enrollments_insert_admin`   | Admin only       |
| DELETE    | `enrollments_delete_admin`   | Admin only       |

#### user_roles

| Operation | Policy                           | Who                               |
| --------- | -------------------------------- | --------------------------------- |
| SELECT    | `user_roles_select_self`         | Own record (user_id = auth.uid()) |
| SELECT    | `user_roles_select_tenant_admin` | Admin in same tenant              |
| ALL       | `user_roles_admin_manage`        | Admin (full CRUD)                 |

#### profiles

| Operation | Policy                | Who                         |
| --------- | --------------------- | --------------------------- |
| SELECT    | `profiles_select`     | Own profile or same tenant  |
| SELECT    | `users_read_profiles` | Same tenant (authenticated) |
| INSERT    | `profiles_insert`     | Own (id = auth.uid())       |
| INSERT    | `profiles_insert_own` | Own + same tenant           |
| UPDATE    | `profiles_update_own` | Own profile only            |

#### quizzes

| Operation | Policy           | Who                                       |
| --------- | ---------------- | ----------------------------------------- |
| SELECT    | `quizzes_select` | Class member, class teacher, or Admin     |
| INSERT    | `quizzes_insert` | Class teacher or Admin (+ module enabled) |
| UPDATE    | `quizzes_update` | Class teacher or Admin (+ module enabled) |
| DELETE    | `quizzes_delete` | Class teacher or Admin (+ module enabled) |

#### quiz_questions / quiz_options

| Operation            | Policy                                                         | Who |
| -------------------- | -------------------------------------------------------------- | --- |
| SELECT               | Same tenant + quiz owner or class teacher or Admin             |     |
| INSERT/UPDATE/DELETE | Same tenant + quiz owner (teacher) or Admin (+ module enabled) |     |

#### quiz_attempts_v2

| Operation | Policy                           | Who                                    |
| --------- | -------------------------------- | -------------------------------------- |
| SELECT    | `Students access their attempts` | Own attempts (student_id = auth.uid()) |
| SELECT    | `Teachers access quiz attempts`  | Class teacher or course creator        |
| SELECT    | `Admins access quiz attempts`    | Admin                                  |
| INSERT    | `Students create attempts`       | Own (student_id = auth.uid())          |
| UPDATE    | `Admins update quiz attempts`    | Admin                                  |

#### assignments

| Operation | Policy                                  | Who                                         |
| --------- | --------------------------------------- | ------------------------------------------- |
| SELECT    | `assignments_select`                    | Same tenant (any role)                      |
| SELECT    | `enrolled_students_read_assignments_v4` | Students enrolled in class (published only) |
| INSERT    | `assignments_insert`                    | Teacher or Admin                            |
| UPDATE    | `assignments_update`                    | Teacher or Admin                            |

#### assignment_submissions

| Operation | Policy                            | Who                               |
| --------- | --------------------------------- | --------------------------------- |
| SELECT    | `assignment_submissions_select`   | Own submission, Teacher, or Admin |
| INSERT    | `assignment_submissions_insert`   | Own (student_id = auth.uid())     |
| ALL       | `students_manage_own_submissions` | Own submissions                   |
| UPDATE    | `teachers_grade_submissions`      | Class teacher                     |

#### lessons / lesson_resources / course_modules

| Operation | Policy                           | Who |
| --------- | -------------------------------- | --- |
| SELECT    | Same tenant (any role)           |     |
| INSERT    | Course creator, or Teacher/Admin |     |
| UPDATE    | Course creator, or Teacher/Admin |     |
| DELETE    | Course creator, or Admin         |     |

#### lesson_progress

| Operation | Policy                          | Who |
| --------- | ------------------------------- | --- |
| SELECT    | Own progress, Teacher, or Admin |     |
| INSERT    | Own (user_id = auth.uid())      |     |
| UPDATE    | Own (user_id = auth.uid())      |     |

#### discussions

| Operation | Policy                                      | Who |
| --------- | ------------------------------------------- | --- |
| SELECT    | Same tenant                                 |     |
| INSERT    | Author = auth.uid() + same tenant           |     |
| UPDATE    | Author only (own posts); teachers can pin   |     |
| DELETE    | Author, Admin, or teachers in related class |     |

#### announcements

| Operation            | Policy                                          | Who |
| -------------------- | ----------------------------------------------- | --- |
| SELECT               | Students see published; staff see all in tenant |     |
| INSERT/UPDATE/DELETE | Staff (teacher/admin) via user_roles check      |     |

### 3.3 Gamification Tables

| Table                 | SELECT                 | INSERT        | UPDATE        | DELETE |
| --------------------- | ---------------------- | ------------- | ------------- | ------ |
| `user_points`         | Same tenant            | Teacher/Admin | Teacher/Admin | --     |
| `user_badges`         | Same tenant            | Teacher/Admin | --            | --     |
| `user_streaks`        | Own (user_id + tenant) | Trigger       | Trigger       | --     |
| `leaderboards`        | Same tenant            | Trigger       | Trigger       | --     |
| `leaderboards_weekly` | Same tenant            | Trigger       | Trigger       | --     |
| `badges`              | All (public read)      | --            | --            | --     |

### 3.4 Analytics / Telemetry Tables

| Table                       | SELECT                                  | INSERT                 | Other |
| --------------------------- | --------------------------------------- | ---------------------- | ----- |
| `activity_events`           | Same tenant                             | Triggers               | --    |
| `activity_logs`             | Own or Admin (+ module enabled)         | Own (+ module enabled) | --    |
| `learning_events`           | Own, Teacher, or Admin                  | Own (tenant from JWT)  | --    |
| `course_progress`           | Own, Teacher, or Admin                  | Triggers               | --    |
| `course_stats`              | Teacher or Admin                        | System                 | --    |
| `course_insights`           | Teacher/Admin; Admin can manage         | Admin                  | --    |
| `analytics_audit`           | Admin; Teacher (own or related courses) | System                 | --    |
| `analytics_metrics`         | Admin                                   | System                 | --    |
| `analytics_rate_limits`     | Own; Admin                              | System                 | --    |
| `analytics_circuit_breaker` | Admin                                   | System                 | --    |

### 3.5 AI Tutor Tables

| Table                     | SELECT                                  | INSERT                                      |
| ------------------------- | --------------------------------------- | ------------------------------------------- |
| `ai_tutor_interactions`   | Own (user_id); service_role full access | service_role only (frontend INSERT blocked) |
| `ai_tutor_rate_limits`    | Own (user_id); service_role full access | service_role only                           |
| `ai_tutor_cache`          | Enrolled students in same course        | Service role                                |
| `student_concept_mastery` | Own (student_id + tenant)               | Tenant scoped                               |

### 3.6 Admin-Only Tables

| Table                   | SELECT              | INSERT                                |
| ----------------------- | ------------------- | ------------------------------------- |
| `admin_audit_logs`      | Admin (same tenant) | service_role (INSERT WITH CHECK true) |
| `user_invitations`      | Admin (same tenant) | Admin                                 |
| `quiz_submission_queue` | System              | System                                |

### 3.7 Question Bank Tables

| Table                    | Isolation Pattern                   |
| ------------------------ | ----------------------------------- |
| `question_bank`          | tenant_id = get_my_tenant_id()      |
| `question_options`       | Via question_id FK to question_bank |
| `question_tags`          | Via question_id FK to question_bank |
| `question_stats`         | tenant_id = get_my_tenant_id()      |
| `question_bank_usage`    | tenant_id = get_my_tenant_id()      |
| `ai_generation_metadata` | Via question_id FK to question_bank |

---

## 4. Guard Architecture Summary
