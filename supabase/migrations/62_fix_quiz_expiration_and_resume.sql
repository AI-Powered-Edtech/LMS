-- Migration 62: Fix Quiz Expiration Recovery and Resume Logic
-- Redefines start_quiz_attempt to handle expired versions of in-progress attempts.

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
    v_max_attempts INTEGER;
    v_attempt_count INTEGER;
    v_course_id UUID;
    v_class_id UUID;
    v_is_enrolled BOOLEAN;
BEGIN
    -- 1. Identity & Tenant Isolation
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- 2. Validate Quiz Ownership & Metadata
    SELECT tenant_id, time_limit_minutes, max_attempts, course_id, class_id
    INTO v_tenant_id, v_time_limit, v_max_attempts, v_course_id, v_class_id
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- 3. Enrollment Check
    v_is_enrolled := false;
    IF v_course_id IS NOT NULL THEN
        v_is_enrolled := is_enrolled_in_course(v_course_id);
    END IF;
    IF NOT v_is_enrolled AND v_class_id IS NOT NULL THEN
        v_is_enrolled := is_class_member(v_class_id);
    END IF;

    -- Privileged roles check
    IF NOT v_is_enrolled THEN
        IF has_role('ADMIN') THEN
            v_is_enrolled := true;
        ELSIF v_class_id IS NOT NULL AND is_class_teacher(v_class_id) THEN
            v_is_enrolled := true;
        ELSIF v_course_id IS NOT NULL AND is_course_creator(v_course_id) THEN
            v_is_enrolled := true;
        END IF;
    END IF;

    IF NOT v_is_enrolled THEN
        RAISE EXCEPTION 'Unauthorized: Not actively enrolled in this course or class';
    END IF;

    -- 4. Recovery & Expiration Check
    -- Find the latest IN_PROGRESS attempt
    SELECT id, status, expires_at INTO v_attempt_id, v_status, v_expires_at
    FROM public.quiz_attempts
    WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_attempt_id IS NOT NULL THEN
        -- Check if it's already expired
        IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
            -- Mark as expired
            UPDATE public.quiz_attempts
            SET status = 'expired', finished_at = v_expires_at
            WHERE id = v_attempt_id;
            
            -- Reset variables to proceed as if no active attempt exists
            v_attempt_id := NULL;
        ELSE
            -- Recoverable attempt found
            RETURN jsonb_build_object(
                'attempt_id', v_attempt_id,
                'status', v_status,
                'recovered', true,
                'expires_at', v_expires_at
            );
        END IF;
    END IF;

    -- 5. Attempt Limit Validation
    SELECT count(*) INTO v_attempt_count
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id 
      AND student_id = auth.uid() 
      AND status IN ('submitted', 'graded', 'expired'); -- Count EXPIRED towards limit too if needed, or follow policy

    IF COALESCE(v_max_attempts, 0) > 0 AND v_attempt_count >= COALESCE(v_max_attempts, 1) THEN
        RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_max_attempts;
    END IF;

    -- 6. Create New Attempt
    IF COALESCE(v_time_limit, 0) > 0 THEN
        v_expires_at := now() + (v_time_limit * INTERVAL '1 minute');
    END IF;

    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at
    ) VALUES (
        p_quiz_id, auth.uid(), v_tenant_id, 'in_progress', now(), v_expires_at
    ) RETURNING id INTO v_attempt_id;

    -- 7. Snapshot Questions
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index
    )
    SELECT 
        v_attempt_id,
        id,
        v_tenant_id,
        text,
        NULL,
        row_number() OVER (ORDER BY random())
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'in_progress',
        'recovered', false,
        'expires_at', v_expires_at
    );
END;
$$;
