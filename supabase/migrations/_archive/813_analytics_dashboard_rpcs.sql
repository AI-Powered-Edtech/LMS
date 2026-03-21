-- ============================================================
-- SP-12.3a: Analytics Dashboard RPCs
-- 3 read-only RPCs for teacher analytics dashboard
-- All use get_my_tenant_id() for tenant isolation
-- SECURITY DEFINER bypasses RLS — WHERE tenant_id filter is the guard
-- ============================================================

-- RPC 1: Course-level analytics overview
CREATE OR REPLACE FUNCTION get_course_analytics(p_course_id UUID)
RETURNS TABLE (
  course_id UUID,
  course_title TEXT,
  total_students INT,
  active_students_7d INT,
  avg_completion_pct NUMERIC,
  avg_quiz_score NUMERIC,
  total_lessons INT,
  struggling_students INT,
  last_aggregated_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cas.course_id,
    c.title,
    cas.total_students,
    cas.active_students_7d,
    cas.avg_completion_pct,
    cas.avg_quiz_score,
    cas.total_lessons,
    cas.struggling_students,
    cas.last_aggregated_at
  FROM course_analytics_summary cas
  JOIN courses c ON c.id = cas.course_id
  WHERE cas.course_id = p_course_id
    AND cas.tenant_id = get_my_tenant_id();
$$;


-- RPC 2: Per-lesson breakdown for a course
CREATE OR REPLACE FUNCTION get_lesson_analytics(p_course_id UUID)
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  module_title TEXT,
  total_students INT,
  active_students_7d INT,
  completions INT,
  avg_completion_pct NUMERIC,
  completion_rate NUMERIC,
  avg_time_spent INT,
  avg_quiz_score NUMERIC,
  struggling_students INT,
  high_risk_students INT,
  last_aggregated_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    las.lesson_id,
    l.title,
    cm.title,
    las.total_students,
    las.active_students_7d,
    las.completions,
    las.avg_completion_pct,
    las.completion_rate,
    las.avg_time_spent,
    las.avg_quiz_score,
    las.struggling_students,
    las.high_risk_students,
    las.last_aggregated_at
  FROM lesson_analytics_summary las
  JOIN lessons l ON l.id = las.lesson_id
  JOIN course_modules cm ON cm.id = l.module_id
  WHERE las.course_id = p_course_id
    AND las.tenant_id = get_my_tenant_id()
  ORDER BY cm."order" ASC, l."order" ASC;
$$;


-- RPC 3: Per-student signals for a course (optionally filtered by lesson)
CREATE OR REPLACE FUNCTION get_student_signals(
  p_course_id UUID,
  p_lesson_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  student_name TEXT,
  lesson_id UUID,
  lesson_title TEXT,
  session_count INT,
  total_time_spent INT,
  blocks_viewed INT,
  blocks_total INT,
  completion_pct NUMERIC,
  video_replays INT,
  max_video_pct NUMERIC,
  quiz_attempts INT,
  best_quiz_score NUMERIC,
  quiz_passed BOOLEAN,
  struggle_score INT,
  last_accessed_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sls.user_id,
    COALESCE(p.full_name, p.email, sls.user_id::TEXT),
    sls.lesson_id,
    l.title,
    sls.session_count,
    sls.total_time_spent,
    sls.blocks_viewed,
    sls.blocks_total,
    sls.completion_pct,
    sls.video_replays,
    sls.max_video_pct,
    sls.quiz_attempts,
    sls.best_quiz_score,
    sls.quiz_passed,
    sls.struggle_score,
    sls.last_accessed_at
  FROM student_lesson_signals sls
  JOIN lessons l ON l.id = sls.lesson_id
  JOIN course_modules cm ON cm.id = l.module_id
  LEFT JOIN profiles p ON p.id = sls.user_id
  WHERE cm.course_id = p_course_id
    AND sls.tenant_id = get_my_tenant_id()
    AND (p_lesson_id IS NULL OR sls.lesson_id = p_lesson_id)
  ORDER BY sls.struggle_score DESC, sls.completion_pct ASC;
$$;


-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_course_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lesson_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_signals(UUID, UUID) TO authenticated;
