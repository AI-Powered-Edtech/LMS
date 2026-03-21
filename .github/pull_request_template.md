## Summary

<!-- Describe the change in 1-3 bullet points. Focus on WHY, not just WHAT. -->

-
-

## Type of Change

- [ ] New feature
- [ ] Bug fix
- [ ] Refactor / code cleanup
- [ ] Database migration / schema change
- [ ] Documentation update
- [ ] Dependency update
- [ ] DevOps / CI change

## Testing

- [ ] Unit tests added / updated (`pnpm test`)
- [ ] E2E tests added / updated (`pnpm test:e2e`)
- [ ] Manually tested in browser (dev server)
- [ ] Tested against local Supabase (`supabase start`)

## Database Changes

- [ ] No database changes
- [ ] Migration file added to `supabase/migrations/`
- [ ] `docs/DATABASE.md` updated
- [ ] RLS policies verified (tenant isolation preserved)
- [ ] No `SELECT *` — specific columns only
- [ ] Queries are paginated or bounded

## Security Checklist

- [ ] No secrets exposed in frontend code
- [ ] No `service_role` key used in client-side code
- [ ] Tenant isolation preserved (all queries scoped to `tenant_id`)
- [ ] RLS policies not disabled or bypassed

## UI Changes

<!-- Attach a screenshot or recording if this PR changes any UI. -->

| Before | After |
|--------|-------|
| _screenshot_ | _screenshot_ |

## Related Issues / Tickets

<!-- Link to Linear, GitHub issue, or ADR if applicable -->

Closes #
