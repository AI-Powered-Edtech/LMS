-- ==============================================================================
-- PHASE 1: SECURITY HARDENING
-- Addresses all CRITICAL and HIGH severity findings from the security audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVOKE 'anon' GRANTS FROM SENSITIVE FUNCTIONS
-- ------------------------------------------------------------------------------
-- Most functions in the baseline were granted to 'anon' by default.
-- We revoke EXECUTE from anon for all functions in public schema.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Re-grant EXECUTE to authenticated and service_role for all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Specifically re-grant anon access ONLY to functions that absolutely need it
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO anon;

-- Restore public registration helper functions (needed by Login.tsx)
CREATE OR REPLACE FUNCTION public.public_lookup_class(p_join_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_class  record;
  v_teacher_name text;
  v_tenant_name  text;
BEGIN
  SELECT c.id, c.name, c.teacher_id, c.tenant_id INTO v_class
  FROM public.classes c
  WHERE upper(trim(c.join_code)) = upper(trim(p_join_code))
  LIMIT 1;

  IF v_class.id IS NULL THEN
    RETURN json_build_object('found', false, 'error', 'Kode kelas tidak ditemukan');
  END IF;

  SELECT full_name INTO v_teacher_name FROM public.profiles WHERE id = v_class.teacher_id;
  SELECT name       INTO v_tenant_name  FROM public.tenants  WHERE id = v_class.tenant_id;

  RETURN json_build_object(
    'found',        true,
    'class_id',     v_class.id,
    'class_name',   v_class.name,
    'teacher_name', COALESCE(v_teacher_name, 'Guru'),
    'tenant_id',    v_class.tenant_id,
    'tenant_name',  COALESCE(v_tenant_name, 'Sekolah')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_lookup_class(text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_lookup_class(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_search_tenants(p_query text DEFAULT '')
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug
  FROM public.tenants t
  WHERE
    t.is_active = true
    AND t.id != '00000000-0000-0000-0000-000000000001'
    AND (p_query = '' OR t.name ILIKE '%' || p_query || '%')
  ORDER BY t.name
  LIMIT 20;
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_search_tenants(text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_search_tenants(text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. ADD AUTH/ROLE CHECKS TO UNPROTECTED RPCs (H1, H2, H6, H7)
-- ------------------------------------------------------------------------------

-- H1: expire_dead_attempt
CREATE OR REPLACE FUNCTION public.expire_dead_attempt(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE quiz_attempts
  SET status = 'expired',
      ended_at = NOW()
  WHERE id = p_attempt_id
    AND status = 'in_progress';
END;
$$;

-- H1: rpc_reorder_course_modules
CREATE OR REPLACE FUNCTION public.rpc_reorder_course_modules(p_course_id uuid, p_module_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_order integer;
  v_new_order integer;
  v_max_order integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: Requires TEACHER or ADMIN role';
  END IF;

  SELECT "order" INTO v_current_order FROM course_modules WHERE id = p_module_id;
  SELECT MAX("order") INTO v_max_order FROM course_modules WHERE course_id = p_course_id;

  IF p_action = 'up' AND v_current_order > 1 THEN
    v_new_order := v_current_order - 1;
    UPDATE course_modules SET "order" = v_current_order WHERE course_id = p_course_id AND "order" = v_new_order;
    UPDATE course_modules SET "order" = v_new_order WHERE id = p_module_id;
  ELSIF p_action = 'down' AND v_current_order < COALESCE(v_max_order, 0) THEN
    v_new_order := v_current_order + 1;
    UPDATE course_modules SET "order" = v_current_order WHERE course_id = p_course_id AND "order" = v_new_order;
    UPDATE course_modules SET "order" = v_new_order WHERE id = p_module_id;
  END IF;
END;
$$;

-- H1: rpc_reorder_module_lessons
CREATE OR REPLACE FUNCTION public.rpc_reorder_module_lessons(p_module_id uuid, p_lesson_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_order integer;
  v_new_order integer;
  v_max_order integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: Requires TEACHER or ADMIN role';
  END IF;

  SELECT "order" INTO v_current_order FROM lessons WHERE id = p_lesson_id;
  SELECT MAX("order") INTO v_max_order FROM lessons WHERE module_id = p_module_id;

  IF p_action = 'up' AND v_current_order > 1 THEN
    v_new_order := v_current_order - 1;
    UPDATE lessons SET "order" = v_current_order WHERE module_id = p_module_id AND "order" = v_new_order;
    UPDATE lessons SET "order" = v_new_order WHERE id = p_lesson_id;
  ELSIF p_action = 'down' AND v_current_order < COALESCE(v_max_order, 0) THEN
    v_new_order := v_current_order + 1;
    UPDATE lessons SET "order" = v_current_order WHERE module_id = p_module_id AND "order" = v_new_order;
    UPDATE lessons SET "order" = v_new_order WHERE id = p_lesson_id;
  END IF;
END;
$$;

-- H1: rpc_reorder_lesson_resources
CREATE OR REPLACE FUNCTION public.rpc_reorder_lesson_resources(p_lesson_id uuid, p_resource_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_order integer;
  v_new_order integer;
  v_max_order integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: Requires TEACHER or ADMIN role';
  END IF;

  SELECT "order" INTO v_current_order FROM lesson_resources WHERE id = p_resource_id;
  SELECT MAX("order") INTO v_max_order FROM lesson_resources WHERE lesson_id = p_lesson_id;

  IF p_action = 'up' AND v_current_order > 1 THEN
    v_new_order := v_current_order - 1;
    UPDATE lesson_resources SET "order" = v_current_order WHERE lesson_id = p_lesson_id AND "order" = v_new_order;
    UPDATE lesson_resources SET "order" = v_new_order WHERE id = p_resource_id;
  ELSIF p_action = 'down' AND v_current_order < COALESCE(v_max_order, 0) THEN
    v_new_order := v_current_order + 1;
    UPDATE lesson_resources SET "order" = v_current_order WHERE lesson_id = p_lesson_id AND "order" = v_new_order;
    UPDATE lesson_resources SET "order" = v_new_order WHERE id = p_resource_id;
  END IF;
END;
$$;

-- H2: rpc_publish_course (add role check)
CREATE OR REPLACE FUNCTION public.rpc_publish_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: Requires TEACHER or ADMIN role';
  END IF;

  v_tenant_id := get_my_tenant_id();

  UPDATE courses
  SET status = 'published'
  WHERE id = p_course_id
    AND tenant_id = v_tenant_id;
END;
$$;

-- H6: get_tutor_context (prevent IDOR)
CREATE OR REPLACE FUNCTION public.get_tutor_context(p_tenant_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := get_my_tenant_id();
  v_result jsonb;
BEGIN
  -- We ignore the parameters passed and force the caller's identity
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM student_lesson_signals WHERE user_id = v_user_id AND total_time_spent > 0) as lessons_started,
      (SELECT COUNT(*) FROM student_lesson_signals WHERE user_id = v_user_id AND is_completed = true) as lessons_completed,
      (SELECT AVG(latest_quiz_score) FROM student_lesson_signals WHERE user_id = v_user_id AND latest_quiz_score IS NOT NULL) as avg_score,
      (SELECT COUNT(*) FROM struggle_signals WHERE user_id = v_user_id AND status = 'active') as active_struggles
  ),
  recent_activity AS (
    SELECT json_agg(activity) as history
    FROM (
      SELECT
        event_type,
        metadata,
        created_at
      FROM activity_events
      WHERE user_id = v_user_id
        AND tenant_id = v_tenant_id
      ORDER BY created_at DESC
      LIMIT 10
    ) activity
  )
  SELECT
    jsonb_build_object(
      'user_stats', row_to_json(stats.*),
      'recent_activity', COALESCE(recent_activity.history, '[]'::json)
    ) INTO v_result
  FROM stats, recent_activity;

  RETURN v_result;
END;
$$;

-- H7: add_user_points (prevent arbitrary grants)
CREATE OR REPLACE FUNCTION public.add_user_points(p_user_id uuid, p_points integer, p_class_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
  v_current_level integer;
  v_new_level integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Only allow users to add points to themselves, OR allow teachers/admins to grant points
  IF auth.uid() != p_user_id AND NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: Cannot add points to another user';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found or no role assigned';
  END IF;

  UPDATE gamification_profiles
  SET xp = xp + p_points
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id
  RETURNING level INTO v_current_level;

  IF NOT FOUND THEN
    INSERT INTO gamification_profiles (user_id, tenant_id, xp, level)
    VALUES (p_user_id, v_tenant_id, p_points, 1)
    RETURNING level INTO v_current_level;
  END IF;

  SELECT compute_level((SELECT xp FROM gamification_profiles WHERE user_id = p_user_id AND tenant_id = v_tenant_id)) INTO v_new_level;

  IF v_new_level > v_current_level THEN
    UPDATE gamification_profiles
    SET level = v_new_level
    WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
  END IF;

  INSERT INTO xp_transactions (user_id, tenant_id, amount, reason, reference_id)
  VALUES (p_user_id, v_tenant_id, p_points, 'MANUAL_OR_SYSTEM_GRANT', p_class_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES (H8)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."admin_audit_logs";
CREATE POLICY "Enable insert for authenticated users" ON "public"."admin_audit_logs"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  -- Ideally restrict to admin, but since regular users trigger audit logs when roles change, we keep it authenticated.
);

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."feature_flags";
CREATE POLICY "Enable read access for tenant members" ON "public"."feature_flags"
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT get_my_tenant_id())
  OR tenant_id IS NULL -- global flags
);

-- ------------------------------------------------------------------------------
-- 4. FIX JWT ROLE CHECKS TO USE user_roles (H4, H5)
-- ------------------------------------------------------------------------------
-- H4: get_student_progress_bundle
CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_course_id uuid, p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
  v_is_teacher_or_admin boolean;
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := get_my_tenant_id();

  -- Check roles via table instead of JWT
  v_is_teacher_or_admin := has_role('TEACHER') OR has_role('ADMIN');

  IF auth.uid() != p_student_id AND NOT v_is_teacher_or_admin THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT json_build_object(
    'student_id', p_student_id,
    'course_id', p_course_id,
    'last_updated', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- H5: get_teacher_analytics (excerpt replacement for security fix)
-- To be safe, we'll patch the specific auth check in the existing function.
-- Let's redefine get_teacher_analytics

-- H5: get_teacher_analytics (Fix JWT role check)
CREATE OR REPLACE FUNCTION public.get_teacher_analytics(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_tenant_id uuid;
    v_course_tenant_id uuid;
    v_user_role text;
    v_stats record;
    v_module_completion jsonb;
    v_quiz_pass_rates jsonb;
    v_top_students jsonb;
    v_at_risk_students jsonb;
BEGIN
    -- Security: Validate role via table
    IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get tenant from function
    v_user_tenant_id := get_my_tenant_id();

    -- Get course tenant and validate
    SELECT tenant_id INTO v_course_tenant_id FROM public.courses WHERE id = p_course_id;
    
    IF v_course_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Security: Tenant isolation
    IF v_course_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- A. Fetch High-Level Stats (refresh first to ensure up-to-date data)
    PERFORM public.refresh_course_stats(p_course_id);
    SELECT * INTO v_stats FROM public.course_stats WHERE course_id = p_course_id;

    -- B. Module Completion Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'module_id', sub.module_id,
            'title', sub.title,
            'completion_rate', sub.completion_rate
        )
    ), '[]'::jsonb) INTO v_module_completion
    FROM (
        SELECT 
            m.id as module_id, 
            m.title,
            COALESCE(
                ROUND(
                    (COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::numeric / 
                    NULLIF(COUNT(DISTINCT lp.user_id), 0)) * 100, 
                2), 
            0) as completion_rate
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id
        WHERE m.course_id = p_course_id
        GROUP BY m.id, m.title, m.position
        ORDER BY m.position ASC
    ) sub;

    -- C. Quiz Pass Rate Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'quiz_id', sub.quiz_id,
            'title', sub.title,
            'pass_rate', sub.pass_rate
        )
    ), '[]'::jsonb) INTO v_quiz_pass_rates
    FROM (
        SELECT 
            q.id as quiz_id,
            q.title,
            COALESCE(
                ROUND(
                    (COUNT(qa.id) FILTER (WHERE qa.passed = true)::numeric / 
                    NULLIF(COUNT(qa.id), 0)) * 100, 
                2), 
            0) as pass_rate
        FROM public.quizzes q
        LEFT JOIN public.quiz_attempts qa ON qa.quiz_id = q.id AND qa.status IN ('graded', 'submitted')
        WHERE q.course_id = p_course_id
        GROUP BY q.id, q.title, q.created_at
        ORDER BY q.created_at ASC
    ) sub;

    -- D. Top Students (Engagement/Progress)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'student_id', sub.user_id,
            'name', sub.full_name,
            'progress', sub.percentage,
            'last_active', sub.last_activity_at
        )
    ), '[]'::jsonb) INTO v_top_students
    FROM (
        SELECT cp.user_id, up.full_name, cp.percentage, cp.last_activity_at
        FROM public.course_progress cp
        JOIN public.user_profiles up ON up.id = cp.user_id
        WHERE cp.course_id = p_course_id
        ORDER BY cp.percentage DESC, cp.last_activity_at DESC NULLS LAST
        LIMIT 5
    ) sub;

    -- E. At-Risk Students
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'student_id', sub.user_id,
            'name', sub.full_name,
            'progress', sub.percentage,
            'last_active', sub.last_activity_at
        )
    ), '[]'::jsonb) INTO v_at_risk_students
    FROM (
        SELECT cp.user_id, up.full_name, cp.percentage, cp.last_activity_at
        FROM public.course_progress cp
        JOIN public.user_profiles up ON up.id = cp.user_id
        WHERE cp.course_id = p_course_id 
          AND cp.percentage < 40.0
          AND cp.created_at < now() - interval '7 days'
        ORDER BY cp.percentage ASC
        LIMIT 5
    ) sub;

    -- Assembly
    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_enrolled', COALESCE(v_stats.total_enrolled, 0),
            'active_students', COALESCE(v_stats.active_students, 0),
            'avg_progress', COALESCE(v_stats.avg_progress, 0),
            'avg_quiz_score', COALESCE(v_stats.avg_quiz_score, 0),
            'lesson_completion_rate', COALESCE(v_stats.lesson_completion_rate, 0),
            'quiz_pass_rate', COALESCE(v_stats.quiz_pass_rate, 0),
            'at_risk_count', COALESCE(v_stats.at_risk_count, 0),
            'last_calculated_at', v_stats.last_calculated_at
        ),
        'module_completion', v_module_completion,
        'quiz_pass_rates', v_quiz_pass_rates,
        'students', jsonb_build_object(
            'top', v_top_students,
            'at_risk', v_at_risk_students
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_analytics(p_course_id uuid, p_limit integer DEFAULT 20, p_cursor_student_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_tenant_id uuid;
    v_course_tenant_id uuid;
    v_user_role text;
    v_user_id uuid;
    v_stats record;
    v_module_completion jsonb;
    v_quiz_pass_rates jsonb;
    v_students_list jsonb;
    v_next_cursor uuid;
BEGIN
    v_user_id := auth.uid();
    
    -- Rate Limiting Check
    IF NOT public.check_analytics_rate_limit(v_user_id) THEN
        RAISE EXCEPTION 'Rate limit exceeded for analytics requests. Please try again later.';
    END IF;

    -- Security: Validate role via table
    IF NOT has_role('TEACHER') AND NOT has_role('ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get tenant from function
    v_user_tenant_id := get_my_tenant_id();

    -- Get course tenant and validate
    SELECT tenant_id INTO v_course_tenant_id FROM public.courses WHERE id = p_course_id;
    
    IF v_course_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Security: Tenant isolation
    IF v_course_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Log access
    PERFORM public.log_analytics_access('VIEW_ANALYTICS', p_course_id, jsonb_build_object('limit', p_limit, 'cursor', p_cursor_student_id));

    -- A. Fetch High-Level Stats
    PERFORM public.refresh_course_stats(p_course_id);
    SELECT * INTO v_stats FROM public.course_stats WHERE course_id = p_course_id;

    -- B. Module Completion Breakdown
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_module_completion
    FROM (
        SELECT 
            m.id as module_id, 
            m.title,
            COALESCE(
                ROUND(
                    (COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::numeric / 
                    NULLIF(COUNT(DISTINCT e.user_id), 0)) * 100, 
                2), 
            0) as completion_rate
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
        JOIN public.enrollments e ON e.class_id IN (SELECT id FROM public.classes WHERE course_id = p_course_id) AND e.status = 'ACTIVE'
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
        WHERE m.course_id = p_course_id
        GROUP BY m.id, m.title, m.position
        ORDER BY m.position ASC
    ) sub;

    -- C. Quiz Pass Rate Breakdown
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_quiz_pass_rates
    FROM (
        SELECT 
            q.id as quiz_id,
            q.title,
            COALESCE(
                ROUND(
                    (COUNT(qa.id) FILTER (WHERE qa.passed = true)::numeric / 
                    NULLIF(COUNT(qa.id), 0)) * 100, 
                2), 
            0) as pass_rate
        FROM public.quizzes q
        LEFT JOIN public.quiz_attempts qa ON qa.quiz_id = q.id AND qa.status IN ('graded', 'submitted')
        WHERE q.course_id = p_course_id
        GROUP BY q.id, q.title, q.created_at
        ORDER BY q.created_at ASC
    ) sub;

    -- D. Paginated Student List
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_students_list
    FROM (
        SELECT 
            e.user_id as student_id, 
            up.full_name, 
            COALESCE(cp.percentage, 0) as progress, 
            cp.last_activity_at
        FROM public.enrollments e
        JOIN public.user_profiles up ON up.id = e.user_id
        JOIN public.classes cl ON cl.id = e.class_id
        LEFT JOIN public.course_progress cp ON cp.course_id = p_course_id AND cp.user_id = e.user_id
        WHERE cl.course_id = p_course_id 
          AND e.status = 'ACTIVE'
          AND (p_cursor_student_id IS NULL OR e.user_id > p_cursor_student_id)
        ORDER BY e.user_id ASC
        LIMIT p_limit
    ) sub;

    -- E. Determine Next Cursor
    IF jsonb_array_length(v_students_list) = p_limit THEN
        v_next_cursor := (v_students_list->(p_limit-1))->>'student_id';
    END IF;

    -- Assembly
    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_enrolled', COALESCE(v_stats.total_enrolled, 0),
            'active_students', COALESCE(v_stats.active_students, 0),
            'avg_progress', COALESCE(v_stats.avg_progress, 0),
            'avg_quiz_score', COALESCE(v_stats.avg_quiz_score, 0),
            'lesson_completion_rate', COALESCE(v_stats.lesson_completion_rate, 0),
            'quiz_pass_rate', COALESCE(v_stats.quiz_pass_rate, 0),
            'at_risk_count', COALESCE(v_stats.at_risk_count, 0),
            'last_calculated_at', v_stats.last_calculated_at
        ),
        'module_completion', v_module_completion,
        'quiz_pass_rates', v_quiz_pass_rates,
        'students_list', v_students_list,
        'next_cursor', v_next_cursor
    );
END;
$$;

-- H3: admin_list_tenants (scope to caller's tenant)
CREATE OR REPLACE FUNCTION public.admin_list_tenants(
    p_search text DEFAULT NULL,
    p_is_active boolean DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz,
    user_count bigint,
    teacher_count bigint,
    student_count bigint,
    admin_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_my_tenant_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF NOT public.has_role('ADMIN') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    v_my_tenant_id := get_my_tenant_id();

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        t.updated_at,
        (SELECT count(*) FROM public.user_roles ur WHERE ur.tenant_id = t.id) AS user_count,
        (SELECT count(*) FROM public.user_roles ur WHERE ur.tenant_id = t.id AND ur.role = 'TEACHER') AS teacher_count,
        (SELECT count(*) FROM public.user_roles ur WHERE ur.tenant_id = t.id AND ur.role = 'STUDENT') AS student_count,
        (SELECT count(*) FROM public.user_roles ur WHERE ur.tenant_id = t.id AND ur.role = 'ADMIN') AS admin_count
    FROM public.tenants t
    WHERE t.id = v_my_tenant_id
        AND (p_search IS NULL OR t.name ILIKE '%' || p_search || '%' OR t.slug ILIKE '%' || p_search || '%')
        AND (p_is_active IS NULL OR t.is_active = p_is_active)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
