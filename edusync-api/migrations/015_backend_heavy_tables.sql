-- Migration: 015_backend_heavy_tables
-- Description: New tables for backend-heavy architecture (XP, Anti-Cheat, Quiz Timer)
-- Simplified to work with existing EduSync schema

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER XP SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_xp (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    last_activity_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_tenant ON public.user_xp(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);

CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_id UUID,
    xp_amount INTEGER NOT NULL CHECK (xp_amount != 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_tenant ON public.xp_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON public.xp_transactions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ANTI-CHEAT SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.anti_cheat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts_v2(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL CHECK (severity > 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    created_by UUID REFERENCES public.profiles(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_attempt ON public.anti_cheat_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_tenant ON public.anti_cheat_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_type ON public.anti_cheat_events(event_type);

-- Add anti-cheat fields to existing quiz_attempts_v2
ALTER TABLE public.quiz_attempts_v2 
    ADD COLUMN IF NOT EXISTS anti_cheat_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS pause_remaining_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Jakarta';

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUIZ TIMER TRACKING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_deadline ON public.quiz_attempts_v2(deadline) 
    WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_flagged ON public.quiz_attempts_v2(flagged) 
    WHERE flagged = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUIZ ITEM ANALYSIS CACHE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quiz_item_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Statistics
    difficulty_index NUMERIC(5,2),
    discrimination_index NUMERIC(5,2),
    point_biserial NUMERIC(5,2),
    total_attempts INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    
    -- Computed fields
    recommendation TEXT,
    reliability_rating VARCHAR(20),
    
    -- Metadata
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_item_analysis_quiz ON public.quiz_item_analysis(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_item_analysis_tenant ON public.quiz_item_analysis(tenant_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRADEBOOK ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Assignment weight column
ALTER TABLE public.assignments 
    ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) DEFAULT 1.00;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to expire stuck quiz attempts
CREATE OR REPLACE FUNCTION public.expire_stuck_quiz_attempts()
RETURNS SETOF uuid AS $$
BEGIN
    RETURN QUERY
    UPDATE public.quiz_attempts_v2
    SET status = 'expired'
    WHERE status IN ('in_progress', 'paused') 
      AND deadline < NOW() - INTERVAL '1 minute'
    RETURNING id;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate user level based on XP
CREATE OR REPLACE FUNCTION public.recalculate_user_level(p_user_id uuid)
RETURNS INTEGER AS $$
DECLARE
    v_total_xp INTEGER;
    v_new_level INTEGER := 1;
    v_thresholds INTEGER[] := ARRAY[0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500];
    v_threshold INTEGER;
BEGIN
    SELECT total_xp INTO v_total_xp FROM public.user_xp WHERE user_id = p_user_id;
    
    IF v_total_xp IS NULL THEN
        RETURN 1;
    END IF;
    
    FOREACH v_threshold IN ARRAY v_thresholds
    LOOP
        IF v_total_xp >= v_threshold THEN
            v_new_level := array_position(v_thresholds, v_threshold);
        END IF;
    END LOOP;
    
    UPDATE public.user_xp SET current_level = v_new_level WHERE user_id = p_user_id;
    
    RETURN v_new_level;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_xp_updated
    BEFORE UPDATE ON public.user_xp
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.user_xp IS 'Denormalized XP summary per user for fast leaderboard queries';
COMMENT ON TABLE public.xp_transactions IS 'XP award transaction log for analytics and history';
COMMENT ON TABLE public.anti_cheat_events IS 'Server-side anti-cheat event log per quiz attempt';
COMMENT ON TABLE public.quiz_item_analysis IS 'Cached statistical analysis of quiz questions';
