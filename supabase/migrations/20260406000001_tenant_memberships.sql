-- Migration: Create tenant_memberships table
-- Created: 2026-04-06
-- Purpose: Fix missing table error for tenant membership queries
-- Issue: "Could not find the table 'public.tenant_memberships' in the schema cache"

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create tenant_memberships table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'principal')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique membership per user per tenant
  UNIQUE(tenant_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_tenant_memberships_tenant ON public.tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_user ON public.tenant_memberships (user_id);
CREATE INDEX idx_tenant_memberships_status ON public.tenant_memberships (status);
CREATE INDEX idx_tenant_memberships_role ON public.tenant_memberships (role);

-- RLS
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships
CREATE POLICY user_view_own_memberships ON public.tenant_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all memberships in their tenant
CREATE POLICY admin_view_tenant_memberships ON public.tenant_memberships
  FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
    )
  );

-- Admins can insert memberships for their tenant
CREATE POLICY admin_insert_tenant_memberships ON public.tenant_memberships
  FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
    )
  );

-- Admins can update memberships for their tenant
CREATE POLICY admin_update_tenant_memberships ON public.tenant_memberships
  FOR UPDATE
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
    )
  );

-- Admins can delete memberships for their tenant
CREATE POLICY admin_delete_tenant_memberships ON public.tenant_memberships
  FOR DELETE
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create helper function to get user's tenant
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.tenant_memberships
  WHERE user_id = p_user_id
  AND status = 'active'
  ORDER BY joined_at DESC
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add comments for documentation
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.tenant_memberships IS 'Maps users to tenants with role and status';
COMMENT ON FUNCTION get_user_tenant_id IS 'Returns the active tenant ID for a user';

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration complete
-- ─────────────────────────────────────────────────────────────────────────────
