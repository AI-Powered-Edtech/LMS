# EduSync LMS — 4 Feature PRD Quick Reference

**Created:** 2026-03-22  
**Version:** 1.0  
**Author:** Engineering Team

---

## 📋 Document Index

### 1. **PRD_gamification.md** — Gamification System

- **Status:** ✅ Mature
- **Core Features:** XP system (10 levels), badges (10+), leaderboard v2, streaks, certificates
- **P0 Requirements:** 12 critical features
- **Database Tables:** `user_xp`, `user_badges`, `user_streaks`, `leaderboard_snapshots`, `badges`
- **Key Routes:** `/#/app/student/leaderboard`, `/#/app/student/badges`
- **Cron Job:** `badge-xp-streak-processor` (every 5 min)
- **Timeline:** 5 weeks (Hard deadline: March 31, 2026)
- **Success Metrics:**
  - Leading: DAU 65%, quiz completion 80%, XP awarded 5000/day per 100 students
  - Lagging: 7-day retention 70%, avg lessons/week ≥3

### 2. **PRD_gradebook.md** — Gradebook System

- **Status:** ✅ Live
- **Core Features:** Multi-view (quiz/assignment/all), SpeedGrader, auto-grade quizzes, weighted grades, CSV export
- **P0 Requirements:** 16 critical features
- **Database Tables:** `assignment_grades`, `assignment_feedback`, `course_grading_config`, `student_course_grades`
- **Key Routes:** `/#/app/teacher/gradebook`, `/#/app/teacher/quiz-gradebook`, `/#/app/teacher/assignment-gradebook`
- **Mobile:** Responsive on iPad (90%) and phone (core features 70%)
- **Timeline:** 4 weeks (Hard deadline: March 31, 2026)
- **Success Metrics:**
  - Leading: Page load <800ms (p95), SpeedGrader save <500ms, 80% teacher usage
  - Lagging: Teacher time savings 60%, parent satisfaction 85% (future)

### 3. **PRD_progress.md** — Progress Tracking System

- **Status:** ✅ Live
- **Core Features:** Event-driven computation, course/module/lesson tracking, quiz integration, time metrics, teacher class view
- **P0 Requirements:** 16 critical features
- **Database Tables:** `course_progress`, `module_progress` (with `student_lesson_signals`)
- **Key Routes:** `/#/app/student/dashboard`, `/#/app/teacher/classes/[courseId]/progress`
- **RPC:** `update_progress_on_activity()`, `compute_final_grades()`
- **Timeline:** 4 weeks (Hard deadline: March 31, 2026)
- **Success Metrics:**
  - Leading: Dashboard views 70% DAU/week, computation latency <2s (p95), teacher page load <1s
  - Lagging: Course completion 70%, assignment deadline compliance 75%, avg 3+ lessons/week

### 4. **PRD_recommendations.md** — Recommendations System

- **Status:** ✅ Live
- **Core Features:** SmartNextButton, ReviewPrompt, assignment alerts, catch-up recommendation, on-pace indicator, teacher follow-ups
- **P0 Requirements:** 15 critical features
- **Database Tables:** `student_recommendations` (tracking table)
- **Key Routes:** `/#/app/teacher/follow-ups/[courseId]`, dashboard widgets
- **RPC:** `get_next_recommended_lesson()`, `check_student_on_pace()`
- **Timeline:** 4 weeks (Hard deadline: March 31, 2026)
- **Success Metrics:**
  - Leading: SmartNextButton CTR 80%, ReviewPrompt show 100% when score <60%, accept rate 60%
  - Lagging: Quiz pass rate 75%, assignment on-time 80%, 70% students follow recommended path

---

## 🎯 Cross-feature Dependencies

```
PROGRESS TRACKING ← Foundation
         ↓
    [Events: lesson completion, quiz submit, assignment submit]
         ↓
GAMIFICATION ← Uses progress to award XP & badges
         ↓
RECOMMENDATIONS ← Uses progress & gamification to suggest next actions
         ↓
GRADEBOOK ← Uses quiz/assignment data from all above
```

---

## 📊 P0 Requirement Summary

| System              | P0 Count | Key P0 Items                                                                                            |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| **Gamification**    | 12       | XP system, leveling (10 levels), badges (10+), leaderboard, streak tracking, pg_cron processor          |
| **Gradebook**       | 16       | Multi-view table, SpeedGrader, auto-grade, weighted grading, CSV export, mobile responsive              |
| **Progress**        | 16       | Event-driven computation, course/module/lesson tracking, teacher view, estimated completion, CSV export |
| **Recommendations** | 15       | SmartNextButton, ReviewPrompt, assignment alerts, catch-up, on-pace indicator, teacher follow-ups       |
| **TOTAL**           | **59**   | All critical for Q1 2026 launch                                                                         |

---

## 🗓️ Phase Timeline (All 4 Features)

Each feature follows 4-week sprint:

**Week 1–2:**

- Data model design & schema
- Core logic (RPC implementations)
- Foundation queries & triggers

**Week 2–3:**

- Frontend components
- Integration with existing modules
- Mobile responsiveness testing

**Week 3–4:**

- Polish & optimization
- Dark mode CSS
- QA & edge case testing

**Week 4+:**

- Beta launch to 3–5 schools
- Gather feedback
- Iteration based on real usage

**Hard Deadline:** March 31, 2026

---

## ✅ Launch Checklist (Per Feature)

Each PRD includes specific "Success Criteria for Launch":

**Gamification:**

- [ ] RoleRoute leaderboard fix (student + teacher)
- [ ] pg_cron badge-processor idempotent
- [ ] XP awarded within 2 seconds
- [ ] Mobile leaderboard responsive
- [ ] 1 beta school, 100+ students, 0 critical bugs/7 days

**Gradebook:**

- [ ] SpeedGrader latency <500ms
- [ ] CSV export RFC 4180 format
- [ ] Mobile: 90% iPad, 70% phone
- [ ] Teacher time savings measurable
- [ ] 5 beta schools, <5 critical bugs/7 days

**Progress:**

- [ ] Computation latency <2s (p95)
- [ ] Progress % formula verified (10+ test cases)
- [ ] Teacher page load <1s for 500 students
- [ ] Virtual scroll/pagination working
- [ ] 3 beta schools, <3 critical bugs/7 days

**Recommendations:**

- [ ] SmartNextButton shows correct recommendations
- [ ] ReviewPrompt triggers only on score <60%
- [ ] RPC latency <200ms
- [ ] Assignment alerts accurate
- [ ] 2–3 beta schools, <3 critical bugs/7 days

---

## 🔗 Key Routes Summary

### Student Routes

| Feature         | Route                        | Purpose                                      |
| --------------- | ---------------------------- | -------------------------------------------- |
| Gamification    | `/#/app/student/leaderboard` | View XP leaderboard, rank                    |
| Gamification    | `/#/app/student/badges`      | View earned badges                           |
| Progress        | `/#/app/student/dashboard`   | View course progress, metrics                |
| Recommendations | Dashboard widget             | SmartNextButton, assignment alerts, catch-up |

### Teacher Routes

| Feature         | Route                                        | Purpose                              |
| --------------- | -------------------------------------------- | ------------------------------------ |
| Gamification    | `/#/app/teacher/analytics/xp-trends`         | View student XP trends               |
| Gradebook       | `/#/app/teacher/gradebook`                   | Multi-view grade table               |
| Gradebook       | `/#/app/teacher/quiz-gradebook`              | Quiz-only grades                     |
| Gradebook       | `/#/app/teacher/assignment-gradebook`        | Assignment-only grades               |
| Progress        | `/#/app/teacher/classes/[courseId]/progress` | Class progress view                  |
| Recommendations | `/#/app/teacher/follow-ups/[courseId]`       | Follow-up list (low scores, overdue) |

---

## 🛠️ Technology Stack (Shared)

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **State:** React Query v5 (server state), Zustand v5 (local feature state)
- **Routing:** React Router v7 (hash routing `#/`)
- **Charts:** Recharts (for analytics views)
- **Animations:** Framer Motion / `motion` (for progress bars, transitions)
- **Icons:** Lucide React
- **Language:** All UI text in Bahasa Indonesia

---

## 📚 Integration with Existing Systems

All 4 features depend on:

1. **Lesson module** — lesson completion triggers
2. **Quiz module** — quiz submission & auto-grading
3. **Assignment module** — assignment submission & tracking
4. **Student lesson signals** — time tracking, engagement metrics
5. **Authentication** — `useAuth()` hook for identity/role
6. **RLS policies** — tenant isolation, role-based access
7. **pg_cron** — background job scheduling

---

## 📖 Documentation Structure

Each PRD includes:

- **Problem Statement** (2–3 paragraphs)
- **Goals** (3–5 measurable outcomes)
- **Non-Goals** (explicit scope exclusions)
- **User Stories** (by persona)
- **Requirements** (P0/P1/P2 with acceptance criteria)
- **Success Metrics** (leading + lagging indicators)
- **Open Questions** (blocking + non-blocking)
- **Timeline & Phases** (4-week sprint breakdown)
- **Dependencies & Risks** (with mitigations)
- **Technical Notes** (SQL, RPC code)
- **Success Criteria for Launch** (checklist)
- **Appendices** (formulas, tables, examples)

---

## 🚀 Getting Started for Engineers

1. **Pick a feature:** Start with Gamification or Progress (foundations)
2. **Read the PRD:** Understand problem, goals, user stories
3. **Review P0 requirements:** Each has specific acceptance criteria
4. **Check database schema:** SQL code provided
5. **Implement RPC:** SQL examples in Technical Notes
6. **Build frontend:** Routes, components, mobile-first
7. **Test:** Against acceptance criteria, edge cases
8. **Measure:** Track success metrics

Each PRD is **self-contained and actionable** — developer should not need external specs.

---

**Last Updated:** 2026-03-22  
**Next Review:** 2026-03-31 (Hard Deadline)
