-- =========================================================================
-- Migration 52: Gamification Phase 5 - Weekly Leaderboard System
--
-- 1. Refactors user_points to be a log (audit) table instead of summary.
-- 2. Updates add_user_points() RPC to support logging and class context.
-- 3. Creates leaderboards_weekly table for historical snapshots.
-- 4. Implements rank recomputation and aggregation logic.
-- 5. Ensures existing profiles leveling logic remains compatible.
-- =========================================================================

-- 1. Refactor user_points table
-- Add created_at and class_id if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_points' AND column_name = 'created_at') THEN
        ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_points' AND column_name = 'class_id') THEN
        ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Drop unique constraint that prevents multiple entries per user/tenant
ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_user_id_key;
ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_user_id_tenant_id_key;

-- 2. Update add_user_points() RPC
-- Refined to act as a log and update summaries
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id uuid,
    p_points integer,
    p_class_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id uuid;
    v_total_points integer;
BEGIN
    -- Get user's tenant from JWT
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found';
    END IF;

    -- 1. INSERT into log table
    INSERT INTO public.user_points (user_id, tenant_id, points, class_id, created_at, updated_at)
    VALUES (p_user_id, v_tenant_id, p_points, p_class_id, now(), now());

    -- 2. Optional: If a global leaderboard table exists, update it (Summary sync)
    -- This assumes public.leaderboards exists and tracks totals.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards') THEN
        INSERT INTO public.leaderboards (tenant_id, class_id, user_id, score, updated_at)
        SELECT v_tenant_id, p_class_id, p_user_id, p_points, now()
        WHERE p_class_id IS NOT NULL
        ON CONFLICT (tenant_id, class_id, user_id)
        DO UPDATE SET 
            score = public.leaderboards.score + EXCLUDED.score,
            updated_at = now();
    END IF;

    -- 3. Recompute Level on profiles (Summing history)
    SELECT SUM(points) INTO v_total_points FROM public.user_points WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
    
    UPDATE public.profiles
    SET 
        level = public.compute_level(v_total_points),
        updated_at = now()
    WHERE id = p_user_id;

END;
$$;

-- 3. Create leaderboards_weekly table
CREATE TABLE IF NOT EXISTS public.leaderboards_weekly (
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    score integer DEFAULT 0,
    rank integer,
    week_start timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (tenant_id, class_id, user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.leaderboards_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weekly leaderboards in their tenant"
    ON public.leaderboards_weekly FOR SELECT
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 4. Index for performance (Guardrail 3)
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_lookup
ON public.leaderboards_weekly (tenant_id, class_id, week_start, score DESC);

-- 5. RPC for weekly rank recomputation (Guardrail 4)
CREATE OR REPLACE FUNCTION public.recompute_weekly_leaderboard(
    p_tenant_id uuid,
    p_class_id uuid,
    p_week_start timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Aggregation and Rank Recomputation in one step if needed, 
    -- but usually we update ranks after score changes.
    UPDATE public.leaderboards_weekly lw
    SET 
        rank = r.computed_rank,
        updated_at = now()
    FROM (
        SELECT 
            user_id,
            DENSE_RANK() OVER (ORDER BY score DESC) as computed_rank
        FROM public.leaderboards_weekly
        WHERE tenant_id = p_tenant_id
          AND class_id = p_class_id
          AND week_start = p_week_start
    ) r
    WHERE lw.user_id = r.user_id
      AND lw.tenant_id = p_tenant_id
      AND lw.class_id = p_class_id
      AND lw.week_start = p_week_start;
END;
$$;

-- 6. RPC to Refresh Weekly Aggregation
CREATE OR REPLACE FUNCTION public.refresh_weekly_leaderboard(
    p_tenant_id uuid,
    p_class_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start timestamp with time zone := date_trunc('week', now());
BEGIN
    -- 1. Refresh scores from user_points
    INSERT INTO public.leaderboards_weekly (tenant_id, class_id, user_id, score, week_start, updated_at)
    SELECT 
        tenant_id,
        class_id,
        user_id,
        SUM(points) as score,
        v_week_start,
        now()
    FROM public.user_points
    WHERE tenant_id = p_tenant_id 
      AND class_id = p_class_id
      AND created_at >= v_week_start
    GROUP BY tenant_id, class_id, user_id
    ON CONFLICT (tenant_id, class_id, user_id, week_start)
    DO UPDATE SET 
        score = EXCLUDED.score,
        updated_at = now();

    -- 2. Recompute ranks
    PERFORM public.recompute_weekly_leaderboard(p_tenant_id, p_class_id, v_week_start);
END;
$$;

-- 7. Trigger to keep weekly scores in sync (Optional but useful for realtime)
CREATE OR REPLACE FUNCTION public.sync_points_to_weekly_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start timestamp with time zone := date_trunc('week', now());
BEGIN
    IF NEW.class_id IS NOT NULL THEN
        INSERT INTO public.leaderboards_weekly (tenant_id, class_id, user_id, score, week_start, updated_at)
        VALUES (NEW.tenant_id, NEW.class_id, NEW.user_id, NEW.points, v_week_start, now())
        ON CONFLICT (tenant_id, class_id, user_id, week_start)
        DO UPDATE SET 
            score = public.leaderboards_weekly.score + EXCLUDED.score,
            updated_at = now();
            
        -- Note: Frequent rank recompute might be expensive; 
        -- usually recomputed on-demand or by cron.
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_points_to_weekly
AFTER INSERT ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.sync_points_to_weekly_leaderboard();
