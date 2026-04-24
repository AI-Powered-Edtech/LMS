-- Migration 038: fix get_tenant_users output shape so frontend TenantUser.user_id is populated.
-- Previously the function returned `id`, causing React `Each child in a list should have a unique "key" prop.`
-- warning in admin UserTable because all rows had key=undefined.

CREATE OR REPLACE FUNCTION public.get_tenant_users(p_search text, p_role text, p_cursor text, p_limit integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_caller uuid := auth.uid();
  v_rows   json;
BEGIN
  IF v_caller IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = v_caller LIMIT 1;
  IF v_tenant IS NULL THEN
    RETURN '[]'::json;
  END IF;

  WITH base AS (
    SELECT p.id AS user_id,
           p.email,
           COALESCE(p.first_name,'') AS first_name,
           COALESCE(p.last_name,'')  AS last_name,
           p.avatar_url,
           COALESCE(p.is_active, true) AS is_active,
           p.created_at,
           NULL::timestamptz AS last_sign_in_at,
           ARRAY(
             SELECT DISTINCT upper(tm.role)
             FROM public.tenant_memberships tm
             WHERE tm.user_id = p.id AND tm.tenant_id = v_tenant
           ) AS roles
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant
      AND (p_search IS NULL OR p_search = '' OR
           p.email ILIKE '%' || p_search || '%' OR
           COALESCE(p.full_name,'') ILIKE '%' || p_search || '%' OR
           COALESCE(p.first_name,'') ILIKE '%' || p_search || '%' OR
           COALESCE(p.last_name,'')  ILIKE '%' || p_search || '%')
  ),
  filtered AS (
    SELECT * FROM base
    WHERE (p_role IS NULL OR p_role = '' OR upper(p_role) = ANY (roles))
      AND (p_cursor IS NULL OR p_cursor = '' OR created_at < p_cursor::timestamptz)
  ),
  counted AS (SELECT count(*)::int AS n FROM filtered),
  page AS (
    SELECT f.*, c.n AS total_count
    FROM filtered f CROSS JOIN counted c
    ORDER BY f.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 20), 1)
  )
  SELECT json_agg(row_to_json(page.*)) INTO v_rows FROM page;

  RETURN COALESCE(v_rows, '[]'::json);
END;
$function$;
