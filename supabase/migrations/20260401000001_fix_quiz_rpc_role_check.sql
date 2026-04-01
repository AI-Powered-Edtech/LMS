-- =============================================================
-- EduSync LMS — Migration: Fix quiz RPC app_role comparison
-- Tanggal: 2026-04-01
-- =============================================================
-- Perbaiki v1_get_assignment_results dan get_question_difficulty:
-- Gunakan query user_roles secara langsung (text comparison)
-- daripada cast app_role enum yang bisa gagal di beberapa env.
-- Sesuai dengan CLAUDE.md: query user_roles table directly.
-- =============================================================

CREATE OR REPLACE FUNCTION public.v1_get_assignment_results(p_assignment_id UUID)
RETURNS TABLE (
    attempt_id      UUID,
    student_id      UUID,
    student_name    TEXT,
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    score           NUMERIC,
    status          TEXT,
    passed          BOOLEAN,
    time_spent      INTEGER,
    quiz_id         UUID,
    quiz_title      TEXT,
    passing_score   INTEGER,
    max_attempts    INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin   BOOLEAN := FALSE;
BEGIN
    SELECT
        qa.id,
        qa.class_id,
        qa.quiz_id,
        q.title,
        q.passing_score,
        COALESCE(qa.max_attempts, q.max_attempts) AS effective_max_attempts
    INTO v_assignment
    FROM public.quiz_assignments qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = get_my_tenant_id();

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'P0001';
    END IF;

    -- Use direct text comparison to avoid app_role enum casting issues
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.tenant_id = get_my_tenant_id()
          AND upper(ur.role::text) = 'ADMIN'
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = v_assignment.class_id
          AND c.teacher_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Must be the class teacher or an admin' USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.student_id,
        COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Siswa') AS student_name,
        a.started_at,
        a.submitted_at,
        a.score,
        a.status,
        a.passed,
        a.time_spent,
        a.quiz_id,
        v_assignment.title,
        v_assignment.passing_score,
        v_assignment.effective_max_attempts
    FROM public.quiz_attempts_v2 a
    JOIN public.profiles p ON p.id = a.student_id
    WHERE a.assignment_id = p_assignment_id
    ORDER BY a.submitted_at DESC NULLS LAST, a.started_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_question_difficulty(p_assignment_id UUID)
RETURNS TABLE (
    question_id        UUID,
    question_text      TEXT,
    question_position  INTEGER,
    correct_count      BIGINT,
    total_attempts     BIGINT,
    difficulty_percent NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin   BOOLEAN := FALSE;
BEGIN
    SELECT qa.id, qa.class_id, qa.quiz_id
    INTO v_assignment
    FROM public.quiz_assignments qa
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = get_my_tenant_id();

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Use direct text comparison to avoid app_role enum casting issues
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.tenant_id = get_my_tenant_id()
          AND upper(ur.role::text) = 'ADMIN'
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = v_assignment.class_id
          AND c.teacher_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized role';
    END IF;

    RETURN QUERY
    WITH attempts AS (
        SELECT a.id
        FROM public.quiz_attempts_v2 a
        WHERE a.assignment_id = p_assignment_id
          AND a.status IN ('SUBMITTED', 'GRADED')
    ),
    questions AS (
        SELECT q.id, q.text, q."order"
        FROM public.quiz_questions q
        WHERE q.quiz_id = v_assignment.quiz_id
    ),
    totals AS (
        SELECT COUNT(*)::bigint AS total_attempts FROM attempts
    )
    SELECT
        q.id                                                          AS question_id,
        q.text                                                        AS question_text,
        q."order"::INTEGER                                            AS question_position,
        COUNT(CASE WHEN aq.is_correct THEN 1 END)::BIGINT            AS correct_count,
        t.total_attempts,
        CASE
            WHEN t.total_attempts = 0 THEN 0
            ELSE ROUND(
                (COUNT(CASE WHEN aq.is_correct THEN 1 END)::NUMERIC
                 / t.total_attempts) * 100, 1)
        END                                                           AS difficulty_percent
    FROM questions q
    CROSS JOIN totals t
    LEFT JOIN public.quiz_attempt_questions_v2 aq
           ON aq.question_id = q.id
          AND aq.attempt_id IN (SELECT id FROM attempts)
    GROUP BY q.id, q.text, q."order", t.total_attempts
    ORDER BY q."order";
END;
$$;
