# EduSync LMS — Security Model

## Principles

1. **Deny by default** — RLS is enabled on every table. No policy = no access.
2. **Tenant isolation** — Every data query is scoped to the caller's tenant via `get_my_tenant_id()`.
3. **Role authorization** — `has_role()` checks role within the caller's tenant, not globally.
4. **No client secrets** — Service role keys never appear in frontend code. Only `VITE_SUPABASE_ANON_KEY` is exposed.

## Row Level Security (RLS)

All 26 tenant-scoped tables have RLS enabled. The standard SELECT policy pattern:
