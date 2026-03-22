-- Consolidates the two-query getCourseEngagementStats into a single server-side join.
-- Previously the service fetched course_stats then courses separately; now one RPC.

CREATE OR REPLACE FUNCTION get_course_engagement(p_tenant_id UUID)
RETURNS TABLE (
  course_id         UUID,
  course_name       TEXT,
  total_enrolled    INTEGER,
  active_students   INTEGER,
  avg_progress      NUMERIC,
  avg_quiz_score    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cs.course_id,
    COALESCE(c.title, 'Unknown Course') AS course_name,
    COALESCE(cs.total_enrolled, 0)      AS total_enrolled,
    COALESCE(cs.active_students, 0)     AS active_students,
    ROUND(COALESCE(cs.avg_progress, 0)::NUMERIC, 1) AS avg_progress,
    ROUND(COALESCE(cs.avg_quiz_score, 0)::NUMERIC, 1) AS avg_quiz_score
  FROM public.course_stats cs
  LEFT JOIN public.courses c ON c.id = cs.course_id
  WHERE cs.tenant_id = p_tenant_id
    AND auth.uid() IS NOT NULL
  ORDER BY cs.total_enrolled DESC NULLS LAST
  LIMIT 100;
$$;

COMMENT ON FUNCTION get_course_engagement(UUID) IS
  'Returns per-course engagement metrics for a tenant in one query. Replaces separate course_stats + courses fetches.';
