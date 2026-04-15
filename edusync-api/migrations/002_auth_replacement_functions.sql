CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    current_setting('request.jwt.claim.sub', true)
  )::UUID;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = public.current_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = public.current_user_id()
  ORDER BY created_at ASC
  LIMIT 1;
$$;
