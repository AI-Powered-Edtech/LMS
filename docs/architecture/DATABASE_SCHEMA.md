# EduSync LMS Database Architecture

This document describes the core database architecture for EduSync LMS, a multi-tenant SaaS Learning Management System.

## Principles

*   **Multi-tenant safe**: All core tables must isolate data by `tenant_id`.
*   **Modular**: Designed to support Feature Toggles per tenant.
*   **Scalable**: Uses an event-driven telemetry pipeline for high-volume data (like video progress).

## Content Hierarchy

EduSync uses a deeply nested, polymorphic content structure to support reordering and unlimited content types without database migrations.

```text
Tenant (School)
   │
   └── courses
         │
         └── modules
               │
               └── lessons
                     │
                     └── lesson_resources
```

### 1. `courses`

The main subject or root container.

```sql
create table courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  created_by uuid not null,
  title text not null,
  description text,
  status text default 'draft',
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_courses_tenant on courses(tenant_id);
```

### 2. `modules`

Sections or chapters within a course. Uses `position` for drag-and-drop reordering.

```sql
create table modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_modules_course on modules(course_id);
create index idx_modules_tenant_course on modules(tenant_id, course_id);
```

### 3. `lessons`

Individual learning units within a module.

```sql
create table lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  description text,
  position integer not null,
  estimated_duration_seconds integer,
  is_preview boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lessons_module on lessons(module_id);
create index idx_lessons_tenant_module on lessons(tenant_id, module_id);
```

### 4. `lesson_resources` (Polymorphic Content)

The most flexible layer. A lesson can contain multiple resources (e.g., 1 Video, 1 Article, 1 Quiz). The actual content is stored as JSONB.

```sql
create table lesson_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lesson_id uuid not null references lessons(id) on delete cascade,
  resource_type text not null, -- 'video', 'article', 'quiz', 'pdf', 'assignment'
  title text,
  position integer not null,
  content jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_resources_tenant_lesson on lesson_resources(tenant_id, lesson_id);
```

**Example JSONB Payloads:**
*   **Video**: `{"videoUrl": "...", "duration": 420, "transcript": true}`
*   **Article**: `{"html": "<p>Content</p>"}`
*   **Quiz**: `{"quizId": "uuid-of-quiz"}`

---

## State & Tracking (OLTP)

These tables maintain the current operational state for the Smart Player.

### 5. `lesson_progress`

Tracks a student's progress through a specific lesson.

```sql
create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  lesson_id uuid not null,
  progress_percent numeric default 0,
  last_position_seconds integer,
  completed boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

create index idx_progress_tenant_user on lesson_progress(tenant_id, user_id);
create index idx_lesson_progress_user_completed on lesson_progress(user_id, completed);
```

### 6. `quiz_attempts`

```sql
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  quiz_id uuid not null,
  user_id uuid not null,
  score numeric,
  passed boolean,
  answers jsonb,
  created_at timestamptz default now()
);

create index idx_quiz_attempts_tenant_user on quiz_attempts(tenant_id, user_id);
create index idx_quiz_attempts_student_created on quiz_attempts(student_id, created_at desc);
```

### 7. `assignments`

Stores assignment details for a lesson block.

```sql
create table assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  instructions text,
  max_points integer default 100,
  max_attempts integer default 1,
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_assignments_lesson on assignments(lesson_id);
```

### 8. `assignment_submissions`

Stores student submissions and teacher feedback.

```sql
create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id uuid not null,
  submission_text text,
  file_url text,
  status text default 'submitted', -- 'submitted', 'graded', 'returned'
  score numeric,
  feedback text,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, assignment_id)
);

create index idx_submissions_assignment on assignment_submissions(assignment_id);
create index idx_submissions_user on assignment_submissions(user_id);
create index idx_submissions_assignment_status on assignment_submissions(assignment_id, status);
```

### 9. `course_enrollments`

Crucial for access control and analytics.

```sql
create table course_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'student', -- 'student', 'teacher', etc.
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

create index idx_enrollments_tenant_user on course_enrollments(tenant_id, user_id);
create index idx_enrollments_tenant_course on course_enrollments(tenant_id, course_id);
```

## Pre-Aggregated & Analytics Data (OLAP/Consumer)

These tables maintain pre-computed state for read-heavy dashboards (Student Progress and Teacher Analytics).

### 10. `course_progress`

Aggregated progress per student per course. Updated automatically via triggers when `lesson_progress` changes.

```sql
create table course_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  course_id uuid not null references courses(id) on delete cascade,
  completed_lessons integer default 0,
  total_lessons integer default 0,
  percentage numeric default 0,
  last_activity_at timestamptz default now(),
  unique(user_id, course_id)
);

create index idx_course_progress_tenant_user on course_progress(tenant_id, user_id);
create index idx_course_progress_user_activity on course_progress(user_id, last_activity_at desc);
```

**Related RPCs & Triggers:**
- `recompute_course_progress(student_id_uuid, lesson_id_uuid)`: Invoked via DB trigger `on_lesson_progress_completed`.

### 11. `course_stats`

Pre-aggregated course-level metrics used by the Teacher Analytics Dashboard. Refreshed via periodic jobs.

```sql
create table course_stats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  course_id uuid not null references courses(id) on delete cascade,
  total_enrolled integer default 0,
  active_students integer default 0,
  avg_progress numeric default 0,
  avg_quiz_score numeric default 0,
  lesson_completion_rate jsonb default '[]'::jsonb,
  quiz_pass_rate jsonb default '[]'::jsonb,
  student_ranking jsonb default '{"top": [], "at_risk": []}'::jsonb,
  last_refreshed_at timestamptz default now(),
  unique(tenant_id, course_id)
);

create index idx_course_stats_refresh on course_stats(last_refreshed_at);
```

**Related Analytics RPCs:**
- `refresh_course_stats(p_tenant_id, p_course_id)`: Aggregates data and upserts into `course_stats`. (Hardened: Role/Tenant check)
- `get_teacher_analytics(p_course_id)`: Fetches the pre-aggregated JSON securely for the frontend. (Hardened: Role/Tenant check)
- `get_question_difficulty(p_quiz_id)`: Fetches question correct/incorrect breakdowns for the gradebook. (Hardened: Role/Tenant check)
- `get_student_progress_bundle(p_student_id)`: Consolidates 6 profile/progress queries into 1 high-performance call for the Student Progress page.

---

## Gamification

### 12. `user_points`

Stores accumulated XP per user per tenant.

```sql
-- Existing table (created in production hardening)
-- Key columns: user_id, tenant_id, points
-- Unique constraint: (user_id, tenant_id)
```

### 13. `leaderboards`

Per-class ranking with realtime score sync.

```sql
-- Existing table (migration 40)
-- Key columns: tenant_id, class_id, user_id, score, rank
-- Unique constraint: (tenant_id, class_id, user_id)
```

### Level System

Level is computed from XP and stored on `user_profiles.level`.

```sql
-- Formula: level = floor(points / 400) + 1
-- Function: compute_level(p_points integer) → integer (IMMUTABLE, NULL-safe)
-- Column: user_profiles.level integer DEFAULT 1
```

**Level Tiers:**

| Level | Tier | Color |
|-------|------|-------|
| 1-3 | Pemula | Gray |
| 4-7 | Penjelajah | Blue |
| 8-12 | Cendekia | Purple |
| 13+ | Master | Gold |

**Related Gamification RPCs:**
- `add_user_points(p_user_id, p_points)`: Upserts XP and auto-recomputes `user_profiles.level` (SECURITY DEFINER)
- `recompute_leaderboard(p_tenant_id, p_class_id)`: Recalculates rank using DENSE_RANK
- `compute_level(p_points)`: Pure function, IMMUTABLE, O(1)

**Triggers:**
- `on_user_points_changed`: Syncs `user_points.points` → `leaderboards.score`

---

## Typical Query Pattern (Smart Player)

To load the sidebar and viewer efficiently, we query a module and nest its relations, ensuring order at every level:

```sql
select
  id,
  title,
  lessons (
    id,
    title,
    position,
    lesson_resources (*)
  )
from modules
where course_id = ?
order by position;
```
