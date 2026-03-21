# Contributing to EduSync LMS

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
```

Examples:
```
feat(quizzes): add autosave indicator to quiz player
fix(analytics): guard against div-by-zero when no enrolled students
docs(auth): update setup guide with new dev passwords
```

## Code Structure Rules

1. **Feature modules** — new features go in `src/features/{domain}/` following the structure:
   ```
   api/       queries/      hooks/      store/      types/      components/      utils/
   ```
2. **No dead imports** — remove unused imports before committing
3. **TypeScript** — all files must be typed. Run `npm run lint` before committing
4. **No hardcoded data** — use `useAuth()` for user identity, never hardcode IDs or names

## Language Rule

All user-visible strings must be in Bahasa Indonesia. No English text in the UI.

## Dark Mode

All new components must include `dark:` Tailwind variants for dark mode support.

## Database Changes

If you add or modify database schema:
1. Create a numbered migration file in `supabase/migrations/`
2. Update `docs/DATABASE.md` with the new table/RPC reference
3. Ensure the new table has RLS enabled and `tenant_id` policy
4. Verify tenant isolation is not broken

Never silently modify schemas — all changes must go through a migration.

## Documentation Policy

After completing any task:
- If you added a feature: document it in the relevant `docs/` file or create a new one
- If you deleted a feature: remove its documentation
- Update `CHANGELOG.md` with a brief entry
- If you created a new feature module: create a `README.md` inside it

## Pre-Merge Checklist

- [ ] `npm run lint` passes (0 TypeScript errors)
- [ ] `npm run build` succeeds
- [ ] No hardcoded user IDs, tenant IDs, or credentials
- [ ] No English text in user-facing UI
- [ ] Dark mode variants added for all new UI
- [ ] New tables have RLS + `tenant_id` policy
- [ ] Documentation updated if architecture changed
- [ ] `CHANGELOG.md` updated
