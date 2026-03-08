# EduSync LMS — Engineering Roadmap

From prototype to production. Migrated to a Supabase-centric architecture.

---

## Current Status

```
✅ Phase A — UI & Mock Data Prototype (Full Frontend)
✅ Phase B — Supabase Backend Setup (Auth, DB Schema)
✅ Phase C — Edge Functions Deployment
✅ Phase D — Service Layer Context Migration (Mock → Supabase)
✅ Phase E — Consumer Page Type Fixing
```

---

## Roadmap Overview

```mermaid
gantt
    title EduSync Engineering Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b

    section Foundation
    Phase A UI Prototype     :done, pa, 2026-03-01, 3d
    Phase B Supabase Schema  :done, pb, after pa, 2d

    section Migration
    Phase C Edge Functions   :done, pc, 2026-03-08, 1d
    Phase D Service Context  :done, pd, after pc, 1d
    Phase E Type Fixes       :done, pe, after pd, 1d
    Phase F Documentation    :active, pf, after pe, 1d

    section Quality Assurance
    Phase G Unit/E2E Test    :pg, after pf, 3d
    Phase H Manual QA        :ph, after pg, 2d

    section Production
    Phase I Vercel Deploy    :pi, after ph, 1d
    Phase J Launch Prep      :pj, after pi, 2d
```

---

## Phase Details

### Phase G — Testing & QA (next)

**Goal:** Ensure system stability through automated testing.

```
Action Items:
- Run `npx tsc --noEmit` to ensure strict typing.
- Add Vitest for core utility/service testing.
- Add Playwright for E2E user flow tests (Login -> Enroll -> Submit).
```

---

### Phase I — Production Deployment 🚀

**Goal:** Live URL for EduSync LMS.

```
Action Items:
- Connect GitHub repo to Vercel/Netlify.
- Configure production environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Update Supabase Auth Redirect URLs.
- Setup custom domain (`edusync.com`).
```
