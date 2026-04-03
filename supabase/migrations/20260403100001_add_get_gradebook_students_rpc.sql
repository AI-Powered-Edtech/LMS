-- RPC: get_gradebook_students
-- Returns only student profiles for the given tenant.
-- Replaces client-side role filtering that was needed after PostgREST
-- !inner join on user_roles caused PGRST200 errors.
CREATE OR REPLACE FUNCTION public.get_gradebook_students(p_tenant_id uuid)
RETURNS TABLE (
  id          uuid,
  first_name  text,
  last_name   text,
  email       text,
  tenant_id   uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, p.tenant_id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
  WHERE p.tenant_id = p_tenant_id
    AND p.is_active = true
    AND ur.role = 'STUDENT'
  ORDER BY p.last_name, p.first_name;
$$;

-- Auth check wrapper: only authenticated users can call
REVOKE ALL ON FUNCTION public.get_gradebook_students(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gradebook_students(uuid) TO authenticated;
