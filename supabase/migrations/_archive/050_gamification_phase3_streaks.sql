-- =========================================================================
-- Migration 50: Gamification Phase 3 - Daily Streak System
--
-- 1. Ensures activity_events has necessary indexes.
-- 2. Ensures activity_event_type has necessary values.
-- 3. Creates user_streaks table with tenant isolation.
-- 4. Implements update_streak() RPC with UPSERT pattern.
-- 5. Implements trigger on activity_events for automatic streak updates.
-- =========================================================================

-- 1. Indexing activity_events for performance
CREATE INDEX IF NOT EXISTS idx_activity_events_gamification_lookup 
ON public.activity_events (tenant_id, user_id, created_at DESC);

-- 2. Ensure enum values exist (Defensive)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_SUBMITTED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_SUBMITTED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_PASSED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_PASSED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_activity_date date,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own streaks"
    ON public.user_streaks FOR SELECT
    USING (auth.uid() = user_id AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_user_streaks_tenant_id ON public.user_streaks(tenant_id);

-- 4. update_streak() RPC
-- Returns bonus_xp earned (5, 10, or 30)
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid, p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today date := current_date;
    v_last_activity date;
    v_current_streak integer;
    v_longest_streak integer;
    v_bonus_xp integer := 0;
BEGIN
    -- Get existing streak data
    SELECT last_activity_date, current_streak, longest_streak 
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM public.user_streaks
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    -- If no record, initialize
    IF v_last_activity IS NULL THEN
        v_current_streak := 1;
        v_longest_streak := 1;
        v_bonus_xp := 5; -- Base bonus for starting
    ELSIF v_last_activity = v_today THEN
        -- Already active today, no change
        RETURN 0;
    ELSIF v_last_activity = v_today - 1 THEN
        -- Activity yesterday, increment streak
        v_current_streak := v_current_streak + 1;
        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;
        
        -- Bonus XP logic
        IF v_current_streak % 30 = 0 THEN
            v_bonus_xp := 30; -- 30-day milestone
        ELSIF v_current_streak % 7 = 0 THEN
            v_bonus_xp := 10; -- Weekly milestone
        ELSE
            v_bonus_xp := 5; -- Daily bonus
        END IF;
    ELSE
        -- Streak broken
        v_current_streak := 1;
        v_bonus_xp := 5;
    END IF;

    -- UPSERT streak data
    INSERT INTO public.user_streaks (user_id, tenant_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (p_user_id, p_tenant_id, v_current_streak, v_longest_streak, v_today, now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = now();

    RETURN v_bonus_xp;
END;
$$;

-- 5. Trigger for automatic streak updates on activity_events
CREATE OR REPLACE FUNCTION public.handle_streak_on_activity()
RETURNS trigger AS $$
DECLARE
    v_bonus_xp integer;
BEGIN
    -- Only process relevant events (LESSON_COMPLETED, QUIZ_PASSED, etc.)
    IF NEW.event_type IN ('LESSON_COMPLETED', 'QUIZ_COMPLETED', 'QUIZ_PASSED', 'ASSIGNMENT_SUBMITTED') THEN
        SELECT public.update_streak(NEW.user_id, NEW.tenant_id) INTO v_bonus_xp;
        
        -- If bonus earned, add points
        IF v_bonus_xp > 0 THEN
            PERFORM public.add_user_points(NEW.user_id, v_bonus_xp);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_streak_on_activity
AFTER INSERT ON public.activity_events
FOR EACH ROW EXECUTE FUNCTION public.handle_streak_on_activity();
