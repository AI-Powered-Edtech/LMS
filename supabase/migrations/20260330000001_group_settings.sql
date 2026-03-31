-- Migration: Add group_settings JSONB column to assignments table
-- Purpose: Store assignment-level group configuration (method, collaboration, peer review)

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS group_settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN assignments.group_settings IS
  'Assignment-level group configuration: method, doc_collaboration, peer_review_required';

-- RPC: Update group settings for an assignment (teacher only)
CREATE OR REPLACE FUNCTION update_group_settings(
  p_assignment_id uuid,
  p_settings      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Verify caller belongs to the same tenant
  IF v_tenant_id <> (SELECT get_my_tenant_id()) THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  -- Verify caller is the assignment owner (teacher)
  IF NOT EXISTS (
    SELECT 1 FROM assignments
    WHERE id = p_assignment_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized — only the assignment teacher can update settings';
  END IF;

  UPDATE assignments
  SET group_settings = p_settings,
      updated_at     = now()
  WHERE id = p_assignment_id;
END;
$$;

-- RPC: Get group settings for an assignment
CREATE OR REPLACE FUNCTION get_group_settings(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings jsonb;
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT group_settings, tenant_id
  INTO v_settings, v_tenant_id
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  IF v_tenant_id <> (SELECT get_my_tenant_id()) THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  RETURN COALESCE(v_settings, '{}'::jsonb);
END;
$$;
