-- =============================================================================
-- Migration 20260405000001: Fix get_my_children() RPC
-- =============================================================================
-- Corrects three wrong references in the original function body
-- (from migration 20260402000007_parent_principal_roles.sql):
--
--   1. e.user_id      → e.student_id   (enrollments PK column name)
--   2. public.classrooms → public.classes (table does not exist as classrooms)
--   3. e.classroom_id → e.class_id     (enrollments FK column name)
--
-- Also adds DISTINCT ON (p.id) to prevent duplicate child rows when a student
-- is enrolled in more than one class simultaneously.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_children()
RETURNS TABLE (
  student_id     uuid,
  student_name   text,
  student_avatar text,
  class_name     text,
  relationship   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id                                      AS student_id,
    p.full_name                               AS student_name,
    p.avatar_url                              AS student_avatar,
    COALESCE(c.name, 'Tidak ada kelas')       AS class_name,
    spl.relationship                          AS relationship
  FROM public.student_parent_links spl
  JOIN public.profiles p
    ON p.id = spl.student_id
  LEFT JOIN public.enrollments e
    ON e.student_id = spl.student_id          -- FIXED: was e.user_id
    AND e.tenant_id = spl.tenant_id
  LEFT JOIN public.classes c
    ON c.id = e.class_id                      -- FIXED: was public.classrooms / e.classroom_id
  WHERE spl.parent_id = auth.uid()
    AND spl.tenant_id = (SELECT public.get_my_tenant_id())
  ORDER BY p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;
