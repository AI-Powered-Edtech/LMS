# EduSync LMS — Analytics System

Teacher analytics gives instructors a real-time view of student engagement, progress, and struggle indicators.

## Architecture

```
Quiz/Lesson Activity
    → lesson_progress / quiz_attempts
    → Triggers: recompute_course_progress
    → course_progress (per-student, per-course)
    → refresh_course_stats() RPC
    → course_stats (pre-aggregated)
    → get_teacher_analytics() RPC
    → Teacher Dashboard (/#/analytics)
```

## Teacher Analytics Dashboard

**Route:** `/#/analytics`

**Access:** Teacher and Admin roles only.

**Data source:** `get_teacher_analytics(p_course_id UUID, p_limit INT DEFAULT 50, p_cursor_student_id UUID DEFAULT NULL)`

Returns paginated JSON with per-student metrics:
- `student_id`, `student_name`
- `completion_pct` — course completion percentage
- `struggle_score` — 0–11 composite difficulty score
- `time_spent_minutes` — total learning time
- `last_active` — last lesson access date
- `quiz_avg_score` — average quiz score

**Frontend:** `src/pages/Analytics.tsx` (using `src/features/analytics/`)

## Engagement Segments

Students are classified into 4 engagement segments based on activity and struggle signals:

| Segment | Label (Indonesian) | Criteria |
|---------|--------------------|---------|
| 1 | Aktif | High activity, low struggle |
| 2 | Berkembang | Moderate activity, improving |
| 3 | Perlu Perhatian | High struggle score |
| 4 | Pasif | Low/no activity |

**Source:** `817_engagement_scoring.sql`

## Struggle Detection

`struggle_score` (0–11) is a composite metric combining:
- Quiz failure rate (retries without improvement)
- Low lesson completion signals
- Long inactivity periods
- Negative AI Tutor interaction patterns

**Source:** `814_struggle_detection.sql`, `src/features/struggle/`

Alerts for at-risk students are surfaced via `get_at_risk_students()` and `get_struggle_alerts()` RPCs.

## pg_cron Refresh Jobs

`course_stats` is refreshed on two triggers:
1. **On-demand:** `refresh_course_stats(p_course_id)` called after significant events
2. **Scheduled:** `refresh-all-course-stats` pg_cron job runs periodically

`refresh_course_stats()` uses an advisory lock and retry logic to prevent concurrent refresh races.

## Advanced Analytics RPCs

| RPC | Purpose |
|-----|---------|
| `get_engagement_summary(p_course_id)` | Aggregate engagement metrics |
| `get_engagement_trend(p_course_id, p_days)` | Trend over time |
| `get_retention_matrix(p_course_id)` | Cohort retention grid |
| `get_funnel_results(p_funnel_id)` | Funnel completion rates |
| `get_learning_paths(p_course_id)` | Common learning paths |
| `get_prediction_summary(p_course_id)` | Predictive at-risk alerts |
| `analytics_health_check()` | Analytics engine health status |

## Per-Course Analytics

**Route:** `/#/teaching/course-analytics`

**Component:** `src/pages/CourseAnalytics.tsx`

Shows per-course drill-down with module completion rates and time-on-task.

## Key Tables

| Table | Purpose |
|-------|---------|
| `course_stats` | Pre-aggregated per-course analytics |
| `course_progress` | Per-student, per-course progress |
| `lesson_progress` | Per-lesson completion records |
| `student_lesson_signals` | Engagement signals per lesson |
| `aggregation_state` | Watermarks for incremental jobs |
| `learning_events` | AI Tutor interaction log |

## SQL Gotchas for Analytics Queries

- Use `course_modules` table (not `modules`)
- Use `status = 'published'` (not `is_published` — that column does not exist)
- `course_modules."order"` and `lessons."order"` must be quoted (reserved word)
- `enrollments.user_id` (not `student_id`)
- `student_lesson_signals`: use `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
- Role check in analytics RPCs: use `user_roles` table directly, not `has_role()` (which fails when JWT is missing tenant claim)

## Migrations

| Range | Purpose |
|-------|---------|
| 009–038 | Core analytics engine, RLS, pg_cron, health checks |
| 810–820 | Advanced analytics: aggregation, engagement, cohort, funnel, path, predictive, struggle |
| 830–835 | Bug fixes to `get_teacher_analytics` and `refresh_course_stats` |
