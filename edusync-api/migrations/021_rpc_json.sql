-- Migration 021: rewrite RPCs to RETURNS JSON so that proargnames matches proargtypes
-- (RETURNS TABLE exposes OUT columns via proargnames, breaking the data-plane signature resolver)

DROP FUNCTION IF EXISTS public.get_struggle_alerts(BOOLEAN, UUID, INT);
DROP FUNCTION IF EXISTS public.get_student_badges(UUID);
DROP FUNCTION IF EXISTS public.get_student_recommendations(UUID, INT);

CREATE FUNCTION public.get_struggle_alerts(
  p_unread_only BOOLEAN DEFAULT false,
  p_course_id   UUID    DEFAULT NULL,
  p_limit       INT     DEFAULT 50
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT '[]'::json
$$;

CREATE FUNCTION public.get_student_badges(
  p_user_id UUID
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT b.id,
           b.id AS badge_id,
           b.name,
           b.icon,
           (ub.id IS NOT NULL) AS earned,
           ub.earned_at
    FROM public.badges b
    LEFT JOIN public.user_badges ub
      ON ub.badge_id = b.id AND ub.user_id = p_user_id
  ) t
$$;

CREATE FUNCTION public.get_student_recommendations(
  p_user_id UUID,
  p_limit   INT DEFAULT 5
) RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT '[]'::json
$$;

-- get_struggle_config stub (teacher calls it)
CREATE OR REPLACE FUNCTION public.get_struggle_config()
RETURNS JSON LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'enabled', false,
    'thresholds', json_build_object('low', 0.3, 'medium', 0.6, 'high', 0.8)
  )
$$;
