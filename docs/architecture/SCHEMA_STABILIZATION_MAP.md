# EduSync LMS — Schema Stabilization Map

> **Version:** 1.0  
> **Last Updated:** 2026-03-18  
> **Purpose:** Single source of truth for EduSync database architecture  
> **Status:** Pre-squash (130+ migrations)

---

## Table of Contents

1. [Domain Map](#1-domain-map)
2. [Relationship Graph](#2-relationship-graph)
3. [Performance Hotspots](#3-performance-hotspots)
4. [RLS Coverage Matrix](#4-rls-coverage-matrix)
5. [Index Strategy](#5-index-strategy)
6. [Partitioning Strategy](#6-partitioning-strategy)
7. [Migration Squash Plan](#7-migration-squash-plan)

---

## 1. Domain Map

Tables organized by business domain for easier understanding.

### 🔐 Auth Domain (Multi-Tenant Core)

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `auth.users` | Supabase auth | No |
| `profiles` | User profiles with tenant_id | No |
| `user_roles` | Role assignments (STUDENT/TEACHER/ADMIN) | No |
| `tenants` | Tenant (school/organization) registry | No |
| `user_invitations` | Pending invitations | No |

### 📚 Learning Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `courses` | Course definitions | No |
| `modules` | Course modules (chapters) | No |
| `lessons` | Individual lessons | No |
| `lesson_progress` | Per-lesson student progress | No |
| `course_progress` | Per-course student progress | No |
| `lesson_resources` | Videos, PDFs, links | No |
| `lesson_chunks` | Video transcript chunks (RAG) | No |
| `lesson_resource_chunks` | Embedded resources (RAG) | No |

### 🏫 Classroom Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `classes` | Class sections | No |
| `enrollments` | Student class enrollments | No |
| `course_enrollments` | Student course enrollments | No |
| `announcements` | Class/school announcements | No |
| `announcement_rsvps` | Announcement responses | No |
| `class_schedules` | Class schedules | No |

### 📝 Assessment Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `quizzes` | Quiz definitions | No |
| `quiz_questions` | Quiz questions | No |
| `quiz_options` | Question options | No |
| `quiz_attempts` | Legacy attempt tracking | No |
| `quiz_attempts_v2` | **Partitioned** attempt tracking | ✅ Monthly |
| `quiz_attempt_questions_v2` | Per-question answers (partitioned) | ✅ Monthly |
| `quiz_answers` | Student answers | No |
| `assignments` | Assignment definitions | No |
| `assignment_submissions` | Student submissions | No |
| `quiz_answer_history` | Autosave history | No |
| `quiz_submission_queue` | Async write queue | No |
| `quiz_attempt_telemetry` | Behavioral tracking | No |
| `quiz_cheating_events` | Proctoring events | No |

### 📊 Analytics Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `course_stats` | Pre-computed analytics | No |
| `course_insights` | AI-generated insights | No |
| `analytics_metrics` | Prometheus-style metrics | No |
| `analytics_audit` | Access audit trail | No |
| `analytics_rate_limits` | Per-user rate limits | No |
| `analytics_circuit_breaker` | Circuit breaker state | No |

### 🎮 Gamification Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `badges` | Badge definitions | No |
| `user_badges` | Earned badges | No |
| `leaderboards` | Ranking snapshots | No |
| `leaderboards_weekly` | Weekly rankings | No |
| `user_streaks` | Daily streak tracking | No |

### 💬 Social Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `discussions` | Discussion threads | No |
| `discussion_replies` | Reply threads | No |
| `activity_events` | **High-volume** activity log | No |
| `activity_logs` | Admin action logs | No |

### 🤖 AI Tutor Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `ai_tutor_sessions` | Chat sessions | No |
| `ai_tutor_messages` | Chat messages | No |
| `ai_tutor_interactions` | Usage tracking | No |
| `ai_tutor_cache` | Q&A cache (vector) | No |
| `ai_tutor_rate_limits` | Rate limiting | No |
| `ai_tutor_feedback` | User feedback | No |
| `embedding_jobs` | RAG embedding jobs | No |
| `student_concept_mastery` | Concept tracking | No |

### 🏢 Admin Domain

| Table | Purpose | Partitioned |
|-------|---------|-------------|
| `admin_audit_logs` | Admin action audit | No |
| `invoices` | Billing invoices | No |
| `payments` | Payment records | No |

---

## 2. Relationship Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANT (School)                                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
   ┌─────────┐              ┌─────────┐              ┌─────────────┐
   │ COURSES │              │ CLASSES │              │  TENANT    │
   └────┬────┘              └────┬────┘              │  MODULES   │
        │                        │                   └──────┬──────┘
   ┌────┴────┐              ┌────┴────┐                      │
   │ MODULES │              │ENROLL-  │                      │
   └────┬────┘              │MENTS    │                      │
        │                   └────┬────┘                      │
   ┌────┴────┐              ┌────┴────┐                      │
   │ LESSONS │              │   USERS │◄────────────────────┘
   └────┬────┘              └────┬────┘
        │                        │
   ┌────┴────────────────────────┴────┐
   │                                    │
   ▼                                    ▼
┌──────────────────┐          ┌──────────────────┐
│ LESSON_PROGRESS │          │ QUIZ_ATTEMPTS   │
│  (per lesson)   │          │      _V2         │
└────────┬─────────┘          └────────┬─────────┘
         │                            │
         └────────────┬───────────────┘
                      ▼
              ┌──────────────┐
              │ COURSE_      │
              │ PROGRESS     │
              │ (per course) │
              └──────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐
   │   COURSE   │          │ LEADER-     │
   │   STATS    │          │ BOARDS      │
   └─────────────┘          └─────────────┘
```

### Key Relationships

| Parent | Child | Relationship |
|--------|-------|-------------|
| `tenant` | `courses` | 1:N |
| `tenant` | `classes` | 1:N |
| `course` | `modules` | 1:N |
| `module` | `lessons` | 1:N |
| `lesson` | `lesson_progress` | 1:N |
| `course` | `course_progress` | 1:N |
| `course` | `quizzes` | 1:N |
| `quiz` | `quiz_attempts_v2` | 1:N |
| `class` | `enrollments` | 1:N |
| `user` | `enrollments` | 1:N |
| `user` | `user_badges` | 1:N |

---

## 3. Performance Hotspots

Known heavy queries and their mitigations.

| Query Pattern | Table(s) | Issue | Mitigation |
|--------------|----------|-------|------------|
| Student dashboard | `course_progress` | Full scan per student | Covering index (104) |
| Teacher analytics | `course_stats` | On-demand compute | pg_cron refresh (103) |
| Quiz latest attempt | `quiz_attempts_v2` | No index | Composite index (101) |
| Activity feed | `activity_events` | Tenant + user scan | Composite index (101) |
| Lesson completion | `lesson_progress` | Trigger recompute | Incremental trigger (102) |
| Gradebook | `quiz_attempts_v2` | Multiple columns | Covering index (104) |
| Course roster | `enrollments` | Class + status | Composite index (101) |

### Query Patterns to Avoid

```sql
-- ❌ BAD: SELECT * on large tables
SELECT * FROM activity_events;

-- ✅ GOOD: Specific columns with limits
SELECT id, event_type, created_at 
FROM activity_events 
WHERE tenant_id = ? AND user_id = ?
ORDER BY created_at DESC LIMIT 20;

-- ❌ BAD: COUNT(*) in trigger
SELECT COUNT(*) FROM lesson_progress 
WHERE user_id = ? AND completed = true;

-- ✅ GOOD: Incremental counter update
UPDATE course_progress 
SET completed_lessons = completed_lessons + 1 
WHERE user_id = ? AND course_id = ?;
```

---

## 4. RLS Coverage Matrix

| Table | Tenant Scoped | Role Scoped | Notes |
|-------|:-------------:|:-----------:|-------|
| **Auth Domain** |
| `profiles` | ✅ | ❌ | User reads own profile |
| `user_roles` | ✅ | ❌ | Role lookup via function |
| `tenants` | ❌ | admin | Explicit policy (mig 98) |
| `user_invitations` | ✅ | admin | Admin only |
| **Learning Domain** |
| `courses` | ✅ | teacher/admin | Create/update |
| `modules` | ✅ | teacher/admin | |
| `lessons` | ✅ | teacher/admin | |
| `lesson_progress` | ✅ | student | Own + teacher |
| `course_progress` | ✅ | student | Own + teacher |
| **Classroom Domain** |
| `classes` | ✅ | teacher/admin | |
| `enrollments` | ✅ | member | |
| `announcements` | ✅ | member | |
| **Assessment Domain** |
| `quizzes` | ✅ | teacher/admin | |
| `quiz_attempts_v2` | ✅ | student | Own attempts |
| `quiz_attempt_questions_v2` | ✅ | student | Own answers |
| `assignment_submissions` | ✅ | student | Own + teacher |
| **Analytics Domain** |
| `course_stats` | ✅ | teacher/admin | |
| `course_insights` | ✅ | teacher/admin | |
| `analytics_audit` | ✅ | admin/teacher | |
| **Gamification Domain** |
| `user_badges` | ✅ | member | |
| `leaderboards` | ✅ | member | |
| `user_streaks` | ✅ | member | |
| **Social Domain** |
| `activity_events` | ✅ | member | Tenant可见 |
| `discussions` | ✅ | member | |

### Security Functions

```sql
-- Primary security functions (defined in migration 96)
public.has_role(role)        -- Check user's role
public.get_my_tenant_id()    -- Get tenant from JWT
public.get_my_user_id()      -- Get user from JWT
```

---

## 5. Index Strategy

### Composite Indexes (Migration 101)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_enrollments_class_status` | `enrollments` | `(class_id, status)` | Teacher class view |
| `idx_lesson_progress_course_completed` | `lesson_progress` | `(tenant_id, lesson_id, completed)` | Course completion |
| `idx_quiz_attempts_student_latest` | `quiz_attempts_v2` | `(student_id, quiz_id, started_at DESC)` | Latest attempt |
| `idx_activity_events_user_recent` | `activity_events` | `(user_id, created_at DESC)` | User activity |
| `idx_activity_events_tenant_type_time` | `activity_events` | `(tenant_id, event_type, created_at DESC)` | Tenant analytics |
| `idx_user_roles_user_tenant` | `user_roles` | `(user_id, tenant_id)` | Role lookup |
| `idx_courses_tenant_status` | `courses` | `(tenant_id, status)` | Active courses |
| `idx_modules_course_position` | `modules` | `(course_id, position)` | Module ordering |

### Covering Indexes (Migration 104)

| Index | Table | Key Columns | Include Columns |
|-------|-------|-------------|-----------------|
| `idx_quiz_attempts_gradebook_cover` | `quiz_attempts_v2` | `(quiz_id, student_id, status, score, submitted_at)` | `started_at, finished_at, time_spent` |
| `idx_lesson_progress_student_dashboard` | `lesson_progress` | `(user_id, lesson_id)` | `completed, progress_percentage, completed_at` |
| `idx_course_progress_teacher_cover` | `course_progress` | `(course_id, user_id)` | `percentage, completed_lessons, total_lessons, last_activity_at` |
| `idx_enrollments_roster_cover` | `enrollments` | `(class_id, user_id, status)` | `joined_at, last_accessed_at` |

### Future Index Candidates

```sql
-- If activity_events grows > 1M rows
CREATE INDEX idx_activity_events_partition
ON activity_events (tenant_id, created_at DESC)
PARTITION BY RANGE (created_at);

-- If discussions grow large
CREATE INDEX idx_discussions_course_recent
ON discussions (course_id, created_at DESC);
```

---

## 6. Partitioning Strategy

### Current Partitions

| Table | Strategy | Partitions | Retention |
|-------|----------|------------|-----------|
| `quiz_attempts_v2` | Monthly | 3 ahead | Archive after 1 year |
| `quiz_attempt_questions_v2` | Monthly | 3 ahead | Archive with attempts |

### Partition Creation Template

```sql
-- Create future partition
CREATE TABLE quiz_attempts_v2_2026_05
PARTITION OF quiz_attempts_v2
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Or use automated script
-- See migration 76 for auto-partition function
```

### Future Partition Candidates

| Table | Reason | Estimated Size |
|-------|--------|----------------|
| `activity_events` | High write volume | 10M+/year |
| `analytics_audit` | Audit logging | 1M+/year |
| `ai_tutor_interactions` | AI usage | 5M+/year |

---

## 7. Migration Squash Plan

Target: Consolidate 130+ migrations into 10 core files.

### Core Migration Files

| File | Contents | Priority |
|------|----------|----------|
| `core_00_extensions.sql` | Extensions, enums, types | P0 |
| `core_01_auth_schema.sql` | Auth tables, JWT hook, invitations | P0 |
| `core_02_learning_schema.sql` | Courses, modules, lessons, progress | P0 |
| `core_03_classroom_schema.sql` | Classes, enrollments, schedules | P0 |
| `core_04_assessment_schema.sql` | Quizzes, questions, attempts | P0 |
| `core_05_social_analytics.sql` | Discussions, activity, analytics | P0 |
| `core_06_gamification.sql` | Badges, leaderboards, streaks | P1 |
| `core_07_helper_functions.sql` | All RPCs, triggers, security functions | P0 |
| `core_08_rls_policies.sql` | All RLS policies (final state) | P0 |
| `core_09_admin_infrastructure.sql` | Admin tables, audit, billing | P1 |

### Pre-Squash Checklist

- [ ] All migrations 101-104 applied
- [ ] EXPLAIN ANALYZE tests pass
- [ ] No duplicate tables (check `question_bank` vs `quiz_questions`)
- [ ] No orphan indexes
- [ ] RLS coverage verified
- [ ] Tenant isolation tested

---

## Appendix A: Quick Reference

### Key Functions

```sql
-- Security
has_role('TEACHER')          -- Check role
get_my_tenant_id()           -- Get tenant
get_my_user_id()            -- Get current user

-- Progress
recompute_course_progress(user_id, course_id)  -- Full recompute
handle_lesson_progress_change()                -- Trigger (102)

-- Analytics
refresh_course_stats(course_id)    -- Refresh stats
get_teacher_analytics(course_id)  -- Get analytics

-- Quiz
start_quiz_attempt(quiz_id)       -- Begin attempt
submit_quiz_attempt(quiz_id, answers)  -- Submit
```

### Common Queries

```sql
-- Student progress
SELECT * FROM course_progress 
WHERE user_id = auth.uid() AND course_id = ?;

-- Teacher class roster
SELECT e.*, p.first_name, p.last_name 
FROM enrollments e
JOIN profiles p ON p.id = e.user_id
WHERE e.class_id = ? AND e.status = 'ACTIVE';

-- Quiz attempts
SELECT * FROM quiz_attempts_v2 
WHERE student_id = ? AND quiz_id = ?
ORDER BY started_at DESC LIMIT 1;
```

---

## Appendix B: Database Stats (Post-Squash Target)

| Metric | Current | Target |
|--------|---------|--------|
| Total tables | ~60 | ~45 (after dedup) |
| Total indexes | ~80 | ~50 |
| Migration files | ~130 | 10 |
| RLS policies | ~100 | ~60 |

---

*Document maintained by: EduSync Engineering Team*  
*Next review: After migration squash*
