-- Migration 80: Teacher Dashboard Results RPC
-- Provides a clean view of all attempts for a specific quiz for the teacher.

SET search_path = public;

-- ============================================================================
-- 1. v1_get_quiz_results
-- ============================================================================
CREATE OR REPLACE FUNCTION public.v1_get_quiz_results(p_quiz_id UUID)
RETURNS TABLE (
  attempt_id UUID,
  student_id UUID,
  student_name TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  status attempt_status,
  passed BOOLEAN
) AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
    v_is_teacher BOOLEAN;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Check if the user is an admin or the teacher of the class the quiz belongs to
    SELECT EXISTS (
        SELECT 1 
        FROM public.quizzes q
        JOIN public.classes c ON c.id = q.class_id
        LEFT JOIN public.user_roles ur ON ur.user_id = v_user_id AND ur.tenant_id = v_tenant_id AND ur.role = 'admin'
        WHERE q.id = p_quiz_id 
          AND q.tenant_id = v_tenant_id
          AND (c.teacher_id = v_user_id OR ur.id IS NOT NULL)
    ) INTO v_is_teacher;

    IF NOT v_is_teacher THEN
        RAISE EXCEPTION 'Unauthorized: Must be the class teacher or an admin' USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT 
        qa.id AS attempt_id,
        qa.student_id,
        (p.first_name || ' ' || p.last_name) AS student_name,
        qa.started_at,
        qa.submitted_at,
        qa.score,
        qa.status,
        qa.passed
    FROM public.quiz_attempts qa
    JOIN public.profiles p ON p.id = qa.student_id
    WHERE qa.quiz_id = p_quiz_id
      AND qa.tenant_id = v_tenant_id
    ORDER BY qa.submitted_at DESC NULLS LAST, qa.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
