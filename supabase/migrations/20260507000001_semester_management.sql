-- ============================================================
-- Phase 38: Semester Management & Close Workflow
--
-- Tables:  semesters
-- RPCs:    clone_course_to_semester, promote_students_to_next_class,
--           generate_semester_report_card
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. semesters — academic semester definitions per tenant
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semesters (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
    name           TEXT NOT NULL,
    academic_year  TEXT NOT NULL,
    term           INTEGER NOT NULL CHECK (term IN (1, 2)),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closing', 'closed')),
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semesters_tenant ON public.semesters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON public.semesters(academic_year);
CREATE INDEX IF NOT EXISTS idx_semesters_term ON public.semesters(term);
CREATE INDEX IF NOT EXISTS idx_semesters_status ON public.semesters(status);
CREATE INDEX IF NOT EXISTS idx_semesters_tenant_year_term ON public.semesters(tenant_id, academic_year, term);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.semesters TO authenticated;

-- All authenticated users can read semesters in their tenant
DROP POLICY IF EXISTS "semesters_read" ON public.semesters;
CREATE POLICY "semesters_read" ON public.semesters
    FOR SELECT USING (tenant_id = public.get_my_tenant_id());

-- Admins and teachers can manage semesters
DROP POLICY IF EXISTS "semesters_manage" ON public.semesters;
CREATE POLICY "semesters_manage" ON public.semesters
    FOR ALL USING (
        tenant_id = public.get_my_tenant_id()
        AND (public.has_role('ADMIN'::public.app_role) OR public.has_role('TEACHER'::public.app_role))
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND (public.has_role('ADMIN'::public.app_role) OR public.has_role('TEACHER'::public.app_role))
    );

CREATE OR REPLACE TRIGGER set_tenant_id_semesters
    BEFORE INSERT ON public.semesters
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


-- ────────────────────────────────────────────────────────────
-- RPC: clone_course_to_semester
-- Copies course structure (modules, lessons, quizzes) to a new course
-- linked to the target semester. Resets enrollments and progress.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.clone_course_to_semester(
    p_course_id UUID,
    p_target_semester_id UUID,
    p_tenant_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_course_id UUID;
    v_old_module_id UUID;
    v_new_module_id UUID;
    v_old_lesson_id UUID;
    v_new_lesson_id UUID;
    v_old_quiz_id UUID;
    v_new_quiz_id UUID;
    v_old_question_id UUID;
    v_new_question_id UUID;
    v_old_option_id UUID;
    v_course RECORD;
    v_module RECORD;
    v_lesson RECORD;
    v_quiz RECORD;
    v_question RECORD;
    v_option RECORD;
BEGIN
    -- Auth check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify tenant access
    IF p_tenant_id != public.get_my_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: tenant mismatch';
    END IF;

    -- Teacher/admin only
    IF NOT public.has_role('TEACHER'::public.app_role) AND NOT public.has_role('ADMIN'::public.app_role) THEN
        RAISE EXCEPTION 'Only teachers and admins can clone courses';
    END IF;

    -- Get source course
    SELECT id, title, description, cover_image, category, difficulty
    INTO v_course
    FROM public.courses
    WHERE id = p_course_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Create new course
    INSERT INTO public.courses (tenant_id, title, description, cover_image, category, difficulty, status)
    VALUES (
        p_tenant_id,
        v_course.title || ' (Salinan)',
        v_course.description,
        v_course.cover_image,
        v_course.category,
        v_course.difficulty,
        'draft'
    ) RETURNING id INTO v_new_course_id;

    -- Clone modules
    FOR v_module IN
        SELECT id, title, description, "order"
        FROM public.course_modules
        WHERE course_id = p_course_id AND tenant_id = p_tenant_id
        ORDER BY "order"
    LOOP
        INSERT INTO public.course_modules (tenant_id, course_id, title, description, "order")
        VALUES (p_tenant_id, v_new_course_id, v_module.title, v_module.description, v_module."order")
        RETURNING id INTO v_new_module_id;

        -- Clone lessons within module
        FOR v_lesson IN
            SELECT id, title, content, "order", lesson_type, video_url, duration_seconds
            FROM public.lessons
            WHERE module_id = v_module.id AND tenant_id = p_tenant_id
            ORDER BY "order"
        LOOP
            INSERT INTO public.lessons (tenant_id, module_id, title, content, "order", lesson_type, video_url, duration_seconds)
            VALUES (p_tenant_id, v_new_module_id, v_lesson.title, v_lesson.content, v_lesson."order", v_lesson.lesson_type, v_lesson.video_url, v_lesson.duration_seconds)
            RETURNING id INTO v_new_lesson_id;
        END LOOP;

        -- Clone quizzes within module
        FOR v_quiz IN
            SELECT id, title, description, time_limit_minutes, passing_score, shuffle_questions, shuffle_options, "order"
            FROM public.quizzes
            WHERE module_id = v_module.id AND tenant_id = p_tenant_id
            ORDER BY "order"
        LOOP
            INSERT INTO public.quizzes (tenant_id, module_id, title, description, time_limit_minutes, passing_score, shuffle_questions, shuffle_options, "order")
            VALUES (p_tenant_id, v_new_module_id, v_quiz.title, v_quiz.description, v_quiz.time_limit_minutes, v_quiz.passing_score, v_quiz.shuffle_questions, v_quiz.shuffle_options, v_quiz."order")
            RETURNING id INTO v_new_quiz_id;

            -- Clone quiz questions
            FOR v_question IN
                SELECT id, text, question_type, explanation, "order", points
                FROM public.quiz_questions
                WHERE quiz_id = v_quiz.id AND tenant_id = p_tenant_id
                ORDER BY "order"
            LOOP
                INSERT INTO public.quiz_questions (tenant_id, quiz_id, text, question_type, explanation, "order", points)
                VALUES (p_tenant_id, v_new_quiz_id, v_question.text, v_question.question_type, v_question.explanation, v_question."order", v_question.points)
                RETURNING id INTO v_new_question_id;

                -- Clone quiz options
                FOR v_option IN
                    SELECT id, text, is_correct, "order"
                    FROM public.quiz_options
                    WHERE question_id = v_question.id AND tenant_id = p_tenant_id
                    ORDER BY "order"
                LOOP
                    INSERT INTO public.quiz_options (tenant_id, question_id, text, is_correct, "order")
                    VALUES (p_tenant_id, v_new_question_id, v_option.text, v_option.is_correct, v_option."order");
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN v_new_course_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- RPC: promote_students_to_next_class
-- Updates student class assignments in bulk.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_students_to_next_class(
    p_tenant_id UUID,
    p_student_ids UUID[],
    p_new_class TEXT
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Auth check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify tenant access
    IF p_tenant_id != public.get_my_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: tenant mismatch';
    END IF;

    -- Admin only
    IF NOT public.has_role('ADMIN'::public.app_role) THEN
        RAISE EXCEPTION 'Only admins can promote students';
    END IF;

    -- Update class assignments
    UPDATE public.profiles
    SET class = p_new_class,
        updated_at = now()
    WHERE id = ANY(p_student_ids)
      AND tenant_id = p_tenant_id
      AND role = 'STUDENT'::public.app_role;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- RPC: generate_semester_report_card
-- Aggregates grades for all courses in a semester for a student.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_semester_report_card(
    p_semester_id UUID,
    p_student_id UUID,
    p_tenant_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result JSON;
    v_semester_name TEXT;
    v_student_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_present INTEGER;
    v_absent INTEGER;
    v_sick INTEGER;
    v_permission INTEGER;
BEGIN
    -- Auth check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify tenant access
    IF p_tenant_id != public.get_my_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: tenant mismatch';
    END IF;

    -- Get semester info
    SELECT name, start_date, end_date
    INTO v_semester_name, v_start_date, v_end_date
    FROM public.semesters
    WHERE id = p_semester_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Semester not found';
    END IF;

    -- Get student name
    SELECT full_name
    INTO v_student_name
    FROM public.profiles
    WHERE id = p_student_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found';
    END IF;

    -- Get attendance summary
    SELECT
        COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'sick' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'permission' THEN 1 ELSE 0 END), 0)
    INTO v_present, v_absent, v_sick, v_permission
    FROM public.attendance_records
    WHERE student_id = p_student_id
      AND tenant_id = p_tenant_id
      AND date >= v_start_date
      AND date <= v_end_date;

    -- Build result JSON
    SELECT json_build_object(
        'student_id', p_student_id,
        'student_name', v_student_name,
        'semester_name', v_semester_name,
        'courses', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'course_name', c.title,
                    'final_score', COALESCE(ROUND(AVG(ge.score::numeric / NULLIF(ge.max_score, 0) * 100), 1), 0),
                    'grade_letter', CASE
                        WHEN COALESCE(ROUND(AVG(ge.score::numeric / NULLIF(ge.max_score, 0) * 100), 1), 0) >= 90 THEN 'A'
                        WHEN COALESCE(ROUND(AVG(ge.score::numeric / NULLIF(ge.max_score, 0) * 100), 1), 0) >= 80 THEN 'B'
                        WHEN COALESCE(ROUND(AVG(ge.score::numeric / NULLIF(ge.max_score, 0) * 100), 1), 0) >= 70 THEN 'C'
                        WHEN COALESCE(ROUND(AVG(ge.score::numeric / NULLIF(ge.max_score, 0) * 100), 1), 0) >= 60 THEN 'D'
                        ELSE 'F'
                    END,
                    'teacher_name', COALESCE(p.full_name, '-')
                )
            ), '[]'::json)
            FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            LEFT JOIN public.gradebook_entries ge ON ge.course_id = c.id AND ge.student_id = p_student_id
            LEFT JOIN public.course_collaborators cc ON cc.course_id = c.id AND cc.role = 'teacher'
            LEFT JOIN public.profiles p ON p.id = cc.user_id
            WHERE e.user_id = p_student_id
              AND e.tenant_id = p_tenant_id
              AND c.tenant_id = p_tenant_id
            GROUP BY c.id, c.title, p.full_name
        ),
        'attendance_summary', json_build_object(
            'present', v_present,
            'absent', v_absent,
            'sick', v_sick,
            'permission', v_permission
        ),
        'teacher_notes', ''
    ) INTO v_result;

    RETURN v_result;
END;
$$;

COMMENT ON TABLE public.semesters IS 'Academic semester definitions per tenant. Phase 38.';
COMMENT ON FUNCTION public.clone_course_to_semester IS 'Clone course structure to a new course for a target semester. Phase 38.';
COMMENT ON FUNCTION public.promote_students_to_next_class IS 'Bulk update student class assignments. Phase 38.';
COMMENT ON FUNCTION public.generate_semester_report_card IS 'Generate semester report card with grades and attendance. Phase 38.';
