# PRD — Quizzes (Kuis)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Mature (Quiz Engine v2 Complete)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/quizzes/`

---

## 1. Problem Statement

Guru Indonesia memerlukan sistem penilaian yang **fair, reliable, dan cepat** untuk mengukur pemahaman siswa secara akurat. Sistem kuis manual (kertas atau Google Forms) tidak scalable, sulit di-grade, dan tidak memberikan insight tentang pembelajaran siswa.

Masalah yang dipecahkan EduSync v2 Quiz Engine:

- **Guru:** Membuat quiz dengan question bank reusable, set time limits, auto-grade, dan lihat analytics detail (item difficulty, discrimination index).
- **Siswa:** Mengerjakan quiz dengan waktu terbatas, autosave real-time, anti-cheat monitoring, dan instant feedback.
- **Platform:** Collect structured quiz data untuk AI Tutor recommendations, identify struggling students, dan measure course efficacy.

---

## 2. Goals

1. **Enterprise-Grade Quiz Engine:** Timed quiz, autosave, anti-cheat (tab-switch detection, IP monitor), instant grading, analytics.
2. **Flexible Question Bank:** Teachers reuse questions across quizzes; smart question selection (difficulty-weighted, topic-filtered).
3. **Student Experience:** Intuitive quiz player, progress bar, instant feedback on submit, review answers before final submit (optional).
4. **Deep Analytics:** Item analysis (difficulty, discrimination, point-biserial correlation), question performance trends, student mastery heatmap.
5. **Integration:** Quiz embeds in lessons, standalone quiz assignments, and class-based proctored quizzes.

---

## 3. Non-Goals

1. **Computer-Adaptive Testing (CAT)** — Dynamic question difficulty based on student response; requires ML pipeline (Phase 7).
2. **Video Proctoring** — AI-powered live proctoring with webcam monitoring; requires video RTC layer + ML (Phase 8).
3. **Biometric Auth** — Fingerprint/face recognition for exam identity verification; security layer too complex for v1.
4. **Mobile Exam Mode** — Locked-down mobile app mode with restricted features; requires native app (Phase 6).
5. **Peer Grading** — Teachers crowdsource essay grading to students; complexity in fairness + moderation (Phase 7).

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-Q1:** Sebagai guru, saya ingin membuat quiz baru dengan set of questions dari question bank, sehingga saya bisa reuse konten di banyak quiz.
  - Acceptance: "Create Quiz" form; select questions from bank (multi-select); set order or random; import multiple at once.

- **US-Q2:** Sebagai guru, saya ingin set quiz properties: timed (30 min), shuffle questions, show answers after submit, passing score (60%), sehingga saya bisa customize experience.
  - Acceptance: Quiz settings form; time limit field (0 = untimed); boolean toggles; passing score %; update RPC parameters.

- **US-Q3:** Sebagai guru, saya ingin lihat quiz statistics: completion rate, avg score, time-to-complete, per-question difficulty, item discrimination, sehingga saya tahu quiz quality.
  - Acceptance: Analytics dashboard dengan 6–8 metrics; table: question name, difficulty %, discrimination, point-biserial; drill-down per question to see student list.

- **US-Q4:** Sebagai guru, saya ingin export quiz results (CSV dengan student name, score, time, answers) sehingga saya bisa import ke gradebook atau analisis offline.
  - Acceptance: "Export Results" button; CSV with columns: student, email, score, max_score, percentage, time_taken, submitted_at; download trigger.

- **US-Q5:** Sebagai guru, saya ingin set quiz sebagai "proctored" dengan anti-cheat: tab-switch detection, IP monitor, webcam optional, sehingga exam integrity terjaga.
  - Acceptance: "Proctoring" toggle dalam settings; if on, show warning "This quiz is proctored"; detect tab switches (warn after 3 switches, auto-submit); log IP address.

- **US-Q6:** Sebagai guru, saya ingin lihat list siswa yang "suspicious" (multiple tab switches, IP changes, time anomalies) dan manual review scores mereka.
  - Acceptance: "Suspicious Attempts" section di analytics; show flags (tab_switch_count, ip_change, time_anomaly); allow manual override score or flag for manual grading.

### Untuk Siswa (Student)

- **US-S1:** Sebagai siswa, saya ingin mulai quiz dan lihat semua questions dalam satu interface dengan timer, progress bar, sehingga saya tahu sisa waktu dan progress.
  - Acceptance: Quiz player fullscreen; timer countdown visible top-right; progress bar (X of Y questions); question list sidebar.

- **US-S2:** Sebagai siswa, saya ingin autosave jawaban setiap 5 detik tanpa intervensi, sehingga kalau browser crash saya tidak loss progress.
  - Acceptance: "Saving..." indicator saat autosave; message "Last saved: 2 min ago"; resume from exact position + answers.

- **US-S3:** Sebagai siswa, saya ingin review jawaban sebelum final submit (optional), sehingga saya bisa double-check sebelum terlambat.
  - Acceptance: "Review" button sebelum submit final; tampilkan: question, my answer, correct answer (if revealed).

- **US-S4:** Sebagai siswa, saya ingin lihat instant feedback after quiz submit: score, passing/failing, which questions saya answer salah, sehingga saya bisa learn.
  - Acceptance: Results screen: score percentage, passing status, question breakdown (correct/incorrect/skipped), option to reveal correct answers (teacher-controlled).

- **US-S5:** Sebagai siswa, saya ingin bisa pause quiz saat-saat (misal: ambil minum), dan timer tetap jalan, sehingga exam fair.
  - Acceptance: "Pause" button; modal "Your quiz paused"; timer keep running; unpause to resume; track pause_duration.

- **US-S6:** Sebagai siswa, saya ingin redo quiz multiple times (jika guru allow) dan sistem hanya save score tertinggi atau yang latest (depending on teacher setting).
  - Acceptance: After submit, if retries left > 0, show "Attempt X of Y" dan "Retry Quiz" button; clarify which score counts (max/latest).

### Untuk Admin Sekolah (Admin)

- **US-A1:** Sebagai admin, saya ingin monitor semua quizzes sekolah saya: avg completion rate, total questions created, identify poorly performing quizzes.
  - Acceptance: Admin dashboard "Quiz Overview"; table: quiz name, course, teacher, completion rate, avg score, question count; sort by metric; drill-down.

- **US-A2:** Sebagai admin, saya ingin audit anti-cheat flags: see list of students dengan suspicious behavior per quiz, export report.
  - Acceptance: "Anti-Cheat Log" page; table: student, quiz, attempt, flag type (tab_switch, ip_change), count; export CSV.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                   | Acceptance Criteria                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Quiz Schema**               | Table `quizzes` with: title, description, course_id, lesson_id (nullable), created_by, status (draft/published), time_limit_minutes (0=untimed), passing_score (%), shuffle_questions (bool), show_answers (bool), proctoring_enabled (bool), created_at, updated_at. RLS enforced by course → tenant. |
| 2   | **Question Types**            | Support 4 question types: Multiple Choice (single), Multiple Select (multi), Short Answer (text match), True/False. Stored in `quiz_questions` with `text` column (not `question_text`).                                                                                                               |
| 3   | **Question Bank Integration** | Teachers can select questions from reusable `question_bank` table; maintain version history (question_bank_versions). Track which questions belong to which quiz in `quiz_questions`.                                                                                                                  |
| 4   | **Quiz Attempt Lifecycle**    | States: IN_PROGRESS → SUBMITTED → GRADED. RPC `v1_start_quiz_attempt(p_quiz_id)` creates new attempt or resume existing. RPC `v1_save_partial_answers(p_attempt_id, p_answers)` autosave. RPC `v1_submit_quiz_attempt(p_attempt_id, p_final_answers)` finalize + auto-grade.                           |
| 5   | **Auto-Grading**              | Multiple Choice/Select/True-False auto-grade on submit (compare to answer key). Short Answer grade via: exact match (case-insensitive), semantic similarity (if AI tutor available), or manual override. RPC return score immediately.                                                                 |
| 6   | **Autosave Real-Time**        | Frontend debounce answers every 5 sec; send to RPC `v1_save_partial_answers`. If user close browser mid-quiz, resume from exact position + answers. Resume button on dashboard.                                                                                                                        |
| 7   | **Timed Quiz Enforcement**    | Timer count down from `quizzes.time_limit_minutes`. At 0 min, auto-submit whatever answers exist. Warn at 5 min, 1 min, 30 sec. Handle client time-skew: verify server time on resume.                                                                                                                 |
| 8   | **Anti-Cheat Monitoring**     | Track: tab-switch (via `visibilitychange` event), IP address (from request), timestamp sequence (detect time gaps). Log to `quiz_attempt_events` table. After 3 tab switches, show warning; allow continue but flag as suspicious.                                                                     |
| 9   | **Quiz Results & Feedback**   | Immediately after submit, show: score %, passing/failing status, question breakdown (correct/incorrect/skipped), optional reveal correct answers (teacher-controlled). Store in `quiz_results` or similar denormalized table for fast query.                                                           |
| 10  | **Quiz Statistics API**       | RPC `v1_get_quiz_stats(p_quiz_id)` returns: completion_count, completion_rate, avg_score, median_time_minutes, questions_stats (per-question: difficulty %, discrimination index, point-biserial). Store in `quiz_stats` table, refresh on-demand or batch.                                            |
| 11  | **Item Analysis**             | Compute per-question: difficulty = (correct_count / attempt_count); discrimination = correlation(q_score, total_score) using point-biserial; question quality scoring. Include in teacher analytics dashboard.                                                                                         |
| 12  | **Attempt History**           | Students see their past attempts (attempt #, date, score, time); can review previous answers. Teachers see all student attempts for a quiz.                                                                                                                                                            |
| 13  | **Review Mode**               | Before final submit, students can review answers (compare my answer vs correct, if revealed). Question review panel shows answer key logic (not just "you're wrong").                                                                                                                                  |
| 14  | **Retries & Scoring Logic**   | If `quizzes.allow_retries = true`, student can re-attempt. Decide scoring: save max score, or latest score, or average. Default: max score (most lenient).                                                                                                                                             |
| 15  | **RLS & Multi-Tenant**        | Quizzes scoped by course → tenant. Students can only access if enrolled in course. Teachers can only see/edit own quizzes. Admin see all. Anti-cheat data aggregated by tenant.                                                                                                                        |
| 16  | **Export Results**            | "Export" button in teacher quiz analytics; CSV with columns: student name, email, score, %, time taken, submitted_at, answers JSON. Downloadable.                                                                                                                                                      |
| 17  | **Dark Mode**                 | Quiz player, settings, analytics all support `dark:` Tailwind variants. Test fullscreen player in dark mode.                                                                                                                                                                                           |
| 18  | **Documentation**             | Update `docs/DATABASE.md` with quiz schema; create feature README with RPC reference; document anti-cheat data collection.                                                                                                                                                                             |

### P1 — Nice to Have

| #   | Requirement                         | Reasoning                                                                                                                                        |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Question Difficulty Auto-Assign** | Auto-calculate question difficulty based on attempt data; teachers can override. Suggest "Hard" or "Easy" badge per question.                    |
| 2   | **Quiz Scheduling**                 | Release quiz on specific date/time; students can't start before. Show "Available in 2 days" if locked.                                           |
| 3   | **Question Pool & Randomization**   | Create pool of 20 questions, randomly select 10 per attempt. Ensures fairness, prevents cheating (different Q per student).                      |
| 4   | **Peer Grading**                    | Teachers assign essay/short-answer Q to peer students to grade (with rubric). Aggregate scores. (Complex, low priority.)                         |
| 5   | **Quiz Versions**                   | Teachers can edit quiz after publish (add Q, change answer key); old attempts versioned. Show "Question changed after your attempt" if relevant. |
| 6   | **Bulk Question Import**            | CSV or Quizlet import: 100+ questions at once into question bank.                                                                                |
| 7   | **Suggestion System**               | If student answer wrong >60% of questions, AI Tutor suggest struggling topics + remedial lessons.                                                |

### P2 — Future Considerations

| #   | Item                          | Reasoning                                                                               |
| --- | ----------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **Computer-Adaptive Testing** | Dynamically adjust Q difficulty based on student response; requires ML model training.  |
| 2   | **Video Proctoring**          | AI proctoring with webcam; requires RTC + face detection ML. Security/privacy concerns. |
| 3   | **Biometric Authentication**  | Fingerprint/face ID for exam start. Native app feature, not web-friendly.               |
| 4   | **Cross-Platform Sync**       | Desktop quiz progress sync to mobile app; requires native client.                       |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                            | Target                                                     | Cara Ukur                                                                                      |
| --------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Quiz Creation Rate**            | Teachers create 3–5 quizzes per course on average          | COUNT(\*) FROM quizzes WHERE created_at >= NOW() - INTERVAL '7 days'. Target 50+ quizzes/week. |
| **Autosave Reliability**          | 99%+ of autosave attempts succeed                          | COUNT(successful_autosave) / COUNT(autosave_attempts); monitor error logs.                     |
| **Anti-Cheat Detection Accuracy** | 95%+ of flagged attempts verified as legitimate/suspicious | Manual QA: review 50 flagged attempts, compare to session logs.                                |
| **Auto-Grading Correctness**      | 99%+ of auto-graded questions correct                      | Compare auto-grade score vs manual spot-check; validate answer key match.                      |
| **Timed Quiz Enforcement**        | 100% of quizzes auto-submit at time limit                  | QA: run 20 timed quizzes, verify auto-submit at deadline.                                      |
| **Quiz Player Performance**       | Quiz page load <1 sec; no jank on question nav             | Monitor Lighthouse; aim for LCP <1s, CLS <0.1.                                                 |

### Lagging Indicators (minggu–bulan)

| Metric                             | Target                                       | Cara Ukur                                                                                  |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Quiz Attempt Completion Rate**   | 85%+ of started quizzes submitted            | COUNT(submitted_attempts) / COUNT(started_attempts). Exclude abandoned (>24h no activity). |
| **Average Quiz Score**             | 65%+ pass rate (score ≥ passing_score %)     | AVG(score %) across all attempts; segment by course/level.                                 |
| **Time-to-Complete Quiz**          | Actual time ≤ estimated time + 20% buffer    | Compare quiz.time_limit vs actual quiz_attempt.duration_minutes; adjust estimate if off.   |
| **Student Retry Engagement**       | 40%+ of students who failed attempt again    | COUNT(DISTINCT user_id with retry) / COUNT(user_id with failed attempt).                   |
| **Question Quality**               | Discrimination index >0.2 for 80%+ questions | Filter out low-quality Q (discrimination <0.1); recommend teacher review.                  |
| **Anti-Cheat False Positive Rate** | <5% of flagged attempts are false positives  | Manual audit: flag rate / actual cheating incidents. Adjust detection threshold if needed. |
| **Teacher Adoption**               | 70%+ of active teachers create ≥1 quiz       | COUNT(teacher_id with ≥1 quiz) / total active teachers.                                    |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                      | Owner               | Blocking?                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Should short-answer questions be auto-graded by AI or require manual teacher grading?           | Product             | Tidak — v1 exact match only; AI grading in v2 via tutor RPC.                                               |
| 2   | What constitutes "suspicious" anti-cheat behavior? Tab-switch threshold? IP change = auto-flag? | Engineering/Product | Tidak — v1: 3+ tab switches = warning, log event; IP change = log only, no flag. Manual review by teacher. |
| 3   | Should quiz data (questions, answers) be encrypted at rest, or standard RLS?                    | Security            | Tidak — RLS is sufficient for v1; encrypt in transit (HTTPS) only. Encrypt at rest in Phase 5.             |
| 4   | Time-out policy: if student paused >30 min, auto-abandon quiz or let resume?                    | Product             | Tidak — v1 allow resume anytime (session doesn't expire); v2 can add session timeout.                      |
| 5   | Retakes: should student see their previous answers when re-attempting?                          | Product             | Tidak — v1 show previous attempt but not answers (to prevent memory-based cheating); review after submit.  |
| 6   | Question bank: should be school-wide, or per-teacher?                                           | Product             | Tidak — v1 per-school (tenant-level); per-teacher folders in v2 if needed.                                 |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1–2)

- [x] Database schema finalized (`quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_attempt_questions`)
- [x] RLS policies + multi-tenant isolation
- [x] RPC foundation (`v1_start_quiz_attempt`, `v1_save_partial_answers`, `v1_submit_quiz_attempt`)

### Phase 2: Quiz Player (Week 3–4)

- [x] Quiz player UI (question nav, timer, progress bar)
- [x] Autosave every 5 sec (debounced)
- [x] Timed quiz enforcement (countdown, auto-submit)
- [x] Question types rendering (MC, multi-select, true-false)

### Phase 3: Auto-Grading & Results (Week 5–6)

- [x] Auto-grade on submit (compare answer key)
- [x] Results screen (score %, feedback, question breakdown)
- [x] Review mode (optional pre-submit review)
- [x] Attempt history

### Phase 4: Anti-Cheat & Analytics (Week 7–8)

- [x] Tab-switch detection + logging
- [x] IP address logging
- [x] Analytics dashboard (completion rate, avg score, question stats)
- [x] Item analysis (difficulty, discrimination index)

### Phase 5: Polish & Optimization (Week 9–10)

- [x] Dark mode audit
- [x] Mobile responsiveness (player + analytics)
- [x] Export results (CSV)
- [x] Suspicious attempts manual review interface

### Phase 6: Launch Prep (Week 11)

- [x] Performance audit (load time, autosave latency)
- [x] Security audit (RLS, data isolation, XSS in answers)
- [x] UAT with 5 teachers + 20 students
- [x] Soft launch to 1 school

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi             | Status  | Impact                                                   |
| ---------------------- | ------- | -------------------------------------------------------- |
| Course + Lesson schema | ✅ Live | Quizzes link to lessons; must be finalized.              |
| Question Bank          | ✅ Live | Teachers select from question bank; must have seed data. |
| Supabase Auth & RLS    | ✅ Live | Multi-tenant + role-based access; core dependency.       |
| React Query v5         | ✅ Live | Query caching + mutations; already integrated.           |
| Edge Functions         | ✅ Live | RPC execution for auto-grading; already deployed.        |

### Risiko & Mitigasi

| Risiko                                                                                                           | Severity | Mitigasi                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autosave collisions** — Concurrent edits (e.g., tab 1 save, tab 2 save) cause answer conflicts.                | Medium   | Implement last-write-wins with timestamp; or add conflict detection (merge logic for field-level updates). Warn user "Answer saved in another tab".                  |
| **Timer skew** — Client clock differs from server; student extends quiz time by setting local clock forward.     | Medium   | Server-side time validation in RPC; compare server time (NOW()) vs client time on resume; reject answers after deadline.                                             |
| **Tab-switch false positives** — User switches tab to check time, browser notification, legit multi-monitor use. | Low      | Only flag if >3 switches per attempt (high threshold); allow 3 "free" switches. Educate teachers: "Detection is not proof of cheating; manual review required."      |
| **Auto-grade bug** — Incorrect answer key causes mass-fail of legitimate answers.                                | High     | Rigorous testing: 100% unit test coverage on grading logic; manual QA on all question types; allow teacher override score. Rollback plan if issue found post-launch. |
| **Quiz player performance** — Large quiz (100 questions) causes UI lag on question nav.                          | Medium   | Paginate questions (load 10 per page); virtual scroll if needed; test with 150+ question quiz.                                                                       |
| **RLS query performance** — `v1_get_quiz_stats` with 10k+ attempts slow.                                         | Medium   | Pre-compute stats in `quiz_stats` table (refresh every 5 min or on-demand); add indexes on `(quiz_id, created_at)`.                                                  |
| **IP spoofing** — Student uses VPN/proxy to hide suspicious IP change.                                           | Low      | IP logging is audit trail, not foolproof; anti-cheat is deterrent, not absolute. Combine with other signals (tab switches, time anomalies).                          |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can create quiz with questions from question bank
- [ ] Can set time limit, passing score, shuffle, show answers options
- [ ] Can view quiz statistics (completion %, avg score, per-question difficulty, discrimination)
- [ ] Can see suspicious attempts (tab-switches, IP changes) and manually review
- [ ] Can export results to CSV

**Student:**

- [ ] Can start quiz and see timer + progress bar
- [ ] Can answer questions (MC, multi-select, true-false)
- [ ] Answers autosave every 5 sec (no manual save button)
- [ ] Timer auto-submits quiz at time limit
- [ ] Can see instant feedback (score %, passing status, question breakdown) after submit
- [ ] Can resume mid-quiz if interrupted
- [ ] Can review previous answers / attempt history

**Admin:**

- [ ] Can view all quizzes across school (completion rate, avg score)
- [ ] Can audit anti-cheat flags (tab-switch, IP change counts)

**Technical:**

- [ ] RLS enforces quiz access via course enrollment
- [ ] Auto-grading 99%+ accurate (multiple-choice, select, true-false)
- [ ] Autosave <500ms latency (debounced, not per keystroke)
- [ ] Timed quiz auto-submits at deadline (test with 20 attempts)
- [ ] No N+1 queries on quiz load or stats fetch
- [ ] Dark mode working on player + analytics
- [ ] Performance: quiz page load <1.5 sec p50
- [ ] Documentation updated (DATABASE.md, feature README, RPC reference)

---

## 11. Implementation Notes for Engineers

### Database Gotchas

- `quiz_questions.text` — Column is `text`, NOT `question_text`.
- `quiz_options.text` — Column is `text`, NOT `option_text`.
- `quiz_attempts` — Status enum: `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED`, `ABANDONED`. Track lifecycle carefully.

### RPC Pattern — Auto-Grading

```sql
-- Example: Submit quiz attempt and auto-grade
CREATE OR REPLACE FUNCTION v1_submit_quiz_attempt(
  p_attempt_id UUID,
  p_final_answers JSONB
)
RETURNS TABLE (
  attempt_id UUID,
  score FLOAT,
  max_score INT,
  is_passing BOOL,
  feedback JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_quiz_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
  v_score FLOAT := 0;
  v_max_score INT := 0;
BEGIN
  -- Validate ownership
  SELECT qa.quiz_id, qa.user_id, qa.tenant_id
  INTO v_quiz_id, v_user_id, v_tenant_id
  FROM quiz_attempts qa
  WHERE qa.id = p_attempt_id AND qa.tenant_id = get_my_tenant_id();

  IF v_quiz_id IS NULL THEN
    RAISE EXCEPTION 'Quiz attempt not found or access denied';
  END IF;

  -- Grade each question
  FOR q IN SELECT id FROM quiz_questions WHERE quiz_id = v_quiz_id LOOP
    v_max_score := v_max_score + 1;
    -- Check if answer matches correct option
    IF (p_final_answers ->> q.id::text) = (
      SELECT cq.correct_option_id::text
      FROM quiz_questions cq
      WHERE cq.id = q.id
    ) THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- Update attempt
  UPDATE quiz_attempts
  SET status = 'GRADED', score = v_score, max_score = v_max_score
  WHERE id = p_attempt_id;

  -- Return result
  RETURN QUERY SELECT p_attempt_id, v_score / v_max_score::FLOAT * 100, v_max_score, (v_score / v_max_score::FLOAT * 100) >= 60;
END;
$$;
```

### Feature Module Structure

```
src/features/quizzes/
├── api/
│   ├── quizService.ts
│   └── quizGradingService.ts
├── queries/
│   ├── quizKeys.ts
│   └── quizQueries.ts
├── hooks/
│   ├── useQuizTimer.ts
│   ├── useAutosave.ts
│   ├── useAntiCheat.ts
│   └── useQuizProgress.ts
├── store/
│   └── quizPlayerStore.ts (Zustand)
├── types/
│   └── index.ts (Quiz, QuizAttempt, QuizStats, etc.)
├── components/
│   ├── QuizPlayer.tsx
│   ├── QuizHeader.tsx
│   ├── QuizBody.tsx
│   ├── QuizFooter.tsx
│   ├── QuestionRenderer.tsx
│   ├── QuizResultsScreen.tsx
│   ├── QuizAnalyticsDashboard.tsx
│   └── SuspiciousAttemptsPanel.tsx
├── utils/
│   ├── autoGrader.ts
│   ├── itemAnalysis.ts
│   └── antiCheatLogger.ts
├── __tests__/
│   ├── quizService.test.ts
│   ├── autoGrader.test.ts
│   └── itemAnalysis.test.ts
└── README.md
```

### Route Structure

- **Student:** `/#/app/student/quiz/{quizId}` — quiz player
- **Student:** `/#/app/student/quiz/{quizId}/results` — results screen
- **Student:** `/#/app/student/quiz/{quizId}/history` — attempt history
- **Teacher:** `/#/app/teacher/quizzes` — manage quizzes
- **Teacher:** `/#/app/teacher/quizzes/{quizId}/analytics` — analytics dashboard
- **Teacher:** `/#/app/teacher/quizzes/{quizId}/suspicious` — suspicious attempts review
- **Admin:** `/#/app/admin/quizzes` — overview all quizzes

---

## Glossary

| Term                      | Definisi                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Kuis (Quiz)**           | Koleksi pertanyaan dengan time limit, passing score, auto-grading.                                    |
| **Pertanyaan (Question)** | Satu item dalam quiz: MC, multi-select, true-false, short answer.                                     |
| **Attempt**               | Record satu siswa mengerjakan satu quiz; track score, time, answers.                                  |
| **Autosave**              | Auto-persist jawaban setiap 5 detik tanpa user interaction.                                           |
| **Anti-Cheat**            | Monitoring: tab-switch, IP address, time sequence untuk detect suspicious behavior.                   |
| **Item Difficulty**       | Persentase siswa yang jawab benar untuk satu pertanyaan; 0.8 = 80% mastered.                          |
| **Discrimination Index**  | Correlation antara student score pada satu pertanyaan vs total quiz score; >0.2 = good discriminator. |
| **Point-Biserial**        | Statistical measure of question quality; similar to discrimination.                                   |
