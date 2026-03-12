-- ============================================================
-- Migration 64: Core Quiz Engine RPC Functions — Phase 1
-- start_quiz_attempt, submit_quiz_attempt, grade_attempt_question,
-- recalculate_attempt_score, and stats triggers.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. start_quiz_attempt() — with availability check, 
--    full question_snapshot, deterministic shuffle, attempt_seed
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_quiz RECORD;
    v_attempt_id UUID;
    v_attempt_seed UUID;
    v_status public.quiz_attempt_status;
    v_expires_at TIMESTAMPTZ;
    v_existing_attempt RECORD;
    v_attempt_count INTEGER;
    v_attempt_number INTEGER;
    v_is_enrolled BOOLEAN;
BEGIN
    -- 1. Identity & Tenant Isolation
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND';
    END IF;

    -- 2. Validate Quiz Existence & Ownership
    SELECT id, tenant_id, time_limit_minutes, max_attempts, course_id, class_id,
           mode, shuffle_questions, shuffle_options,
           available_from, available_until, passing_score
    INTO v_quiz
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'QUIZ_NOT_FOUND';
    END IF;

    -- 3. Availability Window Validation
    IF v_quiz.available_from IS NOT NULL AND now() < v_quiz.available_from THEN
        RAISE EXCEPTION 'QUIZ_NOT_AVAILABLE_YET';
    END IF;

    IF v_quiz.available_until IS NOT NULL AND now() > v_quiz.available_until THEN
        RAISE EXCEPTION 'QUIZ_AVAILABILITY_EXPIRED';
    END IF;

    -- 4. Enrollment Check
    v_is_enrolled := false;
    IF v_quiz.course_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.course_enrollments
            WHERE course_id = v_quiz.course_id AND user_id = v_user_id AND status = 'ACTIVE'
        ) INTO v_is_enrolled;
    END IF;
    IF NOT v_is_enrolled AND v_quiz.class_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.enrollments
            WHERE class_id = v_quiz.class_id AND student_id = v_user_id AND status = 'ACTIVE'
        ) INTO v_is_enrolled;
    END IF;

    -- Privileged roles: admin, teacher, course creator
    IF NOT v_is_enrolled THEN
        IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND tenant_id = v_tenant_id AND role = 'ADMIN') THEN
            v_is_enrolled := true;
        ELSIF v_quiz.class_id IS NOT NULL AND EXISTS(
            SELECT 1 FROM public.classes WHERE id = v_quiz.class_id AND teacher_id = v_user_id
        ) THEN
            v_is_enrolled := true;
        ELSIF v_quiz.course_id IS NOT NULL AND EXISTS(
            SELECT 1 FROM public.courses WHERE id = v_quiz.course_id AND created_by = v_user_id
        ) THEN
            v_is_enrolled := true;
        END IF;
    END IF;

    IF NOT v_is_enrolled THEN
        RAISE EXCEPTION 'UNAUTHORIZED_NOT_ENROLLED';
    END IF;

    -- 5. Recovery: check for existing IN_PROGRESS attempt
    SELECT id, status, expires_at INTO v_existing_attempt
    FROM public.quiz_attempts
    WHERE student_id = v_user_id AND quiz_id = p_quiz_id AND status = 'IN_PROGRESS'
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        -- If expired, auto-expire it
        IF v_existing_attempt.expires_at IS NOT NULL AND now() > v_existing_attempt.expires_at THEN
            UPDATE public.quiz_attempts
            SET status = 'EXPIRED', finished_at = v_existing_attempt.expires_at
            WHERE id = v_existing_attempt.id;
        ELSE
            -- Recoverable! Return existing attempt
            RETURN jsonb_build_object(
                'attempt_id', v_existing_attempt.id,
                'status', 'IN_PROGRESS',
                'recovered', true,
                'expires_at', v_existing_attempt.expires_at
            );
        END IF;
    END IF;

    -- 6. Attempt Limit Validation
    SELECT count(*) INTO v_attempt_count
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_user_id 
      AND status IN ('SUBMITTED', 'GRADED', 'EXPIRED');

    IF COALESCE(v_quiz.max_attempts, 0) > 0 AND v_attempt_count >= v_quiz.max_attempts THEN
        RAISE EXCEPTION 'ATTEMPT_LIMIT_REACHED';
    END IF;

    -- 7. Calculate attempt_number + expires_at
    v_attempt_number := v_attempt_count + 1;
    v_attempt_seed := gen_random_uuid();

    IF COALESCE(v_quiz.time_limit_minutes, 0) > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    END IF;

    -- 8. Create New Attempt
    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at,
        attempt_number, attempt_seed
    ) VALUES (
        p_quiz_id, v_user_id, v_tenant_id, 'IN_PROGRESS', now(), v_expires_at,
        v_attempt_number, v_attempt_seed
    ) RETURNING id INTO v_attempt_id;

    -- 9. Snapshot Questions with full immutable data
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index,
        question_type, max_points, question_snapshot
    )
    SELECT 
        v_attempt_id,
        q.id,
        v_tenant_id,
        q.text,
        q.explanation,
        -- Deterministic shuffle using attempt_seed
        CASE WHEN COALESCE(v_quiz.shuffle_questions, false) THEN
            row_number() OVER (ORDER BY md5(q.id::text || v_attempt_seed::text))
        ELSE
            row_number() OVER (ORDER BY q."order")
        END,
        q.question_type,
        q.points,
        -- Full question snapshot: question + options
        jsonb_build_object(
            'question_id', q.id,
            'text', q.text,
            'question_type', q.question_type,
            'points', q.points,
            'explanation', q.explanation,
            'options', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', o.id,
                        'text', o.text,
                        'is_correct', o.is_correct,
                        'order', CASE WHEN COALESCE(v_quiz.shuffle_options, false) THEN
                            (SELECT row_number FROM (
                                SELECT oo.id, row_number() OVER (ORDER BY md5(oo.id::text || v_attempt_seed::text))
                                FROM public.quiz_options oo WHERE oo.question_id = q.id
                            ) sub WHERE sub.id = o.id)
                        ELSE
                            row_number() OVER (ORDER BY o.id)
                        END
                    ) ORDER BY 
                        CASE WHEN COALESCE(v_quiz.shuffle_options, false) THEN
                            md5(o.id::text || v_attempt_seed::text)
                        ELSE
                            o.id::text
                        END
                )
                FROM public.quiz_options o
                WHERE o.question_id = q.id
            ), '[]'::jsonb)
        )
    FROM public.quiz_questions q
    WHERE q.quiz_id = p_quiz_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'IN_PROGRESS',
        'recovered', false,
        'expires_at', v_expires_at,
        'attempt_number', v_attempt_number
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. submit_quiz_attempt() — multi-type auto-grading
--    with partial scoring for MULTIPLE_SELECT
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_attempt_id UUID,
    p_answers JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_attempt RECORD;
    v_quiz RECORD;
    v_answer JSONB;
    v_aq RECORD;
    v_correct_option_ids UUID[];
    v_student_option_ids UUID[];
    v_correct_selected INTEGER;
    v_incorrect_selected INTEGER;
    v_total_correct INTEGER;
    v_partial_score NUMERIC(5,2);
    v_total_score NUMERIC(5,2) := 0;
    v_total_max NUMERIC(5,2) := 0;
    v_total_correct_count INTEGER := 0;
    v_total_questions INTEGER := 0;
    v_has_ungraded BOOLEAN := false;
    v_time_spent INTEGER;
    v_final_score NUMERIC(5,2);
    v_passed BOOLEAN;
BEGIN
    -- 1. Identity
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND';
    END IF;

    -- 2. Validate Attempt
    SELECT a.*, q.passing_score, q.mode, q.show_correct_answers
    INTO v_attempt
    FROM public.quiz_attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id AND a.student_id = v_user_id AND a.tenant_id = v_tenant_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'ATTEMPT_NOT_FOUND';
    END IF;

    IF v_attempt.status != 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'ATTEMPT_NOT_IN_PROGRESS';
    END IF;

    -- Time limit check
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at THEN
        UPDATE public.quiz_attempts
        SET status = 'EXPIRED', finished_at = v_attempt.expires_at
        WHERE id = p_attempt_id;
        
        RAISE EXCEPTION 'TIME_LIMIT_EXCEEDED';
    END IF;

    -- 3. Process each answer
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        -- Find the attempt question
        SELECT * INTO v_aq
        FROM public.quiz_attempt_questions
        WHERE attempt_id = p_attempt_id 
          AND question_id = (v_answer->>'question_id')::UUID;

        IF v_aq.id IS NULL THEN
            CONTINUE;
        END IF;

        v_total_questions := v_total_questions + 1;
        v_total_max := v_total_max + COALESCE(v_aq.max_points, 10);

        -- Extract student's answers
        v_student_option_ids := ARRAY(
            SELECT (jsonb_array_elements_text(
                COALESCE(v_answer->'selected_option_ids', '[]'::jsonb)
            ))::UUID
        );

        -- Grade based on question type
        CASE v_aq.question_type
            WHEN 'MCQ', 'TRUE_FALSE' THEN
                -- Single correct option
                SELECT ARRAY(
                    SELECT o.id FROM public.quiz_options o
                    WHERE o.question_id = v_aq.question_id AND o.is_correct = true
                    LIMIT 1
                ) INTO v_correct_option_ids;

                IF array_length(v_student_option_ids, 1) > 0 
                   AND v_student_option_ids[1] = v_correct_option_ids[1] THEN
                    -- Correct!
                    UPDATE public.quiz_attempt_questions
                    SET selected_option_ids = v_student_option_ids,
                        is_correct = true,
                        points_earned = COALESCE(v_aq.max_points, 10)
                    WHERE id = v_aq.id;

                    v_total_score := v_total_score + COALESCE(v_aq.max_points, 10);
                    v_total_correct_count := v_total_correct_count + 1;
                ELSE
                    -- Wrong
                    UPDATE public.quiz_attempt_questions
                    SET selected_option_ids = v_student_option_ids,
                        is_correct = false,
                        points_earned = 0
                    WHERE id = v_aq.id;
                END IF;

            WHEN 'MULTIPLE_SELECT' THEN
                -- Partial scoring: max(0, (correct_selected - incorrect_selected) / total_correct) × points
                SELECT ARRAY(
                    SELECT o.id FROM public.quiz_options o
                    WHERE o.question_id = v_aq.question_id AND o.is_correct = true
                ) INTO v_correct_option_ids;

                v_total_correct := COALESCE(array_length(v_correct_option_ids, 1), 0);

                IF v_total_correct > 0 AND array_length(v_student_option_ids, 1) > 0 THEN
                    -- Count correct selections
                    SELECT count(*) INTO v_correct_selected
                    FROM unnest(v_student_option_ids) s(id)
                    WHERE s.id = ANY(v_correct_option_ids);

                    -- Count incorrect selections
                    SELECT count(*) INTO v_incorrect_selected
                    FROM unnest(v_student_option_ids) s(id)
                    WHERE NOT (s.id = ANY(v_correct_option_ids));

                    v_partial_score := GREATEST(0,
                        (v_correct_selected::NUMERIC - v_incorrect_selected::NUMERIC) / v_total_correct::NUMERIC
                    ) * COALESCE(v_aq.max_points, 10);

                    UPDATE public.quiz_attempt_questions
                    SET selected_option_ids = v_student_option_ids,
                        is_correct = (v_correct_selected = v_total_correct AND v_incorrect_selected = 0),
                        points_earned = ROUND(v_partial_score, 2)
                    WHERE id = v_aq.id;

                    v_total_score := v_total_score + ROUND(v_partial_score, 2);
                    IF v_correct_selected = v_total_correct AND v_incorrect_selected = 0 THEN
                        v_total_correct_count := v_total_correct_count + 1;
                    END IF;
                ELSE
                    UPDATE public.quiz_attempt_questions
                    SET selected_option_ids = v_student_option_ids,
                        is_correct = false,
                        points_earned = 0
                    WHERE id = v_aq.id;
                END IF;

            WHEN 'SHORT_ANSWER', 'ESSAY' THEN
                -- Defer to manual grading
                UPDATE public.quiz_attempt_questions
                SET text_answer = v_answer->>'text_answer',
                    is_correct = NULL,
                    points_earned = 0
                WHERE id = v_aq.id;

                v_has_ungraded := true;
        END CASE;
    END LOOP;

    -- 4. Calculate final score
    IF v_total_max > 0 THEN
        v_final_score := ROUND((v_total_score / v_total_max) * 100, 2);
    ELSE
        v_final_score := 0;
    END IF;

    v_passed := v_final_score >= COALESCE(v_attempt.passing_score, 70);
    v_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INTEGER;

    -- 5. Update attempt
    UPDATE public.quiz_attempts
    SET status = CASE WHEN v_has_ungraded THEN 'SUBMITTED'::public.quiz_attempt_status 
                      ELSE 'GRADED'::public.quiz_attempt_status END,
        score = v_final_score,
        passed = CASE WHEN v_has_ungraded THEN NULL ELSE v_passed END,
        submitted_at = now(),
        finished_at = now(),
        duration_seconds = v_time_spent,
        answers = p_answers
    WHERE id = p_attempt_id;

    -- 6. Fire activity event
    INSERT INTO public.activity_events (
        tenant_id, user_id, event_type, entity_type, entity_id,
        course_id, class_id, metadata
    )
    SELECT v_tenant_id, v_user_id,
        CASE WHEN v_has_ungraded THEN 'QUIZ_SUBMITTED'::public.activity_event_type
             ELSE 'QUIZ_GRADED'::public.activity_event_type END,
        'quiz_attempt', p_attempt_id,
        q.course_id, q.class_id,
        jsonb_build_object(
            'quiz_id', v_attempt.quiz_id,
            'score', v_final_score,
            'passed', v_passed,
            'attempt_number', v_attempt.attempt_number,
            'time_spent', v_time_spent,
            'has_ungraded', v_has_ungraded
        )
    FROM public.quizzes q WHERE q.id = v_attempt.quiz_id;

    RETURN jsonb_build_object(
        'attempt_id', p_attempt_id,
        'status', CASE WHEN v_has_ungraded THEN 'SUBMITTED' ELSE 'GRADED' END,
        'score', v_final_score,
        'passed', CASE WHEN v_has_ungraded THEN NULL ELSE v_passed END,
        'total_correct', v_total_correct_count,
        'total_questions', v_total_questions,
        'time_spent', v_time_spent,
        'has_ungraded', v_has_ungraded,
        'show_correct_answers', v_attempt.show_correct_answers
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. recalculate_attempt_score() — helper
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_attempt_score(p_attempt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_earned NUMERIC(5,2);
    v_total_max NUMERIC(5,2);
    v_final_score NUMERIC(5,2);
    v_all_graded BOOLEAN;
    v_passed BOOLEAN;
    v_passing_score INTEGER;
    v_correct_count INTEGER;
    v_quiz_id UUID;
    v_tenant_id UUID;
    v_student_id UUID;
BEGIN
    -- Get attempt info
    SELECT a.quiz_id, a.tenant_id, a.student_id, q.passing_score
    INTO v_quiz_id, v_tenant_id, v_student_id, v_passing_score
    FROM public.quiz_attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id;

    -- Sum scores
    SELECT 
        COALESCE(SUM(points_earned), 0),
        COALESCE(SUM(max_points), 0),
        bool_and(is_correct IS NOT NULL),
        count(*) FILTER (WHERE is_correct = true)
    INTO v_total_earned, v_total_max, v_all_graded, v_correct_count
    FROM public.quiz_attempt_questions
    WHERE attempt_id = p_attempt_id;

    -- Calculate percentage
    IF v_total_max > 0 THEN
        v_final_score := ROUND((v_total_earned / v_total_max) * 100, 2);
    ELSE
        v_final_score := 0;
    END IF;

    v_passed := v_final_score >= COALESCE(v_passing_score, 70);

    -- Update attempt
    UPDATE public.quiz_attempts
    SET score = v_final_score,
        passed = v_passed,
        status = CASE WHEN v_all_graded THEN 'GRADED'::public.quiz_attempt_status 
                      ELSE status END
    WHERE id = p_attempt_id;

    -- If fully graded, fire event
    IF v_all_graded THEN
        INSERT INTO public.activity_events (
            tenant_id, user_id, event_type, entity_type, entity_id, metadata
        ) VALUES (
            v_tenant_id, v_student_id,
            'QUIZ_GRADED'::public.activity_event_type,
            'quiz_attempt', p_attempt_id,
            jsonb_build_object(
                'quiz_id', v_quiz_id,
                'score', v_final_score,
                'passed', v_passed,
                'source', 'manual_grading_complete'
            )
        );
    END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. grade_attempt_question() — manual grading for essays
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.grade_attempt_question(
    p_attempt_question_id UUID,
    p_points_earned NUMERIC,
    p_is_correct BOOLEAN,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_aq RECORD;
    v_attempt RECORD;
    v_quiz RECORD;
    v_is_authorized BOOLEAN := false;
BEGIN
    -- 1. Identity
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND';
    END IF;

    -- 2. Get attempt question + attempt + quiz
    SELECT aq.*, a.quiz_id, a.tenant_id AS attempt_tenant_id
    INTO v_aq
    FROM public.quiz_attempt_questions aq
    JOIN public.quiz_attempts a ON a.id = aq.attempt_id
    WHERE aq.id = p_attempt_question_id;

    IF v_aq.id IS NULL THEN
        RAISE EXCEPTION 'QUESTION_NOT_FOUND';
    END IF;

    -- Tenant check
    IF v_aq.attempt_tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'TENANT_MISMATCH';
    END IF;

    -- 3. Authorization: teacher of class, course creator, or admin
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_aq.quiz_id;

    IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND tenant_id = v_tenant_id AND role = 'ADMIN') THEN
        v_is_authorized := true;
    ELSIF v_quiz.class_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.classes WHERE id = v_quiz.class_id AND teacher_id = v_user_id
    ) THEN
        v_is_authorized := true;
    ELSIF v_quiz.course_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.courses WHERE id = v_quiz.course_id AND created_by = v_user_id
    ) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'UNAUTHORIZED_NOT_TEACHER';
    END IF;

    -- 4. Validate points
    IF p_points_earned < 0 OR p_points_earned > COALESCE(v_aq.max_points, 10) THEN
        RAISE EXCEPTION 'INVALID_POINTS: must be 0-%', COALESCE(v_aq.max_points, 10);
    END IF;

    -- 5. Grade the question
    UPDATE public.quiz_attempt_questions
    SET points_earned = p_points_earned,
        is_correct = p_is_correct,
        grader_comment = p_comment,
        graded_by = v_user_id,
        graded_at = now(),
        updated_at = now()
    WHERE id = p_attempt_question_id;

    -- 6. Recalculate attempt score
    PERFORM public.recalculate_attempt_score(v_aq.attempt_id);

    RETURN jsonb_build_object(
        'success', true,
        'attempt_question_id', p_attempt_question_id,
        'points_earned', p_points_earned,
        'is_correct', p_is_correct
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. Stats trigger — incremental updates
--    Fires when quiz_attempts status changes to GRADED
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_update_quiz_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_attempts INTEGER;
    v_prev_avg NUMERIC(5,2);
    v_prev_pass_rate NUMERIC(5,2);
    v_new_score NUMERIC(5,2);
    v_is_first_attempt BOOLEAN;
BEGIN
    -- Only process when status transitions to GRADED
    IF NEW.status != 'GRADED' OR (OLD.status = 'GRADED') THEN
        RETURN NEW;
    END IF;

    v_new_score := COALESCE(NEW.score, 0);

    -- Check if this student's first graded attempt for this quiz
    v_is_first_attempt := NOT EXISTS(
        SELECT 1 FROM public.quiz_attempts
        WHERE quiz_id = NEW.quiz_id 
          AND student_id = NEW.student_id
          AND status = 'GRADED'
          AND id != NEW.id
    );

    -- Upsert quiz_stats incrementally
    INSERT INTO public.quiz_stats (quiz_id, tenant_id, total_attempts, total_unique_students, avg_score, highest_score, lowest_score, pass_rate, updated_at)
    VALUES (
        NEW.quiz_id,
        NEW.tenant_id,
        1,
        CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        v_new_score,
        v_new_score,
        v_new_score,
        CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END,
        now()
    )
    ON CONFLICT (quiz_id) DO UPDATE SET
        total_attempts = quiz_stats.total_attempts + 1,
        total_unique_students = quiz_stats.total_unique_students + 
            CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        avg_score = ROUND(
            ((quiz_stats.avg_score * quiz_stats.total_attempts) + v_new_score) 
            / (quiz_stats.total_attempts + 1), 2
        ),
        highest_score = GREATEST(quiz_stats.highest_score, v_new_score),
        lowest_score = LEAST(quiz_stats.lowest_score, v_new_score),
        pass_rate = ROUND(
            ((quiz_stats.pass_rate * quiz_stats.total_attempts) + 
             CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END)
            / (quiz_stats.total_attempts + 1), 2
        ),
        updated_at = now();

    -- Update question_stats for each question in this attempt
    INSERT INTO public.question_stats (question_id, quiz_id, tenant_id, total_answers, correct_answers, difficulty_rate, updated_at)
    SELECT 
        aq.question_id,
        NEW.quiz_id,
        NEW.tenant_id,
        1,
        CASE WHEN aq.is_correct THEN 1 ELSE 0 END,
        CASE WHEN aq.is_correct THEN 100.0 ELSE 0.0 END,
        now()
    FROM public.quiz_attempt_questions aq
    WHERE aq.attempt_id = NEW.id AND aq.is_correct IS NOT NULL
    ON CONFLICT (question_id, quiz_id) DO UPDATE SET
        total_answers = question_stats.total_answers + 1,
        correct_answers = question_stats.correct_answers + 
            CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END,
        difficulty_rate = ROUND(
            ((question_stats.correct_answers + 
              CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END)::NUMERIC 
             / (question_stats.total_answers + 1)::NUMERIC) * 100, 2
        ),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_quiz_attempt_stats ON public.quiz_attempts;

CREATE TRIGGER trg_quiz_attempt_stats
    AFTER UPDATE ON public.quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_quiz_stats();
