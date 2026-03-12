-- ==========================================================================
-- Migration 42: Level System (Phase 2)
--
-- 1. Creates compute_level function.
-- 2. Adds level column to profiles.
-- 3. Updates user_profiles view (ensuring frontend compatibility).
-- 4. Backfills level for existing users.
-- 5. Updates add_user_points RPC to auto-calculate level.
-- 6. Adds index on profiles(level).
-- ==========================================================================

-- 1. Create pure SQL function for level calculation
CREATE OR REPLACE FUNCTION public.compute_level(p_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT GREATEST(1, floor(COALESCE(p_points, 0) / 400) + 1)::integer;
$$;

-- 2. Add level column to profiles (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'level'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN level integer DEFAULT 1;
    END IF;
END $$;

-- 3. Ensure user_profiles VIEW is up to date
-- This view is used by the frontend and older migrations.
-- We recreate it to ensure the 'level' column and 'full_name' (stored in profiles) are present.
-- We also include 'role' from user_roles as per architectural requirements.
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id,
    p.tenant_id,
    p.email,
    p.full_name,
    p.avatar_url,
    r.role,
    p.level,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN (
    SELECT DISTINCT ON (user_id) user_id, role 
    FROM public.user_roles 
    ORDER BY user_id, created_at DESC
) r ON p.id = r.user_id;

-- 4. Backfill existing users
UPDATE public.profiles p
SET level = public.compute_level(up.points)
FROM public.user_points up
WHERE up.user_id = p.id;

-- 5. Refine add_user_points RPC
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id uuid,
    p_points integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Get user's tenant from JWT
    v_tenant_id := (SELECT (auth.jwt() ->> 'tenant_id')::uuid);
    IF v_tenant_id IS NULL THEN
        -- Fallback to profile tenant if JWT fails (e.g. background job?)
        SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found';
    END IF;

    -- Upsert points
    INSERT INTO public.user_points (user_id, tenant_id, points, created_at, updated_at)
    VALUES (p_user_id, v_tenant_id, p_points, now(), now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET 
        points = public.user_points.points + p_points,
        updated_at = now();

    -- Recompute Level on profiles table
    UPDATE public.profiles
    SET 
        level = public.compute_level(up.points),
        updated_at = now()
    FROM public.user_points up
    WHERE up.user_id = p_user_id
      AND up.tenant_id = v_tenant_id
      AND public.profiles.id = p_user_id;

END;
$$;

-- 6. Add index for leaderboard query optimization
CREATE INDEX IF NOT EXISTS idx_profiles_level
ON public.profiles (level);
