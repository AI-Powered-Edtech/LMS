-- ==========================================================================
-- Migration: 18_restore_ai_tutor_foundation
--
-- 1. Rate Limiter Table
-- 2. Interaction Logging Table
-- 3. Core Context RPC (hardened)
-- 4. RLS Policies (Multi-tenant safety)
-- ==========================================================================

-- ─── 1. Rate Limiter Table ───
CREATE TABLE IF NOT EXISTS ai_tutor_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),

  request_count int DEFAULT 0,
  window_start timestamptz DEFAULT now(),

  daily_count int DEFAULT 0,
  daily_window_start timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_rate_limit_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_rate_limits_user ON ai_tutor_rate_limits (user_id);

-- ─── 2. Interaction Logging Table ───
CREATE TABLE IF NOT EXISTS ai_tutor_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  lesson_id uuid REFERENCES lessons(id),

  question text,
  response text,

  difficulty_level text,
  model text,

  token_count_prompt int,
  token_count_response int,

  latency_ms int,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_interactions_user ON ai_tutor_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_interactions_tenant ON ai_tutor_interactions (tenant_id);

-- ─── 3. Core Context RPC ───
CREATE OR REPLACE FUNCTION get_tutor_context(
  p_tenant_id uuid,
  p_user_id uuid,
  p_lesson_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN

SELECT json_build_object(
  'lesson', (
    SELECT json_build_object(
      'id', l.id,
      'title', l.title,
      'content', l.content,
      'type', l.type
    )
    FROM lessons l
    WHERE l.id = p_lesson_id AND l.tenant_id = p_tenant_id
  ),
  'resources', (
    SELECT COALESCE(json_agg(r), '[]'::json)
    FROM (
      SELECT lr.id, lr.type, lr.title, lr.content
      FROM lesson_resources lr
      WHERE lr.lesson_id = p_lesson_id AND lr.tenant_id = p_tenant_id
    ) r
  ),
  'progress', (
    SELECT json_build_object(
      'last_position', lp.last_position,
      'completed', lp.completed,
      'progress_percentage', lp.progress_percentage,
      'status', lp.status
    )
    FROM lesson_progress lp
    WHERE lp.user_id = p_user_id
    AND lp.lesson_id = p_lesson_id
    AND lp.tenant_id = p_tenant_id
  )
)
INTO result;

RETURN result;

END;
$$;

-- ─── 4. RLS Policies ───
ALTER TABLE ai_tutor_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_interactions ENABLE ROW LEVEL SECURITY;

-- Service role handles inserts (from Edge Function). 
-- Users can read their own data if they are within their tenant.

CREATE POLICY "users_read_own_rate_limits" ON ai_tutor_rate_limits
  FOR SELECT USING (auth.uid() = user_id AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "users_read_own_interactions" ON ai_tutor_interactions
  FOR SELECT USING (auth.uid() = user_id AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Ensure service role can do everything (default bypass RLS, but explicit for clarity)
CREATE POLICY "service_role_all_rate_limits" ON ai_tutor_rate_limits
  FOR ALL USING (true);

CREATE POLICY "service_role_all_interactions" ON ai_tutor_interactions
  FOR ALL USING (true);
