# Contributing to EduSync LMS

> Baca [`docs/DX.md`](docs/DX.md) untuk peta dokumentasi lengkap dan panduan developer.

---

## Branch Strategy

- `main` — production-ready code
- Feature branches: `feat/description`, `fix/description`, `docs/description`
- Create a PR against `main` for review

## Commit Conventions

```
feat(scope): short description
fix(scope): short description
docs(scope): short description
refactor(scope): short description
test(scope): short description
chore(scope): short description
```

Examples:

```
feat(quizzes): add autosave indicator to quiz player
fix(analytics): guard against div-by-zero when no enrolled students
docs(auth): update setup guide with new dev passwords
refactor(courses): extract builder logic into dedicated hooks
```

---

## Package Manager

Project ini menggunakan **pnpm**. Jangan gunakan `npm` atau `yarn`.

```bash
pnpm install       # Install dependencies
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm typecheck     # TypeScript check (tsc --noEmit)
pnpm lint          # ESLint
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
```

---

## Code Structure Rules

1. **Feature modules** — new features go in `src/features/{domain}/` following the standard structure:
   ```
   api/       queries/      hooks/      store/      types/      components/      utils/
   ```
2. **No dead imports** — remove unused imports before committing
3. **TypeScript** — all files must be typed; run `pnpm typecheck` before committing
4. **No hardcoded data** — use `useAuth()` for user identity, never hardcode IDs or names
5. **Barrel exports** — import from feature `index.ts`, not from deep internal paths
6. **Query keys** — register all new query keys in `src/shared/lib/queryKeys.ts`
7. **Stale times** — use constants from `src/utils/queryConstants.ts` (STALE.STATIC, STALE.MODERATE, STALE.DYNAMIC, STALE.REALTIME)

---

## Language Rule

All user-visible strings must be in **Bahasa Indonesia**. No English text in the UI. Auth errors from Supabase (English) must be translated via `translateAuthError()`.

---

## Dark Mode

All new components must include `dark:` Tailwind variants for dark mode support.

```tsx
// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

<div className="bg-white text-gray-900">
```

---

## Database Changes

If you add or modify database schema:

1. Create a timestamped migration file in `supabase/migrations/`
   - Use format: `YYYYMMDDHHMMSS_description.sql`
2. Update `docs/DATABASE_ARCHITECTURE.md` with the new table/column/RPC reference
3. Ensure the new table has:
   - `tenant_id UUID NOT NULL` column
   - `RLS ENABLED`
   - RLS policy: `tenant_id = get_my_tenant_id()`
   - `auto_set_tenant_id()` trigger
4. Verify tenant isolation is not broken

New RPC functions must have:

```sql
CREATE OR REPLACE FUNCTION public.my_function(...)
  RETURNS ...
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  ...
END;
$$;
```

Never silently modify schemas — all changes must go through a migration.

---

## Documentation Policy

After completing any task:

- If you added a feature: document it in the relevant `docs/features/` file or create a new one
- If you deleted a feature: remove its documentation
- Update `CHANGELOG.md` with a brief entry
- If you created a new feature module: create a `README.md` inside it
- If you changed the database schema: update `docs/DATABASE_ARCHITECTURE.md`

---

## Pre-Merge Checklist

- [ ] `pnpm typecheck` passes (0 TypeScript errors)
- [ ] `pnpm lint` passes (0 ESLint errors)
- [ ] `pnpm build` succeeds
- [ ] No hardcoded user IDs, tenant IDs, or credentials
- [ ] No English text in user-facing UI
- [ ] Dark mode `dark:` variants added for all new UI components
- [ ] New tables have RLS + `tenant_id` policy + `auto_set_tenant_id()` trigger
- [ ] New RPCs have `SECURITY DEFINER` + `SET search_path TO 'public'`
- [ ] Documentation updated if architecture or schema changed
- [ ] `CHANGELOG.md` updated
