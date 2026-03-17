-- Phase 3: Snapshot System (Data Integrity)
-- This avoids "changing questions mid-attempt" bugs and provides a source of truth for the student's attempt.

-- 1. Create quiz_attempt_questions table (Snapshot)
CREATE TABLE IF NOT EXISTS public.quiz_attempt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Snapshotted data
    text TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER NOT NULL,
    
    -- Answer tracking (for Phase 3/4)
    selected_option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure a question is only snapshotted once per attempt
    UNIQUE(attempt_id, question_id)
);

-- Enable RLS
ALTER TABLE public.quiz_attempt_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own attempt questions"
    ON public.quiz_attempt_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            WHERE qa.id = attempt_id 
            AND qa.student_id = auth.uid()
        )
    );

-- INSERT policy for students to create their own attempt snapshots (used by start_quiz_attempt)
CREATE POLICY "Users can insert their own attempt questions"
    ON public.quiz_attempt_questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            WHERE qa.id = attempt_id 
            AND qa.student_id = auth.uid()
        )
    );

-- UPDATE policy for students to update their own attempt answers
CREATE POLICY "Users can update their own attempt questions"
    ON public.quiz_attempt_questions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            WHERE qa.id = attempt_id 
            AND qa.student_id = auth.uid()
        )
    );

-- 2. Update start_quiz_attempt to capture snapshots
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_attempt_id UUID;
    v_status public.quiz_attempt_status;
    v_time_limit INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Identity & Tenant Isolation
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- 2. Validate Quiz Ownership
    IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE id = p_quiz_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- 3. Recovery: Check for active attempt
    SELECT id, status INTO v_attempt_id, v_status
    FROM public.quiz_attempts
    WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'in_progress'
    LIMIT 1;

    IF v_attempt_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_attempt_id,
            'status', v_status,
            'recovered', true
        );
    END IF;

    -- 4. Create New Attempt
    SELECT time_limit_minutes INTO v_time_limit FROM public.quizzes WHERE id = p_quiz_id;
    
    IF v_time_limit > 0 THEN
        v_expires_at := now() + (v_time_limit * INTERVAL '1 minute');
    END IF;

    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at
    ) VALUES (
        p_quiz_id, auth.uid(), v_tenant_id, 'in_progress', now(), v_expires_at
    ) RETURNING id INTO v_attempt_id;

    -- 5. Snapshot Questions (Crucial for Data Integrity)
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index
    )
    SELECT 
        v_attempt_id,
        id,
        v_tenant_id,
        text,
        explanation,
        "order"
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY "order";

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'in_progress',
        'recovered', false
    );
END;
$$;

-- 3. Add column to track option snapshots or just link to options? 
-- For now, we link to quiz_options, but in a full 10/10 we'd snapshot them too.
-- Let's stick to linking options since options change less frequently than quiz logic.

-- 4. Create updated_at trigger for snapshots
CREATE TRIGGER set_quiz_attempt_questions_updated_at
    BEFORE UPDATE ON public.quiz_attempt_questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Add index for quick lookup
CREATE INDEX idx_quiz_attempt_questions_attempt ON public.quiz_attempt_questions(attempt_id);
