# Documentation Changelog

---

## 2026-03-21

### Full Documentation Audit Pass

**Created (new files):**
- `README.md` — Full project overview: stack, env vars, setup, structure, route reference
- `CLAUDE.md` — Claude engineering guide: conventions, gotchas, documentation policy
- `CONTRIBUTING.md` — Developer guide: branch strategy, commit conventions, checklist
- `DEPLOYMENT.md` — Deployment guide: Supabase setup, migration order, hosting
- `CHANGELOG.md` — Version history: v1.0-rc release notes
- `docs/ARCHITECTURE.md` — System architecture: frontend, routing, multi-tenant, feature modules, edge functions
- `docs/DATABASE.md` — Database reference: key tables, column gotchas, RPCs, triggers, pg_cron, migration milestones
- `docs/AUTH.md` — Auth guide: JWT claims, AuthContext API, signUp flow, known limitations
- `docs/SECURITY.md` — Security model: RLS patterns, 5 security fixes (migration 836), remediation history
- `docs/GAMIFICATION.md` — Gamification: XP, levels, badges, leaderboard v2, streaks, struggle score
- `docs/ANALYTICS.md` — Analytics: architecture, engagement segments, struggle detection, pg_cron, SQL gotchas
- `docs/TESTING.md` — Testing guide: accounts, known limitations, ship criteria, post-ship backlog

**Updated (stale content fixed):**
- `docs/USERFLOW.md` — Rewrote all route paths to use hash routing (`/#/`); updated flows to match current Smart Player and quiz architecture
- `src/features/quizzes/README.md` — Updated from "Phase 1 Scaffolding In Progress" to accurate "Complete" status with actual RPC reference

**Audit findings:**
- All other existing docs (`DATABASE_ARCHITECTURE.md`, `AUTH_SETUP_GUIDE.md`, `ENGINEERING_ROADMAP.md`, `RLS_POLICIES.md`, `TENANT_ARCHITECTURE.md`, `TENANT_SECURITY_AUDIT.md`, `SYSTEM_MAP.md`, `MIGRATION_RESET_GUIDE.md`) verified as CURRENT

---

## 2026-03-20

### docs/MIGRATION_RESET_GUIDE.md
- **Rewrote** entire file — migration count 94 → 157, range updated to 001–825
- **Updated** migration chain range table to reflect 001–825 groupings
- **Updated** key migrations list (added 082, 095, 808, 810, 821, 822, 825)
- **Added** Fresh Project Setup section (pg_cron requirement, 825 seed requirement)
- **Updated** Migration Files Reference section with new table categories
- **Added** idempotency pattern for DROP POLICY IF EXISTS and pg_cron unschedule

### docs/architecture/ADR.md (ADR-008)
- **Added** `progress-events` edge function (was missing from list)
- **Fixed** edge function count: 6 → 7
- **Clarified** Groq as the LLM provider for ai-tutor, ai-grade-essay, generate-ai-content

### docs/ENGINEERING_ROADMAP.md
- **Rewrote** entirely — all phases A–I now marked complete, new phases 12–14 added
- **Added** Phase 6–11 (Smart Player, Advanced Analytics, Gamification v2, Auth/Guidance/Attendance)
- **Added** Active Phase 12 (Feature Module Consolidation) with todo list
- **Added** Upcoming Phase 13 (Performance) and Phase 14 (E2E Tests)
- **Added** Infrastructure status table

### docs/architecture/TECHNICAL_ROADMAP_V2.md
- **Updated** debt inventory: added Status column (✅/🔄/⏳)
- **Marked** D1 (lazy loading) ✅ Done — routes.tsx uses React.lazy for all pages
- **Marked** D2 (13 contexts) ✅ Done — now 4 contexts (Auth, Builder, Theme, Toast)
- **Marked** D11 (TenantContext) ✅ Done — TenantContext.tsx deleted
- **Marked** D3, D4, D5 🔄 Partial — in progress
- **Marked** D6, D7, D8, D9, D10, D12 ⏳ Pending

### QUIZ_ENGINE_AUDIT_REPORT.md
- **Added** ⚠️ HISTORICAL DOCUMENT banner at top
- **Added** note that vulnerabilities were addressed in migrations 090, 095, 096

---

## 2026-03-19

### docs/architecture/EDUSYNC_BLUEPRINT.md
- **Updated** Current State table: migration count 95 → 157 (001–825)
- **Updated** Migration safety: "All 95 pass" → "All 157 pass"
- **Updated** Auth status: added Google OAuth and class join-code flow
- **Updated** Feature modules: reflect analytics, gamification, guidance, struggle modules
- **Updated** AI Tutor: clarified Groq provider
- **Updated** State management: reflect reduced context + feature stores

### docs/SYSTEM_MAP.md
- **Removed** `quiz-heartbeat` edge function (does not exist in codebase)
- **Added** `ai-grade-essay` edge function in Module 6 (Quiz)
- **Added** `generate-ai-content` edge function in AI Tutor section
- **Clarified** AI Tutor provider: Groq `llama-3.1-70b-versatile`
- **Added** 19 new tables to Module 9 (Analytics): aggregation engine, predictive alerts, struggle detection, guidance, badges v2, XP/leaderboard, attendance
- **Added** 17 new RPCs to Module 9: aggregation, engagement scoring, badge/XP system, leaderboard v2, registration helpers
- **Updated** Document version: 1.0 → 1.1 (2026-03-19)

### docs/architecture/FEATURE_MAP.md
- **Updated** Feature Overview mindmap: added Smart Player, AI Tutor, Group Assignments, AI Essay Grading, Question Bank, XP system, certificates, cohort retention, funnel analysis, path analysis, predictive alerts, struggle detection, guidance system, attendance, auth improvements
- **Updated** Quiz Feature List: added question types (MCQ/True-False/Multiple-Select/Short Answer/Essay), question bank, randomization, AI essay grading, anti-cheat, autosave, review screen
- **Updated** Gamification Feature List: replaced old points/badges with XP transactions, level progression (10 levels), badges v2 (rarity tiers), certificates, leaderboard v2, streak bonuses
- **Updated** Analytics Feature List: replaced basic analytics with v2 dashboard, engagement scoring, cohort retention, funnel analysis, path analysis, predictive alerts, struggle detection, per-course analytics page
- **Added** Section 9: Auth & Registration (Google OAuth, class join code, pending join code, default tenant fallback)
- **Added** Section 10: In-App Guidance (walkthroughs, tooltips, banners, checkpoints)
- **Added** Section 11: Attendance (teacher scan, student view, JSONB details)
- **Updated** Feature-to-Table mapping: reflects current table names (`quiz_attempts_v2`, `badge_definitions`, `student_badges`, `xp_transactions`, etc.)
- **Updated** Services mapping: reflects current feature module paths

### docs/architecture/README.md
- **Fixed** broken links: `./docs/DATABASE_ARCHITECTURE.md` → `../DATABASE_ARCHITECTURE.md`
- **Fixed** broken links: `./docs/USERFLOW.md` → `../USERFLOW.md`
- **Fixed** broken links: `./docs/ENGINEERING_ROADMAP.md` → `../ENGINEERING_ROADMAP.md`
- **Added** links to `FEATURE_MAP.md` and `SYSTEM_MAP.md`
