# EduSync LMS — Qwen Context File

> Auto-generated instructional context for AI interactions. Last updated: 2026-04-08.

---

## Project Overview

**EduSync LMS** is a multi-tenant SaaS Learning Management System built for Indonesian schools. It supports multiple school organizations (tenants) on a shared platform with complete data isolation via PostgreSQL Row-Level Security (RLS). All student/teacher-facing UI text is in **Bahasa Indonesia**.

### Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Type** | Multi-tenant SaaS LMS for Indonesian schools |
| **Stack** | React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Supabase JS v2 |
| **Backend** | Supabase-only — no Express/NestJS. Logic lives in PostgreSQL (RLS, SQL functions, triggers) and Edge Functions |
| **Package Manager** | **pnpm** exclusively (not npm or yarn) |
| **UI Language** | **Bahasa Indonesia** — all user-visible text |
| **Routing** | Hash routing — all URLs use `/#/` prefix |
| **Status** | Production-ready — Phase 30 complete (2026-04-02) |
| **Roles** | `student` \| `teacher` \| `admin` \| `parent` \| `principal` |

---

## Building and Running

### Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI (for local DB management)

### Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start dev server → http://localhost:5173

# Build
pnpm build                # Production build → dist/
pnpm analyze              # Build with bundle analysis (opens stats.html)
pnpm preview              # Preview production build locally

# Quality
pnpm typecheck            # TypeScript check (tsc --noEmit)
pnpm lint                 # ESLint
pnpm format               # Prettier auto-format
pnpm format:check         # Prettier check only
pnpm validate             # typecheck + lint + test:ci

# Testing
pnpm test                 # Run unit tests (Vitest, watch mode)
pnpm test:ci              # Run unit tests with coverage
pnpm test:changed         # Run tests for changed files
pnpm test:e2e             # Run E2E tests (Playwright)

# Auditing & Analysis
pnpm audit:check          # Check for moderate+ vulnerabilities
pnpm check:circular       # Check for circular dependencies (madge)
pnpm check:unused         # Check for unused exports (knip)
pnpm bundlesize           # Check bundle size limits

# Storybook
pnpm storybook            # Start Storybook → http://localhost:6006
pnpm build-storybook      # Build Storybook

# Performance
pnpm perf:lighthouse      # Run Lighthouse audit

# Cleanup
pnpm clean                # Remove dist/
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in Supabase credentials:
   - `VITE_SUPABASE_URL` — from Supabase Dashboard → Project Settings → API
   - `VITE_SUPABASE_ANON_KEY` — the anon/public key
3. Optional: `VITE_DEV_PASSWORD` for quick login buttons in dev

### Database Setup (for new developers)

```bash
supabase link --project-ref <REF>
supabase db push --include-all
```

Then enable in Supabase Dashboard:
1. **Database → Extensions** → enable `pg_cron`
2. **Authentication → Hooks** → enable `custom_access_token_hook`

---

## Architecture

### Frontend Structure

```
src/
├── app/                    # App bootstrap (routes, providers, query client)
│   ├── routes/             # Domain-based route splits
│   └── lazyPages.tsx       # Lazy-loaded page registry
├── components/             # Shared UI components
│   ├── ui/                 # UI primitives (Button, Card, Modal, etc.)
│   ├── layout/             # Layout components
│   ├── guards/             # AuthGuard, RoleGuard, TenantGuard
│   └── skeletons/          # Loading skeleton components
├── contexts/               # React contexts (Auth, Theme, Builder)
├── features/               # 32+ feature modules (see below)
├── hooks/                  # Shared custom hooks
├── lib/                    # Utility libraries
├── pages/                  # Thin page entry points
├── services/               # Supabase client
├── shared/                 # Shared types, schemas (Valibot), config
├── styles/                 # Global styles
├── testing/                # Testing utilities
└── utils/                  # App-wide utilities
```

### Feature Module Structure

Each feature module under `src/features/{domain}/` follows this convention:

```
src/features/{domain}/
├── api/            ← Supabase calls (DB queries, RPC, Edge Functions)
├── queries/        ← React Query hooks (useQuery, useMutation)
├── hooks/          ← Custom React hooks (non-query business logic)
├── types/          ← TypeScript interfaces (index.ts)
├── components/     ← React components for this domain
├── store/          ← Zustand store (only when needed — e.g., quizzes)
├── utils/          ← Pure utility functions
├── __tests__/      ← Vitest unit tests
├── index.ts        ← Public barrel export
└── README.md       ← Feature documentation
```

### Backend (Supabase)

```
supabase/
├── functions/      # 22+ Edge Functions (Deno)
├── migrations/     # Database migrations (sequential SQL files)
├── seed/           # Seed data scripts
├── config.toml     # Supabase CLI config
└── schema_baseline.sql  # Baseline schema snapshot
```

### State Management

- **React Query v5** — server state (data fetching, caching, mutations)
- **Zustand v5** — local feature state (quiz player only)
- **React Context** — Auth (`useAuth()`), Theme, Builder

### Key Libraries

| Category | Libraries |
|----------|-----------|
| UI | React 19, Tailwind CSS v4, Lucide React, motion (Framer Motion), Recharts |
| Forms | React Hook Form, Valibot (schema validation), @hookform/resolvers |
| Routing | React Router v7 (hash routing) |
| Data | @supabase/supabase-js, @tanstack/react-query |
| Content | react-markdown, remark-gfm, rehype-katex, KaTeX (math rendering) |
| Media | hls.js (video), html2canvas, jspdf |
| Monitoring | @sentry/react (error tracking) |
| PWA | vite-plugin-pwa, workbox-window (offline support) |
| Testing | Vitest, Playwright, Testing Library |

---

## Development Conventions

### Identity & Auth

- Always use `useAuth()` for user identity: `const { user, profile, role, tenantId } = useAuth()`
- Role comes from `user_roles` table, NOT `profiles.role`. Always use `useAuth().role`
- Never hardcode user IDs, tenant IDs, names, or credentials in components

### Routing

- All app links use `/#/` prefix (hash routing)
- Route protection: `<RoleRoute role="teacher">` or `<RoleRoute role={["teacher","admin"]}>`
- Student routes: `/#/app/student/...`
- Teacher routes: `/#/app/teacher/...` or `/#/teaching/...`
- Admin routes: `/#/app/admin/...` or `/#/admin/...`

### Language

- **All user-visible strings must be in Bahasa Indonesia**
- No English labels, button text, error messages, or headers in the UI
- Supabase English error messages must be translated via `translateAuthError()`

### Dark Mode

- All new components need `dark:` Tailwind variants
- Test via `class="dark"` on html element or via ThemeContext toggle

### Database Rules

- All new tables MUST have RLS enabled with `tenant_id = (SELECT get_my_tenant_id())` policy
- All new RPCs MUST have `auth.uid() IS NOT NULL` check and `SET search_path TO 'public'`
- Never use `SELECT *` — always specify columns explicitly
- Queries must be paginated on large tables (notifications, activity_logs, etc.)
- Use `auto_set_tenant_id()` trigger for new tables

### SQL Gotchas

| Column/Table | Note |
|-------------|------|
| `quiz_questions.text` | Column is `text`, NOT `question_text` |
| `quiz_options.text` | Column is `text`, NOT `option_text` |
| `course_modules."order"` | `"order"` is a SQL reserved word — **must be quoted** |
| `lessons."order"` | Same — **must be quoted** |
| `courses.status` | Use `status = 'published'`, NOT `is_published` (column doesn't exist) |
| `enrollments.user_id` | NOT `student_id` |
| `student_lesson_signals` | Use: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` |
| `course_collaborators` | Uses `auto_set_tenant_id()` trigger — NOT `set_tenant_id_from_user()` |

### Auth Gotchas

- `.test` TLD emails fail GoTrue validation — use `.dev` or real domains for test accounts
- React controlled inputs: login form cannot be filled programmatically — requires keyboard events
- `signOut()` must clear React state **BEFORE** calling `supabase.auth.signOut()` (prevents infinite spinner)

### Documentation Policy

After ANY significant task:
1. Update the relevant file in `docs/`
2. If creating a new feature module → create a `README.md` inside it
3. If deleting a feature or file → remove its documentation
4. Add an entry to `CHANGELOG.md`
5. Update `docs/DATABASE.md` if schema changed
6. Update `COMPONENT_REGISTRY.md` for new components

---

## Test Accounts (Shared Dev Project)

| Email | Password | Role |
|-------|----------|------|
| `teacher@edusync.dev` | `password123` | Teacher |
| `student@edusync.dev` | `password123` | Student |
| `admin@edusync.dev` | `password123` | Admin |

Dev app: `http://localhost:5173` (after `pnpm dev`)

---

## Edge Functions

All Edge Functions live in `supabase/functions/`. Each is self-contained (no shared modules). Use `Deno.serve`, `jsr:` imports, and standard CORS/response helpers.

| Function | Purpose | Auth |
|----------|---------|------|
| `ai-grade-essay` | AI essay grading via Groq | User JWT |
| `ai-tutor` | AI tutor chat | User JWT |
| `generate-ai-content` | AI content generation | User JWT |
| `generate-pdf` | PDF certificate generation | User JWT |
| `grade-quiz-attempt` | Background quiz grading | Service role |
| `health-check` | System health status | None (public) |
| `load-quiz-data` | Load quiz for student | User JWT |
| `process-progress-events` | Batch progress event processing | API key |
| `progress-events` | Enqueue progress events | User JWT |
| `send-email-digest` | Email digest sender | Service role |
| `send-push` | Push notification sender | User JWT |
| `lti-jwks` | Public JWKS for LTI platforms | None (public GET) |
| `lti-oidc-login` | LTI OIDC login initiation | None (platform-initiated) |
| `lti-launch` | LTI launch token validation + user provisioning | None (validates LTI id_token) |
| `scorm-extract` | SCORM ZIP upload, validation, extraction | User JWT (teacher/admin) |
| `generate-executive-report` | Executive report generation | Service role |
| `generate-parent-report` | Parent report generation | Service role |
| `bulk-import-users` | Bulk user import | Service role |
| `check-rate-limit` | Rate limiting check | Service role |
| `send-parent-digest` | Parent digest sending | Service role |
| `send-parent-otp` | Parent OTP sending | Service role |
| `whatsapp-webhook` | WhatsApp webhook handler | Service role |

---

## Feature Modules (32+)

| Module | Domain | Description |
|--------|--------|-------------|
| `administration` | Admin | Tenant management, school module configuration |
| `ai-tutor` | Learning | AI-powered study assistant (Groq) |
| `analytics` | Analytics | Teacher & admin analytics dashboards |
| `announcements` | Communication | School announcement system |
| `assignments` | Assessment | Assignment management & grading |
| `attendance` | Academic | Attendance tracking |
| `auth` | Identity | Authentication flows |
| `calendar` | Academic | Academic calendar integration |
| `classroom` | Academic | Virtual & physical class management |
| `courses` | Academic | Course catalog & builder |
| `creator` | Content | AI content generation |
| `dashboards` | Analytics | Custom dashboard with widget builder |
| `discussions` | Communication | Per-course discussion forums |
| `gamification` | Engagement | XP, badges, levels, streaks, leaderboard |
| `gradebook` | Assessment | Digital gradebook, SpeedGrader |
| `guidance` | Admin | In-app walkthroughs, tooltips |
| `lessons` | Learning | Lesson viewer, Smart Player, SCORM |
| `lti` | Integration | LTI 1.3 integration |
| `moderation` | Admin | Content moderation |
| `notifications` | Communication | In-app + push notifications |
| `onboarding` | Admin | New user onboarding wizard |
| `parent` | Parent | Parent portal |
| `principal` | Principal | Principal executive dashboard |
| `profile` | Identity | User profile management |
| `progress` | Learning | Progress tracking |
| `question-bank` | Assessment | Reusable question bank |
| `quizzes` | Assessment | Quiz player, grading, anti-cheat |
| `recommendations` | Learning | Content recommendation engine |
| `reports` | Analytics | Academic & financial report generator |
| `settings` | Identity | User settings |
| `storage` | Infrastructure | File & media management |
| `struggle` | Analytics | Automatic struggle detection |

---

## Key File Locations

| What | Where |
|------|-------|
| Supabase client | `src/services/supabase/client.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Theme context | `src/contexts/ThemeContext.tsx` |
| Route tree | `src/app/routes.tsx` (imports from `src/app/routes/`) |
| Navigation config | `src/shared/config/navigation.ts` |
| Query key registry | `src/shared/lib/queryKeys.ts` |
| Stale time constants | `src/utils/queryConstants.ts` |
| Shared schemas (Valibot) | `src/shared/schemas/` |
| Shared types | `src/shared/types/` |
| UI primitives | `src/components/ui/` |
| Feature modules | `src/features/` |
| DB migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| App-wide utilities | `src/utils/` |
| Documentation | `docs/` (see `docs/DX.md` for full map) |

---

## Completed Phases (26–30)

| Phase | Features | Status |
|-------|----------|--------|
| 26 | Student UX: Quiz Timer Pause, File Preview, Offline Mode, Deep Link Enrollment | ✅ COMPLETED |
| 27 | Teacher UX: Onboarding Wizard, SpeedGrader Annotations, CSV Export, Activity Feed | ✅ COMPLETED |
| 28 | Admin UX: Bulk User Import, Audit Export, Feature Management, Finance Dashboard | ✅ COMPLETED |
| 29 | Parent Portal: OTP Registration, Mobile Dashboard, WhatsApp Digest, Messaging, Monthly Reports | ✅ COMPLETED |
| 30 | Principal Dashboard: Executive Metrics, Before-After Analytics, Report Generator, Survey System | ✅ COMPLETED |

---

## Important References

| Document | Description |
|----------|-------------|
| `CLAUDE.md` | Primary engineering guide — read this for detailed conventions |
| `AGENTS.md` | Quick reference for AI coding agents (Indonesian) |
| `CHANGELOG.md` | All changes by phase |
| `COMPONENT_REGISTRY.md` | Component registry tracking all modules and functions |
| `docs/DX.md` | Developer experience guide & documentation map |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/DATABASE.md` | Database reference (tables, columns, RPCs) |
| `docs/SECURITY.md` | Security model & threat mitigations |
| `docs/TESTING.md` | Test accounts, unit & E2E guide |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `docs/ENGINEERING_ROADMAP.md` | Phase status & roadmap |
