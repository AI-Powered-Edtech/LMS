-- 88_rls_standardization_complete.sql
-- Completing the standardization of RLS policies for remaining tenant-scoped tables.

-- ASSIGNMENTS
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments
    FOR SELECT USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
CREATE POLICY "assignments_insert" ON public.assignments
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "assignments_update" ON public.assignments;
CREATE POLICY "assignments_update" ON public.assignments
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

-- ASSIGNMENT SUBMISSIONS
DROP POLICY IF EXISTS "assignment_submissions_select" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_select" ON public.assignment_submissions
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND (
            student_id = auth.uid() OR has_role('ADMIN') OR has_role('TEACHER')
        )
    );

DROP POLICY IF EXISTS "assignment_submissions_insert" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_insert" ON public.assignment_submissions
    FOR INSERT WITH CHECK (
        tenant_id = get_my_tenant_id() AND student_id = auth.uid()
    );

-- QUIZ ATTEMPTS
DROP POLICY IF EXISTS "quiz_attempts_select_own" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_own" ON public.quiz_attempts
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND student_id = auth.uid() AND has_feature('quiz')
    );

DROP POLICY IF EXISTS "quiz_attempts_select_teacher" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_teacher" ON public.quiz_attempts
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')) AND has_feature('quiz')
    );

-- LESSON PROGRESS
DROP POLICY IF EXISTS "lesson_progress_select_own" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_own" ON public.lesson_progress
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "lesson_progress_select_teacher" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_teacher" ON public.lesson_progress
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER'))
    );

-- LESSON RESOURCES
DROP POLICY IF EXISTS "lesson_resources_select_tenant" ON public.lesson_resources;
CREATE POLICY "lesson_resources_select_tenant" ON public.lesson_resources
    FOR SELECT USING (tenant_id = get_my_tenant_id());

-- COURSE ENROLLMENTS
DROP POLICY IF EXISTS "enrollments_select_own" ON public.course_enrollments;
CREATE POLICY "enrollments_select_own" ON public.course_enrollments
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "enrollments_select_teacher" ON public.course_enrollments;
CREATE POLICY "enrollments_select_teacher" ON public.course_enrollments
    FOR SELECT USING (
        tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER'))
    );
