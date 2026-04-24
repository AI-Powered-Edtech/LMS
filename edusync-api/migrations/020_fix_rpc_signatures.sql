-- Migration 020: align RPC signatures with frontend callers + create missing tables

-- Drop old signatures
DROP FUNCTION IF EXISTS public.get_struggle_alerts(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_student_badges(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_student_xp_profile(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_student_recommendations(UUID, UUID, INT);
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID, UUID);

-- get_struggle_alerts(p_unread_only, p_course_id, p_limit)
CREATE OR REPLACE FUNCTION public.get_struggle_alerts(
  p_unread_only BOOLEAN DEFAULT false,
  p_course_id   UUID    DEFAULT NULL,
  p_limit       INT     DEFAULT 50
) RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  user_id UUID,
  course_id UUID,
  lesson_id UUID,
  severity TEXT,
  reason TEXT,
  unread BOOLEAN,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
         NULL::TEXT, NULL::TEXT, NULL::BOOLEAN, NULL::TIMESTAMPTZ
  WHERE false
$$;

-- get_student_badges(p_user_id)
CREATE OR REPLACE FUNCTION public.get_student_badges(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  badge_id UUID,
  name TEXT,
  icon TEXT,
  earned BOOLEAN,
  earned_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT b.id, b.id, b.name, b.icon,
         (ub.id IS NOT NULL) AS earned,
         ub.earned_at
  FROM public.badges b
  LEFT JOIN public.user_badges ub
    ON ub.badge_id = b.id AND ub.user_id = p_user_id
$$;

-- get_student_xp_profile(p_user_id)
CREATE OR REPLACE FUNCTION public.get_student_xp_profile(
  p_user_id UUID
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'user_id', p_user_id,
    'xp', COALESCE((SELECT SUM(points) FROM public.user_points WHERE user_id = p_user_id), 0),
    'level', 1,
    'streak', 0,
    'next_level_xp', 100,
    'rank', NULL
  )
$$;

-- get_student_recommendations(p_user_id, p_limit)
CREATE OR REPLACE FUNCTION public.get_student_recommendations(
  p_user_id UUID,
  p_limit   INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  course_id UUID,
  title TEXT,
  reason TEXT,
  score FLOAT8
) LANGUAGE sql STABLE AS $$
  SELECT c.id, c.id, c.title, 'Rekomendasi default'::TEXT, 0.5::FLOAT8
  FROM public.courses c
  WHERE c.status = 'published'
    AND c.tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships WHERE user_id = p_user_id
    )
  ORDER BY c.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 0)
$$;

-- get_unread_notification_count(p_user_id)
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_user_id UUID
) RETURNS BIGINT LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT COUNT(*) FROM public.notifications
    WHERE user_id = p_user_id AND COALESCE(is_read, false) = false
  ), 0)::BIGINT
$$;

-- Missing tables
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  event_type TEXT DEFAULT 'generic',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calendar_events_tenant_user_idx
  ON public.calendar_events (tenant_id, user_id, starts_at);

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  feature TEXT,
  prompt TEXT,
  response JSONB,
  tokens_in INT,
  tokens_out INT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_generation_logs_tenant_idx
  ON public.ai_generation_logs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  feature TEXT,
  content JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_generated_content_tenant_idx
  ON public.ai_generated_content (tenant_id, created_at DESC);
