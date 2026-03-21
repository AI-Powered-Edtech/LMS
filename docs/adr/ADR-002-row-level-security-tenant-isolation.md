# ADR-002: Row Level Security as Primary Tenant Isolation Mechanism

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Engineering Team

---

## Context

EduSync is a **multi-tenant SaaS** platform. Each school organization is a tenant. The database is shared (single-schema multi-tenancy). We needed a mechanism to ensure:

1. A student at School A can never see School B's data
2. A teacher can only manage courses within their own tenant
3. An admin can manage resources within their tenant only
4. This isolation cannot be accidentally bypassed by a frontend bug

Options considered:
- **Option A:** Application-layer tenant filtering (frontend always adds `WHERE tenant_id = ?`)
- **Option B:** PostgreSQL Row Level Security (RLS) enforced at the database layer
- **Option C:** Separate databases per tenant (schema-per-tenant or DB-per-tenant)

---

## Decision

We chose **Option B: PostgreSQL Row Level Security (RLS)** as the primary isolation mechanism.

Every tenant-scoped table has:
1. `tenant_id UUID NOT NULL` column
2. `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
3. At minimum, a SELECT policy: `USING (tenant_id = get_my_tenant_id())`

The `get_my_tenant_id()` function reads the tenant from the authenticated user's JWT claims.

---

## Rationale

**Why RLS over Option A (application-layer):**
- Application code can have bugs. A missing `WHERE tenant_id =` in one query leaks data.
- RLS is enforced at the DB layer — it is impossible for frontend code to bypass it
- Works automatically for all queries, including those via Supabase's REST API and GraphQL

**Why RLS over Option C (separate databases):**
- Schema-per-tenant creates operational complexity at scale (1000 schools = 1000 schemas)
- Connection pooling is more complex per-tenant
- Single-schema with RLS is sufficient for our scale

---

## Implementation Rules

All engineers must follow these rules when creating new tables:

```sql
-- Required for every new tenant-scoped table:
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select"
  ON my_new_table
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id());
```

**Never:**
- Disable RLS on a tenant-scoped table (even temporarily in production)
- Use `service_role` key in frontend code
- Create a table with tenant data but without `tenant_id`

---

## Consequences

**Positive:**
- Structural tenant isolation — not dependent on application code correctness
- Supabase's anon/authenticated roles cannot access cross-tenant data
- All SELECT, INSERT, UPDATE, DELETE are automatically scoped

**Negative:**
- Every table needs RLS policies — boilerplate overhead
- Debugging requires understanding of PostgreSQL security context
- `service_role` key (which bypasses RLS) must be strictly secret
- Schema migrations must include RLS policies — easy to forget

**Migration rule:**
Any new table in a migration file MUST include `ENABLE ROW LEVEL SECURITY` and at least a SELECT policy. The SCHEMA_CHANGE_RULE in CLAUDE.md enforces this.
