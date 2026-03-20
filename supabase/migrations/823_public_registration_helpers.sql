-- Public function to look up a class by join code (for pre-registration validation)
-- Accessible to anon - safe because it only exposes class name, teacher name, school name
CREATE OR REPLACE FUNCTION public.public_lookup_class(p_join_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_class  record;
  v_teacher_name text;
  v_tenant_name  text;
BEGIN
  SELECT c.id, c.name, c.teacher_id, c.tenant_id INTO v_class
  FROM public.classes c
  WHERE upper(trim(c.join_code)) = upper(trim(p_join_code))
  LIMIT 1;

  IF v_class.id IS NULL THEN
    RETURN json_build_object('found', false, 'error', 'Kode kelas tidak ditemukan');
  END IF;

  SELECT full_name INTO v_teacher_name FROM public.profiles WHERE id = v_class.teacher_id;
  SELECT name       INTO v_tenant_name  FROM public.tenants  WHERE id = v_class.tenant_id;

  RETURN json_build_object(
    'found',        true,
    'class_id',     v_class.id,
    'class_name',   v_class.name,
    'teacher_name', COALESCE(v_teacher_name, 'Guru'),
    'tenant_id',    v_class.tenant_id,
    'tenant_name',  COALESCE(v_tenant_name, 'Sekolah')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lookup_class(text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_lookup_class(text) TO authenticated;

-- Public tenant search for school selection dropdown
CREATE OR REPLACE FUNCTION public.public_search_tenants(p_query text DEFAULT '')
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug
  FROM public.tenants t
  WHERE
    t.is_active = true
    AND t.id != '00000000-0000-0000-0000-000000000001'
    AND (p_query = '' OR t.name ILIKE '%' || p_query || '%')
  ORDER BY t.name
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_search_tenants(text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_search_tenants(text) TO authenticated;
