


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."activity_event_type" AS ENUM (
    'LESSON_VIEWED',
    'LESSON_COMPLETED',
    'ASSIGNMENT_SUBMITTED',
    'ASSIGNMENT_GRADED',
    'QUIZ_COMPLETED',
    'CLASS_JOINED'
);


ALTER TYPE "public"."activity_event_type" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'STUDENT',
    'TEACHER',
    'ADMIN'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."attempt_status" AS ENUM (
    'in_progress',
    'submitted',
    'graded'
);


ALTER TYPE "public"."attempt_status" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."course_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."course_status" OWNER TO "postgres";


CREATE TYPE "public"."enrollment_status" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DROPPED'
);


ALTER TYPE "public"."enrollment_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'INFO',
    'WARNING',
    'SUCCESS',
    'ASSIGNMENT',
    'QUIZ',
    'GRADE',
    'ANNOUNCEMENT'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."quiz_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."quiz_status" OWNER TO "postgres";


CREATE TYPE "public"."resource_type" AS ENUM (
    'VIDEO',
    'PDF',
    'LINK',
    'IMAGE',
    'DOCUMENT'
);


ALTER TYPE "public"."resource_type" OWNER TO "postgres";


CREATE TYPE "public"."submission_status" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'LATE',
    'GRADED',
    'RETURNED'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."analytics_health_check"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_stats_count integer; v_last_refresh timestamptz; v_stale_count integer; v_error_count integer; v_is_healthy boolean := true;
BEGIN
    SELECT COUNT(*) INTO v_stats_count FROM public.course_stats;
    SELECT MAX(updated_at) INTO v_last_refresh FROM public.course_stats;
    SELECT COUNT(*) INTO v_stale_count FROM public.course_stats WHERE updated_at < now() - interval '1 hour';
    SELECT COUNT(*) INTO v_error_count FROM public.course_stats WHERE last_refresh_error IS NOT NULL;
    IF v_stats_count = 0 OR v_stale_count > (v_stats_count * 0.2) THEN v_is_healthy := false; END IF;
    RETURN jsonb_build_object(
        'status', CASE WHEN v_is_healthy THEN 'healthy' ELSE 'unhealthy' END,
        'stats_count', v_stats_count,
        'last_refresh', v_last_refresh,
        'stale_count', v_stale_count,
        'error_count', v_error_count,
        'timestamp', now()
    );
END; $$;


ALTER FUNCTION "public"."analytics_health_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_add_module_for_all_tenants"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
  SELECT t.id, NEW.id, CASE WHEN NEW.is_core THEN true ELSE NEW.api_enabled_default END
  FROM public.tenants t
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_module_for_all_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_add_modules_for_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
  SELECT NEW.id, m.id, CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END
  FROM public.modules m;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_modules_for_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_set_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_set_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_activity_event"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_event_type" "public"."activity_event_type", "p_entity_type" "text", "p_entity_id" "uuid", "p_class_id" "uuid" DEFAULT NULL::"uuid", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.activity_events (
        tenant_id, user_id, event_type, entity_type, entity_id, class_id, course_id, metadata
    ) VALUES (
        p_tenant_id, p_user_id, p_event_type, p_entity_type, p_entity_id, p_class_id, p_course_id, p_metadata
    ) RETURNING id INTO v_event_id;
    RETURN v_event_id;
END;
$$;


ALTER FUNCTION "public"."create_activity_event"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_event_type" "public"."activity_event_type", "p_entity_type" "text", "p_entity_id" "uuid", "p_class_id" "uuid", "p_course_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_class"("p_name" "text", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_max_students" integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_code text;
  v_class public.classes;
  v_tenant_id uuid;
BEGIN
  -- Get caller's tenant
  v_tenant_id := public.get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant assigned';
  END IF;

  -- Check role
  IF NOT public.has_role('TEACHER') AND NOT public.has_role('ADMIN') THEN
    RAISE EXCEPTION 'Only teachers and admins can create classes';
  END IF;

  v_code := public.generate_join_code();

  INSERT INTO public.classes (name, course_id, teacher_id, join_code, max_students, tenant_id)
  VALUES (p_name, p_course_id, auth.uid(), v_code, p_max_students, v_tenant_id)
  RETURNING * INTO v_class;

  RETURN json_build_object(
    'id', v_class.id,
    'name', v_class.name,
    'join_code', v_class.join_code,
    'course_id', v_class.course_id,
    'max_students', v_class.max_students,
    'created_at', v_class.created_at
  );
END;
$$;


ALTER FUNCTION "public"."create_class"("p_name" "text", "p_course_id" "uuid", "p_max_students" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Simply return the event without doing any queries
  -- If GoTrue was hanging because of this function, it will now unhang.
  RETURN event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enroll_student"("p_join_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_class public.classes;
  v_enrollment public.enrollments;
  v_count int;
  v_tenant_id uuid;
BEGIN
  -- Get caller's tenant
  v_tenant_id := public.get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant assigned';
  END IF;

  -- Find class WITHIN same tenant only
  SELECT * INTO v_class FROM public.classes
  WHERE join_code = p_join_code AND tenant_id = v_tenant_id;

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code' USING ERRCODE = 'P0002';
  END IF;

  -- Check duplicate
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE class_id = v_class.id AND student_id = auth.uid() AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Already enrolled in this class' USING ERRCODE = 'P0003';
  END IF;

  -- Check capacity
  IF v_class.max_students IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.enrollments
    WHERE class_id = v_class.id AND tenant_id = v_tenant_id;
    IF v_count >= v_class.max_students THEN
      RAISE EXCEPTION 'Class is full' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Enroll with tenant_id
  INSERT INTO public.enrollments (class_id, student_id, status, tenant_id)
  VALUES (v_class.id, auth.uid(), 'ACTIVE', v_tenant_id)
  RETURNING * INTO v_enrollment;

  -- Initialize points if not exists
  INSERT INTO public.user_points (user_id, points)
  VALUES (auth.uid(), 10)
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_points.points + 10;

  RETURN json_build_object(
    'enrollment_id', v_enrollment.id,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'status', v_enrollment.status
  );
END;
$$;


ALTER FUNCTION "public"."enroll_student"("p_join_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_join_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = code);
  END LOOP;
  RETURN code;
END;
$$;


ALTER FUNCTION "public"."generate_join_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  v_tenant_id := (SELECT public.get_my_tenant_id());
  v_user_id := (SELECT auth.uid());

  IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT jsonb_build_object(
    'lesson', row_to_json(l.*),
    'module', row_to_json(m.*),
    'course', jsonb_build_object('id', c.id, 'title', c.title, 'description', c.description, 'created_by', c.created_by),
    'resources', COALESCE((SELECT jsonb_agg(row_to_json(lr.*) ORDER BY lr.order_index) FROM public.lesson_resources lr WHERE lr.lesson_id = l.id AND lr.tenant_id = v_tenant_id), '[]'::jsonb),
    'progress', (SELECT row_to_json(lp.*) FROM public.lesson_progress lp WHERE lp.lesson_id = l.id AND lp.user_id = v_user_id AND lp.tenant_id = v_tenant_id LIMIT 1),
    'quiz', (SELECT row_to_json(q.*) FROM public.quizzes q WHERE q.lesson_id = l.id AND q.tenant_id = v_tenant_id LIMIT 1),
    'sibling_lessons', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', sl.id, 'title', sl.title, 'order', sl."order", 'type', sl.type) ORDER BY sl."order") FROM public.lessons sl WHERE sl.module_id = l.module_id AND sl.tenant_id = v_tenant_id), '[]'::jsonb)
  ) INTO v_result
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = p_lesson_id
  AND l.tenant_id = v_tenant_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'LESSON_NOT_FOUND';
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") IS 'Single RPC: lesson + module + course + resources + progress + quiz + siblings. Tenant-isolated.';



CREATE OR REPLACE FUNCTION "public"."get_module_id"("module_slug" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT id FROM public.modules WHERE slug = module_slug;
$$;


ALTER FUNCTION "public"."get_module_id"("module_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_classes"() RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_roles public.app_role[];
  v_result json;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public.get_my_tenant_id();
  v_roles := public.get_my_roles();

  IF 'ADMIN' = ANY(v_roles) THEN
    SELECT json_agg(row_to_json(t)) INTO v_result
    FROM (
      SELECT c.id, c.name, c.join_code, c.max_students, c.created_at,
        json_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name) as teacher,
        (SELECT count(*) FROM public.enrollments e WHERE e.class_id = c.id AND e.tenant_id = v_tenant_id) as student_count
      FROM public.classes c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.tenant_id = v_tenant_id
      ORDER BY c.created_at DESC
    ) t;
  ELSIF 'TEACHER' = ANY(v_roles) THEN
    SELECT json_agg(row_to_json(t)) INTO v_result
    FROM (
      SELECT c.id, c.name, c.join_code, c.max_students, c.created_at,
        json_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name) as teacher,
        (SELECT count(*) FROM public.enrollments e WHERE e.class_id = c.id AND e.tenant_id = v_tenant_id) as student_count
      FROM public.classes c
      JOIN public.profiles p ON p.id = c.teacher_id
      WHERE c.teacher_id = auth.uid() AND c.tenant_id = v_tenant_id
      ORDER BY c.created_at DESC
    ) t;
  ELSE
    SELECT json_agg(row_to_json(t)) INTO v_result
    FROM (
      SELECT c.id, c.name, c.join_code, c.max_students, c.created_at,
        json_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name) as teacher,
        (SELECT count(*) FROM public.enrollments e WHERE e.class_id = c.id AND e.tenant_id = v_tenant_id) as student_count
      FROM public.classes c
      JOIN public.profiles p ON p.id = c.teacher_id
      JOIN public.enrollments en ON en.class_id = c.id AND en.student_id = auth.uid() AND en.tenant_id = v_tenant_id
      WHERE c.tenant_id = v_tenant_id
      ORDER BY c.created_at DESC
    ) t;
  END IF;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;


ALTER FUNCTION "public"."get_my_classes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_roles"() RETURNS "public"."app_role"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT COALESCE(
    array_agg(role),
    '{}'::public.app_role[]
  )
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  jwt_tenant_id text;
  db_tenant_id uuid;
BEGIN
  -- 1. Check JWT claim (set by our custom_access_token_hook)
  BEGIN
    jwt_tenant_id := current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id';
    IF jwt_tenant_id IS NOT NULL AND jwt_tenant_id != '' THEN
      RETURN jwt_tenant_id::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore
  END;

  -- 2. Fallback to profiles table
  -- Because this is SECURITY DEFINER, it runs with the privileges of the creator (postgres).
  -- This bypasses RLS on profiles as long as the owner is a superuser.
  SELECT tenant_id INTO db_tenant_id FROM public.profiles WHERE id = auth.uid();
  RETURN db_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_my_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tutor_context"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_lesson_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
BEGIN

SELECT json_build_object(
  'lesson', (
    SELECT json_build_object(
      'id', l.id,
      'title', l.title,
      'content', l.content,
      'type', l.type
    )
    FROM lessons l
    WHERE l.id = p_lesson_id AND l.tenant_id = p_tenant_id
  ),
  'resources', (
    SELECT COALESCE(json_agg(r), '[]'::json)
    FROM (
      SELECT lr.id, lr.type, lr.title, lr.content
      FROM lesson_resources lr
      WHERE lr.lesson_id = p_lesson_id AND lr.tenant_id = p_tenant_id
    ) r
  ),
  'progress', (
    SELECT json_build_object(
      'last_position', lp.last_position,
      'completed', lp.completed,
      'progress_percentage', lp.progress_percentage,
      'status', lp.status
    )
    FROM lesson_progress lp
    WHERE lp.user_id = p_user_id
    AND lp.lesson_id = p_lesson_id
    AND lp.tenant_id = p_tenant_id
  )
)
INTO result;

RETURN result;

END;
$$;


ALTER FUNCTION "public"."get_tutor_context"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_lesson_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_assignment_graded"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_student_id UUID;
    v_assignment_id UUID;
    v_class_id UUID;
    v_course_id UUID;
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.score IS DISTINCT FROM NEW.score) THEN
        
        -- Get context
        SELECT s.student_id, a.id, a.class_id, c.course_id 
        INTO v_student_id, v_assignment_id, v_class_id, v_course_id
        FROM public.assignment_submissions s
        JOIN public.assignments a ON s.assignment_id = a.id
        JOIN public.classes c ON a.class_id = c.id
        WHERE s.id = NEW.submission_id;

        PERFORM public.create_activity_event(
            NEW.tenant_id,
            v_student_id,
            'ASSIGNMENT_GRADED',
            'assignment',
            v_assignment_id,
            v_class_id,
            v_course_id,
            jsonb_build_object('grade_id', NEW.id, 'score', NEW.score)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_assignment_graded"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_assignment_submission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_class_id UUID;
    v_course_id UUID;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status IN ('SUBMITTED', 'LATE')) OR
       (TG_OP = 'UPDATE' AND OLD.status = 'DRAFT' AND NEW.status IN ('SUBMITTED', 'LATE')) THEN
        
        -- Get class and course
        SELECT a.class_id, c.course_id INTO v_class_id, v_course_id
        FROM public.assignments a
        JOIN public.classes c ON a.class_id = c.id
        WHERE a.id = NEW.assignment_id;

        PERFORM public.create_activity_event(
            NEW.tenant_id,
            NEW.student_id,
            'ASSIGNMENT_SUBMITTED',
            'assignment',
            NEW.assignment_id,
            v_class_id,
            v_course_id,
            jsonb_build_object('submission_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_assignment_submission_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_course_assigned_to_class"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    -- Insert or re-activate enrollment
    INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
    SELECT NEW.tenant_id, NEW.course_id, e.student_id, 'student', 'ACTIVE'
    FROM public.enrollments e
    WHERE e.class_id = NEW.class_id
      AND e.status = 'ACTIVE'
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET status = 'ACTIVE', enrolled_at = now();
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_course_assigned_to_class"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_course_unassigned_from_class"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    -- Mark enrollments as INACTIVE for students in this class for this course
    -- UNLESS they are enrolled via another class that still has this course
    UPDATE public.course_enrollments ce
    SET status = 'INACTIVE'
    WHERE ce.course_id = OLD.course_id
      AND ce.user_id IN (
          SELECT student_id 
          FROM public.enrollments 
          WHERE class_id = OLD.class_id
      )
      AND NOT EXISTS (
          -- Check if student is in another class that also has this course assigned
          SELECT 1 
          FROM public.course_classes cc
          JOIN public.enrollments e ON e.class_id = cc.class_id
          WHERE cc.course_id = OLD.course_id
            AND e.student_id = ce.user_id
            AND cc.class_id != OLD.class_id
      );
      
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_course_unassigned_from_class"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_enrollment_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_course_id UUID;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'ACTIVE') OR
       (TG_OP = 'UPDATE' AND OLD.status != 'ACTIVE' AND NEW.status = 'ACTIVE') THEN
        
        SELECT course_id INTO v_course_id
        FROM public.classes
        WHERE id = NEW.class_id;

        PERFORM public.create_activity_event(
            NEW.tenant_id,
            NEW.student_id,
            'CLASS_JOINED',
            'class',
            NEW.class_id,
            NEW.class_id,
            v_course_id,
            jsonb_build_object('enrollment_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_enrollment_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lesson_progress_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_course_id UUID;
    v_class_id UUID := NULL; -- We might not easily know the class context if lesson progress doesn't log it directly, but let's try to get course
BEGIN
    -- Check if newly completed
    IF (TG_OP = 'INSERT' AND NEW.completed = true) OR
       (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
        
        -- Get course_id for the lesson
        SELECT c.id INTO v_course_id
        FROM public.lessons l
        JOIN public.course_modules m ON l.module_id = m.id
        JOIN public.courses c ON m.course_id = c.id
        WHERE l.id = NEW.lesson_id;

        PERFORM public.create_activity_event(
            NEW.tenant_id,
            NEW.user_id,
            'LESSON_COMPLETED',
            'lesson',
            NEW.lesson_id,
            v_class_id,
            v_course_id
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_lesson_progress_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Extract tenant_id from signup metadata, fallback to default tenant
  v_tenant_id := COALESCE(
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  -- Validate the tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant_id) THEN
    v_tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_tenant_id
  );

  -- Default role: STUDENT (with tenant_id)
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'STUDENT', v_tenant_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_quiz_attempt_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_class_id UUID;
    v_course_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT q.class_id, c.course_id INTO v_class_id, v_course_id
        FROM public.quizzes q
        JOIN public.classes c ON q.class_id = c.id
        WHERE q.id = NEW.quiz_id;

        PERFORM public.create_activity_event(
            NEW.tenant_id,
            NEW.student_id,
            'QUIZ_COMPLETED',
            'quiz',
            NEW.quiz_id,
            v_class_id,
            v_course_id,
            jsonb_build_object('attempt_id', NEW.id, 'score', NEW.score)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_quiz_attempt_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_student_joined_class"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
        SELECT NEW.tenant_id, cc.course_id, NEW.student_id, 'student', 'ACTIVE'
        FROM public.course_classes cc
        WHERE cc.class_id = NEW.class_id
        ON CONFLICT (user_id, course_id) 
        DO UPDATE SET status = 'ACTIVE', enrolled_at = now();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_student_joined_class"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = required_role
      AND tenant_id = public.get_my_tenant_id()
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("required_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_member"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT is_class_teacher(p_class_id) OR is_enrolled_in_class(p_class_id);
$$;


ALTER FUNCTION "public"."is_class_member"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id
      AND teacher_id = auth.uid()
      AND tenant_id = public.get_my_tenant_id()
  );
END;
$$;


ALTER FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_course_creator"("p_course_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id
      AND created_by = auth.uid()
      AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$;


ALTER FUNCTION "public"."is_course_creator"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_class"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE class_id = p_class_id
      AND student_id = auth.uid()
      AND tenant_id = public.get_my_tenant_id()
      AND status = 'ACTIVE'
  );
END;
$$;


ALTER FUNCTION "public"."is_enrolled_in_class"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_module_enabled"("module_slug" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_modules
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      AND module_id = public.get_module_id(module_slug)
      AND is_enabled = true
  );
$$;


ALTER FUNCTION "public"."is_module_enabled"("module_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_lesson_complete"("p_lesson_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_progress public.lesson_progress;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public.get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant assigned';
  END IF;

  -- Verify lesson belongs to user's tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE id = p_lesson_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, tenant_id)
  VALUES (auth.uid(), p_lesson_id, true, now(), v_tenant_id)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = true, completed_at = now()
  RETURNING * INTO v_progress;

  -- Award XP
  INSERT INTO public.user_points (user_id, points)
  VALUES (auth.uid(), 5)
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_points.points + 5;

  RETURN json_build_object('lesson_id', p_lesson_id, 'completed', true, 'completed_at', v_progress.completed_at);
END;
$$;


ALTER FUNCTION "public"."mark_lesson_complete"("p_lesson_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_course_chunks_with_concepts"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "query_embedding" "extensions"."vector", "p_concepts" "text"[] DEFAULT '{}'::"text"[], "match_threshold" double precision DEFAULT 0.75, "match_count" integer DEFAULT 12) RETURNS TABLE("chunk_id" "uuid", "lesson_id" "uuid", "chunk_text" "text", "token_count" integer, "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    lrc.id,
    lrc.lesson_id,
    lrc.chunk_text,
    lrc.token_count,
    lrc.metadata,
    (
      1 - (lrc.embedding <=> query_embedding)
      +
      CASE WHEN lrc.lesson_id = p_lesson_id THEN 0.05 ELSE 0 END
      +
      CASE WHEN lrc.metadata->'concepts' ?| p_concepts THEN 0.07 ELSE 0 END
    ) AS similarity
  FROM lesson_resource_chunks lrc
  WHERE lrc.tenant_id = p_tenant_id
    AND lrc.course_id = p_course_id
    AND (1 - (lrc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_course_chunks_with_concepts"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "query_embedding" "extensions"."vector", "p_concepts" "text"[], "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_announcement_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  -- GUARD: Only if status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published' OR OLD.id IS NULL) THEN
    
    -- If course-specific, notify enrolled students
    IF NEW.course_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
      SELECT 
        NEW.tenant_id,
        e.student_id,
        'Pengumuman Baru: ' || NEW.title,
        'Ada pengumuman baru di kursus Anda.',
        'ANNOUNCEMENT',
        NEW.id
      FROM enrollments e
      JOIN classes cl ON cl.id = e.class_id
      WHERE cl.course_id = NEW.course_id AND e.status = 'ACTIVE';
    ELSE
      -- If system-wide, notify all students in the tenant
      INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
      SELECT 
        NEW.tenant_id,
        ur.user_id,
        'Pengumuman Sekolah: ' || NEW.title,
        NEW.title,
        'ANNOUNCEMENT',
        NEW.id
      FROM user_roles ur
      WHERE ur.tenant_id = NEW.tenant_id AND ur.role = 'STUDENT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_announcement_published"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_course_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  -- GUARD: status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
    SELECT 
      NEW.tenant_id,
      e.student_id,
      'Kursus Diterbitkan',
      'Kursus "' || NEW.title || '" sekarang tersedia untuk diakses.',
      'ANNOUNCEMENT',
      NEW.id
    FROM enrollments e
    JOIN classes cl ON cl.id = e.class_id
    WHERE cl.course_id = NEW.id AND e.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_course_published"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_discussion_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_parent_author uuid;
  v_actor_name text;
BEGIN
  -- GUARD: Only if it's a reply
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author 
    FROM public.discussions 
    WHERE id = NEW.parent_id;
    
    -- Don't notify self
    IF v_parent_author IS NOT NULL AND v_parent_author != NEW.author_id THEN
      SELECT first_name || ' ' || last_name INTO v_actor_name FROM public.profiles WHERE id = NEW.author_id;

      INSERT INTO public.notifications (
        tenant_id, user_id, actor_id, title, message, type, entity_id, link
      ) VALUES (
        NEW.tenant_id,
        v_parent_author,
        NEW.author_id,
        'Balasan Baru',
        v_actor_name || ' membalas diskusi Anda.',
        'INFO', -- Using standard notification_type
        COALESCE(NEW.announcement_id, NEW.course_id),
        CASE 
          WHEN NEW.announcement_id IS NOT NULL THEN '/announcements'
          ELSE '/learning/' || NEW.course_id
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_discussion_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_quiz_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_course_id uuid;
  v_course_title text;
  v_teacher_id uuid;
BEGIN
  -- GUARD: status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') THEN
    -- Get course info
    SELECT id, title, teacher_id INTO v_course_id, v_course_title, v_teacher_id
    FROM courses WHERE id = NEW.course_id;

    INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
    SELECT 
      NEW.tenant_id,
      e.student_id,
      'Kuis Baru Tersedia',
      'Kuis baru telah diterbitkan di kursus "' || v_course_title || '".',
      'ANNOUNCEMENT',
      NEW.id
    FROM enrollments e
    JOIN classes cl ON cl.id = e.class_id
    WHERE cl.course_id = v_course_id AND e.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_quiz_published"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_progress_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    -- O(1) lightweight trigger for progress updates
    IF NEW.event_type = 'LESSON_COMPLETED' THEN
        INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, tenant_id)
        VALUES (NEW.user_id, NEW.entity_id, true, NEW.created_at, NEW.tenant_id)
        ON CONFLICT (user_id, lesson_id) DO UPDATE 
        SET completed = true, completed_at = EXCLUDED.completed_at;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_progress_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_course_progress_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    PERFORM public.recompute_course_progress(NEW.user_id, NEW.course_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recompute_course_progress_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN INSERT INTO public.analytics_metrics (metric_name, metric_value, labels) VALUES (p_metric_name, p_value, p_labels); END; $$;


ALTER FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_course_analytics_mv"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.course_analytics_mv; END; $$;


ALTER FUNCTION "public"."refresh_course_analytics_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_tenant_id uuid;
    v_user_role text;
    v_locked_at timestamptz;
BEGIN
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
    IF v_user_tenant_id IS NOT NULL AND v_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;
    SELECT refresh_locked_at INTO v_locked_at FROM public.course_stats WHERE course_id = p_course_id;
    IF v_locked_at IS NOT NULL AND v_locked_at > now() - interval '1 minute' THEN RETURN; END IF;
    UPDATE public.course_stats SET refresh_locked_at = now() WHERE course_id = p_course_id;
    -- Logic for calculation (simplified for migration, real logic in file)
    -- ...
    UPDATE public.course_stats SET refresh_locked_at = NULL, refresh_attempts = 0, last_refresh_error = NULL WHERE course_id = p_course_id;
EXCEPTION WHEN OTHERS THEN
    UPDATE public.course_stats SET refresh_attempts = refresh_attempts + 1, last_refresh_error = SQLERRM, refresh_locked_at = NULL WHERE course_id = p_course_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_publish_course"("p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    -- Get tenant_id from jwt
    v_tenant_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or missing tenant_id';
    END IF;

    -- Update only if it belongs to the tenant
    UPDATE courses
    SET status = 'published',
        published_at = now(),
        updated_at = now()
    WHERE id = p_course_id
      AND tenant_id = v_tenant_id;
      -- Assuming teachers within the same tenant can publish. If only creator can publish, add AND created_by = v_user_id;
END;
$$;


ALTER FUNCTION "public"."rpc_publish_course"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reorder_course_modules"("p_course_id" "uuid", "p_module_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  UPDATE course_modules m
  SET "order" = new_order.ordinality - 1, -- typically 0-indexed in JS frontend, ordinality is 1-indexed
      updated_at = now()
  FROM unnest(p_module_ids) WITH ORDINALITY AS new_order(id, ordinality)
  WHERE m.id = new_order.id
  AND m.course_id = p_course_id;
$$;


ALTER FUNCTION "public"."rpc_reorder_course_modules"("p_course_id" "uuid", "p_module_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reorder_lesson_resources"("p_lesson_id" "uuid", "p_resource_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  -- lesson_resources does not have updated_at column, so we omit it
  UPDATE lesson_resources r
  SET order_index = new_order.ordinality - 1
  FROM unnest(p_resource_ids) WITH ORDINALITY AS new_order(id, ordinality)
  WHERE r.id = new_order.id
  AND r.lesson_id = p_lesson_id;
$$;


ALTER FUNCTION "public"."rpc_reorder_lesson_resources"("p_lesson_id" "uuid", "p_resource_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reorder_module_lessons"("p_module_id" "uuid", "p_lesson_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  UPDATE lessons l
  SET "order" = new_order.ordinality - 1,
      updated_at = now()
  FROM unnest(p_lesson_ids) WITH ORDINALITY AS new_order(id, ordinality)
  WHERE l.id = new_order.id
  AND l.module_id = p_module_id;
$$;


ALTER FUNCTION "public"."rpc_reorder_module_lessons"("p_module_id" "uuid", "p_lesson_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_class_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_quiz_id         uuid;
  v_question        jsonb;
  v_option          jsonb;
  v_question_id     uuid;
  v_existing_q_ids  uuid[];
  v_new_q_ids       uuid[];
  v_q_ids_to_delete uuid[];
  v_question_count  integer;
BEGIN
  -- ─────────────────────────────────────────────
  -- 1. Tenant Isolation Check
  -- ─────────────────────────────────────────────
  IF p_tenant_id != (auth.jwt() ->> 'tenant_id')::uuid THEN
    RAISE EXCEPTION 'Tenant mismatch. Access denied.';
  END IF;

  -- ─────────────────────────────────────────────
  -- 2. Publish Guard Validation
  --    Only enforce when publishing (status = 'published')
  -- ─────────────────────────────────────────────
  IF (p_quiz_data ->> 'status') = 'published' THEN
    v_question_count := jsonb_array_length(p_quiz_data -> 'questions');

    IF v_question_count < 1 THEN
      RAISE EXCEPTION 'Publish failed: Quiz must have at least 1 question.';
    END IF;

    FOR v_question IN SELECT * FROM jsonb_array_elements(p_quiz_data -> 'questions') LOOP
      IF jsonb_array_length(v_question -> 'options') < 2 THEN
        RAISE EXCEPTION 'Publish failed: Each question must have at least 2 options.';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_question -> 'options') AS opt
        WHERE (opt ->> 'is_correct')::boolean = true
      ) THEN
        RAISE EXCEPTION 'Publish failed: Each question must have at least 1 correct answer.';
      END IF;
    END LOOP;
  END IF;

  -- ─────────────────────────────────────────────
  -- 3. Upsert Quiz
  -- ─────────────────────────────────────────────
  INSERT INTO quizzes (
    id, lesson_id, class_id, tenant_id,
    title, instructions, max_attempts, passing_score,
    shuffle_questions, shuffle_options, time_limit_minutes, status
  )
  VALUES (
    COALESCE((p_quiz_data ->> 'id')::uuid, gen_random_uuid()),
    p_lesson_id,
    p_class_id,
    p_tenant_id,
    p_quiz_data ->> 'title',
    p_quiz_data ->> 'instructions',
    COALESCE((p_quiz_data ->> 'max_attempts')::integer, 1),
    COALESCE((p_quiz_data ->> 'passing_score')::integer, 70),
    COALESCE((p_quiz_data ->> 'shuffle_questions')::boolean, false),
    COALESCE((p_quiz_data ->> 'shuffle_options')::boolean, false),
    COALESCE((p_quiz_data ->> 'time_limit_minutes')::integer, 0),
    COALESCE((p_quiz_data ->> 'status')::quiz_status, 'draft')
  )
  ON CONFLICT (id) DO UPDATE SET
    title              = EXCLUDED.title,
    instructions       = EXCLUDED.instructions,
    max_attempts       = EXCLUDED.max_attempts,
    passing_score      = EXCLUDED.passing_score,
    shuffle_questions  = EXCLUDED.shuffle_questions,
    shuffle_options    = EXCLUDED.shuffle_options,
    time_limit_minutes = EXCLUDED.time_limit_minutes,
    status             = EXCLUDED.status,
    updated_at         = now()
  RETURNING id INTO v_quiz_id;

  -- If no id provided, the INSERT created a new quiz but we still need the id
  -- In case of INSERT (no conflict), use the lesson_id to fetch the quiz
  IF v_quiz_id IS NULL THEN
    SELECT id INTO v_quiz_id FROM quizzes
    WHERE lesson_id = p_lesson_id AND tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- ─────────────────────────────────────────────
  -- 4. Sync Questions (delete removed, upsert existing/new)
  -- ─────────────────────────────────────────────

  -- Collect existing question IDs
  SELECT ARRAY(
    SELECT id FROM quiz_questions WHERE quiz_id = v_quiz_id
  ) INTO v_existing_q_ids;

  -- Collect new question IDs (only those with an existing id)
  SELECT ARRAY(
    SELECT (q ->> 'id')::uuid
    FROM jsonb_array_elements(p_quiz_data -> 'questions') AS q
    WHERE q ->> 'id' IS NOT NULL
  ) INTO v_new_q_ids;

  -- Delete questions removed by teacher
  v_q_ids_to_delete := ARRAY(
    SELECT unnest(v_existing_q_ids)
    EXCEPT SELECT unnest(v_new_q_ids)
  );

  IF array_length(v_q_ids_to_delete, 1) > 0 THEN
    DELETE FROM quiz_questions WHERE id = ANY(v_q_ids_to_delete);
  END IF;

  -- Upsert each question and its options
  FOR v_question IN
    SELECT q, row_number() OVER () AS idx
    FROM jsonb_array_elements(p_quiz_data -> 'questions') AS q
  LOOP
    INSERT INTO quiz_questions (id, quiz_id, tenant_id, text, "order")
    VALUES (
      COALESCE((v_question ->> 'id')::uuid, gen_random_uuid()),
      v_quiz_id,
      p_tenant_id,
      v_question ->> 'text',
      (v_question ->> 'order')::integer
    )
    ON CONFLICT (id) DO UPDATE SET
      text    = EXCLUDED.text,
      "order" = EXCLUDED."order"
    RETURNING id INTO v_question_id;

    -- Delete old options for this question (replace strategy)
    DELETE FROM quiz_options WHERE question_id = v_question_id;

    -- Insert new options
    FOR v_option IN SELECT * FROM jsonb_array_elements(v_question -> 'options') LOOP
      INSERT INTO quiz_options (question_id, tenant_id, text, is_correct)
      VALUES (
        v_question_id,
        p_tenant_id,
        v_option ->> 'text',
        COALESCE((v_option ->> 'is_correct')::boolean, false)
      );
    END LOOP;
  END LOOP;

  -- ─────────────────────────────────────────────
  -- 5. Return result
  -- ─────────────────────────────────────────────
  RETURN jsonb_build_object(
    'quiz_id', v_quiz_id,
    'status', (p_quiz_data ->> 'status'),
    'success', true
  );
END;
$$;


ALTER FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_class_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer DEFAULT 5) RETURNS TABLE("resource_id" "uuid", "lesson_id" "uuid", "content" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id,
    lr.lesson_id,
    lr.content
  FROM lesson_resources lr
  JOIN lessons l ON l.id = lr.lesson_id
  JOIN course_modules cm ON cm.id = l.module_id
  WHERE lr.tenant_id = p_tenant_id
  AND cm.course_id = p_course_id
  AND lr.search_vector @@ plainto_tsquery('english', p_query)
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_quiz_attempt"("p_quiz_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_course_id uuid;
  v_class_id uuid;
  v_attempt_id uuid;
  v_existing_status attempt_status;
  v_attempt_count integer;
  v_max_attempts integer;
  v_is_enrolled boolean;
  v_user_tenant_id uuid;
BEGIN
  -- A. Get User Tenant ID from JWT for strict isolation
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  IF v_user_tenant_id IS NULL THEN
     RAISE EXCEPTION 'Unauthorized: Missing tenant context';
  END IF;

  -- B. Get Quiz Details & Verify Tenant
  SELECT tenant_id, class_id, course_id, max_attempts 
  INTO v_tenant_id, v_class_id, v_course_id, v_max_attempts
  FROM public.quizzes 
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Enrollment Check
  -- Verify student is actively enrolled in the class associated with this quiz/course
  SELECT EXISTS (
      SELECT 1 
      FROM public.enrollments 
      WHERE student_id = auth.uid() 
      AND (class_id = v_class_id OR class_id IN (SELECT id FROM public.classes WHERE course_id = v_course_id))
      AND status = 'ACTIVE'
      AND tenant_id = v_tenant_id
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
      RAISE EXCEPTION 'Unauthorized: Not actively enrolled in this class/course';
  END IF;

  -- D. Check for existing 'in_progress' attempt
  SELECT id, status INTO v_attempt_id, v_existing_status
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid() AND status = 'in_progress'
  LIMIT 1;

  IF v_attempt_id IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', v_existing_status);
  END IF;

  -- E. Attempt Limit Detection
  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid() AND status IN ('submitted', 'graded');

  IF v_attempt_count >= COALESCE(v_max_attempts, 1) THEN
      RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_max_attempts;
  END IF;

  -- F. Create new attempt
  INSERT INTO public.quiz_attempts (quiz_id, student_id, tenant_id, status, started_at)
  VALUES (p_quiz_id, auth.uid(), v_tenant_id, 'in_progress', now())
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', 'in_progress');
END;
$$;


ALTER FUNCTION "public"."start_quiz_attempt"("p_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_quiz_attempt"("p_quiz_id" "uuid", "p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_user_tenant_id uuid;
  v_attempt_record record;
  v_total_questions int := 0;
  v_correct_answers int := 0;
  v_score float8 := 0;
  v_passed boolean := false;
  v_passing_score int;
  v_time_limit_minutes int;
  answer_record record;
  v_is_correct boolean;
  v_option_id uuid;
  v_question_id uuid;
BEGIN
  -- A. Get User Tenant ID from JWT
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  
  -- B. Get Quiz Details & Validate Target
  SELECT tenant_id, passing_score, time_limit_minutes 
  INTO v_tenant_id, v_passing_score, v_time_limit_minutes
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
     RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Fetch In-Progress Attempt & ATTEMPT LOCK validation
  SELECT id, status, started_at 
  INTO v_attempt_record
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid()
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_attempt_record.id IS NULL THEN
      RAISE EXCEPTION 'No active quiz attempt found. Start quiz first.';
  END IF;

  -- REPLAY ATTACK & DOUBLE SUBMIT PREVENTION (Attempt Lock)
  IF v_attempt_record.status IN ('submitted', 'graded') THEN
      RAISE EXCEPTION 'Attempt already submitted. Cannot submit again.';
  END IF;

  IF v_attempt_record.status = 'expired' THEN
      RAISE EXCEPTION 'Attempt has already expired.';
  END IF;

  -- D. TIME LIMIT ENFORCEMENT
  IF v_time_limit_minutes IS NOT NULL AND v_time_limit_minutes > 0 THEN
      -- Add a 30-second grace period for network latency
      IF now() > v_attempt_record.started_at + (v_time_limit_minutes || ' minutes')::interval + interval '30 seconds' THEN
          
          UPDATE public.quiz_attempts
          SET status = 'expired', finished_at = now()
          WHERE id = v_attempt_record.id;

          RAISE EXCEPTION 'Time limit exceeded. Attempt expired.';
      END IF;
  END IF;

  -- E. Grading Logic (Transaction safe)
  FOR answer_record IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id uuid, option_id uuid)
  LOOP
      v_question_id := answer_record.question_id;
      v_option_id := answer_record.option_id;

      -- Check option correctness ensuring it belongs to the same tenant and question to prevent spoofing
      SELECT is_correct INTO v_is_correct
      FROM public.quiz_options
      WHERE id = v_option_id 
        AND question_id = v_question_id 
        AND tenant_id = v_tenant_id;

      IF v_is_correct IS NULL THEN
          v_is_correct := false;
      END IF;

      IF v_is_correct THEN
          v_correct_answers := v_correct_answers + 1;
      END IF;

      -- Insert Answers idempotently (handling potential duplicates gracefully if needed, though locked by status above)
      INSERT INTO public.quiz_answers (tenant_id, attempt_id, question_id, option_id, is_correct)
      VALUES (v_tenant_id, v_attempt_record.id, v_question_id, v_option_id, v_is_correct)
      ON CONFLICT (attempt_id, question_id) 
      DO UPDATE SET option_id = EXCLUDED.option_id, is_correct = EXCLUDED.is_correct;

      v_total_questions := v_total_questions + 1;
  END LOOP;

  -- F. Calculate final outcome
  IF v_total_questions > 0 THEN
      v_score := (v_correct_answers::float / v_total_questions::float) * 100;
      v_score := round(v_score::numeric, 2); -- Keep 2 decimal places max
  END IF;

  IF v_passing_score IS NOT NULL THEN
      v_passed := v_score >= v_passing_score;
  ELSE
      v_passed := v_score >= 70;
  END IF;

  -- G. Finalize Attempt
  UPDATE public.quiz_attempts
  SET
      score = v_score,
      status = 'graded', -- Move straight to graded
      submitted_at = now(),
      finished_at = now(),
      time_spent = EXTRACT(EPOCH FROM (now() - started_at))::integer,
      passed = v_passed,
      answers = p_answers
  WHERE id = v_attempt_record.id;

  RETURN jsonb_build_object(
      'attempt_id', v_attempt_record.id,
      'score', v_score,
      'passed', v_passed,
      'correct_answers', v_correct_answers,
      'total_questions', v_total_questions
  );
END;
$$;


ALTER FUNCTION "public"."submit_quiz_attempt"("p_quiz_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_analytics_security"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_results jsonb := '[]'::jsonb;
BEGIN
    -- TABLE CHECKS
    v_results := v_results || jsonb_build_object('test', 'course_stats_exists', 'status', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_stats') THEN 'PASSED' ELSE 'FAILED' END);
    v_results := v_results || jsonb_build_object('test', 'analytics_audit_exists', 'status', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_audit') THEN 'PASSED' ELSE 'FAILED' END);
    v_results := v_results || jsonb_build_object('test', 'course_insights_exists', 'status', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_insights') THEN 'PASSED' ELSE 'FAILED' END);
    v_results := v_results || jsonb_build_object('test', 'analytics_rate_limits_exists', 'status', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_rate_limits') THEN 'PASSED' ELSE 'FAILED' END);
    v_results := v_results || jsonb_build_object('test', 'analytics_circuit_breaker_exists', 'status', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_circuit_breaker') THEN 'PASSED' ELSE 'FAILED' END);

    -- RLS CHECKS
    v_results := v_results || jsonb_build_object('test', 'course_stats_rls', 'status', CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_stats') THEN 'PASSED' ELSE 'FAILED' END);
    v_results := v_results || jsonb_build_object('test', 'analytics_audit_rls', 'status', CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_audit') THEN 'PASSED' ELSE 'FAILED' END);

    RETURN jsonb_build_object('success', (SELECT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_results) x WHERE x->>'status' = 'FAILED')), 'tests', v_results, 'timestamp', now());
END; $$;


ALTER FUNCTION "public"."test_analytics_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_lesson_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (NEW.tenant_id, NEW.user_id, 'LESSON_COMPLETED', jsonb_build_object('lesson_id', NEW.lesson_id));
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_lesson_completed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_quiz_passed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (NEW.tenant_id, NEW.user_id, 'QUIZ_PASSED', jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score));
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_quiz_passed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_course_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_update_course_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_session_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.ai_tutor_sessions
    SET 
        message_count = ai_tutor_sessions.message_count + 1,
        last_message_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_session_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lesson_progress_monotonic"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_progress_percentage" integer, "p_last_position" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    INSERT INTO lesson_progress (user_id, lesson_id, tenant_id, status, progress_percentage, last_position, completed, completed_at)
    VALUES (
        p_user_id,
        p_lesson_id,
        p_tenant_id,
        p_status,
        p_progress_percentage,
        p_last_position,
        CASE WHEN p_status = 'completed' THEN true ELSE false END,
        CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        status = CASE
            WHEN EXCLUDED.status = 'completed' THEN 'completed'
            WHEN lesson_progress.status = 'completed' THEN 'completed'
            ELSE EXCLUDED.status
        END,
        progress_percentage = GREATEST(lesson_progress.progress_percentage, EXCLUDED.progress_percentage),
        last_position = COALESCE(EXCLUDED.last_position, lesson_progress.last_position),
        completed = CASE
            WHEN EXCLUDED.status = 'completed' OR lesson_progress.status = 'completed' THEN true
            ELSE false
        END,
        completed_at = CASE
            WHEN lesson_progress.completed_at IS NOT NULL THEN lesson_progress.completed_at
            WHEN EXCLUDED.status = 'completed' THEN now()
            ELSE NULL
        END;
END;
$$;


ALTER FUNCTION "public"."update_lesson_progress_monotonic"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_progress_percentage" integer, "p_last_position" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lesson_resource_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    UPDATE public.lesson_resources 
    SET search_vector = 
        setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('indonesian', coalesce(content, '')), 'B')
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lesson_resource_search_vector"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "public"."activity_event_type" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "class_id" "uuid",
    "course_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_gamification_at" timestamp with time zone,
    "processed_notifications_at" timestamp with time zone,
    "processed_analytics_at" timestamp with time zone
);


ALTER TABLE "public"."activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_id" "text",
    "entity_type" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_embedding" "extensions"."vector"(768) NOT NULL,
    "answer" "text" NOT NULL,
    "hit_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_hit_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_tutor_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_feedback_rating_check" CHECK (("rating" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."ai_tutor_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "question" "text",
    "response" "text",
    "difficulty_level" "text",
    "model" "text",
    "token_count_prompt" integer,
    "token_count_response" integer,
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_tutor_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "token_count" integer DEFAULT 0,
    "response_time_ms" integer DEFAULT 0,
    "model" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."ai_tutor_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_count" integer DEFAULT 0,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "daily_count" integer DEFAULT 0,
    "daily_window_start" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_tutor_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "title" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "ai_tutor_sessions_message_count_check" CHECK (("message_count" <= 1000)),
    CONSTRAINT "ai_tutor_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."ai_tutor_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "course_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_circuit_breaker" (
    "id" "text" DEFAULT 'refresh_course_stats'::"text" NOT NULL,
    "state" "text" DEFAULT 'closed'::"text" NOT NULL,
    "failure_count" integer DEFAULT 0,
    "last_failure_at" timestamp with time zone,
    "reset_at" timestamp with time zone,
    "threshold" integer DEFAULT 5,
    "timeout" interval DEFAULT '00:05:00'::interval,
    CONSTRAINT "analytics_circuit_breaker_state_check" CHECK (("state" = ANY (ARRAY['closed'::"text", 'open'::"text", 'half_open'::"text"])))
);


ALTER TABLE "public"."analytics_circuit_breaker" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" double precision NOT NULL,
    "labels" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."analytics_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_rate_limits" (
    "user_id" "uuid" NOT NULL,
    "request_count" integer DEFAULT 0,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "reset_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."analytics_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "announcement_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "response" "text" NOT NULL,
    "responded_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "announcement_rsvps_response_check" CHECK (("response" = ANY (ARRAY['yes'::"text", 'no'::"text", 'maybe'::"text"])))
);


ALTER TABLE "public"."announcement_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "target_audience" "text" DEFAULT 'all_students'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "allow_comments" boolean DEFAULT true,
    "requires_rsvp" boolean DEFAULT false,
    "location" "text",
    "contact_person" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "announcements_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text"]))),
    CONSTRAINT "announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "announcements_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['course_students'::"text", 'course_staff'::"text", 'all_students'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "content" "text",
    "status" "public"."submission_status" DEFAULT 'DRAFT'::"public"."submission_status" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."assignment_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "status" "public"."attendance_status" DEFAULT 'PRESENT'::"public"."attendance_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."class_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "day" "text" NOT NULL,
    "start_time" "text" NOT NULL,
    "end_time" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."class_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "course_id" "uuid",
    "teacher_id" "uuid" NOT NULL,
    "join_code" "text" NOT NULL,
    "max_students" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "progress" double precision DEFAULT 0 NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "completed_lessons" integer DEFAULT 0,
    "total_lessons" integer DEFAULT 0
);


ALTER TABLE "public"."course_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "level" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "public"."course_status" DEFAULT 'draft'::"public"."course_status" NOT NULL,
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "status" "public"."enrollment_status" DEFAULT 'ACTIVE'::"public"."enrollment_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."course_analytics_mv" AS
 SELECT "c"."id" AS "course_id",
    "c"."title" AS "course_title",
    "c"."tenant_id",
    "count"(DISTINCT "e"."student_id") AS "enrolled_count",
    COALESCE("avg"("cp"."progress"), (0)::double precision) AS "avg_progress",
    COALESCE("sum"("cp"."completed_lessons"), (0)::bigint) AS "total_completed_lessons",
    "now"() AS "last_refreshed_at"
   FROM ((("public"."courses" "c"
     LEFT JOIN "public"."classes" "cl" ON (("cl"."course_id" = "c"."id")))
     LEFT JOIN "public"."enrollments" "e" ON ((("e"."class_id" = "cl"."id") AND ("e"."status" = 'ACTIVE'::"public"."enrollment_status"))))
     LEFT JOIN "public"."course_progress" "cp" ON ((("cp"."course_id" = "c"."id") AND ("cp"."user_id" = "e"."student_id"))))
  GROUP BY "c"."id", "c"."title", "c"."tenant_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."course_analytics_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."enrollment_status" DEFAULT 'ACTIVE'::"public"."enrollment_status" NOT NULL,
    CONSTRAINT "course_enrollments_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'teacher'::"text", 'observer'::"text"])))
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "insight_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_insights_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."course_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."course_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_stats" (
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "completed_lessons" integer DEFAULT 0 NOT NULL,
    "completed_assignments" integer DEFAULT 0 NOT NULL,
    "quiz_attempts" integer DEFAULT 0 NOT NULL,
    "avg_score" double precision DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "refresh_attempts" integer DEFAULT 0,
    "last_refresh_error" "text",
    "refresh_locked_at" timestamp with time zone
);


ALTER TABLE "public"."course_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "lesson_id" "uuid",
    "announcement_id" "uuid",
    "author_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "is_edited" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "score" double precision NOT NULL,
    "feedback" "text",
    "graded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "amount" double precision NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaderboards" (
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "rank" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leaderboards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "tenant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'started'::"text",
    "progress_percentage" integer DEFAULT 0,
    "last_position" integer
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "type" "public"."resource_type" DEFAULT 'LINK'::"public"."resource_type" NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "content" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "search_vector" "tsvector",
    "order_index" integer DEFAULT 0
);


ALTER TABLE "public"."lesson_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'article'::"text",
    "passing_score" integer,
    "is_published" boolean DEFAULT false,
    "duration_minutes" integer
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_dependencies" (
    "module_id" "uuid" NOT NULL,
    "depends_on_module_id" "uuid" NOT NULL
);


ALTER TABLE "public"."module_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_core" boolean DEFAULT false NOT NULL,
    "api_enabled_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "public"."notification_type" DEFAULT 'INFO'::"public"."notification_type" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "entity_id" "uuid",
    "link" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" double precision NOT NULL,
    "method" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "full_name" "text" GENERATED ALWAYS AS (
CASE
    WHEN (("last_name" IS NOT NULL) AND ("last_name" <> ''::"text")) THEN (("first_name" || ' '::"text") || "last_name")
    ELSE "first_name"
END) STORED
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_id" "uuid" NOT NULL,
    "is_correct" boolean,
    "points_awarded" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "score" double precision,
    "answers" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1,
    "duration_seconds" integer,
    "passed" boolean DEFAULT false,
    "finished_at" timestamp with time zone,
    "status" "public"."attempt_status" DEFAULT 'in_progress'::"public"."attempt_status",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "submitted_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quiz_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "time_limit_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "instructions" "text",
    "max_attempts" integer DEFAULT 3,
    "passing_score" integer DEFAULT 70,
    "shuffle_questions" boolean DEFAULT false,
    "shuffle_options" boolean DEFAULT false,
    "status" "public"."quiz_status" DEFAULT 'draft'::"public"."quiz_status" NOT NULL,
    "is_published" boolean DEFAULT false
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "lesson_id" "uuid",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_concept_mastery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "concept" "text" NOT NULL,
    "mastery" double precision DEFAULT 0.5,
    "confidence" double precision DEFAULT 0.5,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "student_concept_mastery_mastery_check" CHECK ((("mastery" >= (0.0)::double precision) AND ("mastery" <= (1.0)::double precision)))
);


ALTER TABLE "public"."student_concept_mastery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."user_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_cache"
    ADD CONSTRAINT "ai_tutor_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_feedback"
    ADD CONSTRAINT "ai_tutor_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_interactions"
    ADD CONSTRAINT "ai_tutor_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_messages"
    ADD CONSTRAINT "ai_tutor_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_rate_limits"
    ADD CONSTRAINT "ai_tutor_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_sessions"
    ADD CONSTRAINT "ai_tutor_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_audit"
    ADD CONSTRAINT "analytics_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_circuit_breaker"
    ADD CONSTRAINT "analytics_circuit_breaker_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_metrics"
    ADD CONSTRAINT "analytics_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_rate_limits"
    ADD CONSTRAINT "analytics_rate_limits_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."announcement_rsvps"
    ADD CONSTRAINT "announcement_rsvps_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id");



ALTER TABLE ONLY "public"."announcement_rsvps"
    ADD CONSTRAINT "announcement_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_student_id_assignment_id_key" UNIQUE ("student_id", "assignment_id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_announcements"
    ADD CONSTRAINT "class_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_schedules"
    ADD CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_classes"
    ADD CONSTRAINT "course_classes_course_id_class_id_key" UNIQUE ("course_id", "class_id");



ALTER TABLE ONLY "public"."course_classes"
    ADD CONSTRAINT "course_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_insights"
    ADD CONSTRAINT "course_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_stats"
    ADD CONSTRAINT "course_stats_pkey" PRIMARY KEY ("tenant_id", "course_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_class_id_key" UNIQUE ("student_id", "class_id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_submission_id_key" UNIQUE ("submission_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_lesson_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lesson_resources"
    ADD CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_dependencies"
    ADD CONSTRAINT "module_dependencies_pkey" PRIMARY KEY ("module_id", "depends_on_module_id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_student_id_key" UNIQUE ("quiz_id", "student_id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_tenant_id_module_id_key" UNIQUE ("tenant_id", "module_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "unique_user_course_progress" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "unique_user_lesson" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."ai_tutor_rate_limits"
    ADD CONSTRAINT "uq_rate_limit_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_activity_events_class_id" ON "public"."activity_events" USING "btree" ("class_id");



CREATE INDEX "idx_activity_events_course_id" ON "public"."activity_events" USING "btree" ("course_id");



CREATE INDEX "idx_activity_events_created" ON "public"."activity_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_events_tenant" ON "public"."activity_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_events_tenant_id" ON "public"."activity_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_events_type" ON "public"."activity_events" USING "btree" ("event_type");



CREATE INDEX "idx_activity_events_user" ON "public"."activity_events" USING "btree" ("user_id");



CREATE INDEX "idx_activity_events_user_id" ON "public"."activity_events" USING "btree" ("user_id");



CREATE INDEX "idx_activity_logs_action" ON "public"."activity_logs" USING "btree" ("action");



CREATE INDEX "idx_activity_logs_tenant_id" ON "public"."activity_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_logs_tenant_user" ON "public"."activity_logs" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_activity_logs_user" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_ai_feedback_message" ON "public"."ai_tutor_feedback" USING "btree" ("message_id");



CREATE INDEX "idx_ai_messages_session_created" ON "public"."ai_tutor_messages" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "idx_ai_messages_tenant" ON "public"."ai_tutor_messages" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_sessions_active_lookup" ON "public"."ai_tutor_sessions" USING "btree" ("user_id", "lesson_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_ai_sessions_tenant_user" ON "public"."ai_tutor_sessions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_ai_sessions_user_lesson" ON "public"."ai_tutor_sessions" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "idx_ai_tutor_cache_course_id" ON "public"."ai_tutor_cache" USING "btree" ("course_id");



CREATE INDEX "idx_ai_tutor_cache_embedding" ON "public"."ai_tutor_cache" USING "hnsw" ("question_embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_ai_tutor_cache_tenant_id" ON "public"."ai_tutor_cache" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_tutor_interactions_lesson_id" ON "public"."ai_tutor_interactions" USING "btree" ("lesson_id");



CREATE INDEX "idx_ai_tutor_interactions_tenant" ON "public"."ai_tutor_interactions" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_tutor_interactions_tenant_id" ON "public"."ai_tutor_interactions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_ai_tutor_interactions_user" ON "public"."ai_tutor_interactions" USING "btree" ("user_id");



CREATE INDEX "idx_ai_tutor_rate_limits_user" ON "public"."ai_tutor_rate_limits" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_audit_course_user" ON "public"."analytics_audit" USING "btree" ("course_id", "user_id");



CREATE INDEX "idx_analytics_audit_tenant_id" ON "public"."analytics_audit" USING "btree" ("tenant_id");



CREATE INDEX "idx_analytics_metrics_tenant_id" ON "public"."analytics_metrics" USING "btree" ("tenant_id");



CREATE INDEX "idx_announcement_rsvps_tenant_id" ON "public"."announcement_rsvps" USING "btree" ("tenant_id");



CREATE INDEX "idx_announcements_author" ON "public"."announcements" USING "btree" ("created_by");



CREATE INDEX "idx_announcements_course" ON "public"."announcements" USING "btree" ("course_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_announcements_pinned_created" ON "public"."announcements" USING "btree" ("is_pinned" DESC, "created_at" DESC);



CREATE INDEX "idx_announcements_status" ON "public"."announcements" USING "btree" ("status");



CREATE INDEX "idx_announcements_tenant" ON "public"."announcements" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_submissions_tenant_id" ON "public"."assignment_submissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_submissions_tenant_student_assign" ON "public"."assignment_submissions" USING "btree" ("tenant_id", "student_id", "assignment_id");



CREATE INDEX "idx_assignments_class" ON "public"."assignments" USING "btree" ("class_id");



CREATE INDEX "idx_assignments_tenant_id" ON "public"."assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_attendance_enrollment" ON "public"."attendance_records" USING "btree" ("enrollment_id");



CREATE INDEX "idx_attendance_records_tenant_enrollment" ON "public"."attendance_records" USING "btree" ("tenant_id", "enrollment_id");



CREATE INDEX "idx_attendance_records_tenant_id" ON "public"."attendance_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_class_announcements_class" ON "public"."class_announcements" USING "btree" ("class_id");



CREATE INDEX "idx_class_announcements_tenant_id" ON "public"."class_announcements" USING "btree" ("tenant_id");



CREATE INDEX "idx_class_schedules_class" ON "public"."class_schedules" USING "btree" ("class_id");



CREATE INDEX "idx_class_schedules_tenant_id" ON "public"."class_schedules" USING "btree" ("tenant_id");



CREATE INDEX "idx_classes_course" ON "public"."classes" USING "btree" ("course_id");



CREATE INDEX "idx_classes_teacher" ON "public"."classes" USING "btree" ("teacher_id");



CREATE INDEX "idx_classes_tenant_id" ON "public"."classes" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "idx_course_analytics_mv_course_id" ON "public"."course_analytics_mv" USING "btree" ("course_id");



CREATE INDEX "idx_course_analytics_mv_tenant" ON "public"."course_analytics_mv" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_classes_class" ON "public"."course_classes" USING "btree" ("class_id");



CREATE INDEX "idx_course_classes_class_id" ON "public"."course_classes" USING "btree" ("class_id");



CREATE INDEX "idx_course_classes_course" ON "public"."course_classes" USING "btree" ("course_id");



CREATE INDEX "idx_course_classes_course_id" ON "public"."course_classes" USING "btree" ("course_id");



CREATE INDEX "idx_course_classes_tenant" ON "public"."course_classes" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_classes_tenant_id" ON "public"."course_classes" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_enrollments_course_id" ON "public"."course_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_course_enrollments_course_user_tenant" ON "public"."course_enrollments" USING "btree" ("course_id", "user_id", "tenant_id");



CREATE INDEX "idx_course_insights_course" ON "public"."course_insights" USING "btree" ("course_id");



CREATE INDEX "idx_course_insights_tenant" ON "public"."course_insights" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_insights_type" ON "public"."course_insights" USING "btree" ("insight_type");



CREATE INDEX "idx_course_modules_course" ON "public"."course_modules" USING "btree" ("course_id");



CREATE INDEX "idx_course_modules_course_id" ON "public"."course_modules" USING "btree" ("course_id");



CREATE INDEX "idx_course_modules_order" ON "public"."course_modules" USING "btree" ("course_id", "order");



CREATE INDEX "idx_course_modules_tenant_course_id" ON "public"."course_modules" USING "btree" ("tenant_id", "course_id");



CREATE INDEX "idx_course_modules_tenant_id" ON "public"."course_modules" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_progress_course" ON "public"."course_progress" USING "btree" ("course_id");



CREATE INDEX "idx_course_progress_tenant_id" ON "public"."course_progress" USING "btree" ("tenant_id");



CREATE INDEX "idx_course_progress_user" ON "public"."course_progress" USING "btree" ("user_id");



CREATE INDEX "idx_course_stats_course" ON "public"."course_stats" USING "btree" ("course_id");



CREATE INDEX "idx_courses_created_by" ON "public"."courses" USING "btree" ("created_by");



CREATE INDEX "idx_courses_tenant_created_by" ON "public"."courses" USING "btree" ("tenant_id", "created_by");



CREATE INDEX "idx_courses_tenant_id" ON "public"."courses" USING "btree" ("tenant_id");



CREATE INDEX "idx_discussions_announcement" ON "public"."discussions" USING "btree" ("announcement_id");



CREATE INDEX "idx_discussions_author_id" ON "public"."discussions" USING "btree" ("author_id");



CREATE INDEX "idx_discussions_course" ON "public"."discussions" USING "btree" ("course_id");



CREATE INDEX "idx_discussions_created_at" ON "public"."discussions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_discussions_lesson_id" ON "public"."discussions" USING "btree" ("lesson_id");



CREATE INDEX "idx_discussions_parent" ON "public"."discussions" USING "btree" ("parent_id");



CREATE INDEX "idx_discussions_tenant" ON "public"."discussions" USING "btree" ("tenant_id");



CREATE INDEX "idx_discussions_tenant_course_author" ON "public"."discussions" USING "btree" ("tenant_id", "course_id", "author_id");



CREATE INDEX "idx_discussions_tenant_id" ON "public"."discussions" USING "btree" ("tenant_id");



CREATE INDEX "idx_enrollments_class" ON "public"."enrollments" USING "btree" ("class_id");



CREATE INDEX "idx_enrollments_class_id" ON "public"."enrollments" USING "btree" ("class_id");



CREATE INDEX "idx_enrollments_course_user_status" ON "public"."course_enrollments" USING "btree" ("course_id", "user_id", "status");



CREATE INDEX "idx_enrollments_student" ON "public"."enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_enrollments_student_id" ON "public"."enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_enrollments_tenant_course" ON "public"."course_enrollments" USING "btree" ("tenant_id", "course_id");



CREATE INDEX "idx_enrollments_tenant_id" ON "public"."enrollments" USING "btree" ("tenant_id");



CREATE INDEX "idx_enrollments_tenant_user" ON "public"."course_enrollments" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_grades_graded_by" ON "public"."grades" USING "btree" ("graded_by");



CREATE INDEX "idx_grades_tenant_id" ON "public"."grades" USING "btree" ("tenant_id");



CREATE INDEX "idx_grades_tenant_submission" ON "public"."grades" USING "btree" ("tenant_id", "submission_id");



CREATE INDEX "idx_invoices_student" ON "public"."invoices" USING "btree" ("student_id");



CREATE INDEX "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "idx_leaderboards_tenant_points" ON "public"."leaderboards" USING "btree" ("tenant_id", "points" DESC);



CREATE INDEX "idx_leaderboards_user_id" ON "public"."leaderboards" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_module" ON "public"."lessons" USING "btree" ("module_id");



CREATE INDEX "idx_lesson_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_lesson_id" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_tenant_id" ON "public"."lesson_progress" USING "btree" ("tenant_id");



CREATE INDEX "idx_lesson_progress_tenant_user_lesson" ON "public"."lesson_progress" USING "btree" ("tenant_id", "user_id", "lesson_id");



CREATE INDEX "idx_lesson_progress_user" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_progress_user_id" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_resources_lesson" ON "public"."lesson_resources" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_resources_lesson_id" ON "public"."lesson_resources" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_resources_order" ON "public"."lesson_resources" USING "btree" ("lesson_id", "order_index");



CREATE INDEX "idx_lesson_resources_search" ON "public"."lesson_resources" USING "gin" ("search_vector");



CREATE INDEX "idx_lesson_resources_tenant_id" ON "public"."lesson_resources" USING "btree" ("tenant_id");



CREATE INDEX "idx_lesson_resources_tenant_lesson_id" ON "public"."lesson_resources" USING "btree" ("tenant_id", "lesson_id");



CREATE INDEX "idx_lessons_module" ON "public"."lessons" USING "btree" ("module_id");



CREATE INDEX "idx_lessons_tenant_id" ON "public"."lessons" USING "btree" ("tenant_id");



CREATE INDEX "idx_lessons_tenant_module_id" ON "public"."lessons" USING "btree" ("tenant_id", "module_id");



CREATE INDEX "idx_module_dependencies_depends_on" ON "public"."module_dependencies" USING "btree" ("depends_on_module_id");



CREATE INDEX "idx_module_lessons_order" ON "public"."lessons" USING "btree" ("module_id", "order");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_tenant_user" ON "public"."notifications" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_tenant_id" ON "public"."payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_payments_tenant_invoice" ON "public"."payments" USING "btree" ("tenant_id", "invoice_id");



CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_progress_user" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_answers_attempt_id" ON "public"."quiz_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_quiz_answers_option_id" ON "public"."quiz_answers" USING "btree" ("option_id");



CREATE INDEX "idx_quiz_answers_question_id" ON "public"."quiz_answers" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_answers_tenant_id" ON "public"."quiz_answers" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_attempt_user" ON "public"."quiz_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_quiz" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_quiz_id" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_student" ON "public"."quiz_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_student_id" ON "public"."quiz_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_student_quiz" ON "public"."quiz_attempts" USING "btree" ("student_id", "quiz_id");



CREATE INDEX "idx_quiz_attempts_tenant_id" ON "public"."quiz_attempts" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_options_question" ON "public"."quiz_options" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_options_tenant_id" ON "public"."quiz_options" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_questions_tenant_id" ON "public"."quiz_questions" USING "btree" ("tenant_id");



CREATE INDEX "idx_quizzes_class" ON "public"."quizzes" USING "btree" ("class_id");



CREATE INDEX "idx_quizzes_lesson" ON "public"."quizzes" USING "btree" ("lesson_id");



CREATE INDEX "idx_quizzes_status_tenant" ON "public"."quizzes" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_quizzes_tenant_id" ON "public"."quizzes" USING "btree" ("tenant_id");



CREATE INDEX "idx_recommendations_course_lesson" ON "public"."recommendations" USING "btree" ("course_id", "lesson_id");



CREATE INDEX "idx_recommendations_tenant_id" ON "public"."recommendations" USING "btree" ("tenant_id");



CREATE INDEX "idx_recommendations_tenant_user" ON "public"."recommendations" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_recommendations_user" ON "public"."recommendations" USING "btree" ("user_id");



CREATE INDEX "idx_rsvps_announcement" ON "public"."announcement_rsvps" USING "btree" ("announcement_id");



CREATE INDEX "idx_rsvps_user" ON "public"."announcement_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_student_concept_mastery" ON "public"."student_concept_mastery" USING "btree" ("student_id", "course_id");



CREATE INDEX "idx_student_concept_mastery_course_tenant" ON "public"."student_concept_mastery" USING "btree" ("course_id", "tenant_id");



CREATE INDEX "idx_student_concept_mastery_tenant_id" ON "public"."student_concept_mastery" USING "btree" ("tenant_id");



CREATE INDEX "idx_submissions_assignment" ON "public"."assignment_submissions" USING "btree" ("assignment_id");



CREATE INDEX "idx_submissions_student" ON "public"."assignment_submissions" USING "btree" ("student_id");



CREATE INDEX "idx_tenant_modules_module_id" ON "public"."tenant_modules" USING "btree" ("module_id");



CREATE INDEX "idx_user_badges_badge_tenant" ON "public"."user_badges" USING "btree" ("badge_id", "tenant_id");



CREATE INDEX "idx_user_badges_tenant_id" ON "public"."user_badges" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_badges_user" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_points_tenant_user" ON "public"."user_points" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_tenant_id" ON "public"."user_roles" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "assignments_updated_at" BEFORE UPDATE ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "class_announcements_updated_at" BEFORE UPDATE ON "public"."class_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "course_modules_updated_at" BEFORE UPDATE ON "public"."course_modules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "course_progress_updated_at" BEFORE UPDATE ON "public"."course_progress" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "grades_updated_at" BEFORE UPDATE ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "lesson_progress_completed_trigger" AFTER UPDATE ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_lesson_completed"();



CREATE OR REPLACE TRIGGER "lesson_progress_update_course_trigger_insert" AFTER INSERT ON "public"."lesson_progress" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."trigger_update_course_progress"();



CREATE OR REPLACE TRIGGER "lesson_progress_update_course_trigger_update" AFTER UPDATE OF "status" ON "public"."lesson_progress" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"text") AND ("old"."status" IS DISTINCT FROM "new"."status"))) EXECUTE FUNCTION "public"."trigger_update_course_progress"();



CREATE OR REPLACE TRIGGER "lesson_resources_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."lesson_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_resource_search_vector"();



CREATE OR REPLACE TRIGGER "lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_announcement_published" AFTER INSERT OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."notify_announcement_published"();



CREATE OR REPLACE TRIGGER "on_course_class_deleted" AFTER DELETE ON "public"."course_classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_course_unassigned_from_class"();



CREATE OR REPLACE TRIGGER "on_course_class_inserted" AFTER INSERT ON "public"."course_classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_course_assigned_to_class"();



CREATE OR REPLACE TRIGGER "on_course_published" AFTER UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."notify_course_published"();



CREATE OR REPLACE TRIGGER "on_discussion_reply" AFTER INSERT ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_discussion_reply"();



CREATE OR REPLACE TRIGGER "on_enrollment_inserted" AFTER INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_student_joined_class"();



CREATE OR REPLACE TRIGGER "on_enrollment_updated" AFTER UPDATE OF "status" ON "public"."enrollments" FOR EACH ROW WHEN ((("old"."status" IS DISTINCT FROM "new"."status") AND ("new"."status" = 'ACTIVE'::"public"."enrollment_status"))) EXECUTE FUNCTION "public"."handle_student_joined_class"();



CREATE OR REPLACE TRIGGER "on_module_created_add_to_tenants" AFTER INSERT ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_module_for_all_tenants"();



CREATE OR REPLACE TRIGGER "on_quiz_published" AFTER UPDATE ON "public"."lessons" FOR EACH ROW WHEN (("new"."type" = 'quiz'::"text")) EXECUTE FUNCTION "public"."notify_quiz_published"();



CREATE OR REPLACE TRIGGER "on_tenant_created_add_modules" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_modules_for_tenant"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "quiz_attempt_passed_trigger" AFTER INSERT ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_quiz_passed"();



CREATE OR REPLACE TRIGGER "quizzes_set_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quizzes_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_discussions_updated_at" BEFORE UPDATE ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenant_id_activity_logs" BEFORE INSERT ON "public"."activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_assignment_submissions" BEFORE INSERT ON "public"."assignment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_assignments" BEFORE INSERT ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_attendance_records" BEFORE INSERT ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_class_announcements" BEFORE INSERT ON "public"."class_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_class_schedules" BEFORE INSERT ON "public"."class_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_classes" BEFORE INSERT ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_course_modules" BEFORE INSERT ON "public"."course_modules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_course_progress" BEFORE INSERT ON "public"."course_progress" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_courses" BEFORE INSERT ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_enrollments" BEFORE INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_grades" BEFORE INSERT ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_invoices" BEFORE INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_lesson_progress" BEFORE INSERT ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_lesson_resources" BEFORE INSERT ON "public"."lesson_resources" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_lessons" BEFORE INSERT ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_notifications" BEFORE INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_payments" BEFORE INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_profiles" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_quiz_attempts" BEFORE INSERT ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_quiz_options" BEFORE INSERT ON "public"."quiz_options" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_quiz_questions" BEFORE INSERT ON "public"."quiz_questions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_quizzes" BEFORE INSERT ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_user_roles" BEFORE INSERT ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tr_update_ai_session_stats" AFTER INSERT ON "public"."ai_tutor_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_session_stats"();



CREATE OR REPLACE TRIGGER "trg_assignment_graded_activity" AFTER INSERT OR UPDATE ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."handle_assignment_graded"();



CREATE OR REPLACE TRIGGER "trg_assignment_submission_activity" AFTER INSERT OR UPDATE ON "public"."assignment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_assignment_submission_change"();



CREATE OR REPLACE TRIGGER "trg_enrollment_activity" AFTER INSERT OR UPDATE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_enrollment_activity"();



CREATE OR REPLACE TRIGGER "trg_lesson_progress_activity" AFTER INSERT OR UPDATE ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."handle_lesson_progress_change"();



CREATE OR REPLACE TRIGGER "trg_lesson_resources_search_update" BEFORE INSERT OR UPDATE ON "public"."lesson_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_resource_search_vector"();



CREATE OR REPLACE TRIGGER "trg_process_progress_events" AFTER INSERT ON "public"."activity_events" FOR EACH ROW EXECUTE FUNCTION "public"."process_progress_events"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_activity" AFTER INSERT ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quiz_attempt_activity"();



CREATE OR REPLACE TRIGGER "user_points_updated_at" BEFORE UPDATE ON "public"."user_points" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_cache"
    ADD CONSTRAINT "ai_tutor_cache_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_cache"
    ADD CONSTRAINT "ai_tutor_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_feedback"
    ADD CONSTRAINT "ai_tutor_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ai_tutor_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_feedback"
    ADD CONSTRAINT "ai_tutor_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_feedback"
    ADD CONSTRAINT "ai_tutor_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_interactions"
    ADD CONSTRAINT "ai_tutor_interactions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id");



ALTER TABLE ONLY "public"."ai_tutor_interactions"
    ADD CONSTRAINT "ai_tutor_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_tutor_messages"
    ADD CONSTRAINT "ai_tutor_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_tutor_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_messages"
    ADD CONSTRAINT "ai_tutor_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_rate_limits"
    ADD CONSTRAINT "ai_tutor_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_tutor_sessions"
    ADD CONSTRAINT "ai_tutor_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_sessions"
    ADD CONSTRAINT "ai_tutor_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_sessions"
    ADD CONSTRAINT "ai_tutor_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_audit"
    ADD CONSTRAINT "analytics_audit_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_audit"
    ADD CONSTRAINT "analytics_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."analytics_metrics"
    ADD CONSTRAINT "analytics_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."analytics_rate_limits"
    ADD CONSTRAINT "analytics_rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."analytics_rate_limits"
    ADD CONSTRAINT "analytics_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_rsvps"
    ADD CONSTRAINT "announcement_rsvps_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_rsvps"
    ADD CONSTRAINT "announcement_rsvps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_rsvps"
    ADD CONSTRAINT "announcement_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."class_announcements"
    ADD CONSTRAINT "class_announcements_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_announcements"
    ADD CONSTRAINT "class_announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_schedules"
    ADD CONSTRAINT "class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_schedules"
    ADD CONSTRAINT "class_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_classes"
    ADD CONSTRAINT "course_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_classes"
    ADD CONSTRAINT "course_classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_classes"
    ADD CONSTRAINT "course_classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_insights"
    ADD CONSTRAINT "course_insights_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_stats"
    ADD CONSTRAINT "course_stats_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_stats"
    ADD CONSTRAINT "course_stats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "leaderboards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_resources"
    ADD CONSTRAINT "lesson_resources_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_resources"
    ADD CONSTRAINT "lesson_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_dependencies"
    ADD CONSTRAINT "module_dependencies_depends_on_module_id_fkey" FOREIGN KEY ("depends_on_module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_dependencies"
    ADD CONSTRAINT "module_dependencies_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."quiz_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage analytics circuit breaker" ON "public"."analytics_circuit_breaker" USING ("public"."has_role"('ADMIN'::"public"."app_role"));



CREATE POLICY "Admins can manage tenant insights" ON "public"."course_insights" USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can view analytics metrics" ON "public"."analytics_metrics" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can view audit logs" ON "public"."analytics_audit" FOR SELECT USING (("public"."has_role"('ADMIN'::"public"."app_role") AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "Students read course cache" ON "public"."ai_tutor_cache" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."enrollments" "e"
     JOIN "public"."classes" "c" ON (("e"."class_id" = "c"."id")))
  WHERE (("c"."course_id" = "ai_tutor_cache"."course_id") AND ("e"."student_id" = "auth"."uid"()) AND ("e"."status" = 'ACTIVE'::"public"."enrollment_status")))));



CREATE POLICY "Students read own mastery" ON "public"."student_concept_mastery" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("student_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Teachers and Admins can delete course_classes" ON "public"."course_classes" FOR DELETE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ((("auth"."jwt"() ->> 'role'::"text") = 'TEACHER'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"))));



CREATE POLICY "Teachers and Admins can insert course_classes" ON "public"."course_classes" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ((("auth"."jwt"() ->> 'role'::"text") = 'TEACHER'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"))));



CREATE POLICY "Teachers can view tenant insights" ON "public"."course_insights" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



CREATE POLICY "Tenants manage cache" ON "public"."ai_tutor_cache" TO "authenticated" USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "Tenants manage concept mastery" ON "public"."student_concept_mastery" TO "authenticated" USING ((("tenant_id" = ( SELECT "student_concept_mastery"."tenant_id"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("tenant_id" = ("current_setting"('app.current_tenant'::"text", true))::"uuid")));



CREATE POLICY "Users can insert their own answers" ON "public"."quiz_answers" FOR INSERT WITH CHECK (("attempt_id" IN ( SELECT "quiz_attempts"."id"
   FROM "public"."quiz_attempts"
  WHERE ("quiz_attempts"."student_id" = "auth"."uid"()))));



CREATE POLICY "Users can view course stats for their tenant" ON "public"."course_stats" FOR SELECT USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can view course_classes for their tenant" ON "public"."course_classes" FOR SELECT USING ((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")));



CREATE POLICY "Users can view courses" ON "public"."courses" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "Users can view leaderboards for their tenant" ON "public"."leaderboards" FOR SELECT USING (("tenant_id" = ((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Users can view own analytics rate limits" ON "public"."analytics_rate_limits" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "Users can view own rate limits" ON "public"."analytics_rate_limits" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view tenant activity events" ON "public"."activity_events" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "Users can view their own answers" ON "public"."quiz_answers" FOR SELECT USING (("attempt_id" IN ( SELECT "quiz_attempts"."id"
   FROM "public"."quiz_attempts"
  WHERE ("quiz_attempts"."student_id" = "auth"."uid"()))));



GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
