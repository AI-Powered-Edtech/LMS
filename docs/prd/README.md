# PRD Collection — EduSync LMS Feature Modules

**Generated:** 2026-03-22  
**Version:** 1.0  
**Purpose:** Comprehensive Product Requirements Documents for 4 core EduSync feature modules

---

## Overview

This directory contains full PRDs (Product Requirements Documents) for 4 critical feature modules in EduSync LMS. Each PRD follows a standardized format and provides actionable requirements for engineering teams.

**Key:** All user-visible copy is in Bahasa Indonesia. Technical terms (table names, API endpoints, routes) are in English.

---

## Files in This Collection

### 1. **PRD_analytics.md** (333 lines)

**Feature Module:** `src/features/analytics/`  
**Status:** Live (Performance Optimization Phase)

Teacher analytics dashboard with real-time engagement metrics, student progress tracking, and struggle detection.

**Key Topics:**

- Problem: Dashboard blank 10–20s without skeleton screens
- Goals: Instant-load skeleton, zero-jank scrolling (60 FPS), early warning system
- Requirements: Virtual list for 100+ students, engagement segments (Aktif/Berkembang/Perlu Perhatian/Pasif), stale-time caching strategy
- Success Metrics: <500ms first paint, ≥70% cache hit rate, <5% page abandonment
- Timeline: 4 phases (Skeleton → Virtual List → Early Warning → Polish), 6–8 days total

**Tech Stack:** React Query, Recharts, react-window (VirtualList), Tailwind dark mode

---

### 2. **PRD_dashboards.md** (384 lines)

**Feature Module:** `src/features/dashboards/`  
**Status:** Live (V1 Foundation, Widget Builder Phase 5B+)

Pre-configured dashboards for teacher (class engagement view) and admin (SPP/PPDB/feature health view).

**Key Topics:**

- Problem: Each insight requires navigation to different page → workflow fragmented
- Goals: One-screen view of key metrics, mobile-responsive, instant-load with skeleton, future-proof widget architecture
- Requirements: Fixed 5-widget teacher dashboard, 4-widget admin dashboard, drill-down navigation, peer benchmarking
- Non-goals: Drag-drop widget builder (Phase 5B+), real-time WebSocket (Phase 5C+)
- Success Metrics: <500ms first paint, ≥30% widget CTR, ≥80% admin adoption

**Tech Stack:** React Query, Recharts, React Router, Supabase RLS

---

### 3. **PRD_reports.md** (436 lines)

**Feature Module:** `src/features/reports/`  
**Status:** Live (V1 Foundation, PDF Export Phase 5A)

Structured report generation for compliance, financial tracking, and student records. Covers PPDB (enrollment pipeline), SPP (fee collection), academic transcripts.

**Key Topics:**

- Problem: Report data scattered across pages, admin manually compiles to Excel (5–10 hrs/month waste)
- Goals: One-click report generation (PPDB/SPP/Transcript), instant export to CSV/PDF, scheduled email distribution
- Requirements: Filter tables, CSV export <2s, PDF export <5s, student transcripts (courses+grades+attendance+XP+badges)
- P1: Scheduled report email, PPDB trend chart, SPP overdue tracking
- Success Metrics: <5s report generation, 100% download success rate, ≥60% email open rate

**Tech Stack:** html2pdf (client) or pdfkit (Edge Function), Papa Parse (CSV), Supabase Edge Functions, pg_cron

---

### 4. **PRD_struggle.md** (461 lines)

**Feature Module:** `src/features/struggle/`  
**Status:** Live (Algorithm Refinement Phase)

Early warning system for at-risk students. Detects struggle signals (quiz failures, inactivity, low time-on-task), alerts teacher, suggests interventions.

**Key Topics:**

- Problem: Reactive (guru notices after student fails), no early warning system, manual effort to spot patterns
- Goals: Proactive detection <48 hours, transparent struggle_score (0–11), suggested interventions, intervention logging
- Struggle Score Formula: 40% quiz failure rate + 35% inactivity + 25% time-on-task
- Requirements: Segment filtering (Aktif/Berkembang/Perlu Perhatian/Pasif), action buttons (send message/assign lesson/1-on-1), peer benchmarking
- Success Metrics: <48h detection latency, ≥60% recovery rate within 2 weeks, <20% false positive rate

**Tech Stack:** React Query, custom RPC (`compute_struggle_scores`), intervention logging table, Supabase realtime

---

## PRD Structure (All Documents Follow)

Each PRD contains:

1. **Problem Statement** (2–3 paragraphs) — User pain, business impact, affected personas
2. **Goals** (3–5 specific, measurable objectives)
3. **Non-Goals** (explicitly scoped out, with reasons)
4. **User Stories** (3–5 per persona, Given/When/Then format)
5. **Requirements**
   - P0 (Must Have) — Blocking launch
   - P1 (Nice to Have) — Improves UX
   - P2 (Future) — Sengaja dikeluarkan dari v1
6. **Success Metrics**
   - Leading Indicators (real-time, day/week scale)
   - Lagging Indicators (month+ scale)
7. **Open Questions** (blocking vs non-blocking, owner)
8. **Timeline & Phases** (4 phases with daily breakdown, exit criteria)
9. **Dependencies & Risks** (technical, integration, edge cases)
10. **Technical Architecture** (code patterns, RPCs, hooks, components)
11. **Database/API Requirements** (new tables, RPCs)
12. **Success Checklist** (verification items before launch)
13. **References** (links to related docs)

---

## How to Use These PRDs

### For Product Managers

1. Review Problem Statement + Goals → align with business priorities
2. Validate Goals + Non-Goals → ensure scope is right
3. Review Open Questions → resolve blockers before engineering starts
4. Track Success Metrics → weekly updates on leading indicators

### For Engineering Leads

1. Review Requirements P0 + Technical Architecture → estimate effort
2. Review Dependencies & Risks → plan mitigation
3. Use Timeline & Phases → break into 2–3 day sprints
4. Reference Success Checklist → QA + launch criteria

### For Designers

1. Review User Stories → understand personas + workflows
2. Review Requirements + Acceptance Criteria → translate to mockups
3. Review Technical Architecture (UI patterns) → ensure consistency
4. Reference Dark Mode requirements → test in both themes

### For QA/Test Engineers

1. Review Requirements → write test cases per P0 item
2. Review Edge Cases → write tests for boundary conditions
3. Review Success Metrics → define test plans (manual + automated E2E)
4. Reference Success Checklist → create QA sign-off list

---

## Development Workflow

### Pre-Development (Day 1)

- [ ] Product finalizes PRD (no open blockers)
- [ ] Engineering estimates effort (story points)
- [ ] Design creates mockups + design system specs
- [ ] Open Questions resolved

### Implementation (Days 2–6)

- Follow Timeline & Phases
- P0 requirements are blocking for launch
- P1 added if time permits
- Testing throughout (not at end)

### Launch Readiness (Day 7)

- All P0 requirements complete
- Success Checklist 100% passed
- Leading Metrics on track
- Documentation updated

---

## Key Patterns Across All PRDs

### Skeleton Screens (All Features)

- **Target:** <500ms first paint with skeleton
- **Pattern:** `if (isLoading) return <FeatureSkeleton />`
- **Components:** Pulsing bars, placeholder cards matching final layout

### Dark Mode (All Features)

- **Target:** 10+ files with `dark:` variants per feature
- **Pattern:** `dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700`
- **Testing:** Visual QA with `class="dark"` on `<html>`

### Virtual List (Large Tables)

- **Target:** 60 FPS scroll with 100+ rows
- **Library:** react-window or TanStack VirtualList
- **Pattern:** Paginate in RPC, load-more on scroll

### React Query Caching

- **Target:** ≥70% cache hit rate
- **Pattern:** `staleTime: 5 * 60 * 1000` (5 min) + gcTime: 30 min
- **Invalidation:** Event-driven (not automatic)

### Multi-tenancy + RLS

- **Pattern:** All RPCs check `auth.uid()` and `tenant_id`
- **RLS Policies:** `tenant_id = (SELECT get_my_tenant_id())`
- **Testing:** Create test accounts in different schools

---

## Integration Points

### Between Features

- **Analytics ↔ Dashboards** — Dashboard widgets pull from analytics RPCs
- **Analytics ↔ Struggle** — Struggle scores feed into analytics segments
- **Reports ↔ Dashboards** — Report data can be visualized in dashboard
- **Struggle ↔ Notifications** — Struggle alerts trigger notifications

### With Existing Systems

- **Supabase Auth** — useAuth() hook in all features
- **React Query** — State management + caching
- **Tailwind v4** — Design system, dark mode
- **React Router v7** — Hash routing (`/#/app/...`)
- **Recharts** — Charts in analytics, dashboards, reports
- **Lucide Icons** — Icon library across all components

---

## Metrics & Success Criteria Summary

| Feature    | P0 Load Time   | Cache Hit Target | Primary KPI            |
| ---------- | -------------- | ---------------- | ---------------------- |
| Analytics  | <2s data       | ≥70%             | Teacher session +15%   |
| Dashboards | <2s data       | ≥70%             | Widget CTR ≥30%        |
| Reports    | <5s PDF export | N/A              | ≥5 reports/week/school |
| Struggle   | <48h detection | ≥70%             | Recovery rate ≥60%     |

---

## Timeline Overview (All 4 Features)

If done sequentially (non-parallel):

- **Week 1** → Analytics (Skeleton + Virtual List)
- **Week 2** → Dashboards (Teacher + Admin layouts)
- **Week 3** → Reports (PPDB/SPP + PDF)
- **Week 4** → Struggle (Algorithm + Alerts)

**Total Estimate:** 4 weeks / 4 sprints @ 3 engineers

---

## Questions or Updates?

When updating a PRD:

1. Update version number + date
2. Add "Updated:" section with changes
3. Re-validate against codebase (architecture may have changed)
4. Get sign-off from product + engineering lead

---

## References

- **Main Codebase:** `/home/rog/Documents/edusync1/LMS/`
- **Database Schema:** `docs/DATABASE.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Engineering Roadmap:** `docs/ENGINEERING_ROADMAP.md` (Phase 5)
- **Design System:** `docs/design-system.md`
- **CLAUDE.md:** `CLAUDE.md` (codebase conventions)

---

**Created:** 2026-03-22  
**By:** Product Engineering  
**Last Updated:** 2026-03-22
