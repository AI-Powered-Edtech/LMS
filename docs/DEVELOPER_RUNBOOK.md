# EduSync LMS — Developer Runbook

> Untuk setup awal dari nol, lihat [SETUP_GUIDE.md](SETUP_GUIDE.md).
> Untuk peta dokumentasi lengkap, lihat [DX.md](DX.md).

---

## Prerequisites

- Node.js 20+, **pnpm** 9+
- Supabase CLI: `pnpm add -g supabase` (atau `npm i -g supabase`)
- Git 2.30+

---

## 1. Initial Setup

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
# Settings: Supabase Dashboard → Project Settings → API
```

Required variables:

```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_DEV_PASSWORD=password123   # optional, pre-fills login form in dev
```

---

## 2. Start Development

```bash
pnpm dev
# App runs at http://localhost:5173
# All routes use HashRouter: http://localhost:5173/#/...
```

---

## 3. Database Setup

### Apply migrations to remote

```bash
supabase db push
```

### Full reset (apply baseline + seed)

```bash
supabase db reset --linked
# Runs 000_baseline.sql (full schema) + supabase/seed.sql
```

### Seed demo data (creates test tenant, courses, classes)

```bash
# Run seed_base.sql first (creates demo-school tenant, enables modules)
psql $DATABASE_URL < supabase/seed/seed_base.sql

# Run seed_demo.sql second (requires users to exist in auth.users first)
psql $DATABASE_URL < supabase/seed/seed_demo.sql
```

### Creating test users (required before seed_demo.sql)

Test users cannot be created via SQL — Supabase Auth owns user creation.
Create them via Supabase Dashboard > Authentication > Users, or use the Admin API:

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

Note: use `.dev` TLD. Emails with `.test` TLD fail GoTrue validation.

### Seed tenant_modules (prevents admin console warnings)

`seed_base.sql` seeds `tenant_modules` automatically. If the admin dashboard
shows a warning about missing module config, re-run seed_base.sql:

```bash
psql $DATABASE_URL < supabase/seed/seed_base.sql
```

---

## 4. Test Accounts (Shared Dev Project)

| Email                 | Password      | Role    | Redirect After Login |
| --------------------- | ------------- | ------- | -------------------- |
| `teacher@edusync.dev` | `password123` | TEACHER | `/#/app/teacher`     |
| `student@edusync.dev` | `password123` | STUDENT | `/#/app/student`     |
| `admin@edusync.dev`   | `password123` | ADMIN   | `/#/app/admin`       |

Remote Supabase project: `omfnkoufjqjqilswldtz.supabase.co`
Dev tenant ID: `00000000-0000-0000-0000-00000000000d`

---

## 5. Quality Checks

### TypeScript (must be clean before any merge)

```bash
pnpm typecheck
```

### Lint (ESLint)

```bash
pnpm lint
```

### Production build (must succeed before any deploy)

```bash
pnpm build
# Any actual error will cause a non-zero exit code.
```

### Unit tests

```bash
pnpm test
```

### E2E tests

```bash
# Comprehensive 24-flow suite (recommended)
pnpm exec playwright test --config=playwright-24.config.ts

# Legacy suite
pnpm test:e2e
```

### Full pre-merge check

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

---

## 6. Known Good URLs (Golden Paths)

| Role    | URL                                        | Expected Result                   |
| ------- | ------------------------------------------ | --------------------------------- |
| Any     | `/#/login`                                 | Login form in Bahasa Indonesia    |
| Any     | `/#/workspace-selector`                    | Tenant picker (if multi-tenant)   |
| Any     | `/#/app`                                   | RoleResolver → redirects by role  |
| Teacher | `/#/app/teacher`                           | Teacher dashboard                 |
| Teacher | `/#/teaching/course-builder?courseId=<ID>` | Course builder                    |
| Teacher | `/#/app/teacher/quiz-manager`              | Quiz manager                      |
| Student | `/#/app/student`                           | Student dashboard                 |
| Student | `/#/app/student/courses`                   | Enrolled courses                  |
| Admin   | `/#/app/admin`                             | Administration dashboard          |
| Admin   | `/#/app/admin/users`                       | User management                   |
| Any     | `/#/unauthorized`                          | "Akses Ditolak" page (Indonesian) |

---

## 7. Active Migrations Reference

Active migrations are in `supabase/migrations/`. The baseline `000_baseline.sql` is
a squash of the entire migration history (162 migrations) into one file.

| File Pattern       | Content                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `000_baseline.sql` | Full schema baseline (84 tables, 194 RLS policies, 213 functions)     |
| `001` – `012`      | Feature additions post-baseline                                       |
| `202603*`          | Phase 21 improvements (analytics RPCs, LTI/SCORM, security hardening) |
| `_archive/`        | Historical migrations (reference only, not applied separately)        |

To apply new migrations to a linked project:

```bash
supabase db push
```

---

## 8. Architecture Quick Reference

- **No traditional backend** — all business logic is in Supabase PostgreSQL (RLS + SQL functions)
- **Auth**: Supabase Auth + `user_roles` table. Role comes from `user_roles`, NOT JWT claims.
- **Tenant isolation**: Every tenant-scoped table has `tenant_id`. RLS enforces it via `get_my_tenant_id()`.
- **Event-driven analytics**: High-frequency events are batched client-side and ingested via Edge Functions.
- **HashRouter**: All client-side routes use `/#/` prefix. Deep links refresh correctly.
- **Feature modules**: 24 modules in `src/features/`, each with `api/`, `queries/`, `hooks/`, `types/`, `components/`.
- **Package manager**: pnpm (never npm/yarn)

---

## 9. Common Issues and Fixes

### "Gagal memuat konfigurasi modul" warning in admin console

**Root cause**: `modules` table has RLS requiring `tenant_id = get_my_tenant_id()`. If no `tenant_modules` rows exist for the dev tenant, the join returns nothing.

**Fix**: Re-run `seed_base.sql` to seed missing rows:

```bash
psql $DATABASE_URL < supabase/seed/seed_base.sql
```

### rpc_publish_course fails in course builder

**Root cause**: Old function used `current_setting('request.jwt.claims')` to get `tenant_id`. JWT claims don't include `tenant_id` for most users.

**Fix**: Migration `20260322151050_analytics_rpc_tenant_param.sql` and related fixes replaced the function to use `get_my_tenant_id()` which reads from the `user_roles` table directly. Ensure all migrations are applied via `supabase db push`.

### Infinite loading spinner after logout

**Root cause**: `signOut()` called `supabase.auth.signOut()` before clearing React state, causing auth state listener to re-render with stale user.

**Fix**: `AuthContext.tsx` clears React state BEFORE calling `supabase.auth.signOut()`. Do not revert this order.

### `.test` TLD email fails registration/login

GoTrue validates email TLDs. Use `.dev`, `.com`, or real domains. Test accounts use `@edusync.dev`.

### Student accessing teacher route shows "Akses Ditolak"

Expected behavior. `RoleGuard` on `app/teacher`, `app/admin`, `app/student` redirects to `/unauthorized` which renders the Indonesian "Akses Ditolak" page.

### "JWT claim tenant_id is null"

User doesn't have a profile in the `profiles` table. Ensure seed ran successfully and that the Custom Access Token Hook is enabled in Supabase Dashboard → Authentication → Hooks.

### Edge Function error "GROQ_CONFIG_MISSING"

Secret not set. Run:

```bash
supabase secrets set GROQ_API_KEY=<your-key> --project-ref <ref>
```

---

## 10. Offline Behavior

`OfflineIndicator` component (`src/components/OfflineIndicator.tsx`) uses `navigator.onLine` + window events to detect offline state. When offline, a banner appears: "Anda sedang offline. Progress disimpan secara lokal."

The quiz player has additional offline handling (autosave to local state). The lesson viewer does not buffer content offline — students need connectivity.

---

## 11. Dark Mode

Dark mode is controlled by `ThemeContext` (`src/contexts/ThemeContext.tsx`). Toggle via the Header component. All new components must include `dark:` Tailwind variants.

Test dark mode manually:

1. Login as any role
2. Click the dark mode toggle in the Header
3. Verify all UI elements adapt correctly
4. Run `pnpm exec playwright test --config=playwright-24.config.ts cross-cutting.spec.ts` for automated dark mode sweep (18 tests)

---

## 12. Bundle Analysis

To identify large chunks and optimize bundle size:

```bash
pnpm analyze
# Opens dist/stats.html with interactive treemap
```

Current vendor chunks: `vendor-react`, `vendor-supabase`, `vendor-recharts`, `vendor-katex`,
`vendor-query`, `vendor-motion`, `vendor-dnd`, `vendor-markdown`, `vendor-sentry`, `vendor-date`, `vendor-sanitize`, `vendor-form`.

Bundle size CI gate is configured in `.github/workflows/` — PRs fail if any chunk exceeds the threshold.

> > > > > > > tundra-boa
