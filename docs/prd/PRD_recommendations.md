# PRD — Recommendations System

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/recommendations/`

---

## 1. Problem Statement

Siswa pada platform LMS sering menghadapi **decision paralysis** ketika memilih apa yang harus dipelajari selanjutnya:

- "Saya sudah selesai lesson ini. Apa berikutnya?"
- "Saya dapat nilai 55% di quiz. Apakah saya harus mengulang atau lanjut?"
- "Saya tertinggal 2 module. Mana yang paling penting untuk dikerjakan dulu?"

Masalah pedagogis & engagement:

1. **Low engagement** — Tanpa guidance, siswa stuck/browsing; pindah ke app lain
2. **Suboptimal learning path** — Siswa skip fundamental lessons, lompat ke topik advanced → gagal paham
3. **No remediation signal** — Guru tidak tahu siswa struggled dengan topic X tanpa manually cek quizzes
4. **Low assignment completion** — Siswa tidak tahu assignment yang sudah ditugaskan guru

Kompetitor (Duolingo, Coursera) menggunakan **recommendation engine** untuk:

- Suggest next lesson based on progress & quiz performance
- Prompt review jika quiz score rendah
- Alert assignment deadlines & overdue work
- Personalize learning path per student ability

EduSync harus deliver **smart recommendation system** dengan:

1. **SmartNextButton** — "Next Lesson" button at end of lesson that shows: next lesson in sequence, OR recommended remedial lesson (if quiz <60%), OR assignment due soon
2. **ReviewPrompt** — Toast/modal: "Your latest quiz was 55%. Let's review this topic before moving on"
3. **Assignment Alerts** — Dashboard widget: "3 assignments due in 2 days"
4. **Dashboard Suggestions** — "You're behind in Module 2. Start with Lesson 5?"
5. **Teacher Awareness** — Teacher sees which students need review/remediation (via analytics)

Tanpa recommendation system, student journey adalah **random walk** (ambil lesson asal-asalan), bukan **guided learning path**.

---

## 2. Goals

1. **Increase Next-Lesson Click-through Rate to 80%** — SmartNextButton used by 80% of students after lesson completion (vs. ~40% navigating manually)
2. **Boost Quiz Remediation Completion to 60%** — If student scores <60% on quiz, 60% of students complete review lesson within 24 hours
3. **Reduce Assignment Overdue Rate to <5%** — Clear assignment notifications & due date prompts reduce missed deadlines
4. **Personalize Learning Paths** — Each student gets tailored sequence based on performance (e.g., student with 70% avg quiz → assign harder quizzes; student with 45% → suggest review first)
5. **Improve Quiz Pass Rate by 15%** — With review prompts + remedial lessons, student average quiz score increases 65% → 75%

---

## 3. Non-Goals

1. **ML-powered difficulty prediction** — Out of scope v1. Rules-based recommendations only. ML roadmap Q2 2026.
2. **Peer-based recommendations** ("Students like you studied topic X next")\*\* — Out of scope. Social + privacy concerns. Roadmap Q3.
3. **Adaptive test generation** — Dynamic quiz difficulty based on student performance. Scope creep. Roadmap.
4. **Prerequisite graph enforcement** — Prevent student from accessing lesson unless prerequisites done. Complex. Soft recommendation first.
5. **Cross-subject recommendations** — "Try Math next" (across courses). Out of scope multi-course model.

---

## 4. User Stories

### Untuk Siswa (Student)

- **As a student**, I want to see a "Next Lesson" button at the end of each lesson, so that I know exactly what to study next without having to navigate manually.
- **As a student**, if I score <60% on a quiz, I want a prompt: "Your score was 55%. Would you like to review this topic?", with a "Review Now" button that takes me to a review lesson, so that I can strengthen weak areas.
- **As a student**, I want a dashboard widget showing "You have 2 assignments due in 2 days", so that I don't miss deadlines.
- **As a student**, I want personalized suggestions: "Based on your progress in Module 1, we recommend starting Module 2 with Lesson 5 (Introduction to Equations)", so that I follow an optimal learning path.
- **As a student**, I want a "Catch-up" section on my dashboard: "You're 1 module behind. This lesson takes 10 min and will catch you up", so that I feel motivated to catch up.
- **As a student**, I want to see estimated time for next lesson: "Next: Algebra Basics (12 min)", so that I can plan my study time.

### Untuk Guru (Teacher)

- **As a teacher**, I want to see a list of students who scored <60% on a quiz, so that I can follow up with personalized comments or 1-on-1 support.
- **As a teacher**, I want to see which students haven't started an assignment, so that I can send a reminder or check-in.
- **As a teacher**, I want to see if my students are following the recommended learning path or deviating (e.g., "10 students jumped to Module 3 without finishing Module 2"), so that I can adjust pacing/communication.
- **As a teacher**, I want to override recommended path for a specific student (e.g., "Student X should focus on Topic A instead of following sequence"), so that I can provide individualized support.

### Untuk Admin Sekolah

- **As an admin**, I want to see school-wide metrics: "What % of students are on-pace with recommended paths?", so that I can assess if curriculum sequencing is working.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                                                                                                                                                                                                                      | Acceptance Criteria                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------- |
| 1   | **SmartNextButton Component** — End-of-lesson button that displays next recommended lesson (or action)                                                                                                                                           | Button shows: "Next: [Lesson name] (15 min)" OR "Review: [Topic] — your quiz was 55%" OR "Assignment: [Name] due tomorrow"; click navigates to next content                    |
| 2   | **Next Lesson Logic** — Recommend next lesson based on: (a) sequence (next in module), (b) quiz score (if <60%, recommend review first), (c) assignment deadline (if assignment due <2 days, recommend that)                                     | Priority: (1) assignment due <2 days; (2) if quiz<60%, review lesson; (3) next in sequence. Fallback: if no rules match, show next in module sequence.                         |
| 3   | **ReviewPrompt Modal/Toast** — If quiz score <60%, show modal: "You scored 55% on [Quiz Name]. Strong effort! Let's review [Topic] to strengthen your understanding." with "Review Now" (→ review lesson) and "Continue" (→ next lesson) buttons | Trigger: on quiz_attempt.submitted AND score < 60; modal dismissible; tracking whether student chose Review vs. Continue                                                       |
| 4   | **Assignment Due Alerts Widget** — Dashboard widget: "📋 [X] assignments due in [Y] days" with list; click to expand and show due dates                                                                                                          | Widget on student dashboard; shows up to 3 overdue/due-soon assignments; sorted by due_at ASC; color code: red (overdue), yellow (due today/tomorrow), gray (due >2 days)      |
| 5   | **Catch-up Recommendation** — If student is >25% behind class average progress, dashboard shows: "You're 1.5 modules behind. Start with [recommended lesson]?" with estimated time to catch up                                                   | Calculation: class_avg_progress - student_progress > 25%; recommend lesson that will close gap fastest (estimated from avg time_spent); show "~30 min to catch up in Module X" |
| 6   | **Lesson Time Estimates** — Each lesson shows estimated completion time (e.g., "15 min", "5–10 min")                                                                                                                                             | Store in `lessons.estimated_duration_minutes`; display on lesson start page and in recommendations; if not set, default to historical avg for course                           |
| 7   | **Student On-Path Indicator** — Small status indicator on dashboard: "✓ On pace" or "⚠ Behind pace" based on progress timeline vs. course deadline                                                                                               | If student_progress_pct >= expected_progress_pct (based on days_enrolled / course_duration), show "✓ On pace"; else "⚠ Behind"                                                 |
| 8   | **Teacher Follow-up List** — Route `/#/app/teacher/follow-ups/[courseId]` showing: students with low quiz scores (<60%), missing assignments, not-started modules                                                                                | Table: Student name, issue (e.g., "Quiz: 48%", "Assignment overdue"), action (view submission, send message)                                                                   |
| 9   | **RPC: get_next_recommended_lesson** — Given user_id and lesson_id (current), return next recommended lesson with reasoning                                                                                                                      | Returns: `{ lesson_id, lesson_name, type ("next"                                                                                                                               | "review" | "assignment"), reasoning, estimated_duration }` |
| 10  | **RPC: check_student_on_pace** — Given user_id and course_id, return whether student is on pace with expected progress timeline                                                                                                                  | Returns: `{ on_pace: boolean, expected_progress_pct, actual_progress_pct, days_behind_or_ahead }`                                                                              |
| 11  | **Assignment Overdue Tracking** — Track submitted vs. due date; flag overdue assignments for teacher visibility                                                                                                                                  | Table: `assignment_submissions(user_id, assignment_id, submitted_at, due_at, is_overdue)`; query for teacher dashboard                                                         |
| 12  | **Recommendation Data Schema** — Create: `student_recommendations(id, user_id, recommendation_type, target_lesson_id, reason, created_at, clicked_at, dismissed_at, outcome)` for tracking recommendation clicks & learning                      | Log every recommendation shown (SmartNextButton, ReviewPrompt, assignment alert); track if student clicked/dismissed/completed                                                 |
| 13  | **Mobile Responsive** — SmartNextButton, ReviewPrompt, assignment alerts all work on phone (full width, tap-friendly)                                                                                                                            | Test on iPhone SE; modals readable, buttons ≥44px                                                                                                                              |
| 14  | **Dark Mode Support** — All recommendation UI components (buttons, modals, widgets) support dark mode                                                                                                                                            | Use Tailwind `dark:` variants                                                                                                                                                  |
| 15  | **Recommendation Analytics** — Track: recommendation click-through rate, review lesson completion rate, assignment overdue rate, on-pace %                                                                                                       | Query `student_recommendations`: CTR = clicks / total_shown; review completion = completed_lesson / review_prompted                                                            |

### P1 — Nice to Have

| #   | Requirement                                                                                                                                          | Note                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | **Teacher Override Recommendation** — Button to manually set next lesson for a student (e.g., "For Student X, next should be Lesson 5 not Lesson 3") | Requires teacher interface; backlog Q2                  |
| 2   | **Catch-up Fast-track Path** — Suggest condensed lessons (shorter, summary versions) if student is far behind                                        | Requires separate lesson variants; scope creep; backlog |
| 3   | **Peer Learning Prompt** — "3 students in your class just mastered this topic. Ask them for tips!"                                                   | Social feature; privacy concern; Q3                     |
| 4   | **Retry Assignment Suggestion** — "You can improve your grade by resubmitting. Try again?"                                                           | Pedagogical decision needed; soft suggestion OK for Q2  |
| 5   | **Spaced Repetition Reminder** — "You learned [Topic] 7 days ago. Quick review quiz?"                                                                | Cognitive science + complexity; Q2 roadmap              |

### P2 — Future Considerations

| #   | Requirement                                                                                    | Reason                                                                   |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | **ML-Powered Path Personalization** — Predict optimal learning sequence per student            | Requires ML model, training data, computational overhead. Roadmap Q2/Q3. |
| 2   | **Prerequisite Enforcement** — Lock lesson until prerequisite completed                        | Complex pedagogical rules; soft recommend first (v1), enforce later      |
| 3   | **Cross-course Recommendations** — "Finish Course A first, then start Course B"                | Requires course sequencing logic; future                                 |
| 4   | **Family of Metrics (Propensity)** — Predict likelihood of dropout based on engagement signals | Requires prediction model; infrastructure roadmap Q3                     |

---

## 6. Success Metrics

### Leading Indicators (days–weeks)

| Metric                          | Target                                                | Cara Ukur                                                    | Owner       |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| **SmartNextButton CTR**         | 80% of lesson completions result in next-lesson click | `clicks_next_button / lesson_completions`                    | Product     |
| **ReviewPrompt Show Rate**      | 100% of quizzes with score <60% trigger modal         | `review_prompts_shown / (quiz_submissions WHERE score < 60)` | Engineering |
| **ReviewPrompt Accept Rate**    | 60% of students choose "Review Now"                   | `review_lesson_clicked / review_prompts_shown`               | Product     |
| **Assignment Alert Click Rate** | 70% of students click assignment alerts               | `assignment_alert_clicks / alerts_shown`                     | Product     |
| **Recommendation Latency**      | <200ms to fetch next recommendation                   | Monitor via RPC call timing logs                             | Engineering |

### Lagging Indicators (weeks–months)

| Metric                                | Target                                                                  | Cara Ukur                                                                        | Owner   |
| ------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| **Quiz Pass Rate (≥60%)**             | 75% of students pass quiz on first or second attempt (vs. 65% baseline) | `quiz_attempts with score >= 60% / total_quiz_attempts`                          | Product |
| **Assignment Completion By Deadline** | 80% of assignments submitted by due date (vs. 70% baseline)             | `submitted_before_due / total_assigned` per course                               | Product |
| **Student On-Pace Percentage**        | 75% of students maintain expected progress timeline                     | `on_pace_students / total_students` per course                                   | Product |
| **Lesson Sequence Adherence**         | 70% of students follow recommended path (vs. random walk)               | `students following path / total_students` (from student_recommendations clicks) | Product |
| **Engagement (daily active lessons)** | 3+ lessons/day completed by 50% of DAU                                  | Session telemetry; lesson completion events                                      | Product |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                      | Owner       | Blocking?                                              |
| --- | ----------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| 1   | Should ReviewPrompt appear immediately after quiz submission or on lesson-end page?             | UX          | Ya — affects timing + friction                         |
| 2   | Should recommendation logic be in RPC (server) or frontend? (server = safer, frontend = faster) | Engineering | Ya — affects latency architecture                      |
| 3   | Should we show assignment alerts on dashboard, or send notification (push/email)?               | Product     | Ya — determines scope (v1 = dashboard only, push = Q2) |
| 4   | Should "on pace" account for student's real velocity (adaptive), or fixed timeline?             | Product     | Tidak — fixed timeline in v1, adaptive in Q2           |
| 5   | Should catch-up recommendation be auto-triggered, or only shown if student opens dashboard?     | Product     | Tidak — auto-show on login for lagging students        |
| 6   | Should teacher be able to set custom recommendation rules per class?                            | Product     | Tidak — hardcoded rules in v1, UI builder Q2           |
| 7   | Do we track recommendation clicks for analytics, or is this too privacy-invasive?               | Security    | Ya — check if GDPR/compliance approved                 |

---

## 8. Timeline & Phases

**Phase 1: Core Recommendation Logic (Week 1)**

- Define recommendation rules (next lesson, review, assignment alert)
- Implement RPC: `get_next_recommended_lesson()`, `check_student_on_pace()`
- Create `student_recommendations` table for tracking

**Phase 2: SmartNextButton & ReviewPrompt (Week 2)**

- SmartNextButton component end-of-lesson
- ReviewPrompt modal (score <60%)
- Mobile responsiveness
- Analytics tracking

**Phase 3: Dashboard Widgets & Alerts (Week 2–3)**

- Assignment due alerts widget
- Catch-up recommendation widget
- On-pace indicator
- Dashboard integration

**Phase 4: Teacher Tools & Polish (Week 3–4)**

- Teacher follow-up list (low quiz scores, overdue assignments)
- Export recommendations data
- Dark mode CSS
- QA, performance tuning

**Hard Deadline:** End of Q1 2026 (March 31). Beta launch to 2–3 schools, 50+ students, gather feedback.

---

## 9. Dependensi & Risiko

### Dependensi

1. **Lesson completion events** must fire reliably (prerequisite)
2. **Quiz submission & scoring** must be event-driven
3. **Assignment submissions** must track `submitted_at` and `due_at`
4. **student_lesson_signals** must populate progress & quiz scores (prerequisite from progress module)
5. **Course timeline** (start_date, end_date) must be defined for "on pace" calculation
6. **Lesson estimated_duration** should be set by teacher or auto-calculated from historical data

### Risiko & Mitigasi

| Risiko                                                                     | Impact | Mitigasi                                                                                                                        |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Recommendation logic wrong** (recommend advanced lesson to weak student) | HIGH   | Carefully define rules with pedagogy team; test with real student cohorts in beta; gather teacher feedback.                     |
| **ReviewPrompt overwhelms students** (modal fatigue)                       | MEDIUM | Show only if score <60% AND student hasn't reviewed same topic in last 7 days; track dismissals.                                |
| **Assignment overdue tracking inaccurate**                                 | MEDIUM | Sync assignment_submissions.submitted_at with actual upload timestamp; test with various timezones; document timezone handling. |
| **Performance: RPC slow** (large course, many students)                    | MEDIUM | Optimize RPC: use indexes on (user_id, course_id, lesson_id); cache recommendations for 5 min; test with 1000+ students.        |
| **Recommendation tracking PII exposure** (logs contain student data)       | MEDIUM | Anonymize student_recommendations logs; ensure data complies with GDPR; audit trail encrypted.                                  |
| **Mobile ReviewPrompt blocks content** (modal too large on phone)          | MEDIUM | Test on iPhone SE; ensure modal scrollable; consider slide-in panel instead of centered modal.                                  |

### Edge Cases

1. **Student completes last lesson in course** — SmartNextButton shows: "🎉 You've completed this course! View certificates" or "Start next course?"
2. **No assignments due** — Assignment alert widget hidden or shows "All caught up! ✓"
3. **Student behind but no review lesson exists** — SmartNextButton shows next in sequence (no special remediation available)
4. **Quiz with no passing grade** (e.g., all answers incorrect) — ReviewPrompt still triggers; encourage retry
5. **Multiple quizzes in same lesson** — Use latest quiz attempt score for ReviewPrompt trigger

---

## 10. Technical Notes

### Database

```sql
-- student_recommendations tracking table
CREATE TABLE student_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  course_id UUID NOT NULL REFERENCES courses,
  recommendation_type VARCHAR(50) NOT NULL, -- 'next_lesson', 'review_lesson', 'assignment_alert', 'catch_up', 'on_pace'
  target_lesson_id UUID REFERENCES lessons,
  target_assignment_id UUID REFERENCES assignments,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  shown_at TIMESTAMP,
  clicked_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  completed_at TIMESTAMP,
  outcome VARCHAR(50), -- 'clicked', 'dismissed', 'completed', 'ignored'
  tenant_id UUID DEFAULT get_my_tenant_id()
);

CREATE INDEX idx_student_recommendations_user
  ON student_recommendations(user_id, created_at DESC);
CREATE INDEX idx_student_recommendations_course
  ON student_recommendations(course_id, created_at DESC);
```

### RPC: get_next_recommended_lesson

```sql
CREATE OR REPLACE FUNCTION get_next_recommended_lesson(
  p_user_id UUID,
  p_current_lesson_id UUID
)
RETURNS TABLE(
  lesson_id UUID,
  lesson_name TEXT,
  recommendation_type VARCHAR,
  reasoning TEXT,
  estimated_duration_minutes INT,
  priority INT
) AS $$
DECLARE
  v_course_id UUID;
  v_latest_quiz_score INT;
  v_overdue_assignment_id UUID;
BEGIN
  -- Get course from current lesson
  SELECT course_id INTO v_course_id
  FROM lessons
  WHERE id = p_current_lesson_id;

  -- Check 1: Is there an overdue assignment?
  SELECT id INTO v_overdue_assignment_id
  FROM assignments
  WHERE course_id = v_course_id
    AND due_at < NOW()
    AND id NOT IN (SELECT assignment_id FROM assignment_submissions WHERE user_id = p_user_id)
  LIMIT 1;

  IF v_overdue_assignment_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.title, 'assignment_overdue'::VARCHAR, 'You have an overdue assignment', 0, 1
    FROM assignments a WHERE a.id = v_overdue_assignment_id;
    RETURN;
  END IF;

  -- Check 2: Did student fail latest quiz (score < 60)?
  SELECT score INTO v_latest_quiz_score
  FROM quiz_attempts
  WHERE quiz_id IN (
    SELECT id FROM quizzes WHERE lesson_id IN (
      SELECT id FROM lessons WHERE course_id = v_course_id
    )
  )
    AND user_id = p_user_id
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_latest_quiz_score < 60 THEN
    -- Recommend a review lesson for the same topic
    RETURN QUERY
    SELECT l.id, l.name, 'review_lesson'::VARCHAR,
      CONCAT('Your quiz score was ', v_latest_quiz_score, '%. Let''s review this topic'),
      l.estimated_duration_minutes, 2
    FROM lessons l
    WHERE l.course_id = v_course_id
      AND l.type = 'review'
      AND l.topic = (SELECT topic FROM lessons WHERE id = p_current_lesson_id)
    LIMIT 1;
  END IF;

  -- Check 3: Is there an assignment due within 2 days?
  SELECT id INTO v_overdue_assignment_id
  FROM assignments
  WHERE course_id = v_course_id
    AND due_at BETWEEN NOW() AND NOW() + INTERVAL '2 days'
    AND id NOT IN (SELECT assignment_id FROM assignment_submissions WHERE user_id = p_user_id)
  ORDER BY due_at ASC
  LIMIT 1;

  IF v_overdue_assignment_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.title, 'assignment_due_soon'::VARCHAR, 'You have an assignment due soon', 0, 3
    FROM assignments a WHERE a.id = v_overdue_assignment_id;
    RETURN;
  END IF;

  -- Fallback: Return next lesson in sequence
  RETURN QUERY
  SELECT l.id, l.name, 'next_in_sequence'::VARCHAR, 'Next lesson in sequence',
    l.estimated_duration_minutes, 4
  FROM lessons l
  WHERE l.course_id = v_course_id
    AND l.id > p_current_lesson_id
    AND l.deleted_at IS NULL
  ORDER BY l."order" ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

### RPC: check_student_on_pace

```sql
CREATE OR REPLACE FUNCTION check_student_on_pace(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE(
  on_pace BOOLEAN,
  expected_progress_pct INT,
  actual_progress_pct INT,
  days_behind_or_ahead INT
) AS $$
DECLARE
  v_course_start DATE;
  v_course_end DATE;
  v_days_elapsed INT;
  v_course_duration INT;
  v_expected_pct INT;
  v_actual_pct INT;
  v_days_diff INT;
BEGIN
  -- Get course timeline
  SELECT start_at::DATE, end_at::DATE INTO v_course_start, v_course_end
  FROM courses
  WHERE id = p_course_id;

  v_days_elapsed := (CURRENT_DATE - v_course_start)::INT;
  v_course_duration := (v_course_end - v_course_start)::INT;

  -- Expected progress = (days_elapsed / course_duration) * 100
  v_expected_pct := ROUND((v_days_elapsed::DECIMAL / NULLIF(v_course_duration, 0)) * 100)::INT;

  -- Actual progress from course_progress table
  SELECT progress_pct INTO v_actual_pct
  FROM course_progress
  WHERE user_id = p_user_id AND course_id = p_course_id;

  v_actual_pct := COALESCE(v_actual_pct, 0);
  v_days_diff := v_actual_pct - v_expected_pct; -- Positive = ahead

  RETURN QUERY
  SELECT
    v_actual_pct >= v_expected_pct,
    v_expected_pct,
    v_actual_pct,
    v_days_diff;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

---

## 11. Success Criteria for Launch

- [ ] All P0 requirements implemented & tested
- [ ] SmartNextButton shows correct recommendation (tested with 20+ scenarios)
- [ ] ReviewPrompt triggers only when score <60% (no false positives)
- [ ] RPC latency <200ms for 1000 students
- [ ] Assignment alerts accurate (tracked, due date correct)
- [ ] Teacher follow-up list loads in <1 second
- [ ] Mobile responsive (tested on iPhone SE + iPad)
- [ ] Dark mode CSS complete
- [ ] 2–3 beta schools deployed, 50+ students, <3 critical bugs in 7 days
- [ ] Documentation: DATABASE_ARCHITECTURE.md, feature README in src/features/recommendations/

---

## Appendix A: Recommendation Rules Matrix

| Scenario                 | Trigger                                  | Recommendation                                               | Priority |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------ | -------- |
| Quiz score <60%          | Quiz submitted, score computed           | Show ReviewPrompt; recommend review lesson                   | 1        |
| Assignment overdue       | Periodic check (daily cron)              | Alert on dashboard: "Overdue: [Assignment name]"             | 1        |
| Assignment due <2 days   | Periodic check (daily cron)              | Alert on dashboard: "Due [date]: [Assignment name]"          | 2        |
| Student 25%+ behind pace | Daily on login                           | Show catch-up suggestion with ETA                            | 3        |
| All current tasks done   | Lesson completed, no assignments pending | SmartNextButton: next lesson in sequence                     | 4        |
| First lesson of course   | Course enrollment                        | Welcome prompt: "Start with Lesson 1: [Name] (10 min)"       | 4        |
| Course completed         | Last lesson completed                    | "🎉 Course complete! View certificates or start next course" | 5        |

---

**End of PRD — Recommendations System**
