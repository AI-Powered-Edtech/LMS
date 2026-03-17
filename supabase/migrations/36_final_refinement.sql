-- 36_final_refinement.sql
-- Final Schema Hardening and Performance Optimization

-- 1. HARDENING FUNCTION SEARCH PATHS AND SCHEMA QUALIFICATION
-- Ensures SECURITY DEFINER functions have restricted search paths and explicit schema references.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_lesson_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (NEW.tenant_id, NEW.user_id, 'LESSON_COMPLETED', jsonb_build_object('lesson_id', NEW.lesson_id));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.trigger_quiz_passed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (NEW.tenant_id, NEW.user_id, 'QUIZ_PASSED', jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.trigger_update_course_progress()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.course_progress (tenant_id, user_id, course_id, completed_lessons)
    VALUES (NEW.tenant_id, NEW.user_id, NEW.course_id, ARRAY[NEW.lesson_id])
    ON CONFLICT (user_id, course_id) DO UPDATE
    SET 
        completed_lessons = array_append(public.course_progress.completed_lessons, NEW.lesson_id),
        updated_at = NOW()
    WHERE NOT (NEW.lesson_id = ANY(public.course_progress.completed_lessons));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.recompute_course_progress_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.recompute_course_progress(NEW.user_id, NEW.course_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.update_lesson_resource_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.lesson_resources 
    SET search_vector = 
        setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('indonesian', coalesce(content, '')), 'B')
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


-- 2. INDEX OPTIMIZATION
-- Adding covering indexes for unindexed foreign keys and optimizing for tenant isolation.

-- AI Tutor Tables
CREATE INDEX IF NOT EXISTS idx_ai_tutor_cache_tenant_id ON public.ai_tutor_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_interactions_tenant_id ON public.ai_tutor_interactions (tenant_id, user_id);

-- Learning Management Tables
CREATE INDEX IF NOT EXISTS idx_quiz_answers_tenant_id ON public.quiz_answers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz ON public.quiz_attempts (student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_tenant_user ON public.recommendations (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_grades_tenant_submission ON public.grades (tenant_id, submission_id);
CREATE INDEX IF NOT EXISTS idx_user_points_tenant_user ON public.user_points (tenant_id, user_id);

-- Foundation & Infrastructure
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON public.notifications (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_invoice ON public.payments (tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_user ON public.activity_logs (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON public.lesson_resources (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_tenant_user_lesson ON public.lesson_progress (tenant_id, user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_enrollment ON public.attendance_records (tenant_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_tenant_student_assign ON public.assignment_submissions (tenant_id, student_id, assignment_id);

-- Cleanup unused/redundant indexes
DROP INDEX IF EXISTS public.activities_lesson_id_idx;
DROP INDEX IF EXISTS public.attendance_status_idx;
DROP INDEX IF EXISTS public.course_progress_progress_idx;


-- 3. RLS POLICY OPTIMIZATION (SCALAR SUBQUERIES)
-- Note: Using CREATE OR REPLACE for policies that may or may not exist

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT
USING ((id = (SELECT auth.uid())) OR (tenant_id = (SELECT public.get_my_tenant_id())));

-- Courses
DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses
FOR SELECT
USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Classes
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
FOR SELECT
USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((teacher_id = (SELECT auth.uid())) OR is_enrolled_in_class(id) OR has_role('ADMIN'::app_role)));

-- Enrollments
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
CREATE POLICY "enrollments_select" ON public.enrollments
FOR SELECT
USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((student_id = (SELECT auth.uid())) OR is_class_teacher(class_id) OR has_role('ADMIN'::app_role)));

-- Quiz Attempts
DROP POLICY IF EXISTS "quiz_attempts_select" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select" ON public.quiz_attempts
FOR SELECT
USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((student_id = (SELECT auth.uid())) OR (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.classes c ON c.id = q.class_id WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = (SELECT auth.uid()))) OR has_role('ADMIN'::app_role)));

-- AI Tutor interactions
DROP POLICY IF EXISTS "users_read_own_interactions" ON public.ai_tutor_interactions;
CREATE POLICY "users_read_own_interactions" ON public.ai_tutor_interactions
FOR SELECT
USING (user_id = (SELECT auth.uid()) AND tenant_id = (SELECT public.get_my_tenant_id()));

-- AI Tutor cache
DROP POLICY IF EXISTS "Tenants manage cache" ON public.ai_tutor_cache;
CREATE POLICY "Tenants manage cache" ON public.ai_tutor_cache
FOR SELECT
USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- End of 36_final_refinement.sql
