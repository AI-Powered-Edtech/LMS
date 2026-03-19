-- ==========================================================================
-- Migration 806: Quiz Security + Gamification Pathway
--
-- This migration:
-- 1. Adds RLS to quiz_submission_queue
-- 2. Adds RLS to quiz_attempt_telemetry  
-- 3. Adds xp_awarded column to quiz_attempts_v2
-- 4. Creates award_quiz_xp RPC function for awarding XP on quiz pass
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- 1. Add user_id column to quiz_submission_queue (needed for RLS)
-- ==========================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_submission_queue' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.quiz_submission_queue 
        ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ==========================================================================
-- 2. Add user_id column to quiz_attempt_telemetry (needed for RLS)
-- ==========================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_attempt_telemetry' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.quiz_attempt_telemetry 
        ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ==========================================================================
-- 3. Add xp_awarded column to quiz_attempts_v2 (for idempotency)
-- ==========================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_attempts_v2' 
        AND column_name = 'xp_awarded'
    ) THEN
        ALTER TABLE public.quiz_attempts_v2 
        ADD COLUMN xp_awarded BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ==========================================================================
-- 4. Enable RLS on quiz_submission_queue
-- ==========================================================================
ALTER TABLE public.quiz_submission_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.quiz_submission_queue;
DROP POLICY IF EXISTS "Users can read own submissions" ON public.quiz_submission_queue;

-- Create policies for quiz_submission_queue
CREATE POLICY "Users can insert own submissions"
  ON public.quiz_submission_queue FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR user_id IS NULL -- Allow system inserts
  );

CREATE POLICY "Users can read own submissions"
  ON public.quiz_submission_queue FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.tenant_id = quiz_submission_queue.tenant_id
      AND public.has_role('ADMIN')
    )
  );

-- ==========================================================================
-- 5. Enable RLS on quiz_attempt_telemetry
-- ==========================================================================
ALTER TABLE public.quiz_attempt_telemetry ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert own telemetry" ON public.quiz_attempt_telemetry;
DROP POLICY IF EXISTS "Teachers can read telemetry for their tenant" ON public.quiz_attempt_telemetry;

-- Create policies for quiz_attempt_telemetry
CREATE POLICY "Users can insert own telemetry"
  ON public.quiz_attempt_telemetry FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL -- Allow system inserts
  );

CREATE POLICY "Teachers can read telemetry for their tenant"
  ON public.quiz_attempt_telemetry FOR SELECT
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.has_role('TEACHER')
      OR public.has_role('ADMIN')
    )
  );

-- ==========================================================================
-- 6. Create award_quiz_xp RPC function
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.award_quiz_xp(
    p_user_id UUID,
    p_lesson_id UUID,
    p_quiz_id UUID,
    p_score INTEGER,
    p_passing_score INTEGER,
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp_amount INTEGER;
    v_award_xp BOOLEAN := FALSE;
    v_attempt_id UUID;
    v_existing_attempt RECORD;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_quiz_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Invalid parameters: user_id, quiz_id, and tenant_id are required'
        );
    END IF;

    -- Check if score meets passing threshold
    IF p_passing_score IS NOT NULL AND p_score >= p_passing_score THEN
        v_award_xp := TRUE;
    ELSIF p_passing_score IS NULL AND p_score >= 70 THEN
        -- Default passing score of 70 if not specified
        v_award_xp := TRUE;
    END IF;

    -- If not passing, return early
    IF NOT v_award_xp THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Score does not meet passing threshold',
            'xp_awarded', FALSE
        );
    END IF;

    -- Find the most recent successful attempt for this user/quiz
    -- This is used to check idempotency and to mark xp_awarded
    SELECT id, xp_awarded INTO v_existing_attempt
    FROM public.quiz_attempts_v2
    WHERE tenant_id = p_tenant_id
      AND quiz_id = p_quiz_id
      AND student_id = p_user_id
      AND status IN ('graded', 'submitted')
      AND score IS NOT NULL
      AND score >= COALESCE(p_passing_score, 70)
    ORDER BY started_at DESC
    LIMIT 1;

    -- Check if XP already awarded (idempotency)
    IF v_existing_attempt IS NOT NULL AND v_existing_attempt.xp_awarded = TRUE THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'XP already awarded for this attempt',
            'xp_awarded', TRUE,
            'attempt_id', v_existing_attempt.id
        );
    END IF;

    -- Calculate XP amount: GREATEST(10, ROUND(score / passing_score * 20))
    -- This scales from 10-20 XP based on performance
    IF p_passing_score IS NOT NULL AND p_passing_score > 0 THEN
        v_xp_amount := GREATEST(10, ROUND((p_score::NUMERIC / p_passing_score::NUMERIC) * 20));
    ELSE
        v_xp_amount := 10;
    END IF;

    -- Award XP via add_user_points function
    -- Note: add_user_points handles tenant_id internally via JWT or profile lookup
    PERFORM public.add_user_points(p_user_id, v_xp_amount, NULL);

    -- Mark xp_awarded = TRUE on the attempt (using SECURITY DEFINER to bypass RLS)
    IF v_existing_attempt IS NOT NULL THEN
        UPDATE public.quiz_attempts_v2
        SET xp_awarded = TRUE
        WHERE id = v_existing_attempt.id
          AND tenant_id = p_tenant_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'XP awarded successfully',
        'xp_awarded', TRUE,
        'xp_amount', v_xp_amount,
        'attempt_id', v_existing_attempt.id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Error awarding XP: ' || SQLERRM,
        'xp_awarded', FALSE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.award_quiz_xp TO authenticated;

COMMIT;
