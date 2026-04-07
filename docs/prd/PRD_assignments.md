# PRD — Assignments (Tugas)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/assignments/`

---

## 1. Problem Statement

Guru Indonesia memerlukan cara **scalable** untuk memberi tugas, kumpulin kerja siswa, dan grade dengan fair & cepat. Manual grading (1-by-1 di kertas atau email) tidak scalable untuk class 30+ siswa. Kompetitor seperti Google Classroom punya Turnitin integration, tapi EduSync perlu tambah **SpeedGrader + AI essay grading** untuk competitive advantage.

Masalah yang dipecahkan:

- **Guru:** Tidak bisa lihat submissions semua siswa in one view; grading slow & inconsistent (no rubric); tidak tahu siapa belum submit.
- **Siswa:** Tidak tahu kapan deadline; feedback generic, tidak actionable.
- **Platform:** Tidak ada structured data tentang student work quality; sulit identify struggling writers.

---

## 2. Goals

1. **Efficient Grading:** SpeedGrader interface—navigate student submissions one-by-one, grade in-context, annotate, give feedback, all in <1 min per student.
2. **Rubric-Based Assessment:** Define rubric (criteria + point ranges); auto-calculate total from criterion scores.
3. **AI Essay Grading:** Optional AI analysis (grammar, structure, plagiarism risk); teacher can accept/override score.
4. **Submission Tracking:** Automatic late penalty if past deadline; track who hasn't submitted; bulk reminder.
5. **Gradebook Sync:** Assignment grades flow to main gradebook; reportable for parent portal (future feature).

---

## 3. Non-Goals

1. **Plagiarism Detection (Turnitin)** — Paid third-party integration; v1 stub RPC for future; AI essay grader not same as plagiarism checker.
2. **Peer Review Workflow** — Students grade each other's work; complex fairness + moderation.
3. **File Virus Scanning** — Scan uploaded submissions for malware; requires antivirus API (Phase 8).
4. **Collaborative Submission** — Group assignments with group grading; add later if demand.
5. **Video/Audio Submission** — Students record video submission; requires storage optimization + playback.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-A1:** Sebagai guru, saya ingin membuat assignment dengan title, description, deadline, max points, rubric, sehingga saya bisa define expectations jelas.
  - Acceptance: Assignment form; rich text description; datetime picker for deadline; point slider; rubric builder (add criteria + points per level).

- **US-A2:** Sebagai guru, saya ingin lihat semua submissions siswa di satu halaman (SpeedGrader) dengan filter by status (not submitted, submitted, graded), sehingga saya bisa grade cepat.
  - Acceptance: SpeedGrader layout: left sidebar (student list), center (submission viewer), right (rubric + grading form); navigate prev/next student; show "3 of 30 graded".

- **US-A3:** Sebagai guru, saya ingin grade submission dengan rubric: pilih level per criterion, auto-calc total points, tulis feedback, sehingga grading consistent.
  - Acceptance: Rubric panel; clickable criterion levels; total points auto-sum; textarea for feedback; save on click (optimistic update).

- **US-A4:** Sebagai guru, saya ingin annotate student submission (text highlight + margin note, atau PDF comment), sehingga saya bisa point out specific issue.
  - Acceptance: Text selection → "Add comment"; comment inline; optional: PDF annotation layer (if submission is PDF).

- **US-A5:** Sebagai guru, saya ingin AI analyze submission untuk essay grading (grammar, structure, plagiarism risk), sehingga saya dapat input untuk manual grading.
  - Acceptance: "AI Analysis" button in SpeedGrader; call RPC `ai-grade-essay(submission_id)`; show results (readability, tone, originality_score); teacher can accept or override.

- **US-A6:** Sebagai guru, saya ingin lihat assignment analytics: submission rate %, avg score, score distribution, time-to-grade histogram, sehingga saya know grading workload & student performance.
  - Acceptance: Dashboard tab with 6 metrics; pie chart (submitted vs not); histogram of scores; avg time-to-grade.

- **US-A7:** Sebagai guru, saya ingin send bulk reminder email to students yang belum submit 2 hari sebelum deadline, sehingga mereka tidak lupa.
  - Acceptance: Scheduled email (cron job atau Edge Function); subject "Reminder: Assignment X due 2 days"; link to assignment; one-click in admin UI.

- **US-A8:** Sebagai guru, saya ingin update deadline atau rubric setelah publish tanpa breaking existing submissions.
  - Acceptance: Edit form for published assignment; show "X students already submitted" warning; update effective for future submissions only; old submissions graded against original rubric (version).

### Untuk Siswa (Student)

- **US-S1:** Sebagai siswa, saya ingin melihat assignment details (description, deadline, max points, rubric, attachment), sehingga saya tahu apa harus dikerjakan.
  - Acceptance: Assignment detail modal/page; clear deadline (with timezone); rubric preview; download attachment button.

- **US-S2:** Sebagai siswa, saya ingin submit assignment (upload file atau paste text), sehingga guru bisa lihat pekerjaan saya.
  - Acceptance: "Submit" button; file uploader (multiple files) or rich text editor; confirmation modal; submit timestamp recorded; can resubmit before deadline.

- **US-S3:** Sebagai siswa, saya ingin lihat submission status: on-time, late (with penalty %), graded, score, feedback, sehingga saya tahu progress.
  - Acceptance: Status badge (Submitted, Graded, Late, Not Submitted); show score & max; show feedback in modal; highlight late penalty if applicable.

- **US-S4:** Sebagai siswa, saya ingin resubmit assignment before deadline kalau saya ingin improve, sehingga saya bisa correct mistakes.
  - Acceptance: "Resubmit" button before deadline; overwrite previous; keep submission history (version 1, 2, etc.); teacher grade latest version.

- **US-S5:** Sebagai siswa, saya ingin melihat rubric dengan score saya per criterion, sehingga saya tahu mana yang kurang.
  - Acceptance: Rubric breakdown after grade released; show my score & max per criterion; feedback text per criterion (if provided).

- **US-S6:** Sebagai siswa, saya ingin lihat teacher annotasi/comment on my submission, sehingga saya bisa learn dari feedback.
  - Acceptance: Inline comments on text submission (highlight + popup); atau PDF comments if PDF; link to full feedback in rubric.

### Untuk Admin Sekolah (Admin)

- **US-A1:** Sebagai admin, saya ingin lihat assignment analytics across all teachers: avg submission rate, avg grading time, identify bottlenecks.
  - Acceptance: Admin dashboard "Assignment Overview"; table: teacher, course, # assignments, avg submission rate, avg grading time; drill-down per assignment.

- **US-A2:** Sebagai admin, saya ingin monitor student performance on assignments: score trends, identify students needing support.
  - Acceptance: "Student Performance" heatmap; students vs assignments; color-coded by score band (low/mid/high); drill-down to student detail.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                     | Acceptance Criteria                                                                                                                                                                                                                                        |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Assignment Schema**           | Table `assignments` with: title, description, course_id, class_id (nullable), created_by, due_date, max_points, rubric (JSONB), status (draft/published/archived), late_penalty_percent, created_at, updated_at. RLS by course → tenant.                   |
| 2   | **Rubric Builder**              | JSONB rubric schema: `{criteria: [{name, description, levels: [{name, points}]}]}`. Teacher add/edit criteria + point levels. UI: form with drag-add criteria; set point ranges (e.g., "Excellent: 10 pts, Good: 8, Fair: 5, Poor: 2").                    |
| 3   | **Submission Model**            | Table `assignment_submissions` with: assignment_id, user_id, submission_content (JSONB: {type: 'text'/'file', content, file_urls}), submitted_at, is_late (bool), late_penalty_applied (bool). Allow resubmit before deadline; version tracking.           |
| 4   | **Rubric Grading**              | Table `assignment_grades` with: submission_id, teacher_id, rubric_scores (JSONB: {criterion_id: score}), total_score, feedback_text, graded_at. Auto-calc total_score from rubric criteria sums.                                                           |
| 5   | **Late Penalty Logic**          | Auto-calculate if submitted_at > due_date. Deduct `assignments.late_penalty_percent` from total_score. Show "Late: -10%" on student view.                                                                                                                  |
| 6   | **SpeedGrader UI**              | Left sidebar: student list with filter (not submitted / submitted / graded); center: submission viewer (text or PDF); right: rubric grading panel. Navigate student with prev/next button. Show "5 of 30 graded" progress. No page reload on next student. |
| 7   | **Submission Viewer**           | Render submitted content: text (formatted), file link (download or inline preview if supported—PDF, image). Embedded code viewer with syntax highlight if code submission.                                                                                 |
| 8   | **Rubric Scoring UI**           | Rubric panel in SpeedGrader: show criteria; click criterion level to select; total_score auto-update; textarea for feedback. Save on blur (optimistic). Show "Saving..." indicator.                                                                        |
| 9   | **Feedback System**             | Teacher write feedback per criterion (or overall). Student see feedback grouped by criterion post-grade. Allow comment annotations on text (highlight + inline comment).                                                                                   |
| 10  | **AI Essay Grading RPC**        | RPC `ai-grade-essay(submission_id, rubric_id)` calls Edge Function or Supabase Function; returns: {grammar_score, structure_score, originality_score, recommendation}. Teacher preview before accept/override. UI: "AI Analysis" button in SpeedGrader.    |
| 11  | **Assignment Analytics**        | Dashboard with: submission_count, submission_rate %, avg_score, score_distribution (histogram), avg_time_to_grade. Filter by date range. Re-compute on-demand or cached.                                                                                   |
| 12  | **Bulk Submission Reminder**    | Scheduled job (cron or manual "Send Reminder" button) emails students not submitted 2 days before deadline. Subject: "Reminder: [Assignment] due [date]"; include submission link.                                                                         |
| 13  | **Submission History/Versions** | Track all submissions per student; show timestamp, late status, current grade. Student can see all versions; teacher grade latest. UI: "Versions" dropdown in SpeedGrader.                                                                                 |
| 14  | **RLS & Multi-Tenant**          | Assignments scoped by course → tenant. Teachers see/edit own assignments. Students see if enrolled in course. Admin see all. Submissions only visible to own teacher + student + admin.                                                                    |
| 15  | **Gradebook Export**            | Assignment grades export to CSV: student name, email, score, max_points, %, submission status, graded_date. Used for parent portal (future).                                                                                                               |
| 16  | **Dark Mode**                   | SpeedGrader, rubric panel, analytics all support `dark:` Tailwind. Test fullscreen grading in dark mode.                                                                                                                                                   |
| 17  | **Documentation**               | Update `docs/DATABASE_ARCHITECTURE.md` with assignment schema; create feature README with RPC reference; document rubric JSON format.                                                                                                                      |

### P1 — Nice to Have

| #   | Requirement                  | Reasoning                                                                                          |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | **Collaborative Submission** | Group assignments; one submission per group; group grade.                                          |
| 2   | **File Virus Scanning**      | Scan uploads for malware (antivirus API integration). Protects platform security.                  |
| 3   | **Peer Review**              | Students review & grade each other; teacher aggregate scores. Complex fairness logic.              |
| 4   | **Plagiarism Report**        | Integrate Turnitin API; flag high plagiarism %. Requires paid third-party.                         |
| 5   | **Video Submission**         | Students record video; teacher grade + give video feedback. Requires RTC + storage optimization.   |
| 6   | **Assignment Scheduling**    | Release assignment on specific date; students can't submit before. Show "Available in 2 days".     |
| 7   | **Rubric Templates**         | Pre-built rubrics for common assignment types (essay, presentation, code). Speed up teacher setup. |
| 8   | **Grade Appeals**            | Students request regrade; teacher re-evaluate in audit trail. Transparency + fairness.             |

### P2 — Future Considerations

| #   | Item                        | Reasoning                                                                                               |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **AI Plagiarism Detection** | ML-based plagiarism checker (no third-party cost). Train on corpus. (Data science pipeline.)            |
| 2   | **Video Feedback**          | Teacher record video annotation instead of text comment. Requires video capture + storage.              |
| 3   | **Automated Essay Scoring** | NLP pipeline to score essays without teacher input; reduce manual grading. (ML heavy.)                  |
| 4   | **Collaborative Grading**   | Co-teachers grade same assignment in real-time; merge scores. Requires WebSocket + conflict resolution. |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                          | Target                                                | Cara Ukur                                                                                              |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Assignment Creation Rate**    | Teachers create 2–3 assignments per course on average | COUNT(\*) FROM assignments WHERE created_at >= NOW() - INTERVAL '7 days'. Target 30+ assignments/week. |
| **Submission Rate**             | 80%+ of enrolled students submit assignments on-time  | COUNT(submitted on-time) / COUNT(enrolled) per assignment.                                             |
| **SpeedGrader Adoption**        | 95% of teachers use SpeedGrader vs manual grading     | Survey or log usage: grade_via_speedgrader / total_grades.                                             |
| **Grading Speed**               | Avg time per submission <3 minutes with rubric        | Measure: (graded_at - submission_viewed_at) for sample of 50 submissions.                              |
| **AI Analysis Acceptance Rate** | 60%+ of AI analysis results accepted by teachers      | COUNT(teacher_accept_ai_score) / COUNT(ai_analysis_runs).                                              |
| **Rubric Consistency**          | 90%+ of submitted rubrics have 3+ criteria            | Validate schema; reject malformed rubrics on save.                                                     |

### Lagging Indicators (minggu–bulan)

| Metric                         | Target                                                | Cara Ukur                                                |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| **Assignment Completion Rate** | 75%+ of enrolled students submit and get graded       | COUNT(graded_submissions) / COUNT(enrolled) per course.  |
| **Avg Assignment Score**       | 65%+ students pass (score ≥ 60% of max points)        | AVG(score / max_points \* 100) >= 65.                    |
| **Late Submission Rate**       | <20% of submissions are late                          | COUNT(late_submissions) / COUNT(total_submissions).      |
| **Teacher Grading Turnaround** | 80% of submissions graded within 7 days of submission | PERCENTILE(graded_at - submitted_at, 80) <= 7 days.      |
| **Feedback Quality (NPS)**     | 7.0+ avg teacher satisfaction with grading experience | Survey: "How satisfied with SpeedGrader?" (1-10 Likert). |
| **Student Satisfaction**       | 7.0+ avg student satisfaction with feedback clarity   | Survey: "How helpful was feedback?" (1-10 Likert).       |
| **AI Essay Grading Accuracy**  | 85%+ match between AI score and teacher override      | QA: AI score vs teacher final score; track divergence.   |

---

## 7. Open Questions

| #   | Pertanyaan                                                                          | Owner               | Blocking?                                                                                                            |
| --- | ----------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Should AI essay grading be part of v1, or stub for v2?                              | Product/Engineering | Tidak — v1 stub RPC; UI button calls `/grade-essay-edge-function` (not yet impl); teacher can ignore or wait for v2. |
| 2   | How to handle group submission? One submission per group, or each student submits?  | Product             | Tidak — v1 individual only; group feature in v2 if demand.                                                           |
| 3   | Should we auto-grade with rubric (fill in scores), or require manual teacher click? | Product             | Tidak — v1 teacher manual click per criterion; auto-grade (ML) in v2 if we have AI grader.                           |
| 4   | Resubmit policy: should previous submission be visible or hidden?                   | Product             | Tidak — v1 show version history; teacher grade latest version; student can view older attempts for learning.         |
| 5   | Late penalty: flat % or per-day compound?                                           | Product             | Tidak — v1 flat % (e.g., -10% total); per-day compound in v2 if demand.                                              |
| 6   | Should file upload have size limit? 100MB? 500MB?                                   | Engineering         | Tidak — use Supabase Storage defaults; enforce 500MB in Edge Function validate.                                      |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1–2)

- [x] Database schema finalized (`assignments`, `assignment_submissions`, `assignment_grades`, `assignment_rubrics`)
- [x] RLS policies + multi-tenant isolation
- [x] Rubric JSONB schema finalized

### Phase 2: Teacher Assignment Creation (Week 3–4)

- [ ] Assignment form (title, description, deadline, points, rubric builder)
- [ ] Rubric builder UI (add criteria, set point levels)
- [ ] Publish assignment; visibility controls

### Phase 3: Student Submission (Week 5–6)

- [ ] Student assignment detail page
- [ ] Submission form (file upload or text editor)
- [ ] Submission status tracking (submitted, late, graded)
- [ ] Resubmit before deadline

### Phase 4: SpeedGrader (Week 7–8)

- [ ] SpeedGrader layout (sidebar, viewer, rubric panel)
- [ ] Submission viewer (text + file preview)
- [ ] Rubric grading UI (click criterion, auto-calc total)
- [ ] Feedback textarea

### Phase 5: Analytics & Automation (Week 9–10)

- [ ] Assignment analytics dashboard
- [ ] Bulk reminder emails (scheduled)
- [ ] AI essay grading stub (Edge Function call; not impl yet)
- [ ] Gradebook export

### Phase 6: Polish & Launch (Week 11)

- [ ] Dark mode audit
- [ ] Mobile SpeedGrader responsiveness (sidebar collapse)
- [ ] Performance audit (SpeedGrader load time with 100+ submissions)
- [ ] UAT with 5 teachers + 50 students
- [ ] Soft launch

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi            | Status  | Impact                                                        |
| --------------------- | ------- | ------------------------------------------------------------- |
| Course + Class schema | ✅ Live | Assignments belong to course/class.                           |
| Supabase Auth & RLS   | ✅ Live | Multi-tenant + role-based access.                             |
| Storage bucket        | ✅ Live | File upload to `/assignments/{assignmentId}/{submissionId}/`. |
| Edge Functions        | ✅ Live | `ai-grade-essay` stub (not implemented yet).                  |
| React Query v5        | ✅ Live | Query caching + mutations.                                    |

### Risiko & Mitigasi

| Risiko                                                                                  | Severity | Mitigasi                                                                                                                        |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **File upload DoS** — Student upload 100 large files to exhaust storage quota.          | Medium   | Enforce per-submission file size limit (500MB total); per-user upload quota (1GB/month). Rate-limit upload requests.            |
| **Rubric scoring errors** — Teacher click wrong criterion level; wrong total.           | Low      | Show confirmation "You gave 8/10 for Essay Quality. Save?" before persisting. Allow undo (last 5 grades).                       |
| **Late penalty calculation bug** — Incorrect deduction if submitted multiple times.     | Medium   | Only apply late penalty to latest submission; version control clearly. QA: test 20 resubmit scenarios.                          |
| **SpeedGrader performance** — 200 submissions cause slow nav.                           | Medium   | Paginate submissions (load 50 per page); lazy-load submission content on click; debounce prev/next. Test with 500+ submissions. |
| **AI Essay Grader unavailable** — Edge Function down; SpeedGrader UI breaks.            | Low      | Make "AI Analysis" button optional + graceful failure ("Service unavailable, try later"). No blocking on AI.                    |
| **Rubric JSON validation** — Teacher can corrupt rubric JSON manually; cause error.     | Low      | Validate JSON schema on save; reject invalid rubric; show error "Invalid rubric format".                                        |
| **Concurrent grading** — Two teachers grade same submission; last-write-wins data loss. | Low      | Add optimistic locking (version field) or soft error "Graded by another teacher; refresh".                                      |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can create assignment with description, deadline, max points, rubric
- [ ] Can define rubric with 3+ criteria and point levels
- [ ] Can use SpeedGrader: navigate students, grade with rubric, write feedback
- [ ] Can see analytics (submission %, avg score, grading time)
- [ ] Can send bulk reminder email to non-submitters

**Student:**

- [ ] Can view assignment details (description, deadline, rubric, attachments)
- [ ] Can submit assignment (file or text) before deadline
- [ ] Can resubmit before deadline
- [ ] Can see submission status (on-time, late %, graded)
- [ ] Can view grade + feedback per criterion
- [ ] Can see rubric breakdown (my score vs max per criterion)

**Admin:**

- [ ] Can view assignment overview across all teachers
- [ ] Can see student performance heatmap (students vs assignments)

**Technical:**

- [ ] RLS enforces assignment access (course enrollment check)
- [ ] Late penalty auto-applied correctly
- [ ] Rubric JSON validated on save
- [ ] No N+1 queries on SpeedGrader load
- [ ] File upload works for .pdf, .docx, .txt, .jpg (test 5 types)
- [ ] Dark mode working on SpeedGrader + analytics
- [ ] Performance: SpeedGrader load <2 sec; next student <500ms
- [ ] Documentation updated (DATABASE_ARCHITECTURE.md, feature README, RPC reference)

---

## 11. Implementation Notes for Engineers

### Rubric JSON Schema

```json
{
  "criteria": [
    {
      "id": "uuid",
      "name": "Essay Structure",
      "description": "Organization and flow",
      "max_points": 10,
      "levels": [
        {
          "id": "uuid",
          "name": "Excellent",
          "points": 10,
          "description": "Clear intro, body, conclusion; smooth transitions"
        },
        {
          "id": "uuid",
          "name": "Good",
          "points": 8,
          "description": "Organized but some transitions rough"
        },
        {
          "id": "uuid",
          "name": "Fair",
          "points": 5,
          "description": "Basic structure but unclear organization"
        },
        {
          "id": "uuid",
          "name": "Poor",
          "points": 2,
          "description": "Disorganized, hard to follow"
        }
      ]
    }
  ]
}
```

### Submission Schema

```json
{
  "type": "text",
  "content": "<p>My essay here...</p>",
  "file_urls": [],
  "submitted_at": "2026-03-22T10:30:00Z"
}
```

OR

```json
{
  "type": "file",
  "file_urls": [
    {
      "name": "essay.pdf",
      "url": "https://storage.supabase.co/assignments/...",
      "size_bytes": 102400,
      "mime_type": "application/pdf"
    }
  ],
  "submitted_at": "2026-03-22T10:30:00Z"
}
```

### Feature Module Structure

```
src/features/assignments/
├── api/
│   ├── assignmentService.ts
│   └── gradingService.ts
├── queries/
│   ├── assignmentKeys.ts
│   └── assignmentQueries.ts
├── hooks/
│   ├── useAssignment.ts
│   ├── useRubric.ts
│   └── useSpeedGrader.ts
├── types/
│   └── index.ts (Assignment, Rubric, Grade, etc.)
├── components/
│   ├── AssignmentDetail.tsx
│   ├── SubmissionForm.tsx
│   ├── SpeedGrader.tsx
│   ├── RubricBuilder.tsx
│   ├── RubricGrader.tsx
│   ├── SubmissionViewer.tsx
│   ├── AssignmentAnalytics.tsx
│   └── ReminderPanel.tsx
├── utils/
│   ├── rubricCalculator.ts
│   ├── latePenalty.ts
│   └── fileValidator.ts
├── __tests__/
│   ├── assignmentService.test.ts
│   ├── rubricCalculator.test.ts
│   └── latePenalty.test.ts
└── README.md
```

### Route Structure

- **Student:** `/#/app/student/assignments` — list my assignments
- **Student:** `/#/app/student/assignments/{assignmentId}` — assignment detail + submit
- **Student:** `/#/app/student/assignments/{assignmentId}/grade` — view grade + feedback
- **Teacher:** `/#/app/teacher/assignments` — manage assignments
- **Teacher:** `/#/app/teacher/assignments/{assignmentId}/submissions` — SpeedGrader
- **Teacher:** `/#/app/teacher/assignments/{assignmentId}/analytics` — analytics
- **Admin:** `/#/app/admin/assignments` — overview all assignments

---

## Glossary

| Term                   | Definisi                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Tugas (Assignment)** | Task guru assign kepada siswa dengan deadline dan rubric.                           |
| **Submission**         | Pekerjaan siswa submitted untuk assignment (text atau file).                        |
| **Rubric**             | Grading criteria dengan point levels; teacher score based on rubric.                |
| **SpeedGrader**        | Teacher interface untuk grade submissions satu-satu dengan rubric in-context.       |
| **Late Penalty**       | Automatic score deduction jika submit after deadline.                               |
| **Feedback**           | Teacher comment per criterion atau overall after grading; student see post-release. |
| **AI Essay Grading**   | RPC call ke Edge Function untuk auto-analyze submission (grammar, structure, etc.). |
| **Gradebook Sync**     | Assignment grades exported to main gradebook (for parent portal future feature).    |
