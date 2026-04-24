-- Migration 023: stub `get_student_certificates` and `get_leaderboard_v2` RPCs
-- Both use RETURNS JSON (not RETURNS TABLE) per data-plane resolver quirk.
-- get_leaderboard_v2 signature matches the FE call in
-- src/features/gamification/api/gamificationService.ts (p_course_id, p_sort_by, p_period, p_limit).

DROP FUNCTION IF EXISTS public.get_student_certificates(UUID);
DROP FUNCTION IF EXISTS public.get_student_certificates();
DROP FUNCTION IF EXISTS public.get_leaderboard_v2(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.get_leaderboard_v2(UUID, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public.get_leaderboard_v2(UUID, INT);
DROP FUNCTION IF EXISTS public.get_leaderboard_v2();

CREATE FUNCTION public.get_student_certificates(
  p_user_id UUID DEFAULT NULL
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT '[]'::json
$$;

CREATE FUNCTION public.get_leaderboard_v2(
  p_course_id UUID DEFAULT NULL,
  p_sort_by   TEXT DEFAULT 'xp',
  p_period    TEXT DEFAULT 'all_time',
  p_limit     INT  DEFAULT 50
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT '[]'::json
$$;
