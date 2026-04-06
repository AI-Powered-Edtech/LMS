# Manual Migration Instructions

## Issue
The Supabase CLI migration history is out of sync with the remote database, preventing automatic migration push.

## Solution: Run SQL Manually

### Option 1: Supabase SQL Editor (Recommended)

1. Go to https://supabase.com/dashboard/project/omfnkoufjqjqilswldtz/sql
2. Copy and paste the SQL below
3. Click "Run"

### Option 2: psql Command

If you have psql installed:
```bash
psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260406000001_tenant_memberships.sql
```

---

## SQL to Run

```sql
-- Create tenant_memberships table
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'principal')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON public.tenant_memberships (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON public.tenant_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_status ON public.tenant_memberships (status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_role ON public.tenant_memberships (role);

-- RLS
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_view_own_memberships ON public.tenant_memberships;
CREATE POLICY user_view_own_memberships ON public.tenant_memberships
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admin_view_tenant_memberships ON public.tenant_memberships;
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

DROP POLICY IF EXISTS admin_insert_tenant_memberships ON public.tenant_memberships;
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

DROP POLICY IF EXISTS admin_update_tenant_memberships ON public.tenant_memberships;
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

DROP POLICY IF EXISTS admin_delete_tenant_memberships ON public.tenant_memberships;
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

-- Helper function
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

-- Comments
COMMENT ON TABLE public.tenant_memberships IS 'Maps users to tenants with role and status';
COMMENT ON FUNCTION get_user_tenant_id IS 'Returns the active tenant ID for a user';
```

---

## Verification

After running the SQL, verify the table exists:

```sql
SELECT COUNT(*) FROM public.tenant_memberships;
```

You should see the table exists (count may be 0).

---

## Expected Result

After running this migration:
- ✅ No more `tenant_memberships` table errors
- ✅ No more 404 errors on tenant membership queries
- ✅ Console should be clean of these errors

---

**Date:** April 6, 2026  
**Project:** omfnkoufjqjqilswldtz
