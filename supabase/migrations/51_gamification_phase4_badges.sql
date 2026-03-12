-- =========================================================================
-- Migration 51: Gamification Phase 4 - Achievement/Badge System
--
-- 1. Modifies badges table to be global (removes tenant_id).
-- 2. Modifies user_badges table for tenant isolation and composite PK.
-- 3. Pre-populates global badges.
-- 4. Implements award_badge_if_qualified() RPC.
-- 5. Implements triggers for automatic badge awarding.
-- =========================================================================

-- 1. Modify badges table to be global
-- First drop constraints, policies, and indexes that depend on tenant_id
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_tenant_id_fkey;
DROP INDEX IF EXISTS idx_badges_tenant_id;
DROP POLICY IF EXISTS badges_select ON public.badges;

-- Now remove tenant_id column
ALTER TABLE public.badges DROP COLUMN IF EXISTS tenant_id;

-- Make badges globally viewable
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (true);

-- Ensure name is unique globally
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_name_key;
ALTER TABLE public.badges ADD CONSTRAINT badges_name_key UNIQUE (name);

-- 2. Modify user_badges table
-- Backfill tenant_id from profiles for existing records
UPDATE public.user_badges ub
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ub.user_id = p.id AND ub.tenant_id IS NULL;

-- Ensure tenant_id is NOT NULL and present
ALTER TABLE public.user_badges ALTER COLUMN tenant_id SET NOT NULL;

-- Remove old PK and unique constraints to use composite PK
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_pkey;
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_badge_id_key;

-- Add composite PK (user_id, badge_id, tenant_id)
ALTER TABLE public.user_badges ADD PRIMARY KEY (user_id, badge_id, tenant_id);

-- 3. Pre-populate default badges
INSERT INTO public.badges (id, name, description, icon)
VALUES 
    ('b1000000-0000-0000-0000-000000000001', 'First Quiz', 'Selesaikan kuis pertama Anda!', '🎯'),
    ('b1000000-0000-0000-0000-000000000002', 'Perfect Score', 'Dapatkan nilai 100 dalam satu kuis!', '💯'),
    ('b1000000-0000-0000-0000-000000000003', '7 Day Streak', 'Selesaikan aktivitas selama 7 hari berturut-turut!', '🔥'),
    ('b1000000-0000-0000-0000-000000000004', 'LMS Voyager', 'Selesaikan 5 modul pelajaran.', '🚀')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 4. award_badge_if_qualified() RPC
CREATE OR REPLACE FUNCTION public.award_badge_if_qualified(
    p_user_id uuid,
    p_badge_name text,
    p_tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_badge_id uuid;
BEGIN
    SELECT id INTO v_badge_id FROM public.badges WHERE name = p_badge_name;
    
    IF v_badge_id IS NULL THEN
        RETURN false;
    END IF;

    -- Defensive insert with ON CONFLICT DO NOTHING
    INSERT INTO public.user_badges (user_id, badge_id, tenant_id, created_at)
    VALUES (p_user_id, v_badge_id, p_tenant_id, now())
    ON CONFLICT (user_id, badge_id, tenant_id) DO NOTHING;

    RETURN FOUND;
END;
$$;

-- 5. Triggers for automatic badge awarding

-- Badge: First Quiz & Perfect Score
CREATE OR REPLACE FUNCTION public.handle_quiz_badges()
RETURNS trigger AS $$
BEGIN
    -- Award "First Quiz" badge on first submission
    IF NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts 
        WHERE student_id = NEW.student_id 
          AND tenant_id = NEW.tenant_id 
          AND status IN ('SUBMITTED', 'GRADED')
          AND id != NEW.id
    ) THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'First Quiz', NEW.tenant_id);
    END IF;

    -- Award "Perfect Score" badge if score is 100
    IF NEW.score >= 100 THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'Perfect Score', NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quiz_badges ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_badges
AFTER UPDATE OF status ON public.quiz_attempts
FOR EACH ROW
WHEN (NEW.status = 'GRADED' AND OLD.status != 'GRADED')
EXECUTE FUNCTION public.handle_quiz_badges();

-- Badge: 7 Day Streak
CREATE OR REPLACE FUNCTION public.handle_streak_badges()
RETURNS trigger AS $$
BEGIN
    -- Award "7 Day Streak" when current_streak reaches 7
    IF NEW.current_streak >= 7 THEN
        PERFORM public.award_badge_if_qualified(NEW.user_id, '7 Day Streak', NEW.tenant_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_streak_badges ON public.user_streaks;
CREATE TRIGGER trg_streak_badges
AFTER INSERT OR UPDATE OF current_streak ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.handle_streak_badges();
