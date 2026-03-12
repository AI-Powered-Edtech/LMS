-- ============================================================
-- EduSync LMS
-- Question Bank RPC Functions
-- Version: 1.0
-- ============================================================

SET search_path = public;

-- ============================================================
-- 1. create_question()
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_question(
    p_subject_id UUID,
    p_topic_id UUID,
    p_question_type TEXT,
    p_question_text TEXT,
    p_explanation TEXT,
    p_difficulty_level INTEGER,
    p_options JSONB, -- Array of objects: { option_text, is_correct, order_index }
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
    INSERT INTO question_bank (
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
            INSERT INTO question_options (
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
            INSERT INTO question_tags (question_id, tag)
            VALUES (v_question_id, v_tag);
        END LOOP;
    END IF;

    -- Initialize question stats
    INSERT INTO question_stats (question_id) VALUES (v_question_id);

    RETURN jsonb_build_object(
        'success', true,
        'question_id', v_question_id
    );
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create question: %', SQLERRM;
END;
$$;


-- ============================================================
-- 2. update_question()
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_question(
    p_question_id UUID,
    p_subject_id UUID,
    p_topic_id UUID,
    p_question_type TEXT,
    p_question_text TEXT,
    p_explanation TEXT,
    p_difficulty_level INTEGER,
    p_options JSONB, -- Array of objects: { id(optional), option_text, is_correct, order_index }
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
    IF NOT EXISTS (SELECT 1 FROM question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    -- Safety Check: Cannot modify question used in active attempt
    -- (This relies on quiz_attempt_questions snapshot being implemented if quiz in progress)
    -- Simplified check: has it been used in active attempts?
    SELECT COUNT(*) INTO v_active_attempts
    FROM quiz_attempts qa
    JOIN quiz_questions qq ON qa.quiz_id = qq.quiz_id
    WHERE qq.question_id = p_question_id AND qa.status = 'IN_PROGRESS';

    IF v_active_attempts > 0 THEN
        RAISE EXCEPTION 'Cannot modify question. It is currently in use in % active attempt(s).', v_active_attempts;
    END IF;

    -- Update main question table
    UPDATE question_bank
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
        DELETE FROM question_options WHERE question_id = p_question_id;
        
        FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
        LOOP
            INSERT INTO question_options (
                question_id, option_text, is_correct, order_index
            )
            VALUES (
                p_question_id, 
                v_option->>'option_text', 
                COALESCE((v_option->>'is_correct')::BOOLEAN, FALSE), 
                COALESCE((v_option->>'order_index')::INTEGER, 0)
            );
        END LOOP;
    END IF;

    -- Update tags (full replace)
    IF p_tags IS NOT NULL THEN
        DELETE FROM question_tags WHERE question_id = p_question_id;
        
        IF array_length(p_tags, 1) > 0 THEN
            FOREACH v_tag IN ARRAY p_tags
            LOOP
                INSERT INTO question_tags (question_id, tag)
                VALUES (p_question_id, v_tag);
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;


-- ============================================================
-- 3. search_questions()
-- ============================================================
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
        q.question_type,
        q.question_text,
        q.difficulty_level,
        q.created_at,
        ARRAY(SELECT qt.tag FROM question_tags qt WHERE qt.question_id = q.id) as tags
    FROM question_bank q
    WHERE 
        q.tenant_id = v_tenant_id
        AND q.is_archived = FALSE
        AND (p_subject_id IS NULL OR q.subject_id = p_subject_id)
        AND (p_topic_id IS NULL OR q.topic_id = p_topic_id)
        AND (p_difficulty_level IS NULL OR q.difficulty_level = p_difficulty_level)
        AND (p_question_type IS NULL OR q.question_type = p_question_type)
        AND (p_search_query IS NULL OR q.question_text ILIKE '%' || p_search_query || '%')
        AND (p_tags IS NULL OR EXISTS (
            SELECT 1 FROM question_tags qt 
            WHERE qt.question_id = q.id AND qt.tag = ANY(p_tags)
        ))
    ORDER BY q.created_at DESC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0);
END;
$$;


-- ============================================================
-- 4. add_question_to_quiz()
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_question_to_quiz(
    p_question_id UUID,
    p_quiz_id UUID,
    p_points INTEGER DEFAULT 1,
    p_order_index INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_new_quiz_question_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM quizzes WHERE id = p_quiz_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- Avoid duplicate add
    IF EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = p_quiz_id AND question_id = p_question_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question already added to quiz');
    END IF;

    -- Insert into quiz_questions
    INSERT INTO quiz_questions (
        quiz_id, question_id, points, order_index
    )
    VALUES (
        p_quiz_id, p_question_id, p_points, p_order_index
    )
    RETURNING id INTO v_new_quiz_question_id;

    -- Record Usage Analytics
    INSERT INTO question_bank_usage (
        question_id, quiz_id, tenant_id
    )
    VALUES (
        p_question_id, p_quiz_id, v_tenant_id
    );

    RETURN jsonb_build_object(
        'success', true, 
        'quiz_question_id', v_new_quiz_question_id
    );
END;
$$;


-- ============================================================
-- 5. archive_question()
-- ============================================================
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

    UPDATE question_bank
    SET is_archived = TRUE, updated_at = now()
    WHERE id = p_question_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;
