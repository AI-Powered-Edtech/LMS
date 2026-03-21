# EduSync LMS — Changelog

## v1.0-rc2 (2026-03-21) — Post-Ship Release Hardening

### Bug Fixes
- **BUG-C2-006 (CLOSED)**: Admin dashboard "Failed to fetch tenant modules" console error silenced. `administrationService.getTenantModules()` now uses a left join instead of inner join on `modules` table, filters null rows, and demotes the log from `error` to `warn`. The dashboard still falls back to hardcoded defaults when no DB rows exist.

### Database
- **Migration 840**: Enables RLS on `tenant_modules` table (previously had no policies despite GRANT ALL). Adds admin SELECT + UPDATE policies scoped to `get_my_tenant_id()`. Seeds missing `tenant_modules` rows for existing tenants that predate the `auto_add_modules_for_tenant` trigger.

### Documentation
- **`docs/DEVELOPER_RUNBOOK.md`** (new): Complete developer onboarding guide covering prerequisites, environment setup, database seeding, test accounts, migration checklist, golden paths per role, common issues, and offline/dark mode notes.

---

## v1.0-rc (2026-03-21) — Initial Ship-Ready Release

### Features

**Smart Player (SP-0 → SP-12)**
- Article, video, and quiz lesson types
- Sidebar with module/lesson navigation and progress indicators
- ScrollProgressBar for article lessons
- Auto-advance and SmartNextButton for lesson completion
- ModuleCompletionModal on module finish
- AI Tutor integration within lesson context
- Recommendations feed for next lesson suggestions

**Quiz Engine**
- Multi-type questions: MCQ, True/False, Multiple Select, Short Answer, Essay
- Autosave with partial answer persistence
- Timer with clamping and late submission handling
- Review screen after submission
- QuizResultsView with score labels in Bahasa Indonesia
- Question Palette for navigation during quiz
- Question Bank for reusable questions

**Analytics**
- Teacher analytics dashboard: completion %, struggle score, time spent, quiz avg
- 4 engagement segments: Aktif, Berkembang, Perlu Perhatian, Pasif
- Struggle detection (0–11 composite score)
- Cohort retention, funnel analysis, path analysis
- Predictive at-risk alerts
- pg_cron-based aggregation pipeline

**Gamification v2**
- XP transactions and level progression (10 levels)
- Badge definitions with rarity tiers
- Leaderboard v2 (tenant-scoped)
- Daily streaks with streak_current/streak_longest
- Confetti on quiz pass

**Auth & Multi-Tenant**
- Google OAuth (optional)
- Class join-code enrollment
- Multi-step onboarding wizard
- TenantGuard + RoleGuard routing
- custom_access_token_hook for JWT claims

**Other**
- In-app guidance: walkthroughs, tooltips, banners
- Attendance system: teacher scan, student view
- Course builder with publish/draft/archive workflow
- Gradebook, SpeedGrader, AssignmentGradebook, QuizGradebook
- Announcements with unread state

### Security Hardening

5 HIGH vulnerabilities patched (migration 836):
- `award_quiz_xp`: added `auth.uid() = p_user_id` identity check
- `v1_get_quiz_results`: added `SET search_path TO 'public'`
- `aggregation_state`: enabled RLS, restricted to admin/service role
- `student_lesson_signals`: tightened RLS to own-data-only for students
- `quiz_submission_queue`: removed `user_id IS NULL` wildcard INSERT policy

### QA Sprint Results (2026-03-21)

Full QA sprint with 7 cycles (Pre + QA-1..4 + Dev-1..3):
- 40+ bugs found and fixed
- All CRITICAL and HIGH bugs resolved
- Known limitations documented in `qa-dev-state.md`

### Architecture

- 157 migration files (001–836)
- 7 Edge Functions deployed
- Feature module architecture: `src/features/{domain}/`
- 4 React contexts (down from 13)
- Bundle splitting: 7 manual chunks for optimal loading

### Known Limitations (Post-Ship Backlog)

| ID | Description |
|----|-------------|
| BUG-C3-006 | QuizPlayer: `isOnline` hardcoded — offline warning dead code |
| BUG-C3-008 | HubView: no empty-state for zero items |
| NEW-QA4-002 | Gradebook: local mock data, no Supabase persistence yet |
| FG-PRE-001 | No self-serve school registration wizard |
| BUG-C2-002 | Student course discovery is join-code only (by design) |
| BUG-PRE-006 | Workspace selector text partially in English |
