# EduSync LMS — Security Model

## Principles

1. **Deny by default** — RLS is enabled on every table. No policy = no access.
2. **Tenant isolation** — Every data query is scoped to the caller's tenant via `get_my_tenant_id()`.
3. **Role authorization** — `has_role()` checks role within the caller's tenant, not globally.
4. **No client secrets** — Service role keys never appear in frontend code. Only `VITE_SUPABASE_ANON_KEY` is exposed.

## Row Level Security (RLS)

All 26 tenant-scoped tables have RLS enabled. The standard SELECT policy pattern:

```sql
USING (tenant_id = (SELECT public.get_my_tenant_id()))
```

The scalar subquery `(SELECT ...)` is intentional — PostgreSQL caches the result per statement rather than re-evaluating for every row, which would be a performance problem at scale.

Global tables (`badges`, `user_badges`, `user_points`, `recommendations`) have no `tenant_id` but are scoped by `user_id = auth.uid()` for reads and `has_role('ADMIN')` for writes.

## Tenant Isolation

`get_my_tenant_id()` is the single source of truth for tenant context:

```sql
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid() $$;
```

No user-supplied `tenant_id` parameter is accepted by any security-critical function. The tenant is always derived from `auth.uid()`.

## RPC Security

All RPC functions that modify data must:
1. Check `auth.uid() IS NOT NULL`
2. Use `SET search_path TO 'public'` to prevent search path injection
3. Derive tenant from `get_my_tenant_id()` — never from a parameter

## Security Fixes Applied (Migration 836)

Five HIGH vulnerabilities were patched on 2026-03-20:

| Fix | Table/Function | Issue | Resolution |
|-----|----------------|-------|------------|
| FIX-1 | `award_quiz_xp` | Any user could grant XP to arbitrary user | Added `auth.uid() = p_user_id` check |
| FIX-2 | `v1_get_quiz_results` | SECURITY DEFINER without `search_path` | Added `SET search_path TO 'public'` |
| FIX-3 | `aggregation_state` | No RLS — analytics watermark poisoning possible | Enabled RLS, restricted to admin/service role |
| FIX-4 | `student_lesson_signals` | Students could read all peers' signals | Tightened RLS: students see own rows only |
| FIX-5 | `quiz_submission_queue` | `user_id IS NULL` INSERT policy audit bypass | Removed wildcard null check |

## Prior Vulnerabilities (from TENANT_SECURITY_AUDIT.md, date 2026-03-08)

Five additional issues were found and fixed in earlier migrations:

| Issue | Fix |
|-------|-----|
| `handle_new_user` trigger omitted `tenant_id` | Updated to read from `raw_user_meta_data` |
| `profiles_insert` policy missing tenant check | Fixed — profile creation now passes tenant_id |
| `create_class` RPC bypassed tenant_id | Added `tenant_id = get_my_tenant_id()` |
| `enroll_student` RPC bypassed tenant isolation | Added tenant filter on class lookup and insert |
| `mark_lesson_complete` RPC bypassed tenant_id | Added `tenant_id = get_my_tenant_id()` |

## Frontend Security Checklist

Before merging any PR:
- [ ] No hardcoded user IDs, tenant IDs, or credentials
- [ ] No `VITE_SUPABASE_SERVICE_ROLE_KEY` or equivalent in client code
- [ ] All new tables have RLS enabled and `tenant_id` policy
- [ ] All new RPCs have `auth.uid()` check and `SET search_path TO 'public'`
- [ ] `useAuth()` used for identity — never hardcoded
