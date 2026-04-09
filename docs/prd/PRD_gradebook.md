# PRD — Gradebook System

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/gradebook/`

---

## 1. Problem Statement

Guru di sekolah Indonesia mengelola ratusan siswa dengan beragam tugas (quiz, assignment) dan harus melacak progress, nilai, dan kehadiran mereka secara real-time. Tools spreadsheet tradisional (Excel, Google Sheets) tidak scalable:

- Manual entry time-consuming, error-prone
- Tidak terintegrasi dengan LMS (data silos)
- Tidak ada visibility ke time-spent, attempt history, atau learning patterns
- Export/reporting memerlukan manual aggregation

Kompetitor seperti Google Classroom menawarkan gradebook sederhana (satu kolom per assignment), tetapi tidak ada:

- Multi-view (quiz vs. assignment; weighted grades)
- SpeedGrader-style in-app grading (perlu keluar dari platform untuk grade essays)
- Export to Excel dengan formatting rapi
- Teacher customization (hide columns, reorder, filters)

EduSync harus deliver **professional-grade gradebook** yang memungkinkan guru:

1. **Real-time tracking** — lihat nilai siswa segera setelah quiz selesai / assignment submitted
2. **Multiple views** — toggle antara quiz-only, assignment-only, atau combined grade
3. **Efficient grading** — SpeedGrader workflow: lihat student name, attempt, timer, prev attempts, grade in-place
4. **Export & reporting** — CSV/Excel untuk parents, admin, atau records
5. **Mobile-friendly** — guru sering grade dari smartphone antara kelas

Tanpa gradebook yang baik, guru akan tetap pakai spreadsheet manual (30% waktu admin terbuang), dan student parents tidak punya visibility ke progress.

---

## 2. Goals

1. **Reduce Teacher Admin Time** — 60% pengurangan waktu grading (dari 2 jam/minggu → 48 menit) via SpeedGrader + auto-graded quizzes
2. **Enable Real-time Parent Transparency** — Parents bisa lihat child's grades 24/7 (via exported gradebook or future parent portal)
3. **Support Weighted Grading** — Guru define: Quizzes = 40%, Assignments = 30%, Mid-term = 20%, Attendance = 10%; sistem auto-compute final grade
4. **Deliver Data-driven Insights** — Guru lihat: class average per assignment, low-performing students flagged, most common wrong answer
5. **Ensure Mobile Usability** — 100% of gradebook functions work on tablet (iPad) and smartphone (60%+ of teacher access)

---

## 3. Non-Goals

1. **Parent Portal** — Out of scope. Roadmap Q2 2026. Requires separate auth/RLS.
2. **Peer review grading** — Out of scope. Complexity untuk implement fair evaluation. Future feature.
3. **AI-powered essay grading** — Out of scope. Requires NLP API (cost + latency). Manual grading only.
4. **Predictive grades (ML forecasting)** — Out of scope. Analyze usage patterns first.
5. **Rubric builder UI** — Out of scope v1. Teachers use hardcoded rubrics. Builder tool roadmap Q2.
6. **Grade appeals / student contest** — Out of scope. Pedagogical policy needed.
7. **Integrations (Skyward, Pronote, etc.)** — Out of scope. API standardization future roadmap.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **As a teacher**, I want to see all student grades (quiz + assignment) in one table view, sorted by name or grade, so that I can assess class performance at a glance.
- **As a teacher**, I want to filter grades by assignment type (quizzes only, assignments only, or combined) and by date range, so that I can focus on recent work.
- **As a teacher**, I want to use SpeedGrader mode: open student's work one-by-one, see submission details (text, file, timestamps), grade in-place, move to next student without leaving the page, so that I can grade 50 assignments in 30 min (vs. 90 min in spreadsheet).
- **As a teacher**, I want to see student's previous attempts and grades on the same quiz, so that I can understand if they're improving or struggling.
- **As a teacher**, I want to export grades to CSV (with student name, ID, each assignment as column, final grade), so that I can share with admin, parents, or import to school records.
- **As a teacher**, I want to configure a weighted grading scheme (e.g., Quizzes 40%, Assignments 30%, Midterm 20%, Attendance 10%), so that final grade reflects my pedagogical intent.
- **As a teacher**, I want to mark assignments as "graded" vs. "pending", so that I track grading workflow (50 pending → 40 pending → 0 pending).
- **As a teacher**, I want to add private notes to a student's submission (e.g., "Good effort, but missing section 2"), so that I provide feedback without making it public (yet).

### Untuk Admin Sekolah

- **As an admin**, I want to see aggregate gradebook stats across all teachers (% assignments graded, avg grade per subject, students at-risk), so that I can monitor teaching load and identify struggling students.
- **As an admin**, I want to export all grades for reporting/compliance (e.g., end-of-term report), so that I can generate official records.

### Untuk Siswa (Student) — Optional in v1

- **As a student**, I want to view my own grades on all assignments, so that I understand my progress (read-only).
- **As a student**, I want to see teacher's feedback/notes on my submission, so that I can improve next time.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                                                                                                                                                                                                                                                                                                                           | Acceptance Criteria                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Multi-view Gradebook** — Toggle between "All Grades", "Quiz Only", "Assignment Only" views                                                                                                                                                                                                                                                          | Given teacher on gradebook page, When clicking tab "Quiz Only", Then table updates to show only quiz columns; similarly for "Assignment Only"; "All Grades" shows both.                                                                                |
| 2   | **Gradebook Table** — Rows = students; Columns = assignments (quizzes + assignments) + Final Grade; display score (e.g., "95/100", "not submitted", "pending review")                                                                                                                                                                                 | Table headers: Student Name, Quiz1, Quiz2, Assignment1, Assignment2, ..., Final Grade; rows sorted by name by default (sortable by any column); last column = final grade auto-computed                                                                |
| 3   | **Sort & Filter** — Sort by name, date, grade (ascending/descending); filter by assignment type, date range, submission status (submitted/pending/not submitted)                                                                                                                                                                                      | Given table, When clicking "Grade" column header, Then sort by grade DESC; When selecting filter "Assignment type = Quiz", Then hide assignment columns; Date range picker: default last 30 days, custom range available.                              |
| 4   | **Pagination or Virtual Scrolling** — Gradebook must handle 100–1000 students without lag                                                                                                                                                                                                                                                             | Use React-virtualized or React-window for large tables; paginate every 50 students OR infinite scroll with cursor; max render 50 rows at once                                                                                                          |
| 5   | **SpeedGrader Mode** — Click on a cell (student + assignment), open side panel: show student name, assignment details (text/file), submission timestamp, submission attempt count, previous grade (if retry), grade input field, move to next/prev student buttons                                                                                    | Panel layout: Header (student name, assignment title), Body (submission content, attempt history), Footer (grade input, feedback textarea, Save button, Prev/Next buttons).                                                                            |
| 6   | **Auto-grade Quizzes** — Quiz attempts are auto-graded immediately (correct/incorrect per question, % score computed)                                                                                                                                                                                                                                 | When quiz_attempt submitted, trigger RPC `grade_quiz_attempt(quiz_attempt_id)` → compute score, insert into `assignment_grades(user_id, assignment_id, grade, graded_at)`                                                                              |
| 7   | **Manual Grade Assignment** — Teacher can input grade (0–100 or custom max score) for essay/open-ended assignments                                                                                                                                                                                                                                    | Given SpeedGrader open, When teacher enters "85" in grade field and clicks "Save", Then `INSERT INTO assignment_grades(user_id, assignment_id, grade, graded_at, graded_by)` with teacher_id; cell updates                                             |
| 8   | **Grade Feedback & Notes** — Teacher can attach private notes/feedback to submission (visible only to student + teacher + admin)                                                                                                                                                                                                                      | SpeedGrader: textarea field "Feedback"; `INSERT INTO assignment_feedback(user_id, assignment_id, feedback_text, graded_by)`                                                                                                                            |
| 9   | **Weighted Grading Config** — Admin/teacher define weighting: e.g., Quizzes = 40%, Assignments = 30%, Midterm exam = 20%, Attendance = 10%; final grade auto-computed                                                                                                                                                                                 | Store in `course_grading_config(course_id, category, weight)` (e.g., category = 'quiz', weight = 0.40); Final grade formula: `SUM(category_avg * weight)` per student                                                                                  |
| 10  | **Final Grade Computation** — Auto-calculate per-category average (e.g., avg quiz score, avg assignment score) and weighted final grade                                                                                                                                                                                                               | RPC `compute_final_grades(course_id)`: For each student, compute avg*quiz = AVG(quiz grades), avg_assignment = AVG(assignment grades), avg_attendance = ..., final = (avg_quiz * 0.40) + (avg*assignment * 0.30) + ...; update `student_course_grades` |
| 11  | **CSV Export** — Export gradebook to CSV with columns: StudentName, StudentID, Assignment1, Assignment2, ..., FinalGrade; includes all students + grades as of export time                                                                                                                                                                            | Given teacher clicks "Export to CSV", Then browser downloads `gradebook_[course_id]_[date].csv` with RFC 4180 format (escaped commas, quoted fields)                                                                                                   |
| 12  | **Student List & Enrollment Sync** — Gradebook student list must stay in sync with course enrollments (students added/dropped)                                                                                                                                                                                                                        | On enrollment change (student joins/leaves course), sync `assignment_grades` (auto-populate placeholder rows for existing assignments)                                                                                                                 |
| 13  | **Grade Submission Status Tracking** — Distinguish between: not submitted, submitted (pending grade), graded                                                                                                                                                                                                                                          | Column "Status" shows icon/text: 🔴 Not submitted, 🟡 Pending, 🟢 Graded; also queryable in filter                                                                                                                                                     |
| 14  | **Mobile Responsive** — Gradebook usable on iPad (90% features) and smartphone (core features: view grades, leave feedback, grade 1–2 assignments)                                                                                                                                                                                                    | On tablet (768px width): table horizontal scroll, SpeedGrader modal responsive; on phone: table shows student + 3-5 cols (rest scrollable), SpeedGrader full-screen modal                                                                              |
| 15  | **Dark Mode Support** — All gradebook UI must support dark mode CSS                                                                                                                                                                                                                                                                                   | Test at `class="dark"` on html; use Tailwind `dark:` variants on all components                                                                                                                                                                        |
| 16  | **Database Schema** — Create tables: `assignment_grades(id, user_id, assignment_id, grade, max_score, graded_at, graded_by)`, `assignment_feedback(id, user_id, assignment_id, feedback_text, graded_by, created_at)`, `course_grading_config(id, course_id, category, weight)`, `student_course_grades(user_id, course_id, final_grade, updated_at)` | RLS: `assignment_grades` + `assignment_feedback` accessible only to course teacher/admin and student (own grades only). `student_course_grades` readable by student (own), teacher (all), admin (all)                                                  |

### P1 — Nice to Have

| #   | Requirement                                                                                                            | Note                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | **Bulk Grading** — Select multiple assignments, grade them together (e.g., 10 quizzes as a batch)                      | Low priority for v1; nice-to-have for Q2       |
| 2   | **Grade Scale Customization** — Teacher define custom scale (e.g., A=90–100, B=80–89) instead of hardcoded 90,80,70... | Roadmap Q2; affects reporting                  |
| 3   | **Rubric Grading** — Dropdown for rubric criteria (e.g., "Content: Excellent/Good/Fair/Poor") instead of numeric input | Requires rubric table + complex UX; backlog Q2 |
| 4   | **Late Submission Penalty** — Auto-apply percentage penalty if submitted after deadline                                | Logic complex; best in Q2                      |
| 5   | **Class Average Benchmarks** — Show "This student is X% above/below class average"                                     | Nice insight, low priority                     |
| 6   | **Gradebook Version History** — Audit log of grade changes (who changed, when, old→new)                                | Compliance feature; nice but non-blocking      |

### P2 — Future Considerations

| #   | Requirement                                                                               | Reason                                     |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Parent Portal** — Read-only gradebook for parents                                       | Requires separate auth, RLS; Q2 2026       |
| 2   | **Predictive At-Risk Alerts** — ML-based early warning ("this student on track to fail")  | Analyze usage patterns first; V2           |
| 3   | **Peer Review Workflow** — Students grade each other (teacher reviews)                    | Pedagogical + technical complexity; future |
| 4   | **Integration with SMS alerts** — Send parent SMS: "Your child grade = 65, below passing" | Requires SMS provider; roadmap Q3          |
| 5   | **AI Plagiarism Detection** — Flag suspicious identical submissions                       | Third-party API; cost + privacy concerns   |

---

## 6. Success Metrics

### Leading Indicators (days–weeks)

| Metric                                     | Target                                 | Cara Ukur                                                                                    | Owner       |
| ------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| **Gradebook Page Load Time**               | <800ms (p95)                           | Measure via browser DevTools on real connection                                              | Engineering |
| **SpeedGrader Grade Input → Save Latency** | <500ms                                 | Monitor via event tracking (client-side timer)                                               | Engineering |
| **Teachers using Gradebook weekly**        | 80% of active teachers                 | `SELECT COUNT(DISTINCT teacher_id) FROM gradebook_pageviews WHERE DATE(viewed_at) = TODAY()` | Product     |
| **Assignment Grade Submission Rate**       | 70% graded within 48 hours of deadline | Query `assignment_grades.graded_at` vs. `assignments.due_at`                                 | Product     |
| **CSV Export Clicks**                      | ≥1 per teacher per 2 weeks             | Event tracking (export button click)                                                         | Product     |

### Lagging Indicators (weeks–months)

| Metric                           | Target                                                  | Cara Ukur                                     | Owner   |
| -------------------------------- | ------------------------------------------------------- | --------------------------------------------- | ------- |
| **Teacher Time Savings**         | 60% reduction in grading time (from 2 hr/week → 48 min) | Survey teachers at week 4, measure time spent | Product |
| **Parent Satisfaction (future)** | 85% would recommend to other parents                    | Requires parent portal; future survey         | Product |
| **Grade Accuracy**               | <1% appeal rate (student/parent disputes grade)         | Monitor grade_appeals table (future feature)  | Product |
| **Mobile Adoption**              | 40% of gradebook access via mobile                      | UTM/device tracking in analytics              | Product |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                   | Owner          | Blocking?                           |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------------- |
| 1   | Should final grade be auto-computed in real-time (every new grade) or on-demand (button click)?              | Engineering    | Ya — affects performance, UI design |
| 2   | For "not submitted" assignments, should we show "N/A" or 0 or blank cell?                                    | UX/Design      | Tidak — default blank, can adjust   |
| 3   | Should SpeedGrader show all previous attempts or only last 3?                                                | Product        | Tidak — show last 5 by default      |
| 4   | Should teachers be able to re-grade (change) a student's auto-graded quiz, or is that teacher override only? | Product        | Tidak — allow override, log it      |
| 5   | For weighted grading, who defines weights: teacher or admin?                                                 | Product        | Ya — clarifies schema ownership     |
| 6   | Should CSV export include student ID? (FERPA concern)                                                        | Security/Legal | Ya — impacts export format          |
| 7   | Should assignment grades be visible to all students in class, or only to self?                               | Pedagogy       | Tidak — only self (privacy) for v1  |

---

## 8. Timeline & Phases

**Phase 1: Core Gradebook Table & Filtering (Week 1–2)**

- Database schema: assignment_grades, course_grading_config
- Gradebook query RPC (paginated, with filters)
- Frontend: multi-view table (Quiz/Assignment/All), sorting, filtering
- Mobile responsiveness

**Phase 2: SpeedGrader & Manual Grading (Week 2–3)**

- SpeedGrader side panel UI
- Grade input, feedback textarea
- Prev/Next student navigation
- Auto-save grade → database

**Phase 3: Weighted Grading & Final Grade (Week 3–4)**

- course_grading_config table & UI for weight definition
- compute_final_grades RPC (idempotent)
- Final Grade column in table

**Phase 4: Export & Polish (Week 4)**

- CSV export functionality
- Mobile testing & fixes
- Dark mode CSS
- QA & edge cases

**Hard Deadline:** End of Q1 2026 (March 31). Beta launch to 5 schools, gather feedback.

---

## 9. Dependensi & Risiko

### Dependensi

1. **assignment_grades table schema** must be finalized before frontend dev (determine max_score handling)
2. **Assignment table** must include `due_at` for late-submission logic (even if not in v1)
3. **Lesson/quiz/assignment completion triggers** must populate assignment_grades reliably
4. **student_lesson_signals table** for time-spent insights (optional in v1, good for teacher insights)
5. **RLS policies on assignment_grades** must allow teacher read/write, student read-only (own)

### Risiko & Mitigasi

| Risiko                                                                                | Impact   | Mitigasi                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Grade data corruption** (accidental overwrites, bulk edit mistakes)                 | CRITICAL | Add soft-delete column `deleted_at`; implement audit log `assignment_grade_history`; require confirmation for bulk operations. |
| **Performance: loading 1000-student gradebook slow**                                  | HIGH     | Paginate to 50 students/page; virtual scrolling; index on `(course_id, user_id, assignment_id)`. Measure p95 load time.        |
| **SpeedGrader freezes on large submissions** (videos, large PDFs)                     | MEDIUM   | Don't display full content in-browser; show preview + link to download. Lazy-load content. Set timeout on grade save (30s).    |
| **Teachers accidentally grade same assignment twice** (submit button clicked twice)   | MEDIUM   | Disable button on first click; server-side deduplication: `INSERT ... ON CONFLICT (user_id, assignment_id) DO UPDATE ...`      |
| **Weighted grading rounding issues** (0.40 _ 85.5 + 0.30 _ 90 + ... != 87.65 exactly) | LOW      | Document rounding policy (ROUND to 2 decimals); show formula in UI.                                                            |
| **Mobile virtual scroll breaks on SpeedGrader**                                       | MEDIUM   | Test on real iPad + iPhone; may need custom scroll implementation.                                                             |

### Edge Cases

1. **Student drops course mid-term** — Keep grades in assignment_grades (don't delete); exclude from final grade computation; teacher can manually exclude if needed.
2. **Assignment deleted** — Soft-delete (add deleted_at); keep grades for records; exclude from final grade.
3. **Teacher reassigned** — Grades remain (graded_by field preserves history); new teacher sees all grades.
4. **Weighted config changed mid-term** — Final grade auto-recomputes with new weights; old weights not preserved (design choice: simplicity over history).
5. **Multiple teachers grading same assignment** — RLS allows all course teachers to view/grade; last-write-wins (no concurrency control in v1).

---

## 10. Technical Notes

### Database

```sql
-- assignment_grades table
CREATE TABLE assignment_grades (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  assignment_id UUID NOT NULL REFERENCES assignments,
  grade DECIMAL(5, 2) NOT NULL CHECK (grade >= 0 AND grade <= max_score),
  max_score INT DEFAULT 100,
  graded_at TIMESTAMP DEFAULT NOW(),
  graded_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID DEFAULT get_my_tenant_id(),
  deleted_at TIMESTAMP,
  UNIQUE(user_id, assignment_id, deleted_at IS NULL)
);

-- assignment_feedback
CREATE TABLE assignment_feedback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  assignment_id UUID NOT NULL REFERENCES assignments,
  feedback_text TEXT,
  graded_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID DEFAULT get_my_tenant_id()
);

-- course_grading_config
CREATE TABLE course_grading_config (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses,
  category VARCHAR(50) NOT NULL, -- 'quiz', 'assignment', 'attendance', 'exam', etc.
  weight DECIMAL(3, 2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  tenant_id UUID DEFAULT get_my_tenant_id(),
  UNIQUE(course_id, category)
);

-- student_course_grades
CREATE TABLE student_course_grades (
  user_id UUID,
  course_id UUID,
  final_grade DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID DEFAULT get_my_tenant_id(),
  PRIMARY KEY(user_id, course_id)
);
```

### RPC: compute_final_grades

```sql
CREATE OR REPLACE FUNCTION compute_final_grades(p_course_id UUID)
RETURNS TABLE(user_id UUID, final_grade DECIMAL) AS $$
BEGIN
  RETURN QUERY
  WITH category_avg AS (
    SELECT
      ag.user_id,
      cc.category,
      AVG(ag.grade::DECIMAL / ag.max_score * 100) as avg_score
    FROM assignment_grades ag
    JOIN assignments a ON ag.assignment_id = a.id
    JOIN course_grading_config cc ON a.assignment_type = cc.category AND a.course_id = cc.course_id
    WHERE a.course_id = p_course_id AND ag.deleted_at IS NULL
    GROUP BY ag.user_id, cc.category
  )
  SELECT
    ca.user_id,
    ROUND(SUM(ca.avg_score * cc.weight), 2) as final_grade
  FROM category_avg ca
  JOIN course_grading_config cc ON ca.category = cc.category AND cc.course_id = p_course_id
  GROUP BY ca.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

---

## 11. Success Criteria for Launch

- [ ] All P0 requirements implemented & tested
- [ ] Gradebook table loads <800ms with 500+ students (p95)
- [ ] SpeedGrader save latency <500ms
- [ ] CSV export produces valid RFC 4180 format
- [ ] Mobile: 90% of features work on iPad, 70% on phone
- [ ] Dark mode CSS complete, tested
- [ ] 5 beta schools deployed, 100+ teachers active, <5 critical bugs in 7 days
- [ ] Documentation updated: DATABASE_ARCHITECTURE.md, feature README in src/features/gradebook/

---

**End of PRD — Gradebook System**
