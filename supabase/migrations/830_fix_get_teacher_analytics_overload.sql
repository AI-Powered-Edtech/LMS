-- Fix PGRST203: drop the 3-param get_teacher_analytics overload
-- that was introduced in migrations 029/296 and conflicts with the
-- original single-param version. The client only ever calls this
-- function with { p_course_id } so the paginated overload is unused.

DROP FUNCTION IF EXISTS public.get_teacher_analytics(uuid, integer, uuid);
