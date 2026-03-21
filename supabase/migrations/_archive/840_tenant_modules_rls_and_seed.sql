-- ==========================================================================
-- Migration 840: tenant_modules RLS policies + seed fix for BUG-C2-006
-- Date: 2026-03-21
--
-- Problem:
--   tenant_modules table had no RLS and no policies. Querying it via the
--   anon/authenticated role returned nothing (or errors when joined with the
--   RLS-protected modules table using !inner) causing "Failed to fetch tenant
--   modules" console noise in the Admin dashboard.
--
-- Fixes:
--   1. Enable RLS on tenant_modules
--   2. Add tenant-scoped SELECT policy for admins (and service_role bypasses)
--   3. Add UPDATE policy so admins can toggle modules
--   4. Seed tenant_modules for any existing tenants that have none
--      (idempotent — uses ON CONFLICT DO NOTHING)
-- ==========================================================================

-- 1. Enable RLS on tenant_modules
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: admins and service_role can read their tenant's module config.
--    Teachers/students do not need direct access — they use has_module() RPC.
CREATE POLICY "tenant_modules_select_admin"
  ON public.tenant_modules
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.has_role('ADMIN')
  );

-- 3. UPDATE: admins can toggle modules on/off within their tenant
CREATE POLICY "tenant_modules_update_admin"
  ON public.tenant_modules
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.has_role('ADMIN')
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.has_role('ADMIN')
  );

-- 4. Seed missing tenant_modules rows for existing tenants.
--    The auto_add_modules_for_tenant trigger handles new tenants going forward,
--    but existing tenants created before that trigger was active may have gaps.
--    This runs ONLY if modules exist for a given tenant_id (via modules table).
--
--    NOTE: modules.tenant_id must match the target tenant for these rows to be
--    visible through RLS. This seed uses service_role context (migration runner)
--    so it bypasses RLS and can read all modules rows.
INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
SELECT
    t.id AS tenant_id,
    m.id AS module_id,
    CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END AS is_enabled
FROM public.tenants t
CROSS JOIN public.modules m
WHERE m.tenant_id = t.id   -- only seed modules that belong to the tenant
ON CONFLICT (tenant_id, module_id) DO NOTHING;
