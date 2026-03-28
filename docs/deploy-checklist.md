# EduSync LMS — Deploy Checklist

## Overview

Follow this checklist for every production deployment. Steps marked [REQUIRED] must be completed before merging to main.

---

## Pre-Deploy Checklist

### Code Quality [REQUIRED]

- [ ] All CI checks passing on the PR: typecheck, lint, unit tests, E2E tests
- [ ] No `console.log` or `console.debug` in production code paths (use `logger` utility or remove)
- [ ] No hardcoded user IDs, tenant IDs, or credentials in changed files
- [ ] `SELECT *` not introduced in any new query
- [ ] New tables have RLS enabled and `tenant_id` column
- [ ] New RPCs have `auth.uid() IS NOT NULL` guard and `SET search_path TO 'public'`

### Bundle Size [REQUIRED]

- [ ] Run `pnpm analyze` and verify total bundle is within budget (< 500 kB gzipped for main chunk)
- [ ] No new heavy dependency added without a `docs/dependency-decisions.md` entry
- [ ] Code splitting in place for any new route or large feature module

### Database Migrations [REQUIRED]

- [ ] All new migrations are in `supabase/migrations/` with sequential timestamps
- [ ] Migrations reviewed for: irreversibility, data loss risk, long-running locks
- [ ] Destructive migrations (DROP, ALTER TYPE) have been tested on a staging clone first
- [ ] `docs/DATABASE.md` updated to reflect schema changes

### Documentation [REQUIRED]

- [ ] `CHANGELOG.md` updated with the changes in this PR
- [ ] Relevant `docs/` files updated if architecture or behavior changed
- [ ] New feature modules have a `README.md` inside `src/features/[module]/`

---

## Deploy Steps

1. **Merge PR to main** — requires at least 1 approved review
2. **CI runs automatically** — GitHub Actions runs: typecheck → lint → unit tests → build
3. **Vercel deploys automatically** — triggered on push to `main`, deploys to production
4. **Run migrations** — if this release includes schema changes: