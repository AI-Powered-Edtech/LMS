# Phase 22 — Gap Analysis

> Dibuat: 30 Maret 2026
> Berdasarkan audit codebase aktual terhadap gap summary 29 Maret 2026

---

## Verified Gaps (Masih Open)

### HIGH

| ID  | Deskripsi                                         | File Target                   | Estimasi |
| --- | ------------------------------------------------- | ----------------------------- | -------- |
| G13 | Status badge strings — 11 file render raw/English | Lihat daftar lengkap di bawah | 2 jam    |

### MEDIUM

| ID  | Deskripsi                                    | File Target                                             | Estimasi |
| --- | -------------------------------------------- | ------------------------------------------------------- | -------- |
| G14 | ESLint `ban-ts-comment` belum ada            | `eslint.config.js`                                      | 15 mnt   |
| G17 | Visual regression — no pixel-diff assertions | `playwright.config.ts`, `e2e/visual-regression.spec.ts` | 1 jam    |

### LOW

| ID | Deskripsi                                    | File Target                              | Estimasi |
| -- | -------------------------------------------- | ---------------------------------------- | -------- |
| G7 | FeatureErrorBoundary no auth error detection | `src/components/FeatureErrorBoundary.tsx` | 45 mnt   |

---

## Verified Closed (Tidak Butuh Aksi)

| ID Asli | Deskripsi                          | Bukti                                  |
| ------- | ---------------------------------- | -------------------------------------- |
| Gap 1   | LazyLoadTimeout di-wire ke routing | `src/app/routes/utils.tsx:20-22`       |
| Gap 11  | Proactive token refresh            | `src/contexts/AuthContext.tsx:525-569` |
| Gap 16  | E2E test flows lengkap             | `e2e/flows/` — 5/5 flows ada          |

---

## Detail G13: Status Badge String Files

| #  | File                                                                   | Line   | Field               | Severity | Fix                            |
| -- | ---------------------------------------------------------------------- | ------ | ------------------- | -------- | ------------------------------ |
| 1  | `src/features/lessons/components/StudentCoursesList.tsx`                | 103    | `course.status`     | HIGH     | `translateCourseStatus()`      |
| 2  | `src/features/quizzes/components/analytics/SuspiciousAttemptsPanel.tsx` | 179    | `attempt.status`    | HIGH     | `translateQuizAttemptStatus()` |
| 3  | `src/pages/AdminQuizOverview.tsx`                                       | 34, 36 | statusBadge labels  | MODERATE | Translate labels ke ID         |
| 4  | `src/pages/admin/BillingDashboard.tsx`                                  | 46, 52 | getStatusLabel()    | MODERATE | Translate 'Draft' to 'Draf'    |
| 5  | `src/components/CourseBuilder/BuilderTopBar.tsx`                        | 76-80  | courseStatus         | LOW-MOD  | Add in_review, approved        |
| 6  | `src/components/CourseBuilder/BuilderSidebar.tsx`                       | 332    | `lesson.type`       | LOW      | `translateLessonType()`        |
| 7  | `src/pages/admin/ModerationDashboard.tsx`                               | 204    | `report.contentType`| LOW      | `translateContentType()`       |
| 8  | `src/features/calendar/components/AgendaView.tsx`                       | 79     | `event.type`        | LOW      | `translateEventType()`         |
| 9  | `src/features/calendar/components/CalendarSidebar.tsx`                  | 92     | `event.type`        | LOW      | `translateEventType()`         |
| 10 | `src/features/dashboards/components/sections/UpcomingAssignments.tsx`   | 75     | `task.type`         | LOW      | Map type ke Bahasa Indonesia   |
| 11 | `src/pages/Assignments.tsx`                                             | 332    | `att.type`          | LOW      | Map attachment type            |

---

## Sprint 25A Resolution Status

| ID  | Status         | Resolved By                                                         |
| --- | -------------- | ------------------------------------------------------------------- |
| G13 | CLOSED         | Sprint 25A Task 1 — Extended statusTranslations.ts + fixed 11 files |
| G14 | CLOSED         | Sprint 25A Task 2 — ban-ts-comment rule added to eslint.config.js   |
| G17 | IN PROGRESS    | Sprint 25A Task 3 — Pending playwright.config.ts + e2e migration    |
| G7  | CLOSED         | Sprint 25A Task 4 — isAuthError() helper + auth error branch added  |

---

## Risiko Baru dari Phase 22

| Risiko                                                | Severity | Mitigasi           |
| ----------------------------------------------------- | -------- | ------------------ |
| LTI/SCORM tanpa E2E test                              | High     | Sprint 25B         |
| Group Assignments — 3 tabel baru belum di-QA mendalam | Medium   | Sprint 25B         |
| statusTranslations.ts tidak dipakai oleh UI           | High     | Sprint 25A (G13)   |
| Bundle size setelah Phase 22 additions                | Medium   | Sprint 25C         |