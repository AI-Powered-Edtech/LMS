-- ==========================================================================
-- Migration: AI Tutor Foundation
--
-- 1. Context Builder RPC (hardened)
-- 2. Rate limiter table
-- 3. Interaction logging table
-- ==========================================================================

-- ─── 1. Context Builder RPC ───
-- Returns a compact JSON context for the AI Tutor.
-- - Lesson content truncated to 2000 chars (prevents token explosion)
-- - Quiz answers excluded (only score + max_score, no raw answers)
-- - Single RPC call assembles all context

-- Missing index required for RPC performance (WHERE lesson_id = ? AND tenant_id = ?)
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_tenant 
ON lesson_resources (lesson_id, tenant_id);

DROP FUNCTION IF EXISTS get_tutor_context(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION get_tutor_context(
  p_tenant_id uuid,
  p_user_id uuid,
  p_lesson_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'lesson', (
      SELECT jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'module_title', m.title,
        'course_title', c.title,
        'position_in_module', l.position
      )
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = p_lesson_id AND l.tenant_id = p_tenant_id
    ),
    'resources', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'type', lr.resource_type,
        'content_summary', left(lr.content::text, 2000)
      )), '[]'::jsonb)
      FROM lesson_resources lr
      WHERE lr.lesson_id = p_lesson_id AND lr.tenant_id = p_tenant_id
    ),
    'progress', (
      SELECT jsonb_build_object(
        'last_position_seconds', lp.last_position_seconds,
        'progress_percent', lp.progress_percent,
        'is_completed', lp.is_completed
      )
      FROM lesson_progress lp
      WHERE lp.user_id = p_user_id AND lp.lesson_id = p_lesson_id
    ),
    'recent_quiz', (
      SELECT jsonb_build_object(
        'score', qa.score,
        'max_score', qa.max_score
        -- answers intentionally excluded to prevent AI from leaking quiz answers
      )
      FROM quiz_attempts qa
      WHERE qa.user_id = p_user_id
        AND qa.lesson_id = p_lesson_id
        AND qa.tenant_id = p_tenant_id
      ORDER BY qa.created_at DESC
      LIMIT 1
    ),
    'student_profile', (
      SELECT jsonb_build_object(
        'total_lessons_completed', count(*) FILTER (WHERE lp.is_completed),
        'avg_progress', round(avg(lp.progress_percent)::numeric, 1),
        'total_lessons_started', count(*)
      )
      FROM lesson_progress lp
      WHERE lp.user_id = p_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;


-- ─── 2. Rate Limiter Table ───
-- Tracks AI tutor request counts per user per sliding window (minute and day).

CREATE TABLE IF NOT EXISTS ai_tutor_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  daily_count int NOT NULL DEFAULT 1,
  daily_window_start timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_limit_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON ai_tutor_rate_limits (user_id);

ALTER TABLE ai_tutor_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only — no direct client access
CREATE POLICY "service_role_only" ON ai_tutor_rate_limits
  FOR ALL USING (false);


-- ─── 3. Interaction Logging Table ───
-- Stores AI tutor interactions for analytics and improvement.

CREATE TABLE IF NOT EXISTS ai_tutor_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  lesson_id uuid NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  difficulty_level text NOT NULL,
  model text NOT NULL,
  latency_ms int NOT NULL,
  token_count_prompt int,
  token_count_response int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON ai_tutor_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_tenant ON ai_tutor_interactions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_lesson ON ai_tutor_interactions (lesson_id, created_at DESC);

ALTER TABLE ai_tutor_interactions ENABLE ROW LEVEL SECURITY;

-- Students can read their own interactions
CREATE POLICY "students_read_own" ON ai_tutor_interactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role handles inserts (from Edge Function)
CREATE POLICY "service_insert" ON ai_tutor_interactions
  FOR INSERT WITH CHECK (false);
