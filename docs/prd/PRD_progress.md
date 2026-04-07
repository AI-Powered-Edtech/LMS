# PRD — Progress Tracking System

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/progress/`

---

## 1. Problem Statement

Siswa dan guru membutuhkan visibility real-time terhadap **learning progress** di setiap course dan module. Progress tracking yang baik menjawab pertanyaan fundamental:

- **Siswa:** "Berapa persen saya sudah selesai course ini? Kapan saya bisa selesai?"
- **Guru:** "Mana siswa yang tertinggal? Siapa yang sudah selesai module pertama?"
- **Admin:** "Berapa banyak siswa yang complete course sebelum deadline?"

Masalah saat ini:

1. **No visibility** — Tidak ada dashboard yang menunjukkan progress per course/module
2. **Manual tracking** — Guru cek satu-per-satu dari spreadsheet; tidak scalable untuk 100+ siswa
3. **Incomplete signals** — Sistem cuma tahu "siswa login" tetapi tidak tahu "siswa belajar 5 lessons hari ini"
4. **No completion timeline** — Siswa tidak tahu kapan mereka bisa lulus course (berapa lesson lagi, berapa hari)

Kompetitor (Khan Academy, Duolingo) menunjukkan progress bar yang clear dengan:

- Overall course progress (%)
- Per-module progress (%)
- Estimated time to completion
- Momentum badge ("on pace to complete 2 days early")

EduSync harus deliver **transparent, event-driven progress tracking** yang:

1. **Auto-compute** — Berdasarkan lesson completion, quiz scores, assignment submission
2. **Real-time update** — Reflect dalam 2 detik (tidak perlu refresh manual)
3. **Actionable insights** — Guru tahu "15 siswa belum mulai module 2"; siswa tahu "45 menit lagi selesai course"
4. **Mobile-friendly** — Progress bar pada dashboard, responsive

Tanpa progress tracking yang solid, engagement turun karena siswa tidak merasa progressing, dan guru blind terhadap bottlenecks.

---

## 2. Goals

1. **Achieve 85% of Students Track Own Progress Weekly** — Siswa check progress dashboard ≥1x/minggu via `progress_dashboard` page views
2. **Enable Teacher Intervention** — Guru identify struggling/lagging students in <5 detik per course (via progress view, filter by "not started module X")
3. **Compute Accurate Progress** — Per-course, per-module, per-lesson progress within 2 seconds of last user action (event-driven, not batch)
4. **Increase Assignment Completion Rate to 75%** — Clear progress visibility reduces procrastination; target completion deadline-aware
5. **Deliver Mobile-Friendly Dashboards** — 100% of progress components responsive (tablet = 90% features, phone = 80%)

---

## 3. Non-Goals

1. **Predictive completion date (ML-based ETA)** — Out of scope. Analyze velocity patterns first. Roadmap Q2 2026.
2. **Per-assignment time estimates** — Out of scope v1. Teachers can define in future. Complexity around variability.
3. **Group progress tracking** — Out of scope. Social feature + pedagogical complexity. Backlog.
4. **Offline progress sync** — Out of scope. Assume online. Offline roadmap Q3.
5. **AI-powered pacing recommendations** — Out of scope. Requires learning analytics framework. Future.
6. **Gamified progress animations** (confetti, progress explosions) — Out of scope. Polish only. Nice-to-have Q2.

---

## 4. User Stories

### Untuk Siswa (Student)

- **As a student**, I want to see my progress on the dashboard: "Course: Math 101 — 65% complete (13/20 lessons done)", so that I understand how far I've come and how much is left.
- **As a student**, I want to see per-module progress: "Module 1: Complete ✓ | Module 2: 50% (5/10 lessons) | Module 3: Not started", so that I know what's next.
- **As a student**, I want to see time-based metrics: "You've spent 8 hours in this course, averaging 1.5 hours/day", so that I understand my engagement level.
- **As a student**, I want to see estimated completion: "At current pace, you'll finish Course X by April 15" (or "You're on pace to finish early!"), so that I can set goals.
- **As a student**, I want a single dashboard that shows all my active courses with progress bars, sorted by "most urgent" or "in progress", so that I know what to prioritize.
- **As a student**, I want to see my latest quiz scores per course (avg score last 3 quizzes), so that I can track learning quality, not just quantity.

### Untuk Guru (Teacher)

- **As a teacher**, I want to see a class-wide progress view: "Of 30 students, 18 completed Module 1, 12 started Module 2, 5 not started", so that I can identify gaps and pace instruction.
- **As a teacher**, I want to view individual student progress: "Student X: 3/5 lessons in Module 1, latest quiz 72%", so that I can provide targeted feedback.
- **As a teacher**, I want to filter students by progress status (not started, in progress, completed, at-risk), so that I can communicate with appropriate groups.
- **As a teacher**, I want to download a progress report (CSV) with all students and their per-module progress, so that I can share with admin or parents.
- **As a teacher**, I want to see time-series progress (e.g., "Student X gained 4 lessons this week"), so that I can celebrate progress or flag decline.

### Untuk Admin Sekolah

- **As an admin**, I want to see school-wide completion stats: "Across all courses, 68% of students completed Module 1 by deadline", so that I can assess curriculum pacing.
- **As an admin**, I want to identify at-risk cohorts (e.g., "Grade 10 Math: 40% below expected progress by day 20"), so that I can allocate support.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                                                                                                                                                                                                                                                                                        | Acceptance Criteria                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Progress Data Model** — Define what "progress" means: per-course (% lessons completed + quiz avg), per-module (% lessons completed), per-lesson (started/in-progress/completed)                                                                                                                                  | Schema: `course_progress(user_id, course_id, total_lessons, completed_lessons, avg_quiz_score, progress_pct, updated_at)`, `module_progress(user_id, module_id, total_lessons, completed_lessons, progress_pct, updated_at)`, `lesson_progress(user_id, lesson_id, started_at, completed_at, time_spent)` |
| 2   | **Event-driven Progress Computation** — When lesson completed, quiz submitted, or assignment submitted, trigger progress update (no batch jobs)                                                                                                                                                                    | On lesson mark-complete event: `INSERT/UPDATE module_progress` and `course_progress`; similarly for quiz/assignment. RPC: `update_progress_on_activity(user_id, lesson_id)` called from lesson completion trigger                                                                                         |
| 3   | **Student Dashboard: Progress Widget** — Display on main dashboard: course list with progress bar, % complete, "X lessons left", sorted by urgency                                                                                                                                                                 | Widget: card per course, showing: Course name, progress bar (0–100%), "15/20 lessons", "4 days left" (if deadline exists), "Latest quiz: 85%"                                                                                                                                                             |
| 4   | **Module-level Progress Bar** — Show per-module progress within course detail page                                                                                                                                                                                                                                 | Route: `/#/app/student/courses/[courseId]`; show section "Modules": list of modules with progress bar for each (X% or Y/Z lessons)                                                                                                                                                                        |
| 5   | **Lesson-level Tracking** — Lessons marked as "started" when first accessed, "completed" when explicitly finished (quiz done + passing, or lesson marked complete by teacher)                                                                                                                                      | `student_lesson_signals` table tracks: `total_time_spent`, `last_accessed_at`, `latest_quiz_score`, `completed_at`; lesson complete = `completed_at IS NOT NULL`                                                                                                                                          |
| 6   | **Quiz Score Integration** — Progress includes quiz performance: avg score per course, trend (are scores improving?)                                                                                                                                                                                               | Per-course: `avg_quiz_score = AVG(quiz_attempts.score)` over last N submissions per student; displayed as "Avg Quiz Score: 78%"                                                                                                                                                                           |
| 7   | **Time-spent Metrics** — Show cumulative time in course (hours:minutes), daily average, pace                                                                                                                                                                                                                       | Computed from `student_lesson_signals.total_time_spent` (in seconds); convert to display: "8h 30m total • 1.5h/day average"                                                                                                                                                                               |
| 8   | **Teacher Class Progress View** — Route `/#/app/teacher/classes/[courseId]/progress`; table with: student name, % complete, module status (e.g., "Completed                                                                                                                                                        | In Progress                                                                                                                                                                                                                                                                                               | Not started"), latest quiz score, last access date | Table columns: Student, Course %, Module 1, Module 2, Module 3, Avg Quiz, Last Access; sort/filter available; pagination for 100+ students |
| 9   | **Teacher Filter/Search** — Filter students by progress status (not started, <25%, 25–75%, >75%, completed), or by module (show only students in "Module 2 progress")                                                                                                                                              | Checkbox filters: "Not started", "<25%", "25-75%", ">75%", "100%"; search by name; multi-select OK                                                                                                                                                                                                        |
| 10  | **Estimated Completion Date** — If student has done 3+ lessons, calculate velocity (lessons/day) and estimate completion: "At this pace, you'll finish Course X by April 10"                                                                                                                                       | Formula: `remaining_lessons / (lessons_completed_total / days_enrolled) = days_to_completion`; display "On pace to complete X days early" or "Behind schedule by X days" (optional, nice-to-have)                                                                                                         |
| 11  | **Progress Update Latency** — Progress reflected within 2 seconds of user action (lesson complete, quiz submit)                                                                                                                                                                                                    | After lesson completion button clicked and confirmed, re-query progress endpoint; assert progress % updated within 2s                                                                                                                                                                                     |
| 12  | **Mobile Responsive Progress Dashboard** — Progress widget and course list responsive on phone (layout: vertical stack, condensed) and tablet (2–3 col grid)                                                                                                                                                       | Test on iPhone SE (375px), iPad (768px); progress bar readable, text not truncated, tap targets ≥44px                                                                                                                                                                                                     |
| 13  | **Dark Mode Support** — All progress UI components support dark mode                                                                                                                                                                                                                                               | Test at `class="dark"` on html; use Tailwind `dark:` variants                                                                                                                                                                                                                                             |
| 14  | **Progress Data Accuracy** — Progress % computed correctly: (completed_lessons / total_lessons) \* 100, excluding locked lessons                                                                                                                                                                                   | Acceptance: Test with sample data; verify formula math; edge case: course with 0 lessons (avoid division by zero)                                                                                                                                                                                         |
| 15  | **Export Progress Report (CSV)** — Teacher can export class progress to CSV: Student name, Course %, Module 1 %, Module 2 %, Avg Quiz, Last Access date                                                                                                                                                            | Given teacher clicks "Export to CSV" on progress view, Then browser downloads `class_progress_[courseId]_[date].csv`                                                                                                                                                                                      |
| 16  | **Database Schema** — Create: `course_progress(user_id, course_id, total_lessons, completed_lessons, total_assignments, completed_assignments, avg_quiz_score, progress_pct, updated_at, tenant_id)`, `module_progress(user_id, module_id, total_lessons, completed_lessons, progress_pct, updated_at, tenant_id)` | All tables: RLS enabled, `tenant_id = get_my_tenant_id()` policy; indexes on `(user_id, course_id)`, `(course_id, progress_pct)` for fast filtering                                                                                                                                                       |

### P1 — Nice to Have

| #   | Requirement                                                                                     | Note                                                |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | **Momentum Badge** — "On pace to finish early!" or "Behind pace, catch up!" visual indicator    | Nice polish; motivational; low priority             |
| 2   | **Detailed Progress Timeline** — Graph of progress over time (X-axis: date, Y-axis: % complete) | Good for teacher insights; backlog Q2               |
| 3   | **Predict time to completion (ML)** — Analyze student velocity, give personalized ETA           | Requires ML framework; Q2 roadmap                   |
| 4   | **Progress Notifications** — "You've completed 50% of Module 1!"                                | Gamification tie-in; backlog                        |
| 5   | **Cohort Comparison** — "You're 10% ahead of class average"                                     | Privacy + motivation concern; needs careful framing |

### P2 — Future Considerations

| #   | Requirement                                                                             | Reason                                       |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **Adaptive learning paths** — Suggest different modules based on progress               | Requires curriculum mapping; V2 architecture |
| 2   | **Catch-up recommendations** — "You're behind. We recommend focusing on Module 2 next." | AI/recommendation system; Q3                 |
| 3   | **Parent progress notifications** — "Your child is 60% through Course X"                | Parent portal prerequisite; future           |
| 4   | **Offline progress sync** — Complete lessons offline, sync when online                  | Infrastructure; Q3 roadmap                   |

---

## 6. Success Metrics

### Leading Indicators (days–weeks)

| Metric                           | Target                                                  | Cara Ukur                                                                                         | Owner       |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| **Dashboard page views**         | 70% of DAU visit progress dashboard weekly              | `SELECT COUNT(*) FROM page_views WHERE page = '/student/dashboard' AND DATE(viewed_at) = TODAY()` | Product     |
| **Progress computation latency** | <2 seconds (p95) after user action                      | Monitor via async job logs: time between lesson_completion event and progress_update insertion    | Engineering |
| **Teacher progress page load**   | <1 second for 100+ students                             | DevTools timing; use pagination/virtual scroll                                                    | Engineering |
| **Quiz score integration**       | 100% of quizzes reflected in progress within 30 seconds | Compare quiz_attempts.submitted_at vs. course_progress.updated_at; max delta = 30s                | Engineering |
| **CSV export success rate**      | 99% of export requests succeed                          | Monitor export job logs; alert on failures                                                        | Engineering |

### Lagging Indicators (weeks–months)

| Metric                                 | Target                                                 | Cara Ukur                                                                | Owner   |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ------- |
| **Course Completion Rate**             | 70% of students complete course (vs. 45% baseline)     | `COUNT(course_progress.progress_pct = 100) / COUNT(enrolled)` per course | Product |
| **Assignment Completion by Deadline**  | 75% of assignments submitted by due date               | `COUNT(submitted before due_at) / COUNT(assigned)`                       | Product |
| **Student Engagement (lessons/week)**  | Avg 3+ lessons/week per student                        | `SUM(completed_lessons) / COUNT(students) / weeks`                       | Product |
| **Teacher Intervention Effectiveness** | 80% of flagged at-risk students improve within 2 weeks | Track students with <25% progress, then re-check week 2; % improving     | Product |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                           | Owner       | Blocking?                                          |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| 1   | Should "progress %" exclude optional/extra lessons, or count all lessons?                                            | Product     | Ya — affects calculation formula                   |
| 2   | When a lesson is unlocked (e.g., parent module completed), should we show it as "locked" in progress or "available"? | UX          | Tidak — default show available                     |
| 3   | Should estimated completion account for student's real time spent, or just lesson count?                             | Product     | Tidak — use lesson count, can refine with velocity |
| 4   | For quiz score in progress, should we count retakes (latest attempt only) or average all attempts?                   | Product     | Tidak — use latest attempt, can change             |
| 5   | Should module progress exclude "locked" modules, or show them as "0% locked"?                                        | Design      | Tidak — show as "locked" or hide; TBD              |
| 6   | Should progress computation be synchronous (blocking) or asynchronous (background job)?                              | Engineering | Ya — affects API latency                           |
| 7   | Do we need student-to-student progress comparison (leaderboard integration)?                                         | Product     | Tidak — focus on self + teacher view for v1        |

---

## 8. Timeline & Phases

**Phase 1: Data Model & Core Computation (Week 1)**

- Define course_progress, module_progress schema
- Implement `update_progress_on_activity()` RPC (called from lesson/quiz/assignment triggers)
- Test idempotency, edge cases (0 lessons, locked modules)

**Phase 2: Student Dashboard Widget & Visualizations (Week 2)**

- Student dashboard: course list with progress bars
- Module-level progress within course detail page
- Time-spent metrics calculation
- Mobile responsive layout

**Phase 3: Teacher Class Progress View & Filtering (Week 3)**

- Teacher progress page with student table
- Filter/search by status, module
- Pagination or virtual scroll for 100+ students
- Export to CSV

**Phase 4: Polish & Edge Cases (Week 4)**

- Estimated completion date calculation
- Dark mode CSS completion
- Mobile testing (phone + tablet)
- Performance optimization (query indexing)
- QA & bugfixes

**Hard Deadline:** End of Q1 2026 (March 31). Beta launch to 3 schools, 50+ students, gather feedback.

---

## 9. Dependensi & Risiko

### Dependensi

1. **Lesson completion triggers** must exist and fire reliably (prerequisite from lesson module)
2. **Quiz attempt submission** must populate student_lesson_signals with `latest_quiz_score` and `completed_at`
3. **Assignment submission** must be trackable via assignment_submissions table
4. **student_lesson_signals table** must be populated with `total_time_spent` and `last_accessed_at` (prerequisite from analytics)
5. **RLS policies** on course/module tables must allow teacher read access to all enrolled students' progress
6. **Courses & modules must exist** with well-defined lesson hierarchy (course → module → lesson)

### Risiko & Mitigasi

| Risiko                                                                                       | Impact | Mitigasi                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Progress computation race condition** (concurrent lesson completion)                       | MEDIUM | Make RPC idempotent: `INSERT INTO course_progress ... ON CONFLICT (user_id, course_id) DO UPDATE SET ...`; use UPSERT pattern                      |
| **Progress % incorrect** (missing lessons, off-by-one errors)                                | HIGH   | Unit test formula with sample data (e.g., 3/10 lessons = 30%); edge case: 0 lessons (return 0% or NULL?); locked lessons excluded from denominator |
| **Performance: progress query slow** for 1000+ enrolled students                             | HIGH   | Index `course_progress(course_id, progress_pct)` for filtering; pagination (50/page); test with real data in staging                               |
| **Estimated completion unreliable** (velocity too noisy, e.g., student inactive then active) | MEDIUM | Only calculate if ≥3 lessons completed; use 7-day rolling average of velocity (smooth out variance); document caveats in UI                        |
| **Quiz score not reflected immediately** (async delay)                                       | MEDIUM | Ensure quiz_attempt trigger updates student_lesson_signals within 100ms; monitor latency in logs; alert if >500ms                                  |
| **Mobile progress widget truncates** (text overflow)                                         | MEDIUM | Test on iPhone SE (375px); ensure progress bar responsive; use abbreviations if needed ("13/20 lessons" not "13 of 20 lessons completed")          |
| **Teacher cannot export progress** (permission denied)                                       | MEDIUM | RLS: teacher must have course.role = 'teacher' or 'admin' to read course_progress; test RLS policies                                               |

### Edge Cases

1. **Student enrolls but never accesses course** — progress_pct = 0%, time_spent = 0; still visible in teacher view (might trigger intervention)
2. **Lesson deleted** — Soft-delete with `deleted_at`; exclude from progress calculation; old progress records preserved
3. **Module reordered** — Progress data stays same (not recomputed); new lesson order visible to students going forward
4. **Course deadline passed** — Progress % frozen at last compute time; teacher can still view final completion %
5. **Multiple courses with same lessons** (shared content) — Each course has independent progress_pct; lesson completion in one course does NOT auto-complete in another (design choice: clarity)

---

## 10. Technical Notes

### Database

```sql
-- course_progress table
CREATE TABLE course_progress (
  user_id UUID NOT NULL REFERENCES auth.users,
  course_id UUID NOT NULL REFERENCES courses,
  total_lessons INT NOT NULL DEFAULT 0,
  completed_lessons INT NOT NULL DEFAULT 0,
  total_assignments INT DEFAULT 0,
  completed_assignments INT DEFAULT 0,
  avg_quiz_score DECIMAL(5, 2),
  progress_pct INT GENERATED ALWAYS AS (
    CASE WHEN total_lessons > 0
      THEN ROUND(100.0 * completed_lessons / total_lessons)
      ELSE 0
    END
  ) STORED,
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID DEFAULT get_my_tenant_id(),
  PRIMARY KEY(user_id, course_id)
);

CREATE INDEX idx_course_progress_tenant_course
  ON course_progress(tenant_id, course_id, progress_pct);

-- module_progress table
CREATE TABLE module_progress (
  user_id UUID NOT NULL REFERENCES auth.users,
  module_id UUID NOT NULL REFERENCES course_modules,
  total_lessons INT NOT NULL DEFAULT 0,
  completed_lessons INT NOT NULL DEFAULT 0,
  progress_pct INT GENERATED ALWAYS AS (
    CASE WHEN total_lessons > 0
      THEN ROUND(100.0 * completed_lessons / total_lessons)
      ELSE 0
    END
  ) STORED,
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID DEFAULT get_my_tenant_id(),
  PRIMARY KEY(user_id, module_id)
);

CREATE INDEX idx_module_progress_tenant_module
  ON module_progress(tenant_id, module_id, progress_pct);
```

### RPC: update_progress_on_activity

```sql
CREATE OR REPLACE FUNCTION update_progress_on_activity(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS void AS $$
DECLARE
  v_course_id UUID;
  v_module_id UUID;
  v_total_lessons INT;
  v_completed_lessons INT;
BEGIN
  -- Get lesson's module and course
  SELECT module_id, course_id INTO v_module_id, v_course_id
  FROM lessons
  WHERE id = p_lesson_id;

  -- Count total/completed lessons in module
  SELECT COUNT(*), COUNT(*) FILTER (WHERE sls.completed_at IS NOT NULL)
  INTO v_total_lessons, v_completed_lessons
  FROM lessons l
  LEFT JOIN student_lesson_signals sls ON l.id = sls.lesson_id AND sls.user_id = p_user_id
  WHERE l.module_id = v_module_id AND l.deleted_at IS NULL;

  -- Upsert module_progress
  INSERT INTO module_progress(user_id, module_id, total_lessons, completed_lessons, updated_at)
  VALUES(p_user_id, v_module_id, v_total_lessons, v_completed_lessons, NOW())
  ON CONFLICT(user_id, module_id) DO UPDATE SET
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    updated_at = NOW();

  -- Count total/completed lessons in course
  SELECT COUNT(*), COUNT(*) FILTER (WHERE sls.completed_at IS NOT NULL)
  INTO v_total_lessons, v_completed_lessons
  FROM lessons l
  LEFT JOIN student_lesson_signals sls ON l.id = sls.lesson_id AND sls.user_id = p_user_id
  WHERE l.course_id = v_course_id AND l.deleted_at IS NULL;

  -- Upsert course_progress (with quiz score calculation)
  INSERT INTO course_progress(user_id, course_id, total_lessons, completed_lessons, avg_quiz_score, updated_at)
  VALUES(
    p_user_id,
    v_course_id,
    v_total_lessons,
    v_completed_lessons,
    (SELECT AVG(score::DECIMAL) FROM quiz_attempts
     WHERE user_id = p_user_id
     AND quiz_id IN (SELECT id FROM quizzes WHERE course_id = v_course_id)
     AND submitted_at >= NOW() - INTERVAL '30 days'),
    NOW()
  )
  ON CONFLICT(user_id, course_id) DO UPDATE SET
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    avg_quiz_score = EXCLUDED.avg_quiz_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Trigger on lesson completion
CREATE TRIGGER trg_lesson_completion_progress
AFTER UPDATE ON student_lesson_signals
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION update_progress_on_activity(NEW.user_id, NEW.lesson_id);
```

---

## 11. Success Criteria for Launch

- [ ] All P0 requirements implemented & tested
- [ ] Progress computation latency <2 seconds (p95)
- [ ] Course progress % formula verified with 10+ test cases
- [ ] Teacher progress view loads <1 second for 500 students
- [ ] CSV export works with 1000+ rows
- [ ] Mobile responsiveness tested on iPhone SE + iPad
- [ ] Dark mode CSS complete
- [ ] 3 beta schools deployed, 100+ students, <3 critical bugs in 7 days
- [ ] Documentation: DATABASE_ARCHITECTURE.md, feature README in src/features/progress/

---

**End of PRD — Progress Tracking System**
