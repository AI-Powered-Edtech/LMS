-- Fix rpc_publish_course: replace JWT-based tenant_id lookup with get_my_tenant_id()
-- Root cause: current_setting('request.jwt.claims', ...) returns NULL when tenant_id is
-- not embedded in the JWT (which is the case for most dev/prod users).
-- Solution: use public.get_my_tenant_id() which queries user_roles table directly.

CREATE OR REPLACE FUNCTION public.rpc_publish_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id   UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Use get_my_tenant_id() which reads from user_roles — does not depend on JWT claims.
    v_tenant_id := public.get_my_tenant_id();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or missing tenant_id';
    END IF;

    UPDATE public.courses
    SET status       = 'published',
        published_at = now(),
        updated_at   = now()
    WHERE id        = p_course_id
      AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course not found or access denied';
    END IF;
END;
$$;
