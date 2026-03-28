-- =============================================================================
-- Migration: Public Profile
-- Adds username, bio, is_profile_public to profiles table.
-- Creates get_public_profile and update_profile_privacy RPCs.
-- =============================================================================

SET search_path TO 'public';

-- ── 1. Add columns to profiles ────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_profile_public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_profile_public boolean DEFAULT false;
  END IF;
END;
$$;

-- Unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ── 2. RPC: get_public_profile ─────────────────────────────────────────────────
-- Returns profile JSON for any user. Callers must be authenticated.
-- Returns NULL if profile does not exist or is not public
-- (unless the caller IS the profile owner).

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile     public.profiles%ROWTYPE;
  v_result      jsonb;
  v_total_xp    bigint;
  v_level       integer;
  v_streak      integer;
  v_courses_done bigint;
  v_quiz_count  bigint;
  v_badges      jsonb;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch profile row
  SELECT id, email, first_name, last_name, full_name, avatar_url, phone,
         is_active, created_at, updated_at, tenant_id, level, is_demo,
         username, bio, is_profile_public
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Visibility: only the owner sees a private profile
  IF NOT COALESCE(v_profile.is_profile_public, false)
     AND auth.uid() <> p_user_id THEN
    RETURN NULL;
  END IF;

  -- XP: sum of user_points for this user across all tenant contexts
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_xp
  FROM public.user_points
  WHERE user_id = p_user_id;

  -- Level: from profiles table
  v_level := COALESCE(v_profile.level, 1);

  -- Streak: current_streak from user_streaks (max across tenants)
  SELECT COALESCE(MAX(current_streak), 0)
  INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  -- Courses completed: course_progress rows where percentage = 100
  SELECT COUNT(*)
  INTO v_courses_done
  FROM public.course_progress
  WHERE user_id = p_user_id
    AND percentage >= 100;

  -- Quiz attempts (submitted/graded)
  SELECT COUNT(*)
  INTO v_quiz_count
  FROM public.quiz_attempts_v2
  WHERE student_id = p_user_id
    AND status IN ('submitted', 'graded');

  -- Badges
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',          ub.id,
        'name',        b.name,
        'description', b.description,
        'icon',        b.icon,
        'earned_at',   ub.earned_at
      )
      ORDER BY ub.earned_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_badges
  FROM public.user_badges ub
  JOIN public.badges b ON b.id = ub.badge_id
  WHERE ub.user_id = p_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'id',               v_profile.id,
    'username',         v_profile.username,
    'full_name',        v_profile.full_name,
    'first_name',       v_profile.first_name,
    'last_name',        v_profile.last_name,
    'avatar_url',       v_profile.avatar_url,
    'bio',              COALESCE(v_profile.bio, ''),
    'is_profile_public', COALESCE(v_profile.is_profile_public, false),
    'level',            v_level,
    'stats', jsonb_build_object(
      'total_xp',       v_total_xp,
      'level',          v_level,
      'streak',         v_streak,
      'courses_done',   v_courses_done,
      'quiz_count',     v_quiz_count,
      'badge_count',    jsonb_array_length(v_badges)
    ),
    'badges',           v_badges
  );

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_public_profile(uuid) OWNER TO postgres;

-- ── 3. RPC: update_profile_privacy ────────────────────────────────────────────
-- Allows authenticated users to toggle their own profile visibility.

CREATE OR REPLACE FUNCTION public.update_profile_privacy(p_is_public boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET is_profile_public = p_is_public,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION public.update_profile_privacy(boolean) OWNER TO postgres;
