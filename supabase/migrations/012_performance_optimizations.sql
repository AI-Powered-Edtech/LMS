-- ==============================================================================
-- PHASE 2: PERFORMANCE SCALING
-- Addresses High severity performance bottlenecks
-- ==============================================================================

-- 1. Analytics Activity Counts (Replaces client-side 5000-row fetch)
CREATE OR REPLACE FUNCTION public.get_tenant_activity_counts(
  p_tenant_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  event_type text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Security: verify tenant matches
  IF p_tenant_id != get_my_tenant_id() THEN
    RAISE EXCEPTION 'Unauthorized: tenant mismatch';
  END IF;

  RETURN QUERY
  SELECT 
    ae.event_type, 
    COUNT(*) as count
  FROM activity_events ae
  WHERE ae.tenant_id = p_tenant_id
    AND ae.created_at >= (NOW() - (p_days || ' days')::interval)
  GROUP BY ae.event_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_activity_counts(uuid, integer) TO authenticated;
