-- =============================================================================
-- Migration: Fix SECURITY DEFINER functions missing SET search_path
-- Date: 2026-03-25
-- Sprint: 21D Security Hardening
--
-- SECURITY DEFINER functions execute with the privileges of the function owner
-- (typically postgres). Without an explicit search_path, a malicious actor who
-- can control the search_path (e.g. via SET search_path or a schema with higher
-- priority) could trick these functions into resolving unqualified table/function
-- names to attacker-controlled objects.
--
-- This migration locks down ALL 19 SECURITY DEFINER functions from the baseline
-- that were created without SET search_path TO 'public'.
-- =============================================================================

-- 1. grade_attempt_question(uuid, numeric, boolean, text)
ALTER FUNCTION public.grade_attempt_question(uuid, numeric, boolean, text)
  SET search_path TO 'public';

-- 2. handle_course_unassigned_from_class()
ALTER FUNCTION public.handle_course_unassigned_from_class()
  SET search_path TO 'public';

-- 3. is_enrolled_in_course(uuid)
ALTER FUNCTION public.is_enrolled_in_course(uuid)
  SET search_path TO 'public';

-- 4. log_analytics_access(text, uuid, jsonb)
ALTER FUNCTION public.log_analytics_access(text, uuid, jsonb)
  SET search_path TO 'public';

-- 5. notify_announcement_published()
ALTER FUNCTION public.notify_announcement_published()
  SET search_path TO 'public';

-- 6. notify_assignment_graded()
ALTER FUNCTION public.notify_assignment_graded()
  SET search_path TO 'public';

-- 7. notify_course_published()
ALTER FUNCTION public.notify_course_published()
  SET search_path TO 'public';

-- 8. notify_discussion_reply()
ALTER FUNCTION public.notify_discussion_reply()
  SET search_path TO 'public';

-- 9. notify_quiz_published()
ALTER FUNCTION public.notify_quiz_published()
  SET search_path TO 'public';

-- 10. on_assignment_submitted()
ALTER FUNCTION public.on_assignment_submitted()
  SET search_path TO 'public';

-- 11. recalculate_attempt_score(uuid)
ALTER FUNCTION public.recalculate_attempt_score(uuid)
  SET search_path TO 'public';

-- 12. recompute_leaderboard(uuid)
ALTER FUNCTION public.recompute_leaderboard(uuid)
  SET search_path TO 'public';

-- 13. recompute_weekly_leaderboard(uuid, uuid, timestamptz)
ALTER FUNCTION public.recompute_weekly_leaderboard(uuid, uuid, timestamptz)
  SET search_path TO 'public';

-- 14. refresh_weekly_leaderboard(uuid, uuid)
ALTER FUNCTION public.refresh_weekly_leaderboard(uuid, uuid)
  SET search_path TO 'public';

-- 15. search_lesson_resources(uuid, uuid, text, integer)
ALTER FUNCTION public.search_lesson_resources(uuid, uuid, text, integer)
  SET search_path TO 'public';

-- 16. sync_points_to_weekly_leaderboard()
ALTER FUNCTION public.sync_points_to_weekly_leaderboard()
  SET search_path TO 'public';

-- 17. sync_user_points_to_leaderboard()
ALTER FUNCTION public.sync_user_points_to_leaderboard()
  SET search_path TO 'public';

-- 18. update_streak(uuid, uuid)
ALTER FUNCTION public.update_streak(uuid, uuid)
  SET search_path TO 'public';

-- 19. v1_get_quiz_results(uuid)
ALTER FUNCTION public.v1_get_quiz_results(uuid)
  SET search_path TO 'public';
