-- ==========================================================================
-- Migration 40: Leaderboard Hardening
--
-- 1. Adds composite index for leaderboard Top-N pagination performance.
-- 2. Ensures uniqueness for tenant_id + user_id.
-- 3. Creates RPC add_user_points to manage XP upserts.
-- 4. Creates trigger on user_points to update leaderboards score.
-- 5. Creates RPC recompute_leaderboard to calculate rank offline/separately.
-- ==========================================================================

-- 1. Add Composite Index for Top-N query
CREATE INDEX IF NOT EXISTS idx_leaderboards_tenant_points
ON public.leaderboards (tenant_id, points DESC);

-- 2. Ensure UNIQUE constraint for leaderboard entry
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_leaderboards_tenant_user'
    ) THEN
        ALTER TABLE public.leaderboards 
        ADD CONSTRAINT uq_leaderboards_tenant_user UNIQUE (tenant_id, user_id);
    END IF;
END $;

-- 3. Ensure add_user_points RPC exists
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
    -- Get user's tenant
    SELECT auth.jwt() ->> 'tenant_id' INTO v_tenant_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found in JWT token';
    END IF;

    -- Upsert points
    INSERT INTO public.user_points (user_id, tenant_id, points, created_at, updated_at)
    VALUES (p_user_id, v_tenant_id, p_points, now(), now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET 
        points = public.user_points.points + p_points,
        updated_at = now();
END;
$$;

-- 4. Create function and trigger to sync XP to leaderboards
-- This ONLY updates the score, not the rank. Rank is computed by RPC.
CREATE OR REPLACE FUNCTION sync_user_points_to_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update all leaderboard entries for this user with their new total points
    UPDATE public.leaderboards
    SET 
        points = NEW.points,
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND tenant_id = NEW.tenant_id;
      
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_points_changed ON public.user_points;
CREATE TRIGGER on_user_points_changed
AFTER INSERT OR UPDATE OF points
ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION sync_user_points_to_leaderboard();

-- 5. Create RPC for rank recomputation
CREATE OR REPLACE FUNCTION public.recompute_leaderboard(
    p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    UPDATE public.leaderboards l
    SET 
        rank = r.computed_rank,
        updated_at = now()
    FROM (
        SELECT 
            user_id,
            DENSE_RANK() OVER (ORDER BY points DESC) as computed_rank
        FROM public.leaderboards
        WHERE tenant_id = p_tenant_id
    ) r
    WHERE l.user_id = r.user_id
      AND l.tenant_id = p_tenant_id;
END;
$;
