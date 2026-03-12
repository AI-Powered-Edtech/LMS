-- ============================================================
-- EduSync LMS
-- Question Bank Improvements & Hardening
-- Version: 1.1
-- ============================================================

SET search_path = public;

-- ============================================================
-- 1. Question Type ENUM
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
        CREATE TYPE question_type_enum AS ENUM (
            'MCQ',
            'MULTIPLE_SELECT',
            'TRUE_FALSE',
            'SHORT_ANSWER',
            'ESSAY'
        );
    END IF;
END
$$;

-- Alter table to use ENUM instead of TEXT
ALTER TABLE question_bank 
ALTER COLUMN question_type TYPE question_type_enum 
USING question_type::question_type_enum;


-- ============================================================
-- 2. RPC: get_question
-- ============================================================
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
        'tags', COALESCE((SELECT jsonb_agg(tag) FROM question_tags WHERE question_id = q.id), '[]'::jsonb),
        'options', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', o.id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'order_index', o.order_index
            ) ORDER BY o.order_index)
            FROM question_options o
            WHERE o.question_id = q.id
        ), '[]'::jsonb)
    ) INTO v_question
    FROM question_bank q
    WHERE q.id = p_question_id AND q.tenant_id = v_tenant_id;

    RETURN v_question;
END;
$$;


-- ============================================================
-- 3. RPC: get_question_options
-- ============================================================
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
    IF NOT EXISTS (SELECT 1 FROM question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'option_text', o.option_text,
        'is_correct', o.is_correct,
        'order_index', o.order_index
    ) ORDER BY o.order_index), '[]'::jsonb) INTO v_options
    FROM question_options o
    WHERE o.question_id = p_question_id;

    RETURN v_options;
END;
$$;
