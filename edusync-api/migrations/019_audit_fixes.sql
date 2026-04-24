-- Migration 019: stubs for missing RPCs + schema gaps surfaced by E2E audit

-- 1) assignments.status — frontend filters on this
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived','closed'));
CREATE INDEX IF NOT EXISTS assignments_status_idx ON public.assignments (tenant_id, status);

-- 2) teacher_onboarding_progress — referenced by useTeacherOnboarding
CREATE TABLE IF NOT EXISTS public.teacher_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  step_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, step_key)
);
CREATE INDEX IF NOT EXISTS teacher_onboarding_progress_tenant_user_idx
  ON public.teacher_onboarding_progress (tenant_id, user_id);

-- 3) get_struggle_alerts — stub returning empty set
CREATE OR REPLACE FUNCTION public.get_struggle_alerts(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  user_id UUID,
  course_id UUID,
  lesson_id UUID,
  severity TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ
  WHERE false
$$;

-- 4) get_unread_notification_count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL
) RETURNS BIGINT LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT COUNT(*) FROM public.notifications n
    WHERE (p_tenant_id IS NULL OR n.tenant_id = p_tenant_id)
      AND (p_user_id IS NULL OR n.user_id = p_user_id)
      AND COALESCE(n.is_read, false) = false
  ), 0)::BIGINT
$$;

-- 5) get_student_xp_profile
CREATE OR REPLACE FUNCTION public.get_student_xp_profile(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'xp', COALESCE((SELECT SUM(points) FROM public.user_points up
                    WHERE (p_tenant_id IS NULL OR up.tenant_id = p_tenant_id)
                      AND (p_user_id IS NULL OR up.user_id = p_user_id)), 0),
    'level', 1,
    'streak', 0,
    'next_level_xp', 100
  )
$$;

-- 6) get_student_badges
CREATE OR REPLACE FUNCTION public.get_student_badges(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  badge_id UUID,
  name TEXT,
  icon TEXT,
  earned_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT ub.id, ub.badge_id, b.name, b.icon, ub.earned_at
  FROM public.user_badges ub
  LEFT JOIN public.badges b ON b.id = ub.badge_id
  WHERE (p_tenant_id IS NULL OR ub.tenant_id = p_tenant_id)
    AND (p_user_id IS NULL OR ub.user_id = p_user_id)
$$;

-- 7) get_student_recommendations — safe empty stub
CREATE OR REPLACE FUNCTION public.get_student_recommendations(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL,
  p_limit     INT  DEFAULT 5
) RETURNS TABLE (
  course_id UUID,
  title TEXT,
  reason TEXT,
  score FLOAT8
) LANGUAGE sql STABLE AS $$
  SELECT c.id, c.title, 'Rekomendasi default', 0.5::FLOAT8
  FROM public.courses c
  WHERE (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
    AND c.status = 'published'
  ORDER BY c.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 0)
$$;
