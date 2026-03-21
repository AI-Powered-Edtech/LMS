-- ============================================================
-- Migration 71: Quiz Engine & Question Bank Schema Reconciliation
-- 
-- Resolves critical conflicts between quiz engine (63-67)
-- and question bank (68-69) migrations:
--   1. Canonical question_stats with composite PK
--   2. quiz_questions.question_bank_id FK
--   3. Fixed RPCs: create_question, update_question, add_question_to_quiz
--   4. Absorbed RPCs from deleted 70_question_bank_improvements.sql
--   5. Fixed stats trigger for new schema
-- ============================================================

SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 1. CANONICAL question_stats TABLE
--    Composite PK (question_id, quiz_id) — no surrogate UUID.
--    Supports per-quiz stats AND global bank stats (quiz_id NULL).
-- ────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.question_stats CASCADE;

CREATE TABLE public.question_stats (
    question_id UUID NOT NULL,
    quiz_id     UUID,
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    total_answers    INTEGER      DEFAULT 0,
    correct_answers  INTEGER      DEFAULT 0,
    difficulty_rate  NUMERIC(5,2) DEFAULT 0,
    avg_time_seconds INTEGER      DEFAULT 0,
    updated_at       TIMESTAMPTZ  DEFAULT now(),

    PRIMARY KEY (question_id, quiz_id)
);

COMMENT ON TABLE public.question_stats IS 'Per-question aggregate statistics. Composite PK supports per-quiz analysis AND global bank difficulty (quiz_id = specific quiz UUID).';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_question_stats_tenant
    ON public.question_stats(tenant_id);

CREATE INDEX IF NOT EXISTS idx_question_stats_question
    ON public.question_stats(question_id);

-- RLS
ALTER TABLE public.question_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_question_stats ON public.question_stats;
CREATE POLICY tenant_isolation_question_stats
    ON public.question_stats
    FOR ALL
    USING (tenant_id = get_my_tenant_id());


-- ────────────────────────────────────────────────────────────
-- 2. quiz_questions.question_bank_id FK (idempotent)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_questions
    ADD COLUMN IF NOT EXISTS question_bank_id UUID
    REFERENCES public.question_bank(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_bank
    ON public.quiz_questions(question_bank_id);

-- Unique constraint: no duplicate bank questions in same quiz
-- (only for non-null question_bank_id — handled by partial unique index)
DROP INDEX IF EXISTS idx_unique_quiz_question_bank;
CREATE UNIQUE INDEX idx_unique_quiz_question_bank
    ON public.quiz_questions(quiz_id, question_bank_id)
    WHERE question_bank_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 3. FIXED create_question() RPC
--    Includes tenant_id in question_stats insert.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_question(
    p_subject_id UUID,
    p_topic_id UUID,
    p_question_type TEXT,
    p_question_text TEXT,
    p_explanation TEXT,
    p_difficulty_level INTEGER,
    p_options JSONB,
    p_tags TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_created_by UUID := auth.uid();
    v_question_id UUID;
    v_option JSONB;
    v_tag TEXT;
BEGIN
    -- Get tenant_id
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found for user';
    END IF;

    -- Validate input
    IF p_question_text IS NULL OR TRIM(p_question_text) = '' THEN
        RAISE EXCEPTION 'Question text is required';
    END IF;
    IF p_question_type IS NULL OR TRIM(p_question_type) = '' THEN
        RAISE EXCEPTION 'Question type is required';
    END IF;

    -- Insert into question_bank
    INSERT INTO public.question_bank (
        tenant_id, subject_id, topic_id, question_type, question_text,
        explanation, difficulty_level, source, created_by
    )
    VALUES (
        v_tenant_id, p_subject_id, p_topic_id, p_question_type, p_question_text,
        p_explanation, COALESCE(p_difficulty_level, 3), 'manual', v_created_by
    )
    RETURNING id INTO v_question_id;

    -- Insert options if provided
    IF p_options IS NOT NULL AND jsonb_array_length(p_options) > 0 THEN
        FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
        LOOP
            INSERT INTO public.question_options (
                question_id, option_text, is_correct, order_index
            )
            VALUES (
                v_question_id,
                v_option->>'option_text',
                COALESCE((v_option->>'is_correct')::BOOLEAN, FALSE),
                COALESCE((v_option->>'order_index')::INTEGER, 0)
            );
        END LOOP;
    END IF;

    -- Insert tags if provided
    IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
        FOREACH v_tag IN ARRAY p_tags
        LOOP
            INSERT INTO public.question_tags (question_id, tag)
            VALUES (v_question_id, v_tag);
        END LOOP;
    END IF;

    -- Initialize question stats (FIX: include tenant_id, use a sentinel quiz_id)
    -- We use gen_random_uuid() as a placeholder quiz_id since stats PK requires it.
    -- Global bank stats use question_bank_usage aggregation instead.
    -- This row is for tracking question-level stats across all quizzes.
    INSERT INTO public.question_stats (question_id, quiz_id, tenant_id)
    VALUES (v_question_id, '00000000-0000-0000-0000-000000000000'::UUID, v_tenant_id)
    ON CONFLICT (question_id, quiz_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'question_id', v_question_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create question: %', SQLERRM;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. FIXED update_question() RPC
--    Uses question_bank_id instead of non-existent question_id.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_question(
    p_question_id UUID,
    p_subject_id UUID,
    p_topic_id UUID,
    p_question_type TEXT,
    p_question_text TEXT,
    p_explanation TEXT,
    p_difficulty_level INTEGER,
    p_options JSONB,
    p_tags TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_active_attempts INTEGER;
    v_option JSONB;
    v_tag TEXT;
BEGIN
    -- Security & Authorization
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- Ensure question belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    -- Safety Check: Cannot modify question used in active attempt
    -- FIX: uses question_bank_id (not non-existent question_id column)
    SELECT COUNT(*) INTO v_active_attempts
    FROM public.quiz_attempts qa
    JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
    WHERE qq.question_bank_id = p_question_id
      AND qa.status = 'in_progress'::public.quiz_attempt_status;

    IF v_active_attempts > 0 THEN
        RAISE EXCEPTION 'Cannot modify question. It is currently in use in % active attempt(s).', v_active_attempts;
    END IF;

    -- Update main question table
    UPDATE public.question_bank
    SET
        subject_id = COALESCE(p_subject_id, subject_id),
        topic_id = COALESCE(p_topic_id, topic_id),
        question_type = COALESCE(p_question_type, question_type),
        question_text = COALESCE(p_question_text, question_text),
        explanation = COALESCE(p_explanation, explanation),
        difficulty_level = COALESCE(p_difficulty_level, difficulty_level),
        updated_at = now()
    WHERE id = p_question_id;

    -- Update options (full replace for simplicity & safety)
    IF p_options IS NOT NULL THEN
        DELETE FROM public.question_options WHERE question_id = p_question_id;

        FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
        LOOP
            INSERT INTO public.question_options (
                question_id, option_text, is_correct, order_index
            )
            VALUES (
                p_question_id,
                v_option->>'option_text',
                COALESCE((v_option->>'is_correct')::BOOLEAN, FALSE),
                COALESCE((v_option->>'order_index')::INTEGER, 0)
            );
        END LOOP;

        -- CRITICAL: Also update quiz_options for any quiz_questions linked to this bank question
        -- This keeps grading pipeline in sync when teacher edits a bank question
        -- Only for quizzes that are NOT currently in active attempts (already checked above)
        UPDATE public.quiz_questions
        SET text = COALESCE(p_question_text, text)
        WHERE question_bank_id = p_question_id AND tenant_id = v_tenant_id;

        -- Re-sync quiz_options for linked quiz_questions
        -- Delete old quiz_options and re-copy from question_options
        DELETE FROM public.quiz_options
        WHERE question_id IN (
            SELECT id FROM public.quiz_questions
            WHERE question_bank_id = p_question_id AND tenant_id = v_tenant_id
        );

        INSERT INTO public.quiz_options (question_id, text, is_correct, tenant_id)
        SELECT
            qq.id,
            qo.option_text,
            qo.is_correct,
            qq.tenant_id
        FROM public.quiz_questions qq
        JOIN public.question_options qo ON qo.question_id = qq.question_bank_id
        WHERE qq.question_bank_id = p_question_id AND qq.tenant_id = v_tenant_id;
    END IF;

    -- Update tags (full replace)
    IF p_tags IS NOT NULL THEN
        DELETE FROM public.question_tags WHERE question_id = p_question_id;

        IF array_length(p_tags, 1) > 0 THEN
            FOREACH v_tag IN ARRAY p_tags
            LOOP
                INSERT INTO public.question_tags (question_id, tag)
                VALUES (p_question_id, v_tag);
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. FIXED add_question_to_quiz() RPC
--    CRITICAL: Copies options from question_options → quiz_options
--    so that the grading pipeline (which reads quiz_options) works.
-- ────────────────────────────────────────────────────────────

-- Drop all previous signatures
DROP FUNCTION IF EXISTS public.add_question_to_quiz(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.add_question_to_quiz(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.add_question_to_quiz(
    p_question_bank_id UUID,
    p_quiz_id UUID,
    p_order INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_question RECORD;
    v_new_quiz_question_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- Security: verify question belongs to tenant
    SELECT id, question_text, question_type, explanation
    INTO v_question
    FROM public.question_bank
    WHERE id = p_question_bank_id AND tenant_id = v_tenant_id;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    -- Security: verify quiz belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE id = p_quiz_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- Duplicate check: uses question_bank_id (FIX: not non-existent question_id)
    IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = p_quiz_id AND question_bank_id = p_question_bank_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question already added to quiz');
    END IF;

    -- Insert into quiz_questions with question_bank_id reference
    INSERT INTO public.quiz_questions (
        quiz_id,
        tenant_id,
        "order",
        question_bank_id,
        text,
        question_type,
        explanation,
        points
    )
    VALUES (
        p_quiz_id,
        v_tenant_id,
        p_order,
        p_question_bank_id,
        v_question.question_text,
        v_question.question_type::public.question_type,
        v_question.explanation,
        10  -- default points
    )
    RETURNING id INTO v_new_quiz_question_id;

    -- CRITICAL: Copy options from question_options → quiz_options
    -- The grading pipeline reads correct answers from quiz_options,
    -- so bank-backed questions must have their options here too.
    INSERT INTO public.quiz_options (question_id, text, is_correct, tenant_id)
    SELECT
        v_new_quiz_question_id,
        qo.option_text,
        qo.is_correct,
        v_tenant_id
    FROM public.question_options qo
    WHERE qo.question_id = p_question_bank_id;

    -- Record usage analytics
    INSERT INTO public.question_bank_usage (question_id, quiz_id, tenant_id)
    VALUES (p_question_bank_id, p_quiz_id, v_tenant_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Question added to quiz successfully',
        'quiz_question_id', v_new_quiz_question_id
    );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. ABSORBED RPCs from deleted 70_question_bank_improvements.sql
--    get_question() and get_question_options()
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_question(p_question_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_question JSONB;
BEGIN
    v_tenant_id := get_my_tenant_id();

    SELECT jsonb_build_object(
        'id', q.id,
        'subject_id', q.subject_id,
        'topic_id', q.topic_id,
        'question_type', q.question_type,
        'question_text', q.question_text,
        'explanation', q.explanation,
        'difficulty_level', q.difficulty_level,
        'created_at', q.created_at,
        'tags', COALESCE((SELECT jsonb_agg(tag) FROM public.question_tags WHERE question_id = q.id), '[]'::jsonb),
        'options', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', o.id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'order_index', o.order_index
            ) ORDER BY o.order_index)
            FROM public.question_options o
            WHERE o.question_id = q.id
        ), '[]'::jsonb)
    ) INTO v_question
    FROM public.question_bank q
    WHERE q.id = p_question_id AND q.tenant_id = v_tenant_id;

    RETURN v_question;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_question_options(p_question_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_options JSONB;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Verify question belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'option_text', o.option_text,
        'is_correct', o.is_correct,
        'order_index', o.order_index
    ) ORDER BY o.order_index), '[]'::jsonb) INTO v_options
    FROM public.question_options o
    WHERE o.question_id = p_question_id;

    RETURN v_options;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. FIXED Stats Trigger
--    Updated for composite PK (question_id, quiz_id).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_update_quiz_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_attempts INTEGER;
    v_new_score NUMERIC(5,2);
    v_is_first_attempt BOOLEAN;
BEGIN
    -- Only process when status transitions to GRADED
    IF NEW.status != 'graded'::public.quiz_attempt_status
       OR (OLD.status = 'graded'::public.quiz_attempt_status) THEN
        RETURN NEW;
    END IF;

    v_new_score := COALESCE(NEW.score, 0);

    -- Check if this student's first graded attempt for this quiz
    v_is_first_attempt := NOT EXISTS(
        SELECT 1 FROM public.quiz_attempts
        WHERE quiz_id = NEW.quiz_id
          AND student_id = NEW.student_id
          AND status = 'graded'::public.quiz_attempt_status
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
    -- Uses composite PK (question_id, quiz_id)
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_quiz_attempt_stats ON public.quiz_attempts;

CREATE TRIGGER trg_quiz_attempt_stats
    AFTER UPDATE ON public.quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_quiz_stats();


-- ────────────────────────────────────────────────────────────
-- 8. archive_question() — preserved from migration 69
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.archive_question(
    p_question_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();

    UPDATE public.question_bank
    SET is_archived = TRUE, updated_at = now()
    WHERE id = p_question_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. search_questions() — preserved from migration 69
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_questions(
    p_subject_id UUID DEFAULT NULL,
    p_topic_id UUID DEFAULT NULL,
    p_difficulty_level INTEGER DEFAULT NULL,
    p_question_type TEXT DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    subject_id UUID,
    topic_id UUID,
    question_type TEXT,
    question_text TEXT,
    difficulty_level INTEGER,
    created_at TIMESTAMPTZ,
    tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();

    RETURN QUERY
    SELECT
        q.id,
        q.subject_id,
        q.topic_id,
        q.question_type::TEXT,
        q.question_text,
        q.difficulty_level,
        q.created_at,
        ARRAY(SELECT qt.tag FROM public.question_tags qt WHERE qt.question_id = q.id) as tags
    FROM public.question_bank q
    WHERE
        q.tenant_id = v_tenant_id
        AND q.is_archived = FALSE
        AND (p_subject_id IS NULL OR q.subject_id = p_subject_id)
        AND (p_topic_id IS NULL OR q.topic_id = p_topic_id)
        AND (p_difficulty_level IS NULL OR q.difficulty_level = p_difficulty_level)
        AND (p_question_type IS NULL OR q.question_type::TEXT = p_question_type)
        AND (p_search_query IS NULL OR q.question_text ILIKE '%' || p_search_query || '%')
        AND (p_tags IS NULL OR EXISTS (
            SELECT 1 FROM public.question_tags qt
            WHERE qt.question_id = q.id AND qt.tag = ANY(p_tags)
        ))
    ORDER BY q.created_at DESC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0);
END;
$$;


-- ============================================================
-- MIGRATION 71 COMPLETE
-- ============================================================
