# EduSync — System Interaction Map

## Overview

This document maps every system in EduSync, how they connect, what data flows between them, where failures propagate, and where scale bottlenecks emerge. Use this as the reference before any production scaling decision.

---

## 1. System Inventory

| # | System | Type | Data Store | Realtime | Edge Function |
|---|--------|------|-----------|----------|---------------|
| 1 | Auth | Core | auth.users, profiles | No | No |
| 2 | Tenant | Core | tenants, tenant_modules, user_roles | No | No |
| 3 | Courses | Domain | courses, course_modules, lessons | No | No |
| 4 | Enrollment | Domain | enrollments, course_enrollments, classes | Realtime (classes) | No |
| 5 | Lessons | Domain | lessons, lesson_progress | No | process-progress-events |
| 6 | Quizzes | Domain | quiz_*, quiz_attempts_v2 | No | grade-quiz-attempt, load-quiz-data |
| 7 | AI Tutor | Feature | ai_tutor_* (5 tables) | No | ai-tutor |
| 8 | Analytics | Feature | course_stats, course_progress, analytics_* | No | No |
| 9 | Gamification | Feature | badges, user_badges, user_points, leaderboard_* | No | No |
| 10 | Notifications | Feature | notifications | Realtime (INSERT) | No |
| 11 | Social | Feature | discussions, comments, forum_* | Realtime (comments) | No |
| 12 | Storage | Infra | storage.objects (Supabase Storage) | No | No |
| 13 | Admin | Feature | user_invitations, audit_log, admin_actions | No | No |
| 14 | Cron | Infra | cron.job (pg_cron) | No | No |

---

## 2. System Interaction Matrix

Who calls whom. Read as: **Row system depends on Column system.**

```
             Auth  Tenant  Courses  Enroll  Lessons  Quiz  AI   Analytics  Gamif  Notif  Social  Storage  Admin  Cron
Auth          -      W       -        -       -       -     -      -        -      -       -       -       -      -
Tenant        R      -       -        -       -       -     -      -        -      -       -       -       -      -
Courses       R      R       -        -       -       -     -      -        -      -       -       R       -      -
Enrollment    R      R       R        -       -       -     -      -        -      W       -       -       -      -
Lessons       R      R       R        R       -       -     -      -        -      -       -       R       -      -
Quizzes       R      R       R        R       R       -     -      -        W      W       -       -       -      -
AI Tutor      R      R       R        -       R       R     -      -        -      -       -       -       -      -
Analytics     R      R       R        R       R       R     -      -        -      -       -       -       -      -
Gamification  R      R       -        -       R       R     -      -        -      W       -       -       -      -
Notifications R      R       -        -       -       -     -      -        -      -       -       -       -      -
Social        R      R       R        R       R       -     -      -        -      W       -       -       -      -
Storage       R      R       R        R       -       -     -      -        -      -       -       -       -      -
Admin         R      W       -        -       -       -     -      R        -      W       -       -       -      -
Cron          -      -       R        -       -       -     -      W        -      -       -       -       -      -

R = reads from    W = writes to    - = no interaction
```

### Key Observations

1. **Auth + Tenant are foundational** — everything depends on them. If Auth is down, the entire app is inaccessible
2. **Courses is the central domain** — 8 systems read from it
3. **Notifications is write-heavy** — 5 systems write notifications (Enrollment, Quizzes, Gamification, Social, Admin)
4. **Analytics is read-only** — it reads from 6 systems but writes to none (except its own tables via Cron)
5. **AI Tutor is read-heavy** — reads from Auth, Tenant, Courses, Lessons, Quizzes but writes only to its own tables

---

## 3. Data Flow Diagrams

### 3a. Student Learning Flow (Critical Path)

```
Student Login
│
├─ Auth ──────────────────────────────────────────────┐
│  auth.signInWithPassword()                          │
│  ↓                                                  │
│  AuthContext: session, user, emailVerified           │
│  ↓                                                  │
│  processPendingInvite() → accept_invitation RPC     │
│                                                     │
├─ Tenant ────────────────────────────────────────────┤
│  fetchUserData() → profiles + user_roles + tenants  │
│  ↓                                                  │
│  TenantGuard: activeTenant set                      │
│                                                     │
├─ Course Catalog ────────────────────────────────────┤
│  courseService.list(tenantId)                        │
│  → courses WHERE tenant_id = X AND status = 'published'
│                                                     │
├─ Enrollment ────────────────────────────────────────┤
│  enrollmentService.enroll(classId, studentId)       │
│  → INSERT enrollments + course_enrollments          │
│  → NOTIFY → Notification created                    │
│                                                     │
├─ Lesson Consumption ────────────────────────────────┤
│  LessonViewer loads:                                │
│    1. course_modules WHERE course_id = X            │
│    2. lessons WHERE module_id IN (...)              │
│    3. lesson_progress WHERE user_id = me            │
│  Student reads lesson → marks complete:             │
│    → INSERT/UPDATE lesson_progress                  │
│    → TRIGGER handle_lesson_progress_change()        │
│      → UPDATE course_progress (percentage)          │
│      → Check badge eligibility                      │
│                                                     │
├─ AI Tutor (if enabled) ─────────────────────────────┤
│  Student asks question:                             │
│    → Edge: ai-tutor                                 │
│      → Rate limit check                             │
│      → Cache lookup (pgvector similarity)           │
│      → Context assembly (lesson + progress + quiz)  │
│      → LLM call (Groq)                             │
│      → Response stored in ai_tutor_messages         │
│                                                     │
├─ Quiz Taking ───────────────────────────────────────┤
│  RPC: v1_start_quiz_attempt → quiz_attempts_v2     │
│  Student answers → autosave (debounced)             │
│  RPC: v1_submit_quiz_attempt                        │
│    → Edge: grade-quiz-attempt                       │
│      → Score calculated                             │
│      → quiz_attempts_v2 updated                     │
│      → Points awarded → user_points                 │
│      → Badge check → user_badges                    │
│      → Notification → teacher notified              │
│                                                     │
└─ Progress Dashboard ────────────────────────────────┘
   course_progress: percentage, completed_lessons
   lesson_progress: per-lesson status
   quiz_attempts: scores, passed/failed
   user_badges: achievements
   user_points: gamification score
```

### 3b. Teacher Workflow Flow

```
Teacher Login
│
├─ Dashboard ─────────────────────────────────────────┐
│  RPC: get_teacher_analytics(tenant_id)              │
│  → course_stats (from Cron refresh)                 │
│  → active students, completion rates                │
│                                                     │
├─ Course Builder ────────────────────────────────────┤
│  1. Create course → INSERT courses                  │
│  2. Add modules → INSERT course_modules             │
│  3. Add lessons → INSERT lessons                    │
│  4. Add blocks → INSERT lesson_blocks               │
│  5. Upload files → Storage (course-files bucket)    │
│  6. Publish → UPDATE courses SET status='published' │
│     → course_stats row created                      │
│                                                     │
├─ Quiz Management ───────────────────────────────────┤
│  QuizManager:                                       │
│    Create quiz → quiz_quizzes                       │
│    Add questions → quiz_questions                   │
│    Add options → quiz_options                       │
│    Assign to class → quiz_assignments               │
│  SpeedGrader:                                       │
│    View attempts → quiz_attempts_v2                 │
│    Grade essays → ai-grade-essay edge function      │
│                                                     │
├─ Class Management ──────────────────────────────────┤
│  Create class → INSERT classes                      │
│  Generate join code                                 │
│  View roster → enrollments JOIN profiles            │
│  Track attendance → ScanAttendance                  │
│                                                     │
├─ Gradebook ─────────────────────────────────────────┤
│  QuizGradebook:                                     │
│    quiz_attempts JOIN profiles                      │
│  AssignmentGradebook:                               │
│    assignment_submissions JOIN profiles             │
│  → All filtered by tenant_id + teacher's classes    │
│                                                     │
└─ Student Progress ──────────────────────────────────┘
   RPC: get_student_progress_bundle(student_id)
   → course_progress, lesson_progress, quiz_attempts
   → user_badges, user_points
```

### 3c. Admin Workflow Flow

```
Admin Login
│
├─ Tenant Management ─────────────────────────────────┐
│  admin_list_tenants()                               │
│  → tenants table                                    │
│  Module config:                                     │
│    → tenant_modules (enable/disable features)       │
│    → Frontend: useEnabledModules() reacts           │
│                                                     │
├─ User Management ───────────────────────────────────┤
│  1. Invite user → admin_create_invitation()         │
│     → INSERT user_invitations                       │
│     → Email sent (external)                         │
│  2. User registers → handle_new_user trigger        │
│  3. User logs in → processPendingInvite()           │
│     → accept_invitation() → role assigned           │
│  4. Change role → UPDATE user_roles                 │
│  5. Deactivate → UPDATE profiles SET is_active=false│
│                                                     │
├─ Analytics Dashboard ───────────────────────────────┤
│  AdminAnalyticsDashboard:                           │
│    → course_stats (all courses in tenant)           │
│    → quiz analytics aggregates                      │
│    → student activity metrics                       │
│    → AI tutor usage (ai_tutor_interactions)         │
│                                                     │
├─ Audit & Moderation ───────────────────────────────┤
│  AuditDashboard:                                    │
│    → analytics_audit table                          │
│    → admin_actions log                              │
│  ModerationDashboard:                               │
│    → flagged content review                         │
│                                                     │
└─ Billing & Finance ────────────────────────────────┘
   BillingDashboard:
     → tenant subscription status
   FinanceDashboard:
     → payment tracking
   PPDBDashboard:
     → student admissions
```

### 3d. Background System Flow (Cron + Triggers)

```
┌─────────────────────────────────────────────────────┐
│                    TRIGGERS                          │
│                                                     │
│  on_auth_user_created (auth.users INSERT)           │
│  ├→ handle_new_user()                               │
│  │   → INSERT profiles                              │
│  │   → INSERT user_roles (STUDENT default)          │
│  │                                                  │
│  handle_lesson_progress_change                      │
│  (lesson_progress INSERT/UPDATE)                    │
│  ├→ UPDATE course_progress                          │
│  │   → completed_lessons, percentage                │
│  │   → last_activity_at                             │
│  │                                                  │
│  tr_update_ai_session_stats                         │
│  (ai_tutor_messages INSERT)                         │
│  ├→ UPDATE ai_tutor_sessions                        │
│  │   → message_count, last_message_at               │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    CRON JOBS                         │
│                                                     │
│  refresh-course-stats (every 15 min)                │
│  ├→ _refresh_course_stats_internal()                │
│  │   → For each published course:                   │
│  │     → Count enrollments, completions             │
│  │     → Count quiz attempts, avg scores            │
│  │     → UPSERT course_stats                        │
│  │                                                  │
│  (future) expire-ai-sessions (daily)                │
│  ├→ UPDATE ai_tutor_sessions                        │
│  │   WHERE expires_at < now()                       │
│  │   SET status = 'expired'                         │
│  │                                                  │
│  (future) cleanup-rate-limits (hourly)              │
│  ├→ DELETE FROM ai_tutor_rate_limits                │
│  │   WHERE window_start < now() - interval '1 day'  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Dependency Graph

Systems ordered by dependency depth. **Bottom systems must be stable first.**

```
Layer 0 (Infrastructure):
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Supabase │  │ Storage  │  │ pg_cron  │
  │ Auth     │  │ Buckets  │  │          │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │
Layer 1 (Core):       │              │
  ┌────┴─────┐        │              │
  │  Tenant  │        │              │
  │ (tenant, │        │              │
  │  roles)  │        │              │
  └────┬─────┘        │              │
       │              │              │
Layer 2 (Domain):     │              │
  ┌────┴─────┐        │              │
  │ Courses  ├────────┘              │
  │ (course, │                       │
  │  module, │                       │
  │  lesson) │                       │
  └────┬─────┘                       │
       │                             │
  ┌────┴─────┐  ┌──────────┐        │
  │Enrollment│  │ Storage  │        │
  │(classes, │  │ (files)  │        │
  │ enroll)  │  │          │        │
  └────┬─────┘  └──────────┘        │
       │                             │
Layer 3 (Features):                  │
  ┌────┴─────┐  ┌──────────┐  ┌────┴─────┐
  │ Lessons  │  │ Quizzes  │  │Analytics │
  │(progress,│  │(attempts,│  │(stats,   │
  │ viewer)  │  │ grading) │  │ cron)    │
  └────┬─────┘  └────┬─────┘  └──────────┘
       │              │
Layer 4 (Enrichment):
  ┌────┴─────┐  ┌────┴─────┐  ┌──────────┐
  │ AI Tutor │  │Gamificat.│  │  Social   │
  │(sessions,│  │(badges,  │  │(forum,   │
  │ cache)   │  │ points)  │  │ comments)│
  └──────────┘  └────┬─────┘  └────┬─────┘
                     │              │
Layer 5 (Cross-cutting):           │
  ┌──────────────────┴──────────────┴──┐
  │          Notifications              │
  │   (receives events from all above)  │
  └────────────────────────────────────┘
```

### Stability Rule

**Never let a higher-layer system create a hard dependency on a lower-layer system downward.** Example violations to avoid:

- Courses should NOT import from Quizzes (Layer 2 → Layer 3)
- Lessons should NOT depend on AI Tutor (Layer 3 → Layer 4)
- Auth should NOT know about Notifications (Layer 0 → Layer 5)

**Allowed**: Lower layers emit events. Higher layers subscribe.

---

## 5. Failure Point Analysis

### What happens when each system fails?

| System Failure | Blast Radius | User Impact | Mitigation |
|---------------|-------------|-------------|------------|
| **Auth down** | Total | No one can login | Supabase manages — monitor status page |
| **Tenant fetch fails** | Total | Authenticated users see "No workspace" | Retry in AuthContext + cached activeTenantId in localStorage |
| **Courses query fails** | Major | Empty catalog, no learning | React Query retry (1x). Show cached data if available |
| **lesson_progress trigger fails** | Medium | Progress not updated, but lesson still viewable | Cron reconciliation catches up every 15 min |
| **Quiz grading edge fn fails** | Medium | Score not shown immediately | Quiz attempt saved with status='submitted'. Retry mechanism needed |
| **AI Tutor edge fn fails** | Low | "AI unavailable" message | Graceful degradation — learning continues without AI. Show retry button |
| **AI Tutor LLM provider fails** | Low | Same as above | Fallback provider chain (Groq → OpenAI) |
| **Cron job fails** | Low | course_stats stale (up to 15 min old) | Stale data is acceptable. Add monitoring alert |
| **Notifications realtime fails** | Low | No live notifications, but data persists | Fallback to polling. Notifications visible on page refresh |
| **Storage unavailable** | Low | File uploads/downloads fail | Show error. Files are supplementary, not blocking |
| **pgvector / semantic cache fails** | Negligible | AI Tutor skips cache, calls LLM directly | Cache is optimization only — bypass on error |

### Critical Path (Zero Tolerance for Failure)

```
Auth → Tenant → Courses → Lessons → lesson_progress trigger
```

If ANY of these fail, the core learning experience breaks. These must have:
- Retry logic
- Error boundaries with clear messaging
- Monitoring alerts

### Graceful Degradation Path

```
AI Tutor, Gamification, Social, Analytics, Notifications
```

These can fail without breaking the core experience. Design them to:
- Show "unavailable" state, not crash
- Queue operations for retry
- Never block the critical learning path

---

## 6. Scale Bottleneck Map

### At 1k Students (Current)

No bottlenecks. Everything runs fine on Supabase Free/Pro.

### At 10k Students

| Bottleneck | System | Why | Fix |
|-----------|--------|-----|-----|
| Connection pool | Database | 1000 concurrent connections | Supabase Pro (PgBouncer transaction mode) |
| Bundle size | Frontend | 2MB+ initial load | Lazy loading (Phase 1 of blueprint) |
| Gradebook render | Frontend | 10k rows in DataTable | Virtualization (TanStack Virtual) |

### At 50k Students

| Bottleneck | System | Why | Fix |
|-----------|--------|-----|-----|
| RLS overhead on lesson_progress | Database | 2.5M rows, RLS check per query | Covering indexes, simple equality RLS |
| course_stats refresh | Cron | 15-min refresh too slow with 500+ courses | Batch by 50, stagger execution |
| AI Tutor rate limits table | Database | Hot table — constant reads/writes | Add index on (user_id, window_start), consider Redis |
| Quiz attempts query | Database | 3M+ rows for gradebook views | Materialized view or summary table |
| Notifications table | Database | 50k users × 10 notifs/day = 500k/day | Partition by month, auto-delete >90 days |

### At 100k Students

| Bottleneck | System | Why | Fix |
|-----------|--------|-----|-----|
| Database connections | Database | 10k concurrent, even with pooling | Read replicas for analytics + gradebook |
| lesson_progress writes | Database | High write throughput from concurrent completions | Batch progress events via edge function queue |
| AI Tutor cost | External | 100k students × 5 questions/day × $0.001 = $500/day | Aggressive semantic caching, shorter context, smaller model for simple Q |
| Realtime channels | Supabase | 10k concurrent WebSocket connections | Segment by class, not global. Use polling for non-critical updates |
| Storage bandwidth | Supabase | Video lessons, file downloads | CDN (Supabase Storage uses CDN by default). Consider external video hosting |

### Scale Decision Matrix

```
Students    Database        Frontend        AI Tutor        Infra
─────────────────────────────────────────────────────────────────────
< 1k        Supabase Free   No optimization No optimization Free tier
1k-10k      Supabase Pro    Lazy loading    Groq free tier  Pro tier
10k-50k     + Read replica  + Virtual lists + Cache hits    + Monitoring
50k-100k    + Partitioning  + CDN/SSR       + Cost caps     + Queue system
100k+       + Dedicated DB  + Edge CDN      + Self-hosted   Enterprise
```

---

## 7. Event Flow Architecture (Future: Notification Event System)

Currently notifications are created directly by each system. Target: centralized event bus.

### Current (Direct Writes)

```
Quiz graded → INSERT INTO notifications (hard-coupled)
Enrollment  → INSERT INTO notifications (hard-coupled)
Comment     → INSERT INTO notifications (hard-coupled)
```

Problem: Every system imports notification logic. Adding a new notification type requires changing the source system.

### Target (Event-Driven)

```
┌──────────────────────────────────────────────┐
│              Event Sources                    │
│                                              │
│  Quiz System ──→ quiz.graded                 │
│  Enrollment  ──→ enrollment.created          │
│  Comments    ──→ comment.created             │
│  AI Tutor    ──→ tutor.session_completed     │
│  Badges      ──→ badge.earned                │
│  Admin       ──→ invitation.sent             │
│  Courses     ──→ course.published            │
│  Assignments ──→ assignment.submitted        │
│  Assignments ──→ assignment.graded           │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│           system_events table                │
│                                              │
│  id, tenant_id, event_type, payload (jsonb), │
│  actor_id, entity_type, entity_id,           │
│  created_at                                  │
│                                              │
│  Example:                                    │
│  {                                           │
│    event_type: 'quiz.graded',                │
│    actor_id: '<teacher_id>',                 │
│    entity_type: 'quiz_attempt',              │
│    entity_id: '<attempt_id>',                │
│    payload: {                                │
│      student_id: '...',                      │
│      score: 85,                              │
│      quiz_title: 'Python Basics'             │
│    }                                         │
│  }                                           │
└──────────┬───────────────────────────────────┘
           │ TRIGGER: on_system_event_created
           ▼
┌──────────────────────────────────────────────┐
│        Event Processor (DB Trigger)          │
│                                              │
│  CASE event_type:                            │
│    'quiz.graded' →                           │
│       notify student: "Kuis dinilai: 85"     │
│       notify teacher: "1 kuis selesai"       │
│                                              │
│    'badge.earned' →                          │
│       notify student: "Badge baru!"          │
│                                              │
│    'course.published' →                      │
│       notify all enrolled: "Materi baru"     │
│                                              │
│    'assignment.submitted' →                  │
│       notify teacher: "Tugas masuk"          │
│                                              │
│  → INSERT INTO notifications                 │
│  → pg_notify('notification_channel')         │
└──────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Event log (append-only, partitioned by month)
CREATE TABLE system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_type text NOT NULL,        -- 'quiz.graded', 'badge.earned', etc.
  actor_id uuid,                   -- who triggered it
  entity_type text,                -- 'quiz_attempt', 'enrollment', etc.
  entity_id uuid,                  -- the affected entity
  payload jsonb DEFAULT '{}',      -- event-specific data
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_unprocessed
  ON system_events(created_at)
  WHERE processed = false;

CREATE INDEX idx_events_tenant_type
  ON system_events(tenant_id, event_type, created_at DESC);
```

### Frontend Integration

```typescript
// features/notifications/queries/notificationQueries.ts
export function useNotifications() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  // Polling fallback (every 30s)
  const query = useQuery({
    queryKey: ['notifications', tenantId, user?.id],
    queryFn: () => notificationService.getRecent(tenantId!, user!.id),
    refetchInterval: 30_000,
    enabled: !!tenantId && !!user,
  });

  // Realtime enhancement (instant push)
  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({
          queryKey: ['notifications', tenantId, user.id]
        });
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [user?.id, tenantId]);

  return query;
}
```

### Event Types Registry

| Event Type | Source System | Notification Recipients | Priority |
|-----------|-------------|------------------------|----------|
| `enrollment.created` | Enrollment | Teacher of the class | Normal |
| `lesson.completed` | Lessons | (none — tracked in progress) | Silent |
| `quiz.graded` | Quizzes | Student who took the quiz | High |
| `quiz.submitted` | Quizzes | Teacher of the class | Normal |
| `assignment.submitted` | Assignments | Teacher | Normal |
| `assignment.graded` | Assignments | Student | High |
| `badge.earned` | Gamification | Student | Normal |
| `course.published` | Courses | All enrolled students | Normal |
| `comment.created` | Social | Thread participants | Normal |
| `comment.mentioned` | Social | Mentioned user | High |
| `invitation.sent` | Admin | (external email, not in-app) | High |
| `tutor.budget_warning` | AI Tutor | Tenant admin | High |

---

## 8. Verification Checklist

### Data Flow Verification

```bash
# 1. Verify Auth → Tenant → Course flow
supabase db reset
# Login as student → should see courses in their tenant only

# 2. Verify lesson progress trigger chain
# Complete a lesson → check:
SELECT * FROM lesson_progress WHERE user_id = '<student_id>';
SELECT * FROM course_progress WHERE user_id = '<student_id>';
# percentage should be updated

# 3. Verify quiz → gamification → notification chain
# Submit quiz → check:
SELECT * FROM quiz_attempts_v2 WHERE student_id = '<student_id>';
SELECT * FROM user_points WHERE user_id = '<student_id>';
SELECT * FROM notifications WHERE user_id = '<student_id>';

# 4. Verify cron refresh
SELECT * FROM cron.job WHERE jobname = 'refresh-course-stats';
SELECT * FROM course_stats; -- should have data after 15 min

# 5. Verify AI Tutor flow
# Ask a question in AI Tutor panel → check:
SELECT * FROM ai_tutor_sessions WHERE user_id = '<student_id>';
SELECT * FROM ai_tutor_messages WHERE session_id = '<session_id>';
SELECT * FROM ai_tutor_rate_limits WHERE user_id = '<student_id>';
```

### Dependency Isolation Test

```
For each Layer N system:
  1. Disable/break Layer N+1 system
  2. Verify Layer N still works independently
  3. Verify graceful error in Layer N+1 consumer

Example:
  - Disable AI Tutor edge function
  - Lessons should still work
  - AI Tutor panel shows "unavailable" (not crash)
```

### Scale Simulation

```sql
-- Generate 100k lesson_progress rows to test query performance
INSERT INTO lesson_progress (user_id, lesson_id, tenant_id, completed, progress_percentage)
SELECT
  (SELECT id FROM auth.users ORDER BY random() LIMIT 1),
  (SELECT id FROM lessons ORDER BY random() LIMIT 1),
  '<tenant_id>',
  random() > 0.5,
  (random() * 100)::int
FROM generate_series(1, 100000);

-- Then test critical queries:
EXPLAIN ANALYZE
SELECT * FROM lesson_progress
WHERE user_id = '<id>' AND tenant_id = '<tenant_id>';
-- Target: < 5ms with index
```
