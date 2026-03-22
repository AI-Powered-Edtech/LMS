# PRD — Gamification System

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/gamification/`

---

## 1. Problem Statement

Siswa Indonesia (usia 10–18 tahun) menghadapi tantangan motivasi yang signifikan dalam pembelajaran online. Platform LMS tradisional seperti Google Classroom dan Moodle fokus pada pengelolaan konten dan penilaian, tetapi kurang memberikan feedback positif yang memicu engagement berkelanjutan. Gamifikasi — elemen game mechanics seperti XP, badges, leaderboard — terbukti meningkatkan motivasi intrinsik dan retention rate hingga 40% dalam edtech (Deci & Ryan, self-determination theory).

EduSync membedakan dirinya dengan **gamification system yang deeply integrated** ke learning loop: setiap aksi belajar (menyelesaikan lesson, menjawab quiz, mengerjakan assignment) langsung menghasilkan reward visible dan status progression. Tanpa gamification yang matang:

- Siswa akan beralih ke platform kompetitor (Quizizz, Khan Academy) yang menawarkan feedback gamified
- Engagement rate akan stagnan di 30–40% (industry benchmark 60%+)
- Teacher tidak punya visibility ke student motivation patterns, sehingga intervention terlambat

---

## 2. Goals

1. **Increase Daily Active Users (DAU) ke 65%** dari enrolled students — diukur via `student_lesson_signals` dengan filter `last_accessed_at >= NOW() - 1 day`
2. **Boost Quiz Completion Rate ke 80%** — siswa menyelesaikan quiz setelah lesson (saat ini 55%)
3. **Create Sustainable Engagement Loop** — student menyelesaikan ≥3 lessons per minggu, tracked via `user_xp` insertion rate
4. **Enable Teacher Insights** — guru bisa lihat student motivation via XP trends dan streak status di teacher dashboard
5. **Deliver Visual Progress Clarity** — siswa tahu: XP gained hari ini, level current, badges earned, posisi di leaderboard (dalam 100ms)

---

## 3. Non-Goals

1. **Social features (follows, groups, clans)** — Out of scope v1. Requires profile privacy audit. Backlog untuk Q3 2026.
2. **Dynamic XP scaling per course/difficulty** — v1 hardcode XP values. Per-course XP tuning roadmap Q2 2026.
3. **Predictive badge unlock (pre-notifications)** — Out of scope. Requires ML/trigger refinement di progress processor.
4. **Cross-school leaderboards** — Multi-tenant RLS conflict. Scopeless — tetap per-school.
5. **Real-time leaderboard streaming (WebSocket)** — v1 polling every 30 detik. WebSocket roadmap Q3 2026 (infrastructure cost).

---

## 4. User Stories

### Untuk Siswa (Student)

- **As a student**, I want to earn XP whenever I complete a lesson or quiz, so that I can see my learning progress numerically and feel motivated to keep learning.
- **As a student**, I want to level up based on cumulative XP (e.g., Level 1 @ 0 XP, Level 2 @ 200 XP), so that I have a clear sense of progression and milestone.
- **As a student**, I want to unlock badges for achievements (e.g., "First 100 XP", "Quiz Master", "7-Day Streak"), so that I can celebrate and share my accomplishments.
- **As a student**, I want to see my rank on a leaderboard alongside peers in my class, so that I feel motivated to stay engaged (friendly competition).
- **As a student**, I want to maintain a learning streak (consecutive days of activity ≥1 lesson), so that I establish consistent study habits and get rewarded for discipline.
- **As a student**, I want to see a visual XP progress bar, current level, and "XP gained today" on my dashboard, so that I understand my standing at a glance.
- **As a student**, I want to receive a certificate (printable) after completing a full course (all modules, all quizzes passed), so that I have a credential to share.

### Untuk Guru (Teacher)

- **As a teacher**, I want to see student XP trends over time (e.g., chart of XP earned per week), so that I can identify disengaged students and intervene early.
- **As a teacher**, I want to toggle gamification on/off per course, so that I can adapt mechanics to class context (e.g., competitive vs. collaborative learning).
- **As a teacher**, I want to see student streak status and badge progress, so that I can acknowledge achievements in class (e.g., "Congratulations on 7-Day Streak!").
- **As a teacher**, I want to override/award XP or badges manually, so that I can reward participation, creativity, or make-up work.

### Untuk Admin Sekolah

- **As an admin**, I want to configure global XP values per activity type (lesson +50 XP, quiz +100 XP, assignment +75 XP), so that we can adapt gamification to school culture.
- **As an admin**, I want to view aggregate engagement metrics (% students at Level 5+, avg streak length, badge distribution), so that I can assess if gamification is working school-wide.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                                                                                                                                                                                                                                                                                                                            | Acceptance Criteria                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **XP System** — Student earns XP on lesson completion, quiz submission (passing & failing), assignment submission                                                                                                                                                                                                                                      | Given a student completes lesson, When lesson is marked "completed" in DB, Then `user_xp` row inserted with `+50 XP` and `xp_type = 'lesson_completion'`; Given student submits quiz, When quiz_attempt submitted, Then `+100 XP` if passing, `+50 XP` if failing; assignment `+75 XP` |
| 2   | **Leveling System** — 10 levels total; Level 1 @ 0 XP, Level 2 @ 200 XP, ..., Level 10 @ 4800 XP (exponential curve)                                                                                                                                                                                                                                   | Given 300 total XP earned, When we call `get_user_level(user_id)`, Then return level 2; Given 5000 XP earned, Then return level 10. Formula: `level = FLOOR(SQRT(xp / 50)) + 1`, capped at 10.                                                                                         |
| 3   | **Badges System** — Minimum 10 badges with rarity (common, uncommon, rare, epic, legendary); unlock via achievement triggers                                                                                                                                                                                                                           | Badges: "First Steps" (1st lesson), "Quiz Master" (10 quizzes), "100 Streak" (100 XP), "Perfect Score" (100% on 5 quizzes), etc.; stored in `user_badges(user_id, badge_id, unlocked_at)`                                                                                              |
| 4   | **Leaderboard v2** — Rank students by total XP within school; show top 100; 5-min refresh (via pg_cron `update-leaderboard-snapshot`)                                                                                                                                                                                                                  | Given 10 students in school, When leaderboard fetched, Then return [rank, user_name, total_xp, level, badge_count]; Updated every 5 min. Snapshot table: `leaderboard_snapshots`                                                                                                       |
| 5   | **Streak System** — Track consecutive days with ≥1 lesson/activity; reset if no activity for 24 hours                                                                                                                                                                                                                                                  | Given student 5 consecutive days of activity, When queried, Then `user_streaks.current_streak = 5`; Given no activity on day 6, When queried on day 7, Then `current_streak = 0` and `longest_streak = 5`                                                                              |
| 6   | **Student Dashboard Widget** — Display: current level, XP progress bar (towards next level), XP gained today, current streak, next milestone                                                                                                                                                                                                           | On `/#/app/student/dashboard`, Show: "Level 3 • 120/200 XP • +50 today • 7-day streak • Next: Level 4 (80 XP left)"; Update every 30 seconds                                                                                                                                           |
| 7   | **Leaderboard Page** — List top 100 students by XP; highlight current user's rank; filter by recent/all-time; pagination                                                                                                                                                                                                                               | Route: `/#/app/student/leaderboard`; Show: rank, name, XP, level, badge count; sort by `total_xp DESC`; highlight self                                                                                                                                                                 |
| 8   | **Badge Display** — Show all unlocked badges on student profile; display rarity (common=gray, rare=blue, epic=purple, legendary=gold)                                                                                                                                                                                                                  | Route: `/#/app/student/badges`; Show unlocked badge list with `badge.rarity` color-coded; hide locked badges in v1                                                                                                                                                                     |
| 9   | **Teacher XP Trends Chart** — Line chart of student XP earned per week for last 8 weeks                                                                                                                                                                                                                                                                | Route: `/#/app/teacher/analytics/xp-trends`; Given data, Render chart with weeks on X-axis, cumulative XP on Y-axis per student                                                                                                                                                        |
| 10  | **RoleRoute Fix for Leaderboard** — Leaderboard accessible to both student AND teacher; use `role={["student","teacher"]}` not `role="student"`                                                                                                                                                                                                        | Given teacher logs in, When navigating to `/#/app/student/leaderboard`, Then access granted (not 403)                                                                                                                                                                                  |
| 11  | **pg_cron Processor** — `badge-xp-streak-processor` job runs every 5 min, triggers badge unlock checks, streak resets, snapshot updates                                                                                                                                                                                                                | Job: `SELECT process_gamification()` (RPC); idempotent, timezone-aware (school timezone), handles thousands of students in <30 seconds                                                                                                                                                 |
| 12  | **Database Schema** — Create tables: `user_xp(id, user_id, xp_amount, xp_type, created_at)`, `user_badges(id, user_id, badge_id, unlocked_at)`, `user_streaks(user_id, current_streak, longest_streak, last_activity_at)`, `leaderboard_snapshots(id, user_id, rank, total_xp, level, snapshot_at)`, `badges(id, name, description, rarity, icon_url)` | RLS enabled on all. All with `tenant_id` column. `user_xp` indexed on `(user_id, created_at)` for fast trends. `leaderboard_snapshots` indexed on `(tenant_id, rank)` for top 100 query.                                                                                               |

### P1 — Nice to Have

| #   | Requirement                                                                                 | Note                                               |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | **Manual XP Override (Admin/Teacher)** — Button to award/revoke XP with reason              | Roadmap Q2 2026; requires audit log                |
| 2   | **Per-Course XP Tuning** — Different XP values per course (e.g., math +100, art +50)        | Roadmap Q2 2026; requires `course_xp_config` table |
| 3   | **Achievement Milestones** — "You reached 1000 XP!" toast notifications                     | Nice polish; low priority                          |
| 4   | **Streak Day Counter (offline support)** — Show "streak continues on next login" if offline | Edge case; v1 assumes online                       |
| 5   | **Badge Showcase on Profile** — Public badge display (privacy audit needed)                 | Backlog Q3 2026                                    |

### P2 — Future Considerations

| #   | Requirement                                                                     | Reason                                      |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **Predictive Badge Unlock** — Pre-show "you're 2 quizzes away from Quiz Master" | Requires prompt-based triggers; V2          |
| 2   | **Social Leaderboard (teams)** — Group students into teams, team leaderboard    | Scope creep; social features Q3             |
| 3   | **XP Decay Over Time** — Old XP counts less (e.g., 90-day moving avg)           | Complexity; analyze usage first             |
| 4   | **WebSocket Real-time Leaderboard** — Push updates instead of polling           | Infrastructure cost; Q3                     |
| 5   | **Skill-based Badges** — "Algebra Expert" based on quiz performance in topic    | Requires curriculum mapping; future roadmap |

---

## 6. Success Metrics

### Leading Indicators (days–weeks)

| Metric                       | Target                                     | Cara Ukur                                                                                                                                          | Owner             |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Daily Active Users (DAU)** | 65% of enrolled students                   | `SELECT COUNT(DISTINCT user_id) FROM student_lesson_signals WHERE last_accessed_at >= NOW() - INTERVAL '1 day' AND tenant_id = ?` / total enrolled | Product/Analytics |
| **Quiz Completion Rate**     | 80% (vs. 55% baseline)                     | `SUM(quizzes_completed) / SUM(lessons_completed)` per course                                                                                       | Product           |
| **XP Awarded (Daily)**       | Avg +5000 XP/day per 100 students          | Monitor `user_xp` insertion rate via `process-gamification` job logs                                                                               | Engineering       |
| **Badge Unlock Rate**        | 40% students unlock ≥1 badge in first week | `COUNT(DISTINCT user_id) FROM user_badges WHERE DATE(unlocked_at) = TODAY()`                                                                       | Product           |
| **Leaderboard Page Views**   | 30% of DAU visit leaderboard weekly        | Event tracking via Supabase analytics (TBD instrumentation)                                                                                        | Product           |

### Lagging Indicators (weeks–months)

| Metric                               | Target                                            | Cara Ukur                                                  | Owner     |
| ------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------- | --------- |
| **Retention (7-day)**                | 70% (vs. 50% baseline)                            | `users_active_on_day_7 / users_registered`                 | Product   |
| **Avg Lessons per Student (weekly)** | ≥3 lessons/week                                   | `SUM(lessons_completed) / COUNT(DISTINCT user_id) / weeks` | Product   |
| **Avg Streak Length**                | 4 days                                            | `SELECT AVG(current_streak) FROM user_streaks` per school  | Analytics |
| **XP Distribution (Gini Index)**     | 0.4–0.6 (healthy inequality, not winner-take-all) | Monitor Gini via analytics dashboard                       | Product   |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                     | Owner          | Blocking?                                       |
| --- | ---------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- |
| 1   | Should XP earned be visible in real-time (immediate toast) or batched (end of lesson)?         | Design/UX      | Ya — impacts toast notification implementation  |
| 2   | For leaderboard, do we show first/last names or just first names? (privacy concern for minors) | Security/Legal | Ya — RLS may need adjustment                    |
| 3   | Should streak reset at midnight school-timezone or UTC?                                        | Engineering    | Ya — `user_streaks` trigger logic               |
| 4   | Do we award XP for partial quiz attempts (e.g., unanswered Q) or only completed quizzes?       | Product        | Tidak — default to "completed only", can refine |
| 5   | Should badges be earned server-side (trigger-based) or client-side (query-based)?              | Engineering    | Ya — affects performance                        |
| 6   | Do we need certificate generation (PDF) in v1 or is v2 acceptable?                             | Product        | Tidak — backlog acceptable                      |
| 7   | Should admin be able to reset school-wide streaks or only individual resets?                   | Product        | Tidak — start with individual only              |

---

## 8. Timeline & Phases

**Phase 1: Core XP + Leveling (Week 1–2)**

- Database schema (user_xp, user_levels, badges)
- XP earn logic (lesson/quiz/assignment completion triggers)
- Level computation RPC
- Frontend: XP progress bar widget

**Phase 2: Badges + Streaks (Week 3)**

- Badge unlock triggers (10 badges defined)
- Streak tracking (reset logic, timezone handling)
- pg_cron job for badge/streak processor

**Phase 3: Leaderboard + UI Polish (Week 4)**

- Leaderboard snapshot table & refresh job
- Leaderboard page (top 100, pagination, current user highlight)
- Badge showcase
- Dashboard widget refinement
- RoleRoute fix (student + teacher access)

**Phase 4: Teacher Features + Testing (Week 5)**

- XP trends chart for teachers
- Manual XP override UI (if time permits, else P1)
- QA, edge case testing, performance tuning

**Hard Deadline:** End of Q1 2026 (March 31 = 2 weeks from now). Soft launch to 1 school as beta, gather feedback.

---

## 9. Dependensi & Risiko

### Dependensi

1. **Database Schema must be committed FIRST** — RLS policies, tenant isolation
2. **Core auth/identity working** — `useAuth()` hook must return user_id reliably
3. **React Query v5 for data fetching** — user_xp, leaderboard queries
4. **Supabase pg_cron availability** — job scheduling for badge-processor
5. **Lesson/quiz completion triggers** — must exist in database before XP earn logic can hook in

### Risiko & Mitigasi

| Risiko                                                            | Impact | Mitigasi                                                                                                                                   |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **XP farming** (student manipulates quiz/lesson to gain fake XP)  | HIGH   | Validate quiz_attempt.passing_score >= 50% before awarding XP; log all XP sources with audit trail; teacher can review suspicious activity |
| **Performance: leaderboard queries slow** (N+1 on 1000+ students) | HIGH   | Pre-compute `leaderboard_snapshots` every 5 min; query snapshot, not raw user_xp table. Index on (tenant_id, rank)                         |
| **Streak timezone off-by-one**                                    | MEDIUM | Define strict UTC-based streak reset (NOT school-tz) in v1; document constraint; add timezone support in v2                                |
| **Badge unlock triggers fire multiple times**                     | MEDIUM | Make badge unlock idempotent: `INSERT ... ON CONFLICT DO NOTHING`; pg_cron job is idempotent                                               |
| **Mobile UI XP widget breaks on small screens**                   | MEDIUM | Mobile-first CSS testing required; XP bar responsiveness a/b test on iPhone SE                                                             |
| **Leaderboard ranking ties** (2 students same XP)                 | LOW    | Tiebreak by `created_at ASC` (oldest account wins); document in leaderboard page                                                           |

### Edge Cases

1. **Student completes lesson twice** — Only award XP once (query `user_xp WHERE xp_type = 'lesson_completion' AND source_lesson_id = ?`)
2. **Student deleted mid-course** — Keep `user_xp` records; RLS handles tenant isolation
3. **Teacher overrides student level** — Allow soft override (award XP) not hard reset (teaches don't like their data erased)
4. **Multi-language support** — Badges names/descriptions in `badges.name_id` (refer to i18n key, NOT hardcoded English)

---

## 10. Success Criteria for Launch

- [ ] All P0 requirements implemented & tested
- [ ] Leaderboard loads in <500ms (top 100 students)
- [ ] XP awarded within 2 seconds of lesson/quiz completion
- [ ] Badge unlock triggers are idempotent (no duplicates)
- [ ] 1 beta school deployed, 100+ students active, 0 critical bugs in 7 days
- [ ] Dark mode CSS complete for all gamification UI
- [ ] RoleRoute leaderboard access fixed (student + teacher)
- [ ] Documentation updated: DATABASE.md, GAMIFICATION.md, ENGINEERING_ROADMAP.md

---

## Appendix A: XP & Level Formula

```
XP per activity:
- Lesson completion: +50 XP
- Quiz submission (passing, ≥50%): +100 XP
- Quiz submission (failing, <50%): +50 XP
- Assignment submission: +75 XP
- Bonus (streak day 7, 14, 21, etc.): +25 XP

Level calculation:
level = FLOOR(SQRT(total_xp / 50)) + 1, capped at 10
Example:
- 0 XP = Level 1
- 200 XP = Level 2 (FLOOR(SQRT(200/50)) + 1 = FLOOR(2) + 1 = 3... adjust formula if needed)

Simplified for implementation:
Level 1: 0 XP
Level 2: 200 XP
Level 3: 400 XP
Level 4: 700 XP
Level 5: 1050 XP
Level 6: 1450 XP
Level 7: 1900 XP
Level 8: 2400 XP
Level 9: 2950 XP
Level 10: 3550 XP (max)
```

---

## Appendix B: Badge Definitions

| Badge ID | Name                 | Description                        | Rarity    | Unlock Trigger                                                               |
| -------- | -------------------- | ---------------------------------- | --------- | ---------------------------------------------------------------------------- |
| 1        | Pemula               | Selesaikan lesson pertama          | Common    | `user_xp.xp_type = 'lesson_completion'` AND user has exactly 1               |
| 2        | Quiz Master          | Selesaikan 10 quiz attempts        | Uncommon  | `COUNT(*) FROM quiz_attempts WHERE user_id = ? AND passing_score >= 50` = 10 |
| 3        | XP Collector         | Kumpulkan 100 XP                   | Common    | `SUM(xp_amount) FROM user_xp WHERE user_id = ?` >= 100                       |
| 4        | Perfect Week         | 7 hari berturut-turut aktif        | Rare      | `user_streaks.current_streak = 7`                                            |
| 5        | Perfect Score        | Dapatkan 100% pada 5 quiz          | Epic      | `COUNT(*) FROM quiz_attempts WHERE user_id = ? AND score = 100` >= 5         |
| 6        | Leaderboard Champion | Rank #1 pada leaderboard           | Legendary | `leaderboard_snapshots.rank = 1 AND user_id = ?` for 7 consecutive days      |
| 7        | Assignment Pro       | Selesaikan 20 assignment           | Uncommon  | `COUNT(*) FROM assignment_submissions WHERE user_id = ?` >= 20               |
| 8        | Quick Learner        | Selesaikan lesson dalam 5 menit    | Rare      | `student_lesson_signals.total_time_spent <= 300 seconds`                     |
| 9        | Night Owl            | Aktif belajar setelah jam 10 malam | Uncommon  | `HOUR(created_at) >= 22` for 5 activities                                    |
| 10       | Comeback Kid         | Return setelah 7 hari tidak aktif  | Rare      | `last_accessed_at IS NULL for 7 days`, then `last_accessed_at = TODAY()`     |

---

**End of PRD — Gamification System**
