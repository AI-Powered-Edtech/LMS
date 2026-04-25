-- 075_tenant_invites_global_unique_code.sql
-- Tighten invite-code uniqueness to global (across tenants), not per-tenant.
--
-- Migration 074 left the per-tenant `UNIQUE (tenant_id, code)` constraint
-- in place, which means the random generator could in principle produce the
-- same code for two different tenants. `redeem_tenant_invite()` looks up
-- the invite purely by `code` (no tenant_id filter — UX is "type the code,
-- the system finds your school") so a duplicate would make the SELECT
-- ambiguous and make `SELECT INTO` non-deterministic.
--
-- Switching to a global unique index closes the ambiguity at the schema
-- layer and is forward-compatible with the redeem RPC. Idempotent.

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_invites_code_unique
    ON public.tenant_invites(code);
