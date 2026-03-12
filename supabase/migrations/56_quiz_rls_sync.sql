-- Migration 56_quiz_rls_sync

-- 1. Helper Function: is_enrolled_in_course
CREATE OR REPLACE FUNCTION is_enrolled_in_course(course_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE user_id = auth.uid()
    AND course_id = course_uuid
  );
$$;

-- 2. Quizzes Table Policies
DROP POLICY IF EXISTS "quizzes_select" ON quizzes;
CREATE POLICY "quizzes_select" ON quizzes FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
  AND (
    (class_id IS NOT NULL AND is_class_member(class_id))
    OR (course_id IS NOT NULL AND is_enrolled_in_course(course_id))
    OR (class_id IS NOT NULL AND is_class_teacher(class_id))
    OR (course_id IS NOT NULL AND is_course_creator(course_id))
    OR has_role('ADMIN')
  )
);

DROP POLICY IF EXISTS "quizzes_insert" ON quizzes;
CREATE POLICY "quizzes_insert" ON quizzes FOR INSERT
WITH CHECK (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND (
    (class_id IS NOT NULL AND is_class_teacher(class_id))
    OR (course_id IS NOT NULL AND is_course_creator(course_id))
    OR has_role('ADMIN')
  )
);

DROP POLICY IF EXISTS "quizzes_update" ON quizzes;
CREATE POLICY "quizzes_update" ON quizzes FOR UPDATE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND (
    (class_id IS NOT NULL AND is_class_teacher(class_id))
    OR (course_id IS NOT NULL AND is_course_creator(course_id))
    OR has_role('ADMIN')
  )
);

DROP POLICY IF EXISTS "quizzes_delete" ON quizzes;
CREATE POLICY "quizzes_delete" ON quizzes FOR DELETE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND (
    (class_id IS NOT NULL AND is_class_teacher(class_id))
    OR (course_id IS NOT NULL AND is_course_creator(course_id))
    OR has_role('ADMIN')
  )
);

-- 3. Quiz Questions Table Policies
DROP POLICY IF EXISTS "quiz_questions_select" ON quiz_questions;
CREATE POLICY "quiz_questions_select" ON quiz_questions FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quizzes q 
    WHERE q.id = quiz_id 
    AND (
      (q.class_id IS NOT NULL AND is_class_member(q.class_id))
      OR (q.course_id IS NOT NULL AND is_enrolled_in_course(q.course_id))
      OR (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_questions_insert" ON quiz_questions;
CREATE POLICY "quiz_questions_insert" ON quiz_questions FOR INSERT
WITH CHECK (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quizzes q 
    WHERE q.id = quiz_id 
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_questions_update" ON quiz_questions;
CREATE POLICY "quiz_questions_update" ON quiz_questions FOR UPDATE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quizzes q 
    WHERE q.id = quiz_id 
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_questions_delete" ON quiz_questions;
CREATE POLICY "quiz_questions_delete" ON quiz_questions FOR DELETE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quizzes q 
    WHERE q.id = quiz_id 
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

-- 4. Quiz Options Table Policies
DROP POLICY IF EXISTS "quiz_options_select" ON quiz_options;
CREATE POLICY "quiz_options_select" ON quiz_options FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id
    AND (
      (q.class_id IS NOT NULL AND is_class_member(q.class_id))
      OR (q.course_id IS NOT NULL AND is_enrolled_in_course(q.course_id))
      OR (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_options_insert" ON quiz_options;
CREATE POLICY "quiz_options_insert" ON quiz_options FOR INSERT
WITH CHECK (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_options_update" ON quiz_options;
CREATE POLICY "quiz_options_update" ON quiz_options FOR UPDATE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

DROP POLICY IF EXISTS "quiz_options_delete" ON quiz_options;
CREATE POLICY "quiz_options_delete" ON quiz_options FOR DELETE
USING (
  is_module_enabled('quizzes') AND tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id
    AND (
      (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
      OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      OR has_role('ADMIN')
    )
  )
);

-- 5. Quiz Attempts Table Policies
DROP POLICY IF EXISTS "quiz_attempts_select" ON quiz_attempts;
CREATE POLICY "quiz_attempts_select" ON quiz_attempts FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
  AND (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quizzes q 
      WHERE q.id = quiz_id 
      AND (
        (q.class_id IS NOT NULL AND is_class_teacher(q.class_id))
        OR (q.course_id IS NOT NULL AND is_course_creator(q.course_id))
      )
    )
    OR has_role('ADMIN')
  )
);
