


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


-- CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog"; -- removed: replaced by Rust cron jobs






-- CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions"; -- removed: Supabase-only extension






COMMENT ON SCHEMA "public" IS 'standard public schema';



-- CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql"; -- removed: Supabase-only extension






-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions"; -- pre-installed by init-db.sql






-- CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions"; -- pre-installed in public schema by init-db.sql






-- CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault"; -- removed: Supabase-only extension






-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions"; -- pre-installed in public schema by init-db.sql






CREATE TYPE "public"."activity_event_type" AS ENUM (
    'LESSON_VIEWED',
    'LESSON_COMPLETED',
    'ASSIGNMENT_SUBMITTED',
    'ASSIGNMENT_GRADED',
    'QUIZ_COMPLETED',
    'CLASS_JOINED',
    'QUIZ_STARTED',
    'QUIZ_SUBMITTED',
    'QUIZ_GRADED',
    'QUIZ_ABANDONED',
    'QUIZ_EXPIRED',
    'QUIZ_PASSED'
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


CREATE TYPE "public"."question_type" AS ENUM (
    'MCQ',
    'TRUE_FALSE',
    'MULTIPLE_SELECT',
    'SHORT_ANSWER',
    'ESSAY'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."quiz_assignment_status" AS ENUM (
    'draft',
    'active',
    'scheduled',
    'ended'
);


ALTER TYPE "public"."quiz_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."quiz_attempt_status" AS ENUM (
    'not_started',
    'in_progress',
    'submitted',
    'expired',
    'graded',
    'abandoned'
);


ALTER TYPE "public"."quiz_attempt_status" OWNER TO "postgres";


CREATE TYPE "public"."quiz_mode" AS ENUM (
    'practice',
    'graded',
    'exam'
);


ALTER TYPE "public"."quiz_mode" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."add_question_to_quiz"("p_question_bank_id" "uuid", "p_quiz_id" "uuid", "p_order" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_question RECORD;
    v_new_quiz_question_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- Security: verify question belongs to tenant
    SELECT id, question_text, question_type, explanation
    INTO v_question
    FROM public.question_bank
    WHERE id = p_question_bank_id AND tenant_id = v_tenant_id;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    -- Security: verify quiz belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE id = p_quiz_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- Duplicate check: uses question_bank_id (FIX: not non-existent question_id)
    IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = p_quiz_id AND question_bank_id = p_question_bank_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question already added to quiz');
    END IF;

    -- Insert into quiz_questions with question_bank_id reference
    INSERT INTO public.quiz_questions (
        quiz_id,
        tenant_id,
        "order",
        question_bank_id,
        text,
        question_type,
        explanation,
        points
    )
    VALUES (
        p_quiz_id,
        v_tenant_id,
        p_order,
        p_question_bank_id,
        v_question.question_text,
        v_question.question_type::public.question_type,
        v_question.explanation,
        10  -- default points
    )
    RETURNING id INTO v_new_quiz_question_id;

    -- CRITICAL: Copy options from question_options → quiz_options
    -- The grading pipeline reads correct answers from quiz_options,
    -- so bank-backed questions must have their options here too.
    INSERT INTO public.quiz_options (question_id, text, is_correct, tenant_id)
    SELECT
        v_new_quiz_question_id,
        qo.option_text,
        qo.is_correct,
        v_tenant_id
    FROM public.question_options qo
    WHERE qo.question_id = p_question_bank_id;

    -- Record usage analytics
    INSERT INTO public.question_bank_usage (question_id, quiz_id, tenant_id)
    VALUES (p_question_bank_id, p_quiz_id, v_tenant_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Question added to quiz successfully',
        'quiz_question_id', v_new_quiz_question_id
    );
END;
$$;


ALTER FUNCTION "public"."add_question_to_quiz"("p_question_bank_id" "uuid", "p_quiz_id" "uuid", "p_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id uuid;
    v_total_points integer;
BEGIN
    -- Get user's tenant
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found';
    END IF;

    -- 1. Insert into history log
    INSERT INTO public.user_points (user_id, tenant_id, points, class_id, created_at, updated_at)
    VALUES (p_user_id, v_tenant_id, p_points, p_class_id, now(), now());

    -- 2. Update global leaderboard (Summary table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards') THEN
        INSERT INTO public.leaderboards (tenant_id, user_id, points, updated_at)
        VALUES (v_tenant_id, p_user_id, p_points, now())
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET 
            points = public.leaderboards.points + EXCLUDED.points,
            updated_at = now();
    END IF;

    -- 3. Recompute Level on profiles (Summing history)
    SELECT COALESCE(SUM(points), 0) INTO v_total_points FROM public.user_points WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
    
    UPDATE public.profiles
    SET 
        level = public.compute_level(v_total_points),
        updated_at = now()
    WHERE id = p_user_id;

END;
$$;


ALTER FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Update user status to active
    UPDATE public.profiles
    SET is_active = true, updated_at = now()
    WHERE id = p_user_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_ACTIVATED',
        p_user_id,
        'profile',
        p_user_id,
        jsonb_build_object('activated_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User activated successfully',
        'user_id', p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_exists boolean;
    v_existing_role public.app_role;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('STUDENT', 'TEACHER', 'ADMIN') THEN
        RAISE EXCEPTION 'Invalid role. Must be STUDENT, TEACHER, or ADMIN';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Check if user already has this role
    SELECT role INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role AND tenant_id = v_tenant_id;
    
    IF v_existing_role IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already has this role',
            'user_id', p_user_id,
            'role', p_role
        );
    END IF;
    
    -- Remove existing roles of the same type (optional: keep multiple roles)
    -- For now, we allow multiple roles per user
    
    -- Insert the new role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (p_user_id, p_role, v_tenant_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'ROLE_ASSIGNED',
        p_user_id,
        'user_roles',
        p_user_id,
        jsonb_build_object('assigned_role', p_role, 'assigned_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Role assigned successfully',
        'user_id', p_user_id,
        'role', p_role
    );
END;
$$;


ALTER FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer DEFAULT 7) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_invitation_token text;
    v_invitation_id uuid;
    v_invitation_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Validate email format
    IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('STUDENT', 'TEACHER', 'ADMIN') THEN
        RAISE EXCEPTION 'Invalid role. Must be STUDENT, TEACHER, or ADMIN';
    END IF;
    
    -- Check if invitation already exists for this email in this tenant
    SELECT EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE email = p_email AND tenant_id = v_tenant_id AND status = 'pending'
    ) INTO v_invitation_exists;
    
    IF v_invitation_exists THEN
        RAISE EXCEPTION 'Pending invitation already exists for this email';
    END IF;
    
    -- Generate unique token
    v_invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create invitation
    INSERT INTO public.user_invitations (
        tenant_id,
        email,
        invited_by,
        role,
        token,
        expires_at
    ) VALUES (
        v_tenant_id,
        p_email,
        auth.uid(),
        p_role,
        v_invitation_token,
        now() + (p_expires_days || ' days')::interval
    ) RETURNING id INTO v_invitation_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_INVITATION_CREATED',
        NULL,
        'user_invitations',
        v_invitation_id,
        jsonb_build_object('email', p_email, 'role', p_role, 'invited_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation created successfully',
        'invitation_id', v_invitation_id,
        'token', v_invitation_token,
        'expires_at', now() + (p_expires_days || ' days')::interval
    );
END;
$_$;


ALTER FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_tenants"("p_search" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user_count" bigint, "teacher_count" bigint, "student_count" bigint, "admin_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Security check: must be admin (note: platform-level admin check would require different logic)
    -- For now, we check if user is admin in ANY tenant
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        t.updated_at,
        (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id) AS user_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'TEACHER') AS teacher_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'STUDENT') AS student_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'ADMIN') AS admin_count
    FROM public.tenants t
    WHERE (p_search IS NULL OR 
            t.name ILIKE '%' || p_search || '%' OR
            t.slug ILIKE '%' || p_search || '%')
        AND (p_is_active IS NULL OR t.is_active = p_is_active)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."admin_list_tenants"("p_search" "text", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"("p_search" "text" DEFAULT NULL::"text", "p_role_filter" "public"."app_role" DEFAULT NULL::"public"."app_role", "p_is_active" boolean DEFAULT NULL::boolean, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "full_name" "text", "is_active" boolean, "tenant_id" "uuid", "roles" "public"."app_role"[], "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.full_name,
        p.is_active,
        p.tenant_id,
        COALESCE(
            array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL),
            '{}'::public.app_role[]
        ) AS roles,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
    WHERE p.tenant_id = v_tenant_id
        AND (p_search IS NULL OR 
            p.email ILIKE '%' || p_search || '%' OR
            p.first_name ILIKE '%' || p_search || '%' OR
            p.last_name ILIKE '%' || p_search || '%' OR
            p.full_name ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR ur.role = p_role_filter)
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
    GROUP BY p.id, p.email, p.first_name, p.last_name, p.full_name, p.is_active, p.tenant_id, p.created_at
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."admin_list_users"("p_search" "text", "p_role_filter" "public"."app_role", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_invitation_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if invitation exists
    SELECT EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE id = p_invitation_id AND tenant_id = v_tenant_id AND status = 'pending'
    ) INTO v_invitation_exists;
    
    IF NOT v_invitation_exists THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;
    
    -- Revoke invitation
    UPDATE public.user_invitations
    SET status = 'revoked'
    WHERE id = p_invitation_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_INVITATION_REVOKED',
        NULL,
        'user_invitations',
        p_invitation_id,
        jsonb_build_object('revoked_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation revoked successfully',
        'invitation_id', p_invitation_id
    );
END;
$$;


ALTER FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_tenant_id uuid;
    v_user_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Prevent admin from suspending themselves
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot suspend your own account';
    END IF;
    
    -- Update user status to inactive
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = p_user_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_SUSPENDED',
        p_user_id,
        'profile',
        p_user_id,
        jsonb_build_object('suspended_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User suspended successfully',
        'user_id', p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."analytics_health_check"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_stats_count integer;
    v_last_refresh timestamptz;
    v_stale_count integer;
    v_error_count integer;
    v_is_healthy boolean := true;
BEGIN
    -- count total stats
    SELECT COUNT(*) INTO v_stats_count FROM public.course_stats;
    
    -- last refresh time
    SELECT MAX(last_calculated_at) INTO v_last_refresh FROM public.course_stats;
    
    -- count stale records (older than 1 hour)
    SELECT COUNT(*) INTO v_stale_count 
    FROM public.course_stats 
    WHERE last_calculated_at < now() - interval '1 hour';
    
    -- count records with errors
    SELECT COUNT(*) INTO v_error_count 
    FROM public.course_stats 
    WHERE last_refresh_error IS NOT NULL;

    -- Health logic
    IF v_stats_count = 0 OR v_stale_count > (v_stats_count * 0.2) THEN
        v_is_healthy := false;
    END IF;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_is_healthy THEN 'healthy' ELSE 'unhealthy' END,
        'stats_count', v_stats_count,
        'last_refresh', v_last_refresh,
        'stale_count', v_stale_count,
        'error_count', v_error_count,
        'timestamp', now()
    );
END;
$$;


ALTER FUNCTION "public"."analytics_health_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."analytics_health_check"() IS 'Returns health status and diagnostic metrics for the analytics engine.';



CREATE OR REPLACE FUNCTION "public"."archive_question"("p_question_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();

    UPDATE public.question_bank
    SET is_archived = TRUE, updated_at = now()
    WHERE id = p_question_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;


ALTER FUNCTION "public"."archive_question"("p_question_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."award_badge_if_qualified"("p_user_id" "uuid", "p_badge_name" "text", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_badge_id uuid;
BEGIN
    SELECT id INTO v_badge_id FROM public.badges WHERE name = p_badge_name;
    
    IF v_badge_id IS NULL THEN
        RETURN false;
    END IF;

    -- Defensive insert with ON CONFLICT DO NOTHING
    -- Fixed: Changed created_at to earned_at
    INSERT INTO public.user_badges (user_id, badge_id, tenant_id, earned_at)
    VALUES (p_user_id, v_badge_id, p_tenant_id, now())
    ON CONFLICT (user_id, badge_id, tenant_id) DO NOTHING;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."award_badge_if_qualified"("p_user_id" "uuid", "p_badge_name" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_save_answers"("p_attempt_id" "uuid", "p_answers" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE

    v_student_id UUID := auth.uid();
    v_answer JSONB;

BEGIN

    -- Validate attempt ownership
    IF NOT EXISTS (
        SELECT 1
        FROM quiz_attempts
        WHERE id = p_attempt_id
        AND student_id = v_student_id
        AND status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Invalid attempt or permission denied';
    END IF;


    FOR v_answer IN
        SELECT * FROM jsonb_array_elements(p_answers)
    LOOP

        UPDATE quiz_attempt_questions
        SET

            selected_option_ids =
            COALESCE(
                (
                    SELECT array_agg(value::UUID)
                    FROM jsonb_array_elements_text(v_answer->'selected_option_ids')
                ),
                '{}'
            ),

            text_answer = v_answer->>'text_answer',

            updated_at = now()

        WHERE attempt_id = p_attempt_id
        AND question_id = (v_answer->>'question_id')::UUID;

    END LOOP;


    RETURN TRUE;

END;
$$;


ALTER FUNCTION "public"."batch_save_answers"("p_attempt_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_analytics_rate_limit"("p_user_id" "uuid", "p_limit" integer DEFAULT 100, "p_window" interval DEFAULT '01:00:00'::interval) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_record record;
BEGIN
    SELECT * INTO v_record FROM public.analytics_rate_limits WHERE user_id = p_user_id;

    IF v_record IS NULL THEN
        INSERT INTO public.analytics_rate_limits (user_id, request_count, window_start, reset_at)
        VALUES (p_user_id, 1, now(), now() + p_window);
        RETURN true;
    END IF;

    -- Reset if window passed
    IF now() > v_record.reset_at THEN
        UPDATE public.analytics_rate_limits 
        SET 
            request_count = 1,
            window_start = now(),
            reset_at = now() + p_window
        WHERE user_id = p_user_id;
        RETURN true;
    END IF;

    -- Check limit
    IF v_record.request_count >= p_limit THEN
        RETURN false;
    END IF;

    -- Increment
    UPDATE public.analytics_rate_limits 
    SET request_count = request_count + 1
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_analytics_rate_limit"("p_user_id" "uuid", "p_limit" integer, "p_window" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_single_active_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- Only check when inserting an IN_PROGRESS attempt
    IF NEW.status <> 'in_progress' THEN
        RETURN NEW;
    END IF;

    -- Lock any existing active attempt to prevent race conditions
    -- Also check tenant_id for multi-tenant isolation
    SELECT id INTO v_existing_id
    FROM public.quiz_attempts_v2
    WHERE student_id = NEW.student_id
      AND quiz_id = NEW.quiz_id
      AND tenant_id = NEW.tenant_id
      AND status = 'in_progress'
    LIMIT 1
    FOR UPDATE;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Student already has an active attempt for this quiz (attempt_id: %)',
            v_existing_id
            USING ERRCODE = 'P0010';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_single_active_attempt"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_single_active_attempt"() IS 'BEFORE INSERT guard: prevents multiple IN_PROGRESS attempts per student per quiz. Uses FOR UPDATE lock to handle concurrent inserts on partitioned table.';



CREATE OR REPLACE FUNCTION "public"."cleanup_stale_quiz_attempts"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_expired_count INTEGER;
    v_abandoned_count INTEGER;
BEGIN
    -- Mark expired IN_PROGRESS attempts that never got submitted
    UPDATE public.quiz_attempts_v2
    SET status = 'expired',
        submitted_at = expires_at
    WHERE status = 'in_progress'
      AND expires_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    -- Mark attempts stale for > 48h with no heartbeat as ABANDONED
    UPDATE public.quiz_attempts_v2
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND last_heartbeat_at < NOW() - INTERVAL '48 hours';

    GET DIAGNOSTICS v_abandoned_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired', v_expired_count,
        'abandoned', v_abandoned_count,
        'processed_at', NOW()
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_stale_quiz_attempts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_level"("p_points" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
    SELECT GREATEST(1, floor(COALESCE(p_points, 0) / 400) + 1)::integer;
$$;


ALTER FUNCTION "public"."compute_level"("p_points" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."create_question"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    INSERT INTO public.question_bank (
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
            INSERT INTO public.question_options (
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
            INSERT INTO public.question_tags (question_id, tag)
            VALUES (v_question_id, v_tag);
        END LOOP;
    END IF;

    -- Initialize question stats (FIX: include tenant_id, use a sentinel quiz_id)
    -- We use gen_random_uuid() as a placeholder quiz_id since stats PK requires it.
    -- Global bank stats use question_bank_usage aggregation instead.
    -- This row is for tracking question-level stats across all quizzes.
    INSERT INTO public.question_stats (question_id, quiz_id, tenant_id)
    VALUES (v_question_id, '00000000-0000-0000-0000-000000000000'::UUID, v_tenant_id)
    ON CONFLICT (question_id, quiz_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'question_id', v_question_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create question: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_question"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_custom_claims jsonb;
BEGIN
  -- Extract user_id from the event
  v_user_id := (event->>'user_id')::uuid;
  
  -- Only proceed if we have a valid user_id
  IF v_user_id IS NOT NULL THEN
    -- Get tenant_id from profiles table
    -- This SECURITY DEFINER function runs with postgres privileges, so it bypasses RLS
    SELECT p.tenant_id INTO v_tenant_id
    FROM public.profiles p
    WHERE p.id = v_user_id;
    
    -- If we found a tenant_id, inject it into custom_claims
    IF v_tenant_id IS NOT NULL THEN
      -- Get existing custom_claims or create empty object
      v_custom_claims := COALESCE(event->'custom_claims', '{}'::jsonb);
      
      -- Add tenant_id to custom_claims
      v_custom_claims := jsonb_set(v_custom_claims, '{tenant_id}', to_jsonb(v_tenant_id));
      
      -- Update the event with the new custom_claims
      event := jsonb_set(event, '{custom_claims}', v_custom_claims);
    END IF;
  END IF;
  
  RETURN event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enroll_student"("p_join_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_class    public.classes;
  v_enrollment public.enrollments;
  v_count    int;
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

  -- Award 10 XP for joining — use add_user_points() which handles
  -- the per-tenant points model, leaderboards, and level recompute.
  PERFORM public.add_user_points(auth.uid(), 10);

  RETURN json_build_object(
    'enrollment_id', v_enrollment.id,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'status', v_enrollment.status
  );
END;
$$;


ALTER FUNCTION "public"."enroll_student"("p_join_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_partition_name TEXT;
    v_from_date      DATE;
    v_to_date        DATE;
    v_quarter_months INTEGER[] := ARRAY[1, 4, 7, 10];
    v_next_month     INTEGER;
    v_next_year      INTEGER;
BEGIN
    -- Validate quarter start month
    IF NOT (p_month = ANY(v_quarter_months)) THEN
        RAISE EXCEPTION 'p_month must be a quarter-start month: 1, 4, 7, or 10';
    END IF;

    v_from_date := make_date(p_year, p_month, 1);
    v_partition_name := format(
        'quiz_attempts_v2_%s_%s',
        to_char(v_from_date, 'YYYY'),
        to_char(v_from_date, 'MM')
    );

    -- Compute to_date (+3 months)
    v_to_date := v_from_date + INTERVAL '3 months';

    -- Create if not exists
    BEGIN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.quiz_attempts_v2
             FOR VALUES FROM (%L) TO (%L)',
            v_partition_name,
            v_from_date,
            v_to_date
        );

        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            v_partition_name
        );

        RETURN format('Partition %I created (%s → %s)', v_partition_name, v_from_date, v_to_date);
    EXCEPTION WHEN duplicate_table THEN
        RETURN format('Partition %I already exists', v_partition_name);
    END;
END;
$$;


ALTER FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) IS 'Auto-provision quarterly partitions for quiz_attempts_v2.
   Call monthly via pg_cron: SELECT ensure_quiz_attempt_partition(EXTRACT(YEAR FROM NOW()), ...)';



CREATE OR REPLACE FUNCTION "public"."expire_dead_attempt"("p_attempt_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN

    UPDATE quiz_attempts
    SET
        status = 'expired',
        finished_at = expires_at,
        updated_at = now()
    WHERE id = p_attempt_id
    AND status = 'in_progress'
    AND expires_at IS NOT NULL
    AND now() > expires_at;

    RETURN TRUE;

END;
$$;


ALTER FUNCTION "public"."expire_dead_attempt"("p_attempt_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_attempt_detail"("p_attempt_id" "uuid") RETURNS TABLE("question_id" "uuid", "question_text" "text", "question_position" integer, "question_type" "text", "selected_option_id" "uuid", "selected_option_ids" "uuid"[], "selected_option_text" "text", "text_answer" "text", "correct_option_id" "uuid", "correct_option_text" "text", "is_correct" boolean, "points_earned" numeric, "max_points" numeric, "grader_comment" "text", "explanation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_attempt RECORD;
    v_is_admin BOOLEAN := FALSE;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    SELECT
        a.id,
        a.quiz_id,
        a.assignment_id,
        a.student_id,
        q.course_id
    INTO v_attempt
    FROM public.quiz_attempts_v2 a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_attempt.student_id = auth.uid() THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF v_is_admin THEN
            v_is_authorized := TRUE;
        ELSIF v_attempt.assignment_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.quiz_assignments qa
                JOIN public.classes c ON c.id = qa.class_id
                WHERE qa.id = v_attempt.assignment_id
                  AND c.teacher_id = auth.uid()
            ) INTO v_is_authorized;
        ELSIF v_attempt.course_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = v_attempt.course_id
                  AND ce.user_id = auth.uid()
                  AND ce.role IN ('teacher', 'admin')
            ) INTO v_is_authorized;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to view this attempt detail';
    END IF;

    RETURN QUERY
    WITH attempt_source AS (
        SELECT id, question_manifest
        FROM public.quiz_attempts_v2
        WHERE id = p_attempt_id
    )
    SELECT
        q.id AS question_id,
        q.text AS question_text,
        array_position(src.question_manifest, q.id) AS question_position,
        q.question_type::TEXT,
        CASE
            WHEN aq.student_answers IS NOT NULL
             AND jsonb_typeof(aq.student_answers) = 'array'
             AND jsonb_array_length(aq.student_answers) = 1
            THEN (aq.student_answers ->> 0)::uuid
            ELSE NULL
        END AS selected_option_id,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'array'
            THEN ARRAY(
                SELECT value::uuid
                FROM jsonb_array_elements_text(aq.student_answers)
            )
            ELSE ARRAY[]::uuid[]
        END AS selected_option_ids,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'array'
            THEN (
                SELECT string_agg(qo.text, ', ' ORDER BY qo.text)
                FROM public.quiz_options qo
                WHERE qo.id = ANY(
                    ARRAY(
                        SELECT value::uuid
                        FROM jsonb_array_elements_text(aq.student_answers)
                    )
                )
            )
            ELSE NULL
        END AS selected_option_text,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'string'
            THEN trim(both '"' FROM aq.student_answers::text)
            ELSE NULL
        END AS text_answer,
        (
            SELECT qo.id
            FROM public.quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
            ORDER BY qo.id
            LIMIT 1
        ) AS correct_option_id,
        (
            SELECT string_agg(qo.text, ', ' ORDER BY qo.text)
            FROM public.quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
        ) AS correct_option_text,
        aq.is_correct,
        aq.points_earned,
        q.points AS max_points,
        NULL::TEXT AS grader_comment,
        q.explanation
    FROM attempt_source src
    JOIN public.quiz_questions q
      ON q.id = ANY(src.question_manifest)
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.attempt_id = p_attempt_id
     AND aq.question_id = q.id
    ORDER BY array_position(src.question_manifest, q.id);
END;
$$;


ALTER FUNCTION "public"."get_attempt_detail"("p_attempt_id" "uuid") OWNER TO "postgres";


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
    'course', jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'created_by', c.created_by
    ),
    'resources', COALESCE((
      SELECT jsonb_agg(row_to_json(lr.*) ORDER BY lr.order_index)
      FROM public.lesson_resources lr
      WHERE lr.lesson_id = l.id
      AND lr.tenant_id = v_tenant_id
    ), '[]'::jsonb),
    'progress', (
      SELECT row_to_json(lp.*)
      FROM public.lesson_progress lp
      WHERE lp.lesson_id = l.id
      AND lp.user_id = v_user_id
      AND lp.tenant_id = v_tenant_id
      LIMIT 1
    ),
    'quiz', (
      SELECT row_to_json(q.*)
      FROM public.quizzes q
      WHERE q.lesson_id = l.id
      AND q.tenant_id = v_tenant_id
      LIMIT 1
    ),
    'sibling_lessons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sl.id,
        'title', sl.title,
        'order', sl."order",
        'type', sl.type
      ) ORDER BY sl."order")
      FROM public.lessons sl
      WHERE sl.module_id = l.module_id
      AND sl.tenant_id = v_tenant_id
    ), '[]'::jsonb)
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


COMMENT ON FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") IS 'Single RPC: lesson + module + course + resources + progress + quiz + siblings.
Eliminates N+1 query explosion. Enforces tenant isolation at DB level.';



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


CREATE OR REPLACE FUNCTION "public"."get_question"("p_question_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
        'tags', COALESCE((SELECT jsonb_agg(tag) FROM public.question_tags WHERE question_id = q.id), '[]'::jsonb),
        'options', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', o.id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'order_index', o.order_index
            ) ORDER BY o.order_index)
            FROM public.question_options o
            WHERE o.question_id = q.id
        ), '[]'::jsonb)
    ) INTO v_question
    FROM public.question_bank q
    WHERE q.id = p_question_id AND q.tenant_id = v_tenant_id;

    RETURN v_question;
END;
$$;


ALTER FUNCTION "public"."get_question"("p_question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_question_difficulty"("p_assignment_id" "uuid") RETURNS TABLE("question_id" "uuid", "question_text" "text", "question_position" integer, "correct_count" bigint, "total_attempts" bigint, "difficulty_percent" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    SELECT qa.id, qa.class_id, qa.quiz_id
    INTO v_assignment
    FROM public.quiz_assignments qa
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = get_my_tenant_id();

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'super_admin')
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
        q.id AS question_id,
        q.text AS question_text,
        q."order" AS question_position,
        COUNT(DISTINCT aq.attempt_id) FILTER (WHERE aq.is_correct = true) AS correct_count,
        t.total_attempts,
        ROUND(
            COALESCE(
                COUNT(DISTINCT aq.attempt_id) FILTER (WHERE aq.is_correct = true)::numeric
                / NULLIF(t.total_attempts, 0) * 100,
                0
            ),
            1
        ) AS difficulty_percent
    FROM questions q
    CROSS JOIN totals t
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.question_id = q.id
     AND aq.attempt_id IN (SELECT id FROM attempts)
    GROUP BY q.id, q.text, q."order", t.total_attempts
    ORDER BY q."order" ASC;
END;
$$;


ALTER FUNCTION "public"."get_question_difficulty"("p_assignment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_question_options"("p_question_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_options JSONB;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Verify question belongs to tenant
    IF NOT EXISTS (SELECT 1 FROM public.question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'option_text', o.option_text,
        'is_correct', o.is_correct,
        'order_index', o.order_index
    ) ORDER BY o.order_index), '[]'::jsonb) INTO v_options
    FROM public.question_options o
    WHERE o.question_id = p_question_id;

    RETURN v_options;
END;
$$;


ALTER FUNCTION "public"."get_question_options"("p_question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_progress_bundle"("p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := get_my_tenant_id();

    IF auth.uid() <> p_student_id AND (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.profiles WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(SUM(points), 0) FROM public.user_points
            WHERE user_id = p_student_id AND tenant_id = v_tenant_id
        ),
        'completed_lessons_count', (
            SELECT COUNT(*) FROM public.lesson_progress
            WHERE user_id = p_student_id AND completed = true AND tenant_id = v_tenant_id
        ),
        -- Return key as 'quiz_attempts' (canonical name, reads from V2 via view)
        'quiz_attempts', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT a.id, a.quiz_id, a.score, COALESCE(a.submitted_at, a.started_at) AS created_at
                FROM public.quiz_attempts_v2 a
                WHERE a.student_id = p_student_id AND a.tenant_id = v_tenant_id
                  AND a.status IN ('submitted', 'graded')
                ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
            ) d
        ),
        'achievements', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage,
                       cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_student_progress_bundle"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    -- Security: Get role from JWT
    v_user_role := auth.jwt() ->> 'role';
    
    -- Security: Validate role - only teacher/admin can access analytics
    IF v_user_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get tenant from JWT
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Get course tenant and validate
    SELECT tenant_id INTO v_course_tenant_id FROM public.courses WHERE id = p_course_id;
    
    IF v_course_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Security: Tenant isolation - ensure course belongs to user's tenant
    IF v_course_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- A. Fetch High-Level Stats (refresh first to ensure up-to-date data)
    PERFORM public.refresh_course_stats(p_course_id);

    SELECT * INTO v_stats FROM public.course_stats WHERE course_id = p_course_id;

    -- B. Module Completion Breakdown - FIXED CALCULATION
    -- Now uses meaningful metric: % of students who completed each lesson in module
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


ALTER FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") IS 'Returns comprehensive analytics data for a course. Requires teacher or admin role. 
Fixes applied: role validation, tenant isolation, module completion calculation.';



CREATE OR REPLACE FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer DEFAULT 20, "p_cursor_student_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

    -- Security: Get role from JWT
    v_user_role := auth.jwt() ->> 'role';
    
    -- Security: Validate role
    IF v_user_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get tenant from JWT
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

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


ALTER FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer, "p_cursor_student_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer, "p_cursor_student_id" "uuid") IS 'Returns comprehensive analytics with cursor-based pagination for the student list. Requires teacher or admin role.';



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


CREATE OR REPLACE FUNCTION "public"."grade_attempt_question"("p_attempt_question_id" "uuid", "p_points_earned" numeric, "p_is_correct" boolean, "p_comment" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_aq RECORD;
    v_attempt RECORD;
    v_quiz RECORD;
    v_is_authorized BOOLEAN := false;
BEGIN
    -- 1. Identity
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND';
    END IF;

    -- 2. Get attempt question + attempt + quiz
    SELECT aq.*, a.quiz_id, a.tenant_id AS attempt_tenant_id
    INTO v_aq
    FROM public.quiz_attempt_questions aq
    JOIN public.quiz_attempts a ON a.id = aq.attempt_id
    WHERE aq.id = p_attempt_question_id;

    IF v_aq.id IS NULL THEN
        RAISE EXCEPTION 'QUESTION_NOT_FOUND';
    END IF;

    -- Tenant check
    IF v_aq.attempt_tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'TENANT_MISMATCH';
    END IF;

    -- 3. Authorization: teacher of class, course creator, or admin
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_aq.quiz_id;

    IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND tenant_id = v_tenant_id AND role = 'ADMIN') THEN
        v_is_authorized := true;
    ELSIF v_quiz.class_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.classes WHERE id = v_quiz.class_id AND teacher_id = v_user_id
    ) THEN
        v_is_authorized := true;
    ELSIF v_quiz.course_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.courses WHERE id = v_quiz.course_id AND created_by = v_user_id
    ) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'UNAUTHORIZED_NOT_TEACHER';
    END IF;

    -- 4. Validate points
    IF p_points_earned < 0 OR p_points_earned > COALESCE(v_aq.max_points, 10) THEN
        RAISE EXCEPTION 'INVALID_POINTS: must be 0-%', COALESCE(v_aq.max_points, 10);
    END IF;

    -- 5. Grade the question
    UPDATE public.quiz_attempt_questions
    SET points_earned = p_points_earned,
        is_correct = p_is_correct,
        grader_comment = p_comment,
        graded_by = v_user_id,
        graded_at = now(),
        updated_at = now()
    WHERE id = p_attempt_question_id;

    -- 6. Recalculate attempt score
    PERFORM public.recalculate_attempt_score(v_aq.attempt_id);

    RETURN jsonb_build_object(
        'success', true,
        'attempt_question_id', p_attempt_question_id,
        'points_earned', p_points_earned,
        'is_correct', p_is_correct
    );
END;
$$;


ALTER FUNCTION "public"."grade_attempt_question"("p_attempt_question_id" "uuid", "p_points_earned" numeric, "p_is_correct" boolean, "p_comment" "text") OWNER TO "postgres";


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
    INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
    SELECT NEW.tenant_id, NEW.course_id, e.student_id, 'student', 'ACTIVE'
    FROM public.enrollments e
    WHERE e.class_id = NEW.class_id
      AND e.status = 'ACTIVE'
    ON CONFLICT ON CONSTRAINT course_enrollments_user_id_course_id_key
    DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        status = 'ACTIVE',
        enrolled_at = now();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_course_assigned_to_class"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_course_unassigned_from_class"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."handle_quiz_attempt_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_event_type public.activity_event_type;
    v_course_id UUID;
    v_class_id UUID;
BEGIN
    -- Only trigger on status change or fresh insert
    IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Map status to event type
    CASE NEW.status
        WHEN 'in_progress' THEN v_event_type := 'QUIZ_STARTED'::public.activity_event_type;
        WHEN 'submitted' THEN v_event_type := 'QUIZ_SUBMITTED'::public.activity_event_type;
        WHEN 'graded' THEN v_event_type := 'QUIZ_GRADED'::public.activity_event_type;
        WHEN 'expired' THEN v_event_type := 'QUIZ_EXPIRED'::public.activity_event_type;
        WHEN 'abandoned' THEN v_event_type := 'QUIZ_ABANDONED'::public.activity_event_type;
        ELSE RETURN NEW;
    END CASE;

    -- Resolve Course and Class context
    SELECT 
        q.class_id,
        CASE 
            WHEN q.lesson_id IS NOT NULL THEN (
                SELECT m.course_id 
                FROM public.lessons l 
                JOIN public.course_modules m ON l.module_id = m.id 
                WHERE l.id = q.lesson_id
            )
            ELSE NULL 
        END as course_id
    INTO v_class_id, v_course_id
    FROM public.quizzes q
    WHERE q.id = NEW.quiz_id;

    -- Log to activity_events
    INSERT INTO public.activity_events (
        tenant_id,
        user_id,
        event_type,
        entity_type,
        entity_id,
        class_id,
        course_id,
        metadata
    ) VALUES (
        NEW.tenant_id,
        NEW.student_id,
        v_event_type,
        'quiz_attempt',
        NEW.id,
        v_class_id,
        v_course_id,
        jsonb_build_object(
            'quiz_id', NEW.quiz_id,
            'status', NEW.status,
            'score', NEW.score,
            'attempt_number', NEW.attempt_number,
            'tab_switch_count', NEW.tab_switch_count,
            'focus_loss_count', NEW.focus_loss_count,
            'triggered_by', CASE WHEN NEW.status IN ('abandoned', 'expired') THEN 'system_cleanup' ELSE 'user_action' END
        )
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_quiz_attempt_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_quiz_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Award "First Quiz" badge on first submission
    IF NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts_v2
        WHERE student_id = NEW.student_id
          AND tenant_id = NEW.tenant_id
          AND status IN ('submitted', 'graded')
          AND id != NEW.id
    ) THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'First Quiz', NEW.tenant_id);
    END IF;

    -- Award "Perfect Score" badge if score is 100
    IF NEW.score >= 100 THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'Perfect Score', NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_quiz_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_streak_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Award "7 Day Streak" when current_streak reaches 7
    IF NEW.current_streak >= 7 THEN
        PERFORM public.award_badge_if_qualified(NEW.user_id, '7 Day Streak', NEW.tenant_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_streak_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_streak_on_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_bonus_xp integer;
BEGIN
    -- Only process relevant events (LESSON_COMPLETED, QUIZ_PASSED, etc.)
    IF NEW.event_type IN ('LESSON_COMPLETED', 'QUIZ_COMPLETED', 'QUIZ_PASSED', 'ASSIGNMENT_SUBMITTED') THEN
        SELECT public.update_streak(NEW.user_id, NEW.tenant_id) INTO v_bonus_xp;
        
        -- If bonus earned, add points
        IF v_bonus_xp > 0 THEN
            PERFORM public.add_user_points(NEW.user_id, v_bonus_xp);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_streak_on_activity"() OWNER TO "postgres";


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
        ON CONFLICT ON CONSTRAINT course_enrollments_user_id_course_id_key
        DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = 'ACTIVE',
            enrolled_at = now();
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


CREATE OR REPLACE FUNCTION "public"."has_feature"("feature" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    (auth.jwt() -> 'app_metadata' -> 'features') ? feature;
$$;


ALTER FUNCTION "public"."has_feature"("feature" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE user_id = auth.uid()
    AND course_id = course_uuid
  );
$$;


ALTER FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid" DEFAULT NULL::"uuid", "p_target_entity_type" "text" DEFAULT NULL::"text", "p_target_entity_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_audit_log_id uuid;
    v_tenant_id uuid;
    v_admin_user_id uuid;
BEGIN
    -- Get the current user's tenant and ID
    v_tenant_id := public.get_my_tenant_id();
    v_admin_user_id := auth.uid();
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Admin action requires tenant context';
    END IF;
    
    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin action requires authentication';
    END IF;
    
    -- Insert audit log
    INSERT INTO public.admin_audit_logs (
        tenant_id,
        admin_user_id,
        action,
        target_user_id,
        target_entity_type,
        target_entity_id,
        metadata
    ) VALUES (
        v_tenant_id,
        v_admin_user_id,
        p_action,
        p_target_user_id,
        p_target_entity_type,
        p_target_entity_id,
        p_metadata
    ) RETURNING id INTO v_audit_log_id;
    
    RETURN v_audit_log_id;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.analytics_audit (
        tenant_id,
        user_id,
        action,
        course_id,
        metadata,
        ip_address,
        user_agent
    )
    VALUES (
        (auth.jwt() ->> 'tenant_id')::uuid,
        auth.uid(),
        p_action,
        p_course_id,
        p_metadata,
        (SELECT inet_client_addr()),
        (SELECT current_setting('request.headers', true)::jsonb ->> 'user-agent')
    );
END;
$$;


ALTER FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid", "p_metadata" "jsonb") IS 'Utility function to log analytics-related actions with tenant and user context.';



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


CREATE OR REPLACE FUNCTION "public"."notify_announcement_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."notify_assignment_graded"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_assignment_title text;
  v_course_id uuid;
BEGIN
  IF (NEW.status = 'graded') AND (OLD.status IS DISTINCT FROM 'graded') THEN
    SELECT title, course_id INTO v_assignment_title, v_course_id
    FROM assignments
    WHERE id = NEW.assignment_id;

    INSERT INTO notifications (
      tenant_id, user_id, actor_id, title, message, type, entity_id, link
    ) VALUES (
      NEW.tenant_id,
      NEW.user_id,
      auth.uid(),
      'Tugas Dinilai',
      'Tugas "' || v_assignment_title || '" telah dinilai (' || NEW.score || '). Tinjau umpan balik guru.',
      'grade',
      NEW.assignment_id,
      '/learning/' || v_course_id
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_assignment_graded"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_course_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    AS $$
DECLARE
  v_course_id uuid;
  v_course_title text;
  v_teacher_id uuid;
BEGIN
  -- GUARD: status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') THEN
    -- Get course info (courses uses created_by, not teacher_id)
    SELECT id, title, created_by INTO v_course_id, v_course_title, v_teacher_id
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


CREATE OR REPLACE FUNCTION "public"."on_assignment_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mark the lesson as completed for the student
  INSERT INTO lesson_progress (tenant_id, user_id, lesson_id, completed, progress_percent, last_position_seconds, updated_at)
  SELECT 
    NEW.tenant_id, 
    NEW.student_id, 
    a.lesson_id, 
    true, 
    100, 
    0, 
    now()
  FROM assignments a
  WHERE a.id = NEW.assignment_id
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET 
    completed = true, 
    progress_percent = 100,
    updated_at = now();
    
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_assignment_submitted"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."recalculate_attempt_score"("p_attempt_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_earned NUMERIC(5,2);
    v_total_max NUMERIC(5,2);
    v_final_score NUMERIC(5,2);
    v_all_graded BOOLEAN;
    v_passed BOOLEAN;
    v_passing_score INTEGER;
    v_correct_count INTEGER;
    v_quiz_id UUID;
    v_tenant_id UUID;
    v_student_id UUID;
BEGIN
    -- Get attempt info
    SELECT a.quiz_id, a.tenant_id, a.student_id, q.passing_score
    INTO v_quiz_id, v_tenant_id, v_student_id, v_passing_score
    FROM public.quiz_attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id;

    -- Sum scores
    SELECT 
        COALESCE(SUM(points_earned), 0),
        COALESCE(SUM(max_points), 0),
        bool_and(is_correct IS NOT NULL),
        count(*) FILTER (WHERE is_correct = true)
    INTO v_total_earned, v_total_max, v_all_graded, v_correct_count
    FROM public.quiz_attempt_questions
    WHERE attempt_id = p_attempt_id;

    -- Calculate percentage
    IF v_total_max > 0 THEN
        v_final_score := ROUND((v_total_earned / v_total_max) * 100, 2);
    ELSE
        v_final_score := 0;
    END IF;

    v_passed := v_final_score >= COALESCE(v_passing_score, 70);

    -- Update attempt
    UPDATE public.quiz_attempts
    SET score = v_final_score,
        passed = v_passed,
        status = CASE WHEN v_all_graded THEN 'graded'::public.quiz_attempt_status 
                      ELSE status END
    WHERE id = p_attempt_id;

    -- If fully graded, fire event
    IF v_all_graded THEN
        INSERT INTO public.activity_events (
            tenant_id, user_id, event_type, entity_type, entity_id, metadata
        ) VALUES (
            v_tenant_id, v_student_id,
            'QUIZ_GRADED'::public.activity_event_type,
            'quiz_attempt', p_attempt_id,
            jsonb_build_object(
                'quiz_id', v_quiz_id,
                'score', v_final_score,
                'passed', v_passed,
                'source', 'manual_grading_complete'
            )
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."recalculate_attempt_score"("p_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_total_lessons integer := 0;
    v_completed_lessons integer := 0;
    v_percentage numeric := 0;
    v_last_activity_type text;
    v_last_activity_at timestamptz;
BEGIN
    -- Get tenant_id from course
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN RETURN; END IF;

    -- Count total published lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND l.status = 'published';

    -- Count completed lessons for this user in this course
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND lp.user_id = p_user_id
      AND lp.completed = true;

    -- Calculate percentage
    IF v_total_lessons > 0 THEN
        v_percentage := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2);
    ELSE
        v_percentage := 0;
    END IF;

    -- Upsert course_progress
    INSERT INTO public.course_progress (
        tenant_id, course_id, user_id, total_lessons, completed_lessons, percentage, updated_at, last_calculated_at
    )
    VALUES (
        v_tenant_id, p_course_id, p_user_id, v_total_lessons, v_completed_lessons, v_percentage, now(), now()
    )
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET 
        total_lessons = EXCLUDED.total_lessons,
        completed_lessons = EXCLUDED.completed_lessons,
        percentage = EXCLUDED.percentage,
        last_calculated_at = now(),
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."recompute_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."recompute_leaderboard"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.leaderboards l
    SET 
        rank = r.computed_rank,
        updated_at = now()
    FROM (
        SELECT 
            user_id,
            DENSE_RANK() OVER (ORDER BY points DESC) as computed_rank
        FROM public.leaderboards
        WHERE tenant_id = p_tenant_id
    ) r
    WHERE l.user_id = r.user_id
      AND l.tenant_id = p_tenant_id;
END $$;


ALTER FUNCTION "public"."recompute_leaderboard"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid", "p_week_start" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Aggregation and Rank Recomputation in one step if needed, 
    -- but usually we update ranks after score changes.
    UPDATE public.leaderboards_weekly lw
    SET 
        rank = r.computed_rank,
        updated_at = now()
    FROM (
        SELECT 
            user_id,
            DENSE_RANK() OVER (ORDER BY score DESC) as computed_rank
        FROM public.leaderboards_weekly
        WHERE tenant_id = p_tenant_id
          AND class_id = p_class_id
          AND week_start = p_week_start
    ) r
    WHERE lw.user_id = r.user_id
      AND lw.tenant_id = p_tenant_id
      AND lw.class_id = p_class_id
      AND lw.week_start = p_week_start;
END;
$$;


ALTER FUNCTION "public"."recompute_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid", "p_week_start" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.analytics_metrics (metric_name, metric_value, labels)
    VALUES (p_metric_name, p_value, p_labels);
END;
$$;


ALTER FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") IS 'Records a numerical metric with optional labels for monitoring.';



CREATE OR REPLACE FUNCTION "public"."record_cheating_signal"("p_attempt_id" "uuid", "p_signal_type" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE public.quiz_attempts_v2
    SET
        last_heartbeat_at = now(),
        tab_switch_count = CASE WHEN p_signal_type = 'TAB_SWITCH' THEN tab_switch_count + 1 ELSE tab_switch_count END,
        focus_loss_count = CASE WHEN p_signal_type = 'FOCUS_LOSS' THEN focus_loss_count + 1 ELSE focus_loss_count END,
        cheating_signals = COALESCE(cheating_signals, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'type', p_signal_type,
                'timestamp', now(),
                'metadata', COALESCE(p_metadata, '{}'::jsonb)
            )
        )
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND tenant_id = get_my_tenant_id()
      AND status = 'IN_PROGRESS';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."record_cheating_signal"("p_attempt_id" "uuid", "p_signal_type" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid" DEFAULT NULL::"uuid", "p_module_id" "uuid" DEFAULT NULL::"uuid", "p_lesson_id" "uuid" DEFAULT NULL::"uuid", "p_quiz_id" "uuid" DEFAULT NULL::"uuid", "p_assignment_id" "uuid" DEFAULT NULL::"uuid", "p_event_data" "jsonb" DEFAULT '{}'::"jsonb", "p_duration_seconds" integer DEFAULT NULL::integer, "p_device_type" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_event_id uuid;
    v_tenant_id uuid;
    v_user_id uuid;
BEGIN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    v_user_id := auth.uid();
    
    INSERT INTO public.learning_events (
        tenant_id,
        user_id,
        event_type,
        course_id,
        module_id,
        lesson_id,
        quiz_id,
        assignment_id,
        event_data,
        duration_seconds,
        device_type,
        session_id
    ) VALUES (
        v_tenant_id,
        v_user_id,
        p_event_type,
        p_course_id,
        p_module_id,
        p_lesson_id,
        p_quiz_id,
        p_assignment_id,
        p_event_data,
        p_duration_seconds,
        p_device_type,
        p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;


ALTER FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid", "p_module_id" "uuid", "p_lesson_id" "uuid", "p_quiz_id" "uuid", "p_assignment_id" "uuid", "p_event_data" "jsonb", "p_duration_seconds" integer, "p_device_type" "text", "p_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid", "p_module_id" "uuid", "p_lesson_id" "uuid", "p_quiz_id" "uuid", "p_assignment_id" "uuid", "p_event_data" "jsonb", "p_duration_seconds" integer, "p_device_type" "text", "p_session_id" "text") IS 'Records a learning event for analytics and AI Tutor. Required fields: event_type. 
Optional: course_id, module_id, lesson_id, quiz_id, assignment_id, event_data, duration_seconds, device_type, session_id.';



CREATE OR REPLACE FUNCTION "public"."record_quiz_heartbeat"("p_attempt_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE public.quiz_attempts_v2
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND tenant_id = get_my_tenant_id()
      AND status = 'IN_PROGRESS';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."record_quiz_heartbeat"("p_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_all_course_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    -- Only allow teachers/admins to run this
    IF (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers and admins can refresh all course stats';
    END IF;

    FOR r IN
        SELECT id FROM public.courses WHERE status = 'published'
    LOOP
        BEGIN
            PERFORM public.refresh_course_stats(r.id);
            v_count := v_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to refresh stats for course %: %', r.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Refreshed stats for % courses', v_count;
END;
$$;


ALTER FUNCTION "public"."refresh_all_course_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_all_course_stats"() IS 'Manually trigger refresh of all course statistics. Requires teacher or admin role.
Use this if pg_cron is not available on your Supabase plan.';



CREATE OR REPLACE FUNCTION "public"."refresh_course_analytics_mv"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.course_analytics_mv;
END;
$$;


ALTER FUNCTION "public"."refresh_course_analytics_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_tenant_id uuid;
    v_cb record;
    v_locked_at timestamptz;
    -- vars for stats
    v_total_enrolled integer := 0;
    v_active_students integer := 0;
    v_avg_progress numeric := 0;
    v_avg_quiz_score numeric := 0;
    v_lesson_completion_rate numeric := 0;
    v_quiz_pass_rate numeric := 0;
    v_at_risk_count integer := 0;
    v_total_lessons integer := 0;
    v_completed_lessons integer := 0;
    v_quiz_attempts_total integer := 0;
    v_quiz_attempts_passed integer := 0;
BEGIN
    -- Circuit Breaker Check
    SELECT * INTO v_cb FROM public.analytics_circuit_breaker WHERE id = 'refresh_course_stats';
    
    IF v_cb.state = 'open' THEN
        IF now() > v_cb.reset_at THEN
            -- Transition to half_open to allow a trial request
            UPDATE public.analytics_circuit_breaker 
            SET state = 'half_open' 
            WHERE id = 'refresh_course_stats';
        ELSE
            -- Circuit is open, skip execution
            RETURN;
        END IF;
    END IF;

    -- Security Check
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Get course tenant & validate
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN 
        RAISE EXCEPTION 'Course not found';
    END IF;

    IF v_user_tenant_id IS NOT NULL AND v_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Implement basic locking
    SELECT refresh_locked_at INTO v_locked_at FROM public.course_stats WHERE course_id = p_course_id;
    IF v_locked_at IS NOT NULL AND v_locked_at > now() - interval '1 minute' THEN
        RETURN;
    END IF;

    -- Lock the record
    UPDATE public.course_stats SET refresh_locked_at = now() WHERE course_id = p_course_id;

    BEGIN
        -- A. Calculate Enrollment & Active Students
        SELECT COUNT(*), COUNT(*) FILTER (WHERE e.last_accessed_at > now() - interval '7 days')
        INTO v_total_enrolled, v_active_students
        FROM public.enrollments e
        JOIN public.classes c ON c.id = e.class_id
        WHERE c.course_id = p_course_id AND e.status = 'ACTIVE';

        -- B. Calculate Average Progress and At-Risk count
        SELECT COALESCE(AVG(percentage), 0), COUNT(*) FILTER (WHERE percentage < 40.0 AND created_at < now() - interval '7 days')
        INTO v_avg_progress, v_at_risk_count
        FROM public.course_progress WHERE course_id = p_course_id;
        v_avg_progress := ROUND(v_avg_progress, 2);

        -- C. Calculate Lesson Completion Rate
        SELECT COALESCE(SUM(cp.total_lessons), 0), COALESCE(SUM(cp.completed_lessons), 0)
        INTO v_total_lessons, v_completed_lessons
        FROM public.course_progress cp WHERE cp.course_id = p_course_id;
        IF v_total_lessons > 0 THEN v_lesson_completion_rate := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2); END IF;

        -- D. Calculate Avg Quiz Score & Pass Rate
        SELECT COALESCE(AVG(qa.score), 0), COUNT(*), COUNT(*) FILTER (WHERE qa.passed = true)
        INTO v_avg_quiz_score, v_quiz_attempts_total, v_quiz_attempts_passed
        FROM public.quiz_attempts qa JOIN public.quizzes q ON q.id = qa.quiz_id
        WHERE q.course_id = p_course_id AND qa.status IN ('graded', 'submitted');
        v_avg_quiz_score := ROUND(v_avg_quiz_score, 2);
        IF v_quiz_attempts_total > 0 THEN v_quiz_pass_rate := ROUND((v_quiz_attempts_passed::numeric / v_quiz_attempts_total::numeric) * 100, 2); END IF;

        -- E. Upsert into course_stats
        INSERT INTO public.course_stats (
            tenant_id, course_id, total_enrolled, active_students, avg_progress,
            avg_quiz_score, lesson_completion_rate, quiz_pass_rate, at_risk_count, 
            last_calculated_at, updated_at, refresh_attempts, last_refresh_error, refresh_locked_at
        )
        VALUES (
            v_tenant_id, p_course_id, v_total_enrolled, v_active_students, v_avg_progress,
            v_avg_quiz_score, v_lesson_completion_rate, v_quiz_pass_rate, v_at_risk_count, 
            now(), now(), 0, NULL, NULL
        )
        ON CONFLICT (course_id)
        DO UPDATE SET 
            total_enrolled = EXCLUDED.total_enrolled, active_students = EXCLUDED.active_students,
            avg_progress = EXCLUDED.avg_progress, avg_quiz_score = EXCLUDED.avg_quiz_score,
            lesson_completion_rate = EXCLUDED.lesson_completion_rate, quiz_pass_rate = EXCLUDED.quiz_pass_rate,
            at_risk_count = EXCLUDED.at_risk_count, last_calculated_at = now(), updated_at = now(),
            refresh_attempts = 0, last_refresh_error = NULL, refresh_locked_at = NULL;

        -- Success: Close the circuit if it was half_open
        IF v_cb.state = 'half_open' THEN
            UPDATE public.analytics_circuit_breaker 
            SET state = 'closed', failure_count = 0, reset_at = NULL 
            WHERE id = 'refresh_course_stats';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Failure: Update mistake tracking
        UPDATE public.course_stats 
        SET refresh_attempts = refresh_attempts + 1, last_refresh_error = SQLERRM, refresh_locked_at = NULL
        WHERE course_id = p_course_id;

        -- Failure: Update circuit breaker
        UPDATE public.analytics_circuit_breaker 
        SET 
            failure_count = failure_count + 1,
            last_failure_at = now(),
            state = CASE WHEN failure_count + 1 >= threshold THEN 'open' ELSE state END,
            reset_at = CASE WHEN failure_count + 1 >= threshold THEN now() + timeout ELSE reset_at END
        WHERE id = 'refresh_course_stats';

        RAISE;
    END;
END;
$$;


ALTER FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") IS 'Refreshes course analytics with locking and retry tracking. Prevents concurrent refreshes within 1 minute.';



CREATE OR REPLACE FUNCTION "public"."refresh_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_week_start timestamp with time zone := date_trunc('week', now());
BEGIN
    -- 1. Refresh scores from user_points
    INSERT INTO public.leaderboards_weekly (tenant_id, class_id, user_id, score, week_start, updated_at)
    SELECT 
        tenant_id,
        class_id,
        user_id,
        SUM(points) as score,
        v_week_start,
        now()
    FROM public.user_points
    WHERE tenant_id = p_tenant_id 
      AND class_id = p_class_id
      AND created_at >= v_week_start
    GROUP BY tenant_id, class_id, user_id
    ON CONFLICT (tenant_id, class_id, user_id, week_start)
    DO UPDATE SET 
        score = EXCLUDED.score,
        updated_at = now();

    -- 2. Recompute ranks
    PERFORM public.recompute_weekly_leaderboard(p_tenant_id, p_class_id, v_week_start);
END;
$$;


ALTER FUNCTION "public"."refresh_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_quiz_id UUID;
    v_course_id UUID;
    v_existing_q_ids UUID[];
    v_new_q_ids UUID[];
    v_q_ids_to_delete UUID[];
    v_question JSONB;
    v_option JSONB;
    v_question_id UUID;
    v_question_count INTEGER;
BEGIN
    IF p_tenant_id != (auth.jwt() ->> 'tenant_id')::uuid THEN
        RAISE EXCEPTION 'Tenant mismatch. Access denied.';
    END IF;

    SELECT m.course_id
    INTO v_course_id
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id
      AND l.tenant_id = p_tenant_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Lesson or course context not found';
    END IF;

    IF (p_quiz_data ->> 'status') = 'published' THEN
        v_question_count := COALESCE(jsonb_array_length(p_quiz_data -> 'questions'), 0);

        IF v_question_count < 1 THEN
            RAISE EXCEPTION 'Publish failed: Quiz must have at least 1 question.';
        END IF;

        FOR v_question IN SELECT * FROM jsonb_array_elements(p_quiz_data -> 'questions')
        LOOP
            IF COALESCE(v_question ->> 'question_type', 'MCQ') IN ('MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT') THEN
                IF jsonb_array_length(COALESCE(v_question -> 'options', '[]'::jsonb)) < 2 THEN
                    RAISE EXCEPTION 'Publish failed: Objective questions must have at least 2 options.';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(COALESCE(v_question -> 'options', '[]'::jsonb)) AS opt
                    WHERE COALESCE((opt ->> 'is_correct')::boolean, false) = true
                ) THEN
                    RAISE EXCEPTION 'Publish failed: Objective questions must have at least 1 correct answer.';
                END IF;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.quizzes (
        id,
        lesson_id,
        course_id,
        class_id,
        origin_class_id,
        tenant_id,
        title,
        instructions,
        max_attempts,
        passing_score,
        shuffle_questions,
        shuffle_options,
        time_limit_minutes,
        show_correct_answers,
        available_from,
        available_until,
        mode,
        status
    )
    VALUES (
        COALESCE((p_quiz_data ->> 'id')::uuid, gen_random_uuid()),
        p_lesson_id,
        v_course_id,
        NULL,
        NULL,
        p_tenant_id,
        COALESCE(NULLIF(p_quiz_data ->> 'title', ''), 'Kuis Baru'),
        NULLIF(p_quiz_data ->> 'instructions', ''),
        COALESCE((p_quiz_data ->> 'max_attempts')::integer, 1),
        COALESCE((p_quiz_data ->> 'passing_score')::integer, 70),
        COALESCE((p_quiz_data ->> 'shuffle_questions')::boolean, false),
        COALESCE((p_quiz_data ->> 'shuffle_options')::boolean, false),
        NULLIF(p_quiz_data ->> 'time_limit_minutes', '')::integer,
        COALESCE((p_quiz_data ->> 'show_correct_answers')::boolean, false),
        NULLIF(p_quiz_data ->> 'available_from', '')::timestamptz,
        NULLIF(p_quiz_data ->> 'available_until', '')::timestamptz,
        COALESCE((p_quiz_data ->> 'mode')::quiz_mode, 'graded'),
        COALESCE((p_quiz_data ->> 'status')::quiz_status, 'draft')
    )
    ON CONFLICT (id) DO UPDATE SET
        lesson_id = EXCLUDED.lesson_id,
        course_id = EXCLUDED.course_id,
        class_id = NULL,
        origin_class_id = NULL,
        title = EXCLUDED.title,
        instructions = EXCLUDED.instructions,
        max_attempts = EXCLUDED.max_attempts,
        passing_score = EXCLUDED.passing_score,
        shuffle_questions = EXCLUDED.shuffle_questions,
        shuffle_options = EXCLUDED.shuffle_options,
        time_limit_minutes = EXCLUDED.time_limit_minutes,
        show_correct_answers = EXCLUDED.show_correct_answers,
        available_from = EXCLUDED.available_from,
        available_until = EXCLUDED.available_until,
        mode = EXCLUDED.mode,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id INTO v_quiz_id;

    SELECT ARRAY(
        SELECT id FROM public.quiz_questions WHERE quiz_id = v_quiz_id
    ) INTO v_existing_q_ids;

    SELECT ARRAY(
        SELECT (q ->> 'id')::uuid
        FROM jsonb_array_elements(COALESCE(p_quiz_data -> 'questions', '[]'::jsonb)) AS q
        WHERE q ->> 'id' IS NOT NULL
    ) INTO v_new_q_ids;

    v_q_ids_to_delete := ARRAY(
        SELECT unnest(COALESCE(v_existing_q_ids, ARRAY[]::uuid[]))
        EXCEPT
        SELECT unnest(COALESCE(v_new_q_ids, ARRAY[]::uuid[]))
    );

    IF array_length(v_q_ids_to_delete, 1) > 0 THEN
        DELETE FROM public.quiz_questions WHERE id = ANY(v_q_ids_to_delete);
    END IF;

    FOR v_question IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_quiz_data -> 'questions', '[]'::jsonb))
    LOOP
        INSERT INTO public.quiz_questions (
            id,
            quiz_id,
            tenant_id,
            text,
            "order",
            question_type,
            points,
            explanation
        )
        VALUES (
            COALESCE((v_question ->> 'id')::uuid, gen_random_uuid()),
            v_quiz_id,
            p_tenant_id,
            COALESCE(v_question ->> 'text', ''),
            COALESCE((v_question ->> 'order')::integer, 1),
            COALESCE((v_question ->> 'question_type')::question_type, 'MCQ'),
            COALESCE((v_question ->> 'points')::integer, 1),
            NULLIF(v_question ->> 'explanation', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            "order" = EXCLUDED."order",
            question_type = EXCLUDED.question_type,
            points = EXCLUDED.points,
            explanation = EXCLUDED.explanation
        RETURNING id INTO v_question_id;

        DELETE FROM public.quiz_options WHERE question_id = v_question_id;

        FOR v_option IN
            SELECT value
            FROM jsonb_array_elements(COALESCE(v_question -> 'options', '[]'::jsonb))
        LOOP
            INSERT INTO public.quiz_options (question_id, tenant_id, text, is_correct)
            VALUES (
                v_question_id,
                p_tenant_id,
                COALESCE(v_option ->> 'text', ''),
                COALESCE((v_option ->> 'is_correct')::boolean, false)
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'quiz_id', v_quiz_id,
        'status', COALESCE(p_quiz_data ->> 'status', 'draft'),
        'success', true
    );
END;
$$;


ALTER FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer DEFAULT 5) RETURNS TABLE("resource_id" "uuid", "lesson_id" "uuid", "content" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_questions"("p_subject_id" "uuid" DEFAULT NULL::"uuid", "p_topic_id" "uuid" DEFAULT NULL::"uuid", "p_difficulty_level" integer DEFAULT NULL::integer, "p_question_type" "text" DEFAULT NULL::"text", "p_search_query" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "subject_id" "uuid", "topic_id" "uuid", "question_type" "text", "question_text" "text", "difficulty_level" integer, "created_at" timestamp with time zone, "tags" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
        q.question_type::TEXT,
        q.question_text,
        q.difficulty_level,
        q.created_at,
        ARRAY(SELECT qt.tag FROM public.question_tags qt WHERE qt.question_id = q.id) as tags
    FROM public.question_bank q
    WHERE
        q.tenant_id = v_tenant_id
        AND q.is_archived = FALSE
        AND (p_subject_id IS NULL OR q.subject_id = p_subject_id)
        AND (p_topic_id IS NULL OR q.topic_id = p_topic_id)
        AND (p_difficulty_level IS NULL OR q.difficulty_level = p_difficulty_level)
        AND (p_question_type IS NULL OR q.question_type::TEXT = p_question_type)
        AND (p_search_query IS NULL OR q.question_text ILIKE '%' || p_search_query || '%')
        AND (p_tags IS NULL OR EXISTS (
            SELECT 1 FROM public.question_tags qt
            WHERE qt.question_id = q.id AND qt.tag = ANY(p_tags)
        ))
    ORDER BY q.created_at DESC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0);
END;
$$;


ALTER FUNCTION "public"."search_questions"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_difficulty_level" integer, "p_question_type" "text", "p_search_query" "text", "p_tags" "text"[], "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_learning_event_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Auto-set tenant_id from JWT if not provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    END IF;
    
    -- Auto-set user_id from JWT if not provided
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_learning_event_tenant"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."sync_points_to_weekly_leaderboard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_week_start timestamp with time zone := date_trunc('week', now());
BEGIN
    IF NEW.class_id IS NOT NULL THEN
        INSERT INTO public.leaderboards_weekly (tenant_id, class_id, user_id, score, week_start, updated_at)
        VALUES (NEW.tenant_id, NEW.class_id, NEW.user_id, NEW.points, v_week_start, now())
        ON CONFLICT (tenant_id, class_id, user_id, week_start)
        DO UPDATE SET 
            score = public.leaderboards_weekly.score + EXCLUDED.score,
            updated_at = now();
            
        -- Note: Frequent rank recompute might be expensive; 
        -- usually recomputed on-demand or by cron.
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_points_to_weekly_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_points_to_leaderboard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update all leaderboard entries for this user with their new total points
    UPDATE public.leaderboards
    SET 
        points = NEW.points,
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND tenant_id = NEW.tenant_id;
      
    RETURN NEW;
END $$;


ALTER FUNCTION "public"."sync_user_points_to_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_analytics_security"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_test_course_id uuid;
    v_other_tenant_course_id uuid;
    v_error_msg text;
BEGIN
    -- This RPC should ideally be run in a test environment or by an admin
    -- We'll simulate checks by attempting operations (where possible in SQL)
    
    -- TEST 1: Check if course_stats exists
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_stats' AND table_schema = 'public') THEN
            v_results := v_results || jsonb_build_object('test', 'course_stats_exists', 'status', 'PASSED');
        ELSE
            v_results := v_results || jsonb_build_object('test', 'course_stats_exists', 'status', 'FAILED');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_object('test', 'course_stats_exists', 'status', 'ERROR', 'msg', SQLERRM);
    END;

    -- TEST 2: Check RLS on course_stats
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_stats' AND rowsecurity = true) THEN
            v_results := v_results || jsonb_build_object('test', 'course_stats_rls_enabled', 'status', 'PASSED');
        ELSE
            v_results := v_results || jsonb_build_object('test', 'course_stats_rls_enabled', 'status', 'FAILED');
        END IF;
    END;

    -- TEST 3: Verify analytics_audit exists
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_audit' AND table_schema = 'public') THEN
            v_results := v_results || jsonb_build_object('test', 'analytics_audit_exists', 'status', 'PASSED');
        ELSE
            v_results := v_results || jsonb_build_object('test', 'analytics_audit_exists', 'status', 'FAILED');
        END IF;
    END;

    -- TEST 4: Verify health check
    BEGIN
        PERFORM public.analytics_health_check();
        v_results := v_results || jsonb_build_object('test', 'health_check_rpc', 'status', 'PASSED');
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_object('test', 'health_check_rpc', 'status', 'FAILED', 'msg', SQLERRM);
    END;

    -- Assemble final report
    RETURN jsonb_build_object(
        'success', (SELECT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_results) x WHERE x->>'status' = 'FAILED')),
        'tests', v_results,
        'timestamp', now()
    );
END;
$$;


ALTER FUNCTION "public"."test_analytics_security"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_analytics_security"() IS 'Runs a suite of sanity checks and security validations for the analytics system.';



CREATE OR REPLACE FUNCTION "public"."trg_update_quiz_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_score NUMERIC(5,2);
    v_is_first_attempt BOOLEAN;
BEGIN
    IF NEW.status != 'graded' OR (OLD.status = 'graded') THEN
        RETURN NEW;
    END IF;

    v_new_score := COALESCE(NEW.score, 0);

    v_is_first_attempt := NOT EXISTS(
        SELECT 1 FROM public.quiz_attempts_v2  -- was: quiz_attempts (VIEW)
        WHERE quiz_id = NEW.quiz_id
          AND student_id = NEW.student_id
          AND status = 'graded'
          AND id != NEW.id
    );

    -- Upsert quiz_stats
    INSERT INTO public.quiz_stats (
        quiz_id, tenant_id, total_attempts, total_unique_students,
        avg_score, highest_score, lowest_score, pass_rate, updated_at
    )
    VALUES (
        NEW.quiz_id, NEW.tenant_id, 1,
        CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        v_new_score, v_new_score, v_new_score,
        CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END,
        now()
    )
    ON CONFLICT (quiz_id) DO UPDATE SET
        total_attempts      = quiz_stats.total_attempts + 1,
        total_unique_students = quiz_stats.total_unique_students
                              + CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        avg_score           = ROUND(
            ((quiz_stats.avg_score * quiz_stats.total_attempts) + v_new_score)
            / (quiz_stats.total_attempts + 1), 2
        ),
        highest_score       = GREATEST(quiz_stats.highest_score, v_new_score),
        lowest_score        = LEAST(quiz_stats.lowest_score, v_new_score),
        pass_rate           = ROUND(
            ((quiz_stats.pass_rate * quiz_stats.total_attempts)
             + CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END)
            / (quiz_stats.total_attempts + 1), 2
        ),
        updated_at          = now();

    -- Upsert question_stats
    INSERT INTO public.question_stats (
        question_id, quiz_id, tenant_id,
        total_answers, correct_answers, difficulty_rate, updated_at
    )
    SELECT
        aq.question_id, NEW.quiz_id, NEW.tenant_id, 1,
        CASE WHEN aq.is_correct THEN 1 ELSE 0 END,
        CASE WHEN aq.is_correct THEN 100.0 ELSE 0.0 END,
        now()
    FROM public.quiz_attempt_questions_v2 aq  -- was: quiz_attempt_questions (VIEW)
    WHERE aq.attempt_id = NEW.id
      AND aq.is_correct IS NOT NULL
    ON CONFLICT (question_id, quiz_id) DO UPDATE SET
        total_answers   = question_stats.total_answers + 1,
        correct_answers = question_stats.correct_answers
                        + CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END,
        difficulty_rate = ROUND(
            ((question_stats.correct_answers
              + CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END)::NUMERIC
             / (question_stats.total_answers + 1)::NUMERIC) * 100, 2
        ),
        updated_at      = now();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_update_quiz_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_attempt_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN

    IF OLD.status IS DISTINCT FROM NEW.status THEN

        IF NOT validate_attempt_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION
            'Invalid attempt state transition: % -> %',
            OLD.status,
            NEW.status;
        END IF;

    END IF;

    RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."trg_validate_attempt_status_change"() OWNER TO "postgres";


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
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (
            NEW.tenant_id,
            NEW.student_id,  -- was: NEW.user_id (bug)
            'QUIZ_PASSED',
            jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score)
        );
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


CREATE OR REPLACE FUNCTION "public"."update_question"("p_question_id" "uuid", "p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    IF NOT EXISTS (SELECT 1 FROM public.question_bank WHERE id = p_question_id AND tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Question not found or access denied';
    END IF;

    -- Safety Check: Cannot modify question used in active attempt
    -- FIX: uses question_bank_id (not non-existent question_id column)
    SELECT COUNT(*) INTO v_active_attempts
    FROM public.quiz_attempts qa
    JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
    WHERE qq.question_bank_id = p_question_id
      AND qa.status = 'in_progress'::public.quiz_attempt_status;

    IF v_active_attempts > 0 THEN
        RAISE EXCEPTION 'Cannot modify question. It is currently in use in % active attempt(s).', v_active_attempts;
    END IF;

    -- Update main question table
    UPDATE public.question_bank
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
        DELETE FROM public.question_options WHERE question_id = p_question_id;

        FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
        LOOP
            INSERT INTO public.question_options (
                question_id, option_text, is_correct, order_index
            )
            VALUES (
                p_question_id,
                v_option->>'option_text',
                COALESCE((v_option->>'is_correct')::BOOLEAN, FALSE),
                COALESCE((v_option->>'order_index')::INTEGER, 0)
            );
        END LOOP;

        -- CRITICAL: Also update quiz_options for any quiz_questions linked to this bank question
        -- This keeps grading pipeline in sync when teacher edits a bank question
        -- Only for quizzes that are NOT currently in active attempts (already checked above)
        UPDATE public.quiz_questions
        SET text = COALESCE(p_question_text, text)
        WHERE question_bank_id = p_question_id AND tenant_id = v_tenant_id;

        -- Re-sync quiz_options for linked quiz_questions
        -- Delete old quiz_options and re-copy from question_options
        DELETE FROM public.quiz_options
        WHERE question_id IN (
            SELECT id FROM public.quiz_questions
            WHERE question_bank_id = p_question_id AND tenant_id = v_tenant_id
        );

        INSERT INTO public.quiz_options (question_id, text, is_correct, tenant_id)
        SELECT
            qq.id,
            qo.option_text,
            qo.is_correct,
            qq.tenant_id
        FROM public.quiz_questions qq
        JOIN public.question_options qo ON qo.question_id = qq.question_bank_id
        WHERE qq.question_bank_id = p_question_id AND qq.tenant_id = v_tenant_id;
    END IF;

    -- Update tags (full replace)
    IF p_tags IS NOT NULL THEN
        DELETE FROM public.question_tags WHERE question_id = p_question_id;

        IF array_length(p_tags, 1) > 0 THEN
            FOREACH v_tag IN ARRAY p_tags
            LOOP
                INSERT INTO public.question_tags (question_id, tag)
                VALUES (p_question_id, v_tag);
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;


ALTER FUNCTION "public"."update_question"("p_question_id" "uuid", "p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_question_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN

    NEW.updated_at = now();

    RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."update_question_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quiz_assignment_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_quiz_assignment_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_today date := current_date;
    v_last_activity date;
    v_current_streak integer;
    v_longest_streak integer;
    v_bonus_xp integer := 0;
BEGIN
    -- Get existing streak data
    SELECT last_activity_date, current_streak, longest_streak 
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM public.user_streaks
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    -- If no record, initialize
    IF v_last_activity IS NULL THEN
        v_current_streak := 1;
        v_longest_streak := 1;
        v_bonus_xp := 5; -- Base bonus for starting
    ELSIF v_last_activity = v_today THEN
        -- Already active today, no change
        RETURN 0;
    ELSIF v_last_activity = v_today - 1 THEN
        -- Activity yesterday, increment streak
        v_current_streak := v_current_streak + 1;
        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;
        
        -- Bonus XP logic
        IF v_current_streak % 30 = 0 THEN
            v_bonus_xp := 30; -- 30-day milestone
        ELSIF v_current_streak % 7 = 0 THEN
            v_bonus_xp := 10; -- Weekly milestone
        ELSE
            v_bonus_xp := 5; -- Daily bonus
        END IF;
    ELSE
        -- Streak broken
        v_current_streak := 1;
        v_bonus_xp := 5;
    END IF;

    -- UPSERT streak data
    INSERT INTO public.user_streaks (user_id, tenant_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (p_user_id, p_tenant_id, v_current_streak, v_longest_streak, v_today, now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = now();

    RETURN v_bonus_xp;
END;
$$;


ALTER FUNCTION "public"."update_streak"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_checkout_submission_queue"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    -- atomically lock and update one pending ticket
    UPDATE public.quiz_submission_queue
    SET status = 'PROCESSING'
    WHERE id = (
        SELECT id FROM public.quiz_submission_queue
        WHERE status = 'PENDING'
        ORDER BY submitted_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING id, attempt_id, tenant_id, payload INTO v_ticket;

    IF v_ticket.id IS NULL THEN
        RETURN NULL; -- No pending submissions
    END IF;

    RETURN jsonb_build_object(
        'ticket_id', v_ticket.id,
        'attempt_id', v_ticket.attempt_id,
        'tenant_id', v_ticket.tenant_id,
        'payload', v_ticket.payload
    );
END;
$$;


ALTER FUNCTION "public"."v1_checkout_submission_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_get_assignment_results"("p_assignment_id" "uuid") RETURNS TABLE("attempt_id" "uuid", "student_id" "uuid", "student_name" "text", "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "score" numeric, "status" "text", "passed" boolean, "time_spent" integer, "quiz_id" "uuid", "quiz_title" "text", "passing_score" integer, "max_attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin BOOLEAN := FALSE;
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

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'super_admin')
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


ALTER FUNCTION "public"."v1_get_assignment_results"("p_assignment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_get_quiz_results"("p_quiz_id" "uuid") RETURNS TABLE("attempt_id" "uuid", "student_id" "uuid", "student_name" "text", "started_at" timestamp with time zone, "submitted_at" timestamp with time zone, "score" numeric, "status" "public"."attempt_status", "passed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."v1_get_quiz_results"("p_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_save_answer"("p_attempt_id" "uuid", "p_question_id" "uuid", "p_selected_option_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_text_answer" "text" DEFAULT NULL::"text", "p_client_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_student_answer JSONB;
BEGIN
    IF p_text_answer IS NOT NULL AND btrim(p_text_answer) <> '' THEN
        v_student_answer := to_jsonb(p_text_answer);
    ELSE
        v_student_answer := to_jsonb(COALESCE(p_selected_option_ids, ARRAY[]::uuid[]));
    END IF;

    RETURN public.v1_save_partial_answers(
        p_attempt_id,
        jsonb_build_array(
            jsonb_build_object(
                'question_id', p_question_id,
                'student_answers', v_student_answer,
                'client_version', p_client_version
            )
        )
    );
END;
$$;


ALTER FUNCTION "public"."v1_save_answer"("p_attempt_id" "uuid", "p_question_id" "uuid", "p_selected_option_ids" "uuid"[], "p_text_answer" "text", "p_client_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_save_partial_answers"("p_attempt_id" "uuid", "p_answers" "jsonb", "p_client_version" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_attempt RECORD;
    v_answer RECORD;
    v_question_id UUID;
    v_student_answer JSONB;
    v_current_version INTEGER;
    v_previous_answers JSONB;
    v_item_client_version INTEGER;
    v_effective_version INTEGER;
BEGIN
    v_tenant_id := get_my_tenant_id();

    SELECT id, tenant_id, student_id, status, expires_at, question_manifest, started_at
    INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    IF v_attempt.status != 'in_progress' THEN
        RAISE EXCEPTION 'Attempt is not in progress' USING ERRCODE = 'P0003';
    END IF;

    -- Match 30s grace period
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'Attempt has expired' USING ERRCODE = 'P0004';
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := (v_answer.value->>'question_id')::UUID;
        v_student_answer := v_answer.value->'student_answers';
        
        v_item_client_version := COALESCE((v_answer.value->>'client_version')::INTEGER, p_client_version);

        IF NOT (v_question_id = ANY(v_attempt.question_manifest)) THEN
            RAISE EXCEPTION 'Invalid question_id for this attempt manifest: %', v_question_id USING ERRCODE = 'P0005';
        END IF;

        -- OPTIMISTIC LOCKING: Lock the specific question row
        SELECT answer_version, student_answers
        INTO v_current_version, v_previous_answers
        FROM public.quiz_attempt_questions_v2
        WHERE attempt_id = p_attempt_id 
          AND question_id = v_question_id 
          AND started_at = v_attempt.started_at
        FOR UPDATE;

        IF v_current_version IS NOT NULL THEN
            IF v_item_client_version IS NOT NULL AND v_item_client_version <= v_current_version THEN
                CONTINUE; 
            END IF;
        END IF;

        v_effective_version := COALESCE(v_item_client_version, COALESCE(v_current_version, 0) + 1);

        -- AUDIT TRAIL
        IF v_previous_answers IS NOT NULL AND v_previous_answers IS DISTINCT FROM v_student_answer THEN
            INSERT INTO public.quiz_answer_history (
                tenant_id, attempt_id, question_id, previous_answers, new_answers, client_version, changed_at
            ) VALUES (
                v_tenant_id, p_attempt_id, v_question_id, v_previous_answers, v_student_answer, v_effective_version, now()
            );
        END IF;

        -- UPSERT the answer
        INSERT INTO public.quiz_attempt_questions_v2 (
            attempt_id, started_at, question_id, tenant_id, student_answers, answer_version, updated_at
        )
        VALUES (
            v_attempt.id, v_attempt.started_at, v_question_id, v_tenant_id, v_student_answer, v_effective_version, now()
        )
        ON CONFLICT (attempt_id, question_id, started_at) 
        DO UPDATE SET 
            student_answers = EXCLUDED.student_answers,
            answer_version = EXCLUDED.answer_version,
            updated_at = EXCLUDED.updated_at;

    END LOOP;

    UPDATE public.quiz_attempts_v2
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id AND status = 'in_progress';

    RETURN jsonb_build_object(
        'success', true,
        'saved_at', now()
    );
END;
$$;


ALTER FUNCTION "public"."v1_save_partial_answers"("p_attempt_id" "uuid", "p_answers" "jsonb", "p_client_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_start_attempt"("p_quiz_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_new_attempt_id UUID := gen_random_uuid();
    v_attempt_seed UUID := gen_random_uuid();
    v_quiz RECORD;
    v_previous_attempts INTEGER;
    v_manifest UUID[];
    v_expires_at TIMESTAMPTZ;
    v_existing_attempt RECORD;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Fetch Quiz Configuration & Ensure Eligibility
    SELECT id, mode, time_limit_minutes, max_attempts, available_from, available_until, status, shuffle_questions
    INTO v_quiz
    FROM public.quizzes
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
    END IF;

    -- Check if quiz is active
    IF v_quiz.available_from IS NOT NULL AND now() < v_quiz.available_from THEN
        RAISE EXCEPTION 'Quiz is not yet available' USING ERRCODE = 'P0003';
    END IF;
    IF v_quiz.available_until IS NOT NULL AND now() > v_quiz.available_until THEN
        RAISE EXCEPTION 'Quiz is no longer available' USING ERRCODE = 'P0004';
    END IF;

    -- Auto-abandon expired IN_PROGRESS attempts before checking
    UPDATE public.quiz_attempts_v2
    SET status = 'abandoned'
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'in_progress'
      AND expires_at < now();

    -- Enforce Attempt Limits
    SELECT COUNT(*) INTO v_previous_attempts
    FROM public.quiz_attempts_v2
    WHERE quiz_id = p_quiz_id AND student_id = v_student_id;

    IF v_quiz.max_attempts IS NOT NULL AND v_previous_attempts >= v_quiz.max_attempts THEN
        RAISE EXCEPTION 'Maximum attempts exceeded' USING ERRCODE = 'P0005';
    END IF;

    -- Check for existing active (non-expired) attempt — allow resume
    SELECT id, started_at, expires_at, question_manifest, attempt_number, attempt_seed
    INTO v_existing_attempt
    FROM public.quiz_attempts_v2 
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'in_progress'
      AND expires_at >= now()
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        -- Return existing attempt for resume instead of error
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'status', 'in_progress',
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at,
            'question_manifest', v_existing_attempt.question_manifest,
            'attempt_number', v_existing_attempt.attempt_number,
            'attempt_seed', v_existing_attempt.attempt_seed,
            'is_adaptive', false
        );
    END IF;

    -- 2. Build the Snapshot Manifest from quiz_questions (with deterministic shuffle if enabled)
    IF COALESCE(v_quiz.shuffle_questions, false) THEN
        SELECT ARRAY(
            SELECT id FROM public.quiz_questions 
            WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id
            ORDER BY md5(id::text || v_attempt_seed::text) ASC
        ) INTO v_manifest;
    ELSE
        SELECT ARRAY(
            SELECT id FROM public.quiz_questions 
            WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id
            ORDER BY "order" ASC
        ) INTO v_manifest;
    END IF;

    -- 3. Calculate Expiration
    IF v_quiz.time_limit_minutes IS NOT NULL AND v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        v_expires_at := now() + interval '24 hours';
    END IF;

    -- 4. Insert V2 Attempt
    INSERT INTO public.quiz_attempts_v2 (
        id, tenant_id, quiz_id, student_id, started_at, status, 
        expires_at, question_manifest, attempt_number, attempt_seed
    )
    VALUES (
        v_new_attempt_id, v_tenant_id, p_quiz_id, v_student_id, now(), 'in_progress', 
        v_expires_at, v_manifest, v_previous_attempts + 1, v_attempt_seed
    );

    -- Return API Contract matched payload
    RETURN jsonb_build_object(
        'attempt_id', v_new_attempt_id,
        'status', 'in_progress',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', v_manifest,
        'attempt_number', v_previous_attempts + 1,
        'attempt_seed', v_attempt_seed,
        'is_adaptive', false
    );
END;
$$;


ALTER FUNCTION "public"."v1_start_attempt"("p_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_quiz RECORD;
    v_attempt_id UUID;
    v_existing_attempt RECORD;
    v_expires_at TIMESTAMPTZ;
    v_attempt_number INTEGER;
    v_max_attempts INTEGER;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Ensure quiz exists and belongs to the tenant
    SELECT * INTO v_quiz 
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0001';
    END IF;

    -- Guard 1: Return existing attempt if in_progress and not expired
    SELECT id, status, started_at, expires_at INTO v_existing_attempt
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'in_progress';

    IF v_existing_attempt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'status', v_existing_attempt.status,
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at
        );
    END IF;

    -- Calculate next attempt_number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id AND student_id = v_student_id;
    
    -- Check max attempts guard
    v_max_attempts := COALESCE(v_quiz.max_attempts, 3);
    IF v_attempt_number > v_max_attempts AND v_max_attempts > 0 THEN
        RAISE EXCEPTION 'Maximum attempts reached' USING ERRCODE = 'P0005';
    END IF;

    -- Calculate Expiration
    IF v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        -- Default to 24 hours if no time limit
        v_expires_at := now() + INTERVAL '24 hours';
    END IF;

    -- Create New Attempt
    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at, attempt_seed, attempt_number
    ) VALUES (
        p_quiz_id, v_student_id, v_tenant_id, 'in_progress', now(), v_expires_at, gen_random_uuid(), v_attempt_number
    ) RETURNING id INTO v_attempt_id;

    -- Snapshot Questions (With Randomization/Shuffling)
    -- We order by random() seeded by the attempt_seed if needed, or just random() 
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index, question_type, points_earned, max_points
    )
    SELECT 
        v_attempt_id,
        id,
        v_tenant_id,
        text,
        explanation,
        row_number() OVER (ORDER BY random()) AS order_index,
        question_type,
        0,
        points
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    AND tenant_id = v_tenant_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'in_progress',
        'recovered', false,
        'attempt_number', v_attempt_number,
        'started_at', now(),
        'expires_at', v_expires_at
    );
END;
$$;


ALTER FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid", "p_assignment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_new_attempt_id UUID := gen_random_uuid();
    v_attempt_seed UUID := gen_random_uuid();
    v_quiz RECORD;
    v_assignment RECORD;
    v_existing_attempt RECORD;
    v_manifest UUID[];
    v_expires_at TIMESTAMPTZ;
    v_available_from TIMESTAMPTZ;
    v_due_at TIMESTAMPTZ;
    v_attempt_number INTEGER;
    v_effective_max_attempts INTEGER;
    v_is_authorized BOOLEAN := FALSE;
    v_scope_lock_key TEXT;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found' USING ERRCODE = 'P0001';
    END IF;

    SELECT
        id,
        lesson_id,
        course_id,
        origin_class_id,
        tenant_id,
        status,
        time_limit_minutes,
        max_attempts,
        available_from,
        available_until,
        shuffle_questions,
        show_correct_answers,
        passing_score
    INTO v_quiz
    FROM public.quizzes
    WHERE id = p_quiz_id
      AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_quiz.status <> 'published' THEN
        RAISE EXCEPTION 'Quiz is not published' USING ERRCODE = 'P0003';
    END IF;

    IF p_assignment_id IS NOT NULL THEN
        SELECT
            qa.id,
            qa.class_id,
            qa.available_from,
            qa.due_at,
            qa.max_attempts,
            qa.status
        INTO v_assignment
        FROM public.quiz_assignments qa
        WHERE qa.id = p_assignment_id
          AND qa.quiz_id = p_quiz_id
          AND qa.tenant_id = v_tenant_id;

        IF v_assignment.id IS NULL THEN
            RAISE EXCEPTION 'Quiz assignment not found' USING ERRCODE = 'P0004';
        END IF;

        IF v_assignment.status IN ('draft', 'ended') THEN
            RAISE EXCEPTION 'Quiz assignment is not active' USING ERRCODE = 'P0005';
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.class_id = v_assignment.class_id
              AND e.student_id = v_student_id
              AND e.tenant_id = v_tenant_id
              AND e.status = 'ACTIVE'
        ) INTO v_is_authorized;

        IF NOT v_is_authorized THEN
            RAISE EXCEPTION 'Unauthorized: not enrolled in assigned class' USING ERRCODE = 'P0006';
        END IF;

        v_available_from := COALESCE(v_assignment.available_from, v_quiz.available_from);
        v_due_at := COALESCE(v_assignment.due_at, v_quiz.available_until);
        v_effective_max_attempts := COALESCE(v_assignment.max_attempts, v_quiz.max_attempts, 0);
        v_scope_lock_key := 'assignment:' || p_assignment_id::text || ':' || v_student_id::text;
    ELSE
        IF v_quiz.lesson_id IS NULL THEN
            RAISE EXCEPTION 'Standalone quiz requires assignment context' USING ERRCODE = 'P0007';
        END IF;

        IF v_quiz.course_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = v_quiz.course_id
                  AND ce.user_id = v_student_id
                  AND ce.tenant_id = v_tenant_id
                  AND ce.status = 'ACTIVE'
            ) INTO v_is_authorized;
        END IF;

        IF NOT v_is_authorized AND v_quiz.origin_class_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.enrollments e
                WHERE e.class_id = v_quiz.origin_class_id
                  AND e.student_id = v_student_id
                  AND e.tenant_id = v_tenant_id
                  AND e.status = 'ACTIVE'
            ) INTO v_is_authorized;
        END IF;

        IF NOT v_is_authorized THEN
            RAISE EXCEPTION 'Unauthorized: not enrolled in lesson context' USING ERRCODE = 'P0008';
        END IF;

        v_available_from := v_quiz.available_from;
        v_due_at := v_quiz.available_until;
        v_effective_max_attempts := COALESCE(v_quiz.max_attempts, 0);
        v_scope_lock_key := 'lesson:' || p_quiz_id::text || ':' || v_student_id::text;
    END IF;

    IF v_available_from IS NOT NULL AND now() < v_available_from THEN
        RAISE EXCEPTION 'Quiz is not yet available' USING ERRCODE = 'P0009';
    END IF;

    IF v_due_at IS NOT NULL AND now() > v_due_at THEN
        RAISE EXCEPTION 'Quiz is no longer available' USING ERRCODE = 'P0010';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_scope_lock_key));

    UPDATE public.quiz_attempts_v2
    SET status = 'ABANDONED'
    WHERE student_id = v_student_id
      AND status = 'IN_PROGRESS'
      AND expires_at < now()
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      );

    SELECT
        id,
        started_at,
        expires_at,
        question_manifest,
        attempt_number,
        assignment_id,
        attempt_seed
    INTO v_existing_attempt
    FROM public.quiz_attempts_v2
    WHERE student_id = v_student_id
      AND status = 'IN_PROGRESS'
      AND expires_at >= now()
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      )
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'assignment_id', v_existing_attempt.assignment_id,
            'status', 'IN_PROGRESS',
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at,
            'question_manifest', v_existing_attempt.question_manifest,
            'attempt_number', v_existing_attempt.attempt_number,
            'attempt_seed', v_existing_attempt.attempt_seed
        );
    END IF;

    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.quiz_attempts_v2
    WHERE student_id = v_student_id
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      );

    IF v_effective_max_attempts > 0 AND v_attempt_number > v_effective_max_attempts THEN
        RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_effective_max_attempts USING ERRCODE = 'P0011';
    END IF;

    IF v_quiz.shuffle_questions THEN
        SELECT ARRAY(
            SELECT qq.id
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = p_quiz_id
              AND qq.tenant_id = v_tenant_id
            ORDER BY md5(qq.id::text || v_attempt_seed::text) ASC
        ) INTO v_manifest;
    ELSE
        SELECT ARRAY(
            SELECT qq.id
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = p_quiz_id
              AND qq.tenant_id = v_tenant_id
            ORDER BY qq."order" ASC
        ) INTO v_manifest;
    END IF;

    IF COALESCE(v_quiz.time_limit_minutes, 0) > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        v_expires_at := now() + INTERVAL '24 hours';
    END IF;

    INSERT INTO public.quiz_attempts_v2 (
        id,
        tenant_id,
        quiz_id,
        assignment_id,
        student_id,
        started_at,
        status,
        expires_at,
        question_manifest,
        attempt_number,
        attempt_seed,
        last_heartbeat_at
    )
    VALUES (
        v_new_attempt_id,
        v_tenant_id,
        p_quiz_id,
        p_assignment_id,
        v_student_id,
        now(),
        'IN_PROGRESS',
        v_expires_at,
        COALESCE(v_manifest, ARRAY[]::uuid[]),
        v_attempt_number,
        v_attempt_seed,
        now()
    );

    RETURN jsonb_build_object(
        'attempt_id', v_new_attempt_id,
        'assignment_id', p_assignment_id,
        'status', 'IN_PROGRESS',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', COALESCE(v_manifest, ARRAY[]::uuid[]),
        'attempt_number', v_attempt_number,
        'attempt_seed', v_attempt_seed
    );
END;
$$;


ALTER FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid", "p_assignment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_attempt RECORD;
    v_total_score NUMERIC := 0;
    v_correct_count INTEGER := 0;
    v_incorrect_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_q RECORD;
    v_is_correct BOOLEAN;
    v_points_earned NUMERIC;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Fetch and explicitly lock Attempt
    SELECT id, tenant_id, student_id, status, expires_at INTO v_attempt
    FROM public.quiz_attempts
    WHERE id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    -- Anti Double Submit (Idempotency check)
    IF v_attempt.status IN ('submitted', 'graded') THEN
        RETURN jsonb_build_object(
            'status', v_attempt.status,
            'message', 'Already submitted'
        );
    END IF;

    -- Timer enforcement verification (mark EXPIRED if past due, but still grade what we have)
    -- Wait, if it's expired we still grade and submit, but maybe track status='expired'?
    -- Often LMS treats auto-submit of an expired as SUBMITTED but with an expired timestamp.
    -- Let's just grade it as is. 

    -- ANTI DOUBLE SUBMIT LOCK
    UPDATE public.quiz_attempts
    SET status = 'submitted', submitted_at = now()
    WHERE id = p_attempt_id AND status = 'in_progress';

    IF NOT FOUND THEN
        -- Another transaction beat us to the update
        RETURN jsonb_build_object('status', 'submitted', 'message', 'Already submitted');
    END IF;

    -- ========================
    -- RESULT CALCULATION ENGINE
    -- ========================

    FOR v_q IN 
        SELECT 
            qaq.question_id, 
            qaq.selected_option_ids, 
            qaq.question_type, 
            qaq.max_points,
            ARRAY(
                SELECT id FROM public.quiz_options qo 
                WHERE qo.question_id = qaq.question_id AND qo.is_correct = true
            ) as correct_option_ids
        FROM public.quiz_attempt_questions qaq
        WHERE qaq.attempt_id = p_attempt_id
    LOOP
        v_is_correct := false;
        v_points_earned := 0;

        IF array_length(v_q.selected_option_ids, 1) IS NULL THEN
            -- Unanswered
            v_unanswered_count := v_unanswered_count + 1;
        ELSIF v_q.question_type IN ('MCQ', 'TRUE_FALSE') THEN
            -- Single choice strict grading
            IF array_length(v_q.correct_option_ids, 1) > 0 AND v_q.selected_option_ids[1] = v_q.correct_option_ids[1] THEN
                v_is_correct := true;
                v_points_earned := v_q.max_points;
                v_correct_count := v_correct_count + 1;
            ELSE
                v_incorrect_count := v_incorrect_count + 1;
            END IF;
        ELSE
            -- Treat others as needing manual grading for now or incorrect
            v_incorrect_count := v_incorrect_count + 1;
        END IF;

        -- Update the individual question result
        UPDATE public.quiz_attempt_questions
        SET 
            is_correct = v_is_correct,
            points_earned = v_points_earned,
            graded_at = now()
        WHERE attempt_id = p_attempt_id AND question_id = v_q.question_id;

        -- Accumulate
        v_total_score := v_total_score + v_points_earned;
    END LOOP;

    -- Update the final Attempt Score
    UPDATE public.quiz_attempts
    SET score = v_total_score
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'status', 'submitted',
        'score', v_total_score,
        'correct', v_correct_count,
        'incorrect', v_incorrect_count,
        'unanswered', v_unanswered_count
    );
END;
$$;


ALTER FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid", "p_final_answers" "jsonb" DEFAULT '[]'::"jsonb", "p_telemetry_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_attempt RECORD;
    v_question RECORD;
    v_question_row RECORD;
    v_total_questions INTEGER := 0;
    v_total_correct INTEGER := 0;
    v_total_points NUMERIC := 0;
    v_points_earned NUMERIC := 0;
    v_has_ungraded BOOLEAN := FALSE;
    v_score NUMERIC := 0;
    v_passed BOOLEAN;
    v_time_spent INTEGER := 0;
    v_selected_option_ids UUID[];
    v_correct_option_ids UUID[];
    v_is_correct BOOLEAN;
    v_status TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_attempt_id::text));

    SELECT
        a.id,
        a.quiz_id,
        a.assignment_id,
        a.student_id,
        a.tenant_id,
        a.status,
        a.started_at,
        a.expires_at,
        a.question_manifest,
        a.tab_switch_count,
        a.focus_loss_count,
        q.passing_score,
        q.show_correct_answers
    INTO v_attempt
    FROM public.quiz_attempts_v2 a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id
    FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.student_id <> auth.uid() OR v_attempt.tenant_id <> get_my_tenant_id() THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    IF v_attempt.status IN ('submitted', 'graded', 'expired') THEN
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE aq.is_correct = true),
            COALESCE(SUM(COALESCE(aq.points_earned, 0)), 0),
            BOOL_OR(q.question_type IN ('SHORT_ANSWER', 'ESSAY'))
        INTO
            v_total_questions,
            v_total_correct,
            v_points_earned,
            v_has_ungraded
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_attempt_questions_v2 aq
          ON aq.attempt_id = v_attempt.id
         AND aq.question_id = q.id
        WHERE q.id = ANY(v_attempt.question_manifest);

        SELECT COALESCE(SUM(points), 0)
        INTO v_total_points
        FROM public.quiz_questions
        WHERE id = ANY(v_attempt.question_manifest);

        v_score := CASE
            WHEN v_total_points > 0 THEN ROUND((v_points_earned / v_total_points) * 100, 2)
            ELSE 0
        END;

        RETURN jsonb_build_object(
            'attempt_id', v_attempt.id,
            'status', v_attempt.status,
            'score', v_score,
            'passed', (v_score >= COALESCE(v_attempt.passing_score, 0)),
            'total_correct', v_total_correct,
            'correct_answers', v_total_correct,
            'total_questions', v_total_questions,
            'time_spent', COALESCE((p_telemetry_data ->> 'time_spent_seconds')::integer, 0),
            'has_ungraded', COALESCE(v_has_ungraded, false),
            'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
        );
    END IF;

    -- SERVER-AUTHORITATIVE TIMER GUARD
    -- If submission arrives > 30s after expiration, mark as EXPIRED and ignore new payload
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        UPDATE public.quiz_attempts_v2
        SET status = 'expired', submitted_at = now()
        WHERE id = p_attempt_id AND status = 'in_progress';

        RETURN jsonb_build_object(
            'status', 'expired'
        );
    END IF;

    IF jsonb_array_length(COALESCE(p_final_answers, '[]'::jsonb)) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    v_time_spent := COALESCE(
        (p_telemetry_data ->> 'time_spent_seconds')::integer,
        COALESCE(v_attempt.tab_switch_count * 5, 0)
    );

    FOR v_question_row IN
        SELECT jsonb_array_elements_text(jsonb_build_array(v_attempt.question_manifest)) AS id
    LOOP
        SELECT * INTO v_question
        FROM public.quiz_questions
        WHERE id = (v_question_row.id)::uuid;

        IF v_question.question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE') THEN
            SELECT ARRAY_AGG(option_id) INTO v_selected_option_ids
            FROM public.quiz_attempt_answers
            WHERE attempt_id = v_attempt.id AND question_id = v_question.id;

            SELECT ARRAY_AGG(id) INTO v_correct_option_ids
            FROM public.quiz_question_options
            WHERE question_id = v_question.id AND is_correct = true;

            IF v_selected_option_ids IS NOT NULL AND v_correct_option_ids IS NOT NULL AND
               ARRAY_LENGTH(v_selected_option_ids, 1) = ARRAY_LENGTH(v_correct_option_ids, 1) AND
               v_selected_option_ids <@ v_correct_option_ids AND v_selected_option_ids @> v_correct_option_ids THEN
                v_is_correct := true;
                v_points_earned := v_question.points;
            ELSE
                v_is_correct := false;
                v_points_earned := 0;
            END IF;

            INSERT INTO public.quiz_attempt_questions_v2 (
                attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
            ) VALUES (
                v_attempt.id, v_attempt.started_at, v_question.id, v_attempt.tenant_id, v_is_correct, v_points_earned
            )
            ON CONFLICT (attempt_id, question_id, started_at) DO UPDATE
            SET is_correct = EXCLUDED.is_correct,
                points_earned = EXCLUDED.points_earned;

        ELSIF v_question.question_type IN ('SHORT_ANSWER', 'ESSAY') THEN
            v_has_ungraded := TRUE;
            INSERT INTO public.quiz_attempt_questions_v2 (
                attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
            ) VALUES (
                v_attempt.id, v_attempt.started_at, v_question.id, v_attempt.tenant_id, false, 0
            )
            ON CONFLICT (attempt_id, question_id, started_at) DO NOTHING;
        END IF;

    END LOOP;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE aq.is_correct = true),
        COALESCE(SUM(COALESCE(aq.points_earned, 0)), 0)
    INTO
        v_total_questions,
        v_total_correct,
        v_points_earned
    FROM public.quiz_questions q
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.attempt_id = v_attempt.id
     AND aq.question_id = q.id
    WHERE q.id = ANY(v_attempt.question_manifest);

    SELECT COALESCE(SUM(points), 0)
    INTO v_total_points
    FROM public.quiz_questions
    WHERE id = ANY(v_attempt.question_manifest);

    IF v_total_points > 0 THEN
        v_score := ROUND((v_points_earned / v_total_points) * 100, 2);
    ELSE
        v_score := 0;
    END IF;

    v_passed := v_score >= COALESCE(v_attempt.passing_score, 0);
    v_status := CASE WHEN v_has_ungraded THEN 'submitted' ELSE 'graded' END;

    UPDATE public.quiz_attempts_v2
    SET
        status = v_status,
        score = v_score,
        passed = v_passed,
        submitted_at = NOW()
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt.id,
        'status', v_status,
        'score', v_score,
        'passed', v_passed,
        'total_correct', v_total_correct,
        'correct_answers', v_total_correct,
        'total_questions', v_total_questions,
        'time_spent', v_time_spent,
        'has_ungraded', v_has_ungraded,
        'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
    );
END;
$$;


ALTER FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid", "p_final_answers" "jsonb", "p_telemetry_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_attempt_transition"("p_old_status" "text", "p_new_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN CASE

        WHEN p_old_status = 'not_started'
        AND p_new_status = 'in_progress'
        THEN TRUE

        WHEN p_old_status = 'in_progress'
        AND p_new_status IN ('submitted','expired','abandoned')
        THEN TRUE

        WHEN p_old_status = 'submitted'
        AND p_new_status = 'graded'
        THEN TRUE

        ELSE FALSE
    END;
END;
$$;


ALTER FUNCTION "public"."validate_attempt_transition"("p_old_status" "text", "p_new_status" "text") OWNER TO "postgres";

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


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_user_id" "uuid",
    "target_entity_type" "text",
    "target_entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_generation_metadata" (
    "question_id" "uuid",
    "model" "text",
    "prompt" "text",
    "generation_cost" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_generation_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
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


COMMENT ON TABLE "public"."analytics_audit" IS 'Audit trail for analytics access and actions.';



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


COMMENT ON TABLE "public"."analytics_circuit_breaker" IS 'State tracking for the analytics refresh circuit breaker.';



CREATE TABLE IF NOT EXISTS "public"."analytics_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" double precision NOT NULL,
    "labels" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."analytics_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_metrics" IS 'Persistent storage for analytics metrics.';



CREATE TABLE IF NOT EXISTS "public"."analytics_rate_limits" (
    "user_id" "uuid" NOT NULL,
    "request_count" integer DEFAULT 0,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "reset_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."analytics_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_rate_limits" IS 'Tracks analytics request counts per user for rate limiting.';



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
    "tenant_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1,
    "score" numeric,
    "submission_text" "text",
    "file_url" "text",
    "feedback" "text",
    "graded_at" timestamp with time zone,
    CONSTRAINT "assignment_submissions_attempt_number_check" CHECK (("attempt_number" > 0))
);


ALTER TABLE "public"."assignment_submissions" OWNER TO "postgres";


ALTER TABLE "public"."assignment_submissions" ADD COLUMN "link_url" text NULL;


ALTER TABLE "public"."assignment_submissions" ADD COLUMN "is_late" boolean NOT NULL DEFAULT false;


ALTER TABLE "public"."assignment_submissions" ADD COLUMN "late_penalty_percent" integer NOT NULL DEFAULT 0;


ALTER TABLE "public"."assignment_submissions" ADD COLUMN "raw_score" numeric NULL;


ALTER TABLE "public"."assignment_submissions" ADD COLUMN "client_request_id" text NULL;


COMMENT ON COLUMN "public"."assignment_submissions"."attempt_number" IS 'The attempt count for this specific assignment by the student.';


COMMENT ON COLUMN "public"."assignment_submissions"."score" IS 'Effective score after applying late penalty (if applicable).';


COMMENT ON COLUMN "public"."assignment_submissions"."raw_score" IS 'Raw score before applying any late penalty.';



CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "lesson_id" "uuid",
    "instructions" "text",
    "max_points" integer DEFAULT 100,
    "created_by" "uuid",
    "max_attempts" integer DEFAULT 1,
    "is_published" boolean DEFAULT false,
    CONSTRAINT "assignments_max_attempts_check" CHECK (("max_attempts" >= 1))
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


ALTER TABLE "public"."assignments" ADD COLUMN "available_from" timestamp with time zone NULL;


ALTER TABLE "public"."assignments" ADD COLUMN "late_penalty_percent" integer NOT NULL DEFAULT 0;


ALTER TABLE "public"."assignments" ADD COLUMN "allow_text_submission" boolean NOT NULL DEFAULT true;


ALTER TABLE "public"."assignments" ADD COLUMN "allow_file_submission" boolean NOT NULL DEFAULT true;


ALTER TABLE "public"."assignments" ADD COLUMN "allow_link_submission" boolean NOT NULL DEFAULT false;


ALTER TABLE "public"."assignments" ADD COLUMN "reminder_enabled" boolean NOT NULL DEFAULT true;


ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_late_penalty_percent_check" CHECK (("late_penalty_percent" >= 0 AND "late_penalty_percent" <= 100));


COMMENT ON COLUMN "public"."assignments"."max_attempts" IS 'Maximum number of times a student can submit this assignment.';



COMMENT ON COLUMN "public"."assignments"."is_published" IS 'Whether the assignment is visible to students.';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "tenant_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_lessons" integer DEFAULT 0,
    "completed_lessons" integer DEFAULT 0,
    "percentage" numeric DEFAULT 0,
    "last_activity_type" "text",
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "last_calculated_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    COALESCE("avg"("cp"."percentage"), (0)::numeric) AS "avg_progress",
    COALESCE("sum"("cp"."completed_lessons"), (0)::bigint) AS "total_completed_lessons",
    "now"() AS "last_refreshed_at"
   FROM ((("public"."courses" "c"
     LEFT JOIN "public"."classes" "cl" ON (("cl"."course_id" = "c"."id")))
     LEFT JOIN "public"."enrollments" "e" ON ((("e"."class_id" = "cl"."id") AND ("e"."status" = 'ACTIVE'::"public"."enrollment_status"))))
     LEFT JOIN "public"."course_progress" "cp" ON ((("cp"."course_id" = "c"."id") AND ("cp"."user_id" = "e"."student_id"))))
  GROUP BY "c"."id", "c"."title", "c"."tenant_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."course_analytics_mv" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."course_analytics_mv" IS 'High-level course analytics pre-computed for performance. Refreshed periodically via refresh_course_analytics_mv().';



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


COMMENT ON TABLE "public"."course_insights" IS 'Storage for AI-ready insights and pattern detection results.';



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
    "refresh_locked_at" timestamp with time zone,
    "last_calculated_at" timestamp with time zone DEFAULT "now"()
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


CREATE TABLE IF NOT EXISTS "public"."leaderboards_weekly" (
    "tenant_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0,
    "rank" integer,
    "week_start" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."leaderboards_weekly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_version" integer DEFAULT 1,
    "course_id" "uuid",
    "module_id" "uuid",
    "lesson_id" "uuid",
    "quiz_id" "uuid",
    "assignment_id" "uuid",
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "duration_seconds" integer,
    "device_type" "text",
    "session_id" "text",
    "ip_address" "inet",
    "processed_at" timestamp with time zone,
    "processing_status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."learning_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."learning_events" IS '@enum event_type lesson_viewed, lesson_completed, video_started, video_completed, video_paused, quiz_started, quiz_completed, quiz_attempted, assignment_viewed, assignment_submitted, discussion_posted, course_enrolled, course_completed';



COMMENT ON COLUMN "public"."learning_events"."event_type" IS 'Type of learning event: lesson_viewed, lesson_completed, video_started, video_completed, video_paused, quiz_started, quiz_completed, quiz_attempted, assignment_viewed, assignment_submitted, discussion_posted, course_enrolled, course_completed';



CREATE TABLE IF NOT EXISTS "public"."lesson_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "content" "text" NOT NULL
);


ALTER TABLE "public"."lesson_chunks" OWNER TO "postgres";


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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL
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
END) STORED,
    "level" integer DEFAULT 1,
    "is_demo" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."is_demo" IS 'Flag to identify demo/test accounts for visual mockups.';



CREATE TABLE IF NOT EXISTS "public"."question_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "subject_id" "uuid",
    "topic_id" "uuid",
    "question_type" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "explanation" "text",
    "difficulty_level" integer DEFAULT 3,
    "source" "text" DEFAULT 'manual'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false
);


ALTER TABLE "public"."question_bank" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_bank_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_bank_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "order_index" integer DEFAULT 0
);


ALTER TABLE "public"."question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_stats" (
    "question_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "total_answers" integer DEFAULT 0,
    "correct_answers" integer DEFAULT 0,
    "difficulty_rate" numeric(5,2) DEFAULT 0,
    "avg_time_seconds" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_stats" IS 'Per-question aggregate statistics. Composite PK supports per-quiz analysis AND global bank difficulty (quiz_id = specific quiz UUID).';



CREATE TABLE IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL
);


ALTER TABLE "public"."question_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempt_questions_v2" (
    "attempt_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_answers" "jsonb",
    "points_earned" numeric(5,2) DEFAULT 0,
    "is_correct" boolean,
    "answer_version" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
)
PARTITION BY RANGE ("started_at");


ALTER TABLE "public"."quiz_attempt_questions_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_a_q_v2_2026_03" (
    "attempt_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_answers" "jsonb",
    "points_earned" numeric(5,2) DEFAULT 0,
    "is_correct" boolean,
    "answer_version" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_a_q_v2_2026_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_a_q_v2_2026_04" (
    "attempt_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_answers" "jsonb",
    "points_earned" numeric(5,2) DEFAULT 0,
    "is_correct" boolean,
    "answer_version" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_a_q_v2_2026_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_a_q_v2_historic" (
    "attempt_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_answers" "jsonb",
    "points_earned" numeric(5,2) DEFAULT 0,
    "is_correct" boolean,
    "answer_version" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_a_q_v2_historic" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_answer_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "previous_answers" "jsonb",
    "new_answers" "jsonb",
    "client_version" integer,
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_answer_history" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."quiz_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "public"."quiz_assignment_status" DEFAULT 'active'::"public"."quiz_assignment_status" NOT NULL,
    "available_from" timestamp with time zone,
    "due_at" timestamp with time zone,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_attempts" integer
);


ALTER TABLE "public"."quiz_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_assignments" IS 'Junction table linking quizzes to classes with per-class scheduling and status.';



CREATE TABLE IF NOT EXISTS "public"."assignment_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reset_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assignment_rate_limits" OWNER TO "postgres";



CREATE OR REPLACE VIEW "public"."quiz_attempt_questions" WITH ("security_invoker"='true') AS
 SELECT "attempt_id",
    "question_id",
    "tenant_id",
    "is_correct",
    "points_earned",
    "student_answers"
   FROM "public"."quiz_attempt_questions_v2";


ALTER VIEW "public"."quiz_attempt_questions" OWNER TO "postgres";


COMMENT ON VIEW "public"."quiz_attempt_questions" IS 'Compatibility view → quiz_attempt_questions_v2. Read-only. security_invoker=true.';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempt_questions_legacy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "explanation" "text",
    "order_index" integer NOT NULL,
    "selected_option_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "selected_option_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "text_answer" "text",
    "points_earned" numeric(5,2) DEFAULT 0,
    "is_correct" boolean,
    "question_snapshot" "jsonb" DEFAULT '{}'::"jsonb",
    "question_type" "public"."question_type" DEFAULT 'MCQ'::"public"."question_type",
    "max_points" integer DEFAULT 10,
    "grader_comment" "text",
    "graded_by" "uuid",
    "graded_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_attempt_questions_legacy" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz_attempt_questions_legacy"."selected_option_ids" IS 'Array of selected option UUIDs (supports MULTIPLE_SELECT)';



COMMENT ON COLUMN "public"."quiz_attempt_questions_legacy"."text_answer" IS 'Text response for SHORT_ANSWER and ESSAY question types';



COMMENT ON COLUMN "public"."quiz_attempt_questions_legacy"."points_earned" IS 'Points awarded (auto or manual grading)';



COMMENT ON COLUMN "public"."quiz_attempt_questions_legacy"."is_correct" IS 'Whether the answer is correct (NULL = not yet graded)';



COMMENT ON COLUMN "public"."quiz_attempt_questions_legacy"."question_snapshot" IS 'Full immutable snapshot of question + options at attempt start';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempt_telemetry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "tab_switches" integer DEFAULT 0,
    "time_spent_seconds" integer DEFAULT 0,
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_attempt_telemetry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
)
PARTITION BY RANGE ("started_at");


ALTER TABLE "public"."quiz_attempts_v2" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz_attempts_v2"."attempt_seed" IS 'Deterministic seed for shuffling questions/options within this attempt';



CREATE OR REPLACE VIEW "public"."quiz_attempts" WITH ("security_invoker"='true') AS
 SELECT "id",
    "quiz_id",
    "student_id",
    "tenant_id",
    "status",
    "score",
    "started_at",
    "submitted_at",
    "expires_at",
    "attempt_number",
    "passed",
    "time_spent",
    "tab_switch_count",
    "focus_loss_count",
    "last_heartbeat_at",
    "attempt_seed",
    "assignment_id",
    "started_at" AS "created_at",
    "submitted_at" AS "finished_at",
    "time_spent" AS "duration_seconds"
   FROM "public"."quiz_attempts_v2";


ALTER VIEW "public"."quiz_attempts" OWNER TO "postgres";


COMMENT ON VIEW "public"."quiz_attempts" IS 'Compatibility view → quiz_attempts_v2. Read-only. security_invoker=true.';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_legacy" (
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
    "submitted_at" timestamp with time zone,
    "lesson_id" "uuid",
    "expires_at" timestamp with time zone,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "version" integer DEFAULT 1 NOT NULL,
    "assignment_id" "uuid"
);


ALTER TABLE "public"."quiz_attempts_legacy" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz_attempts_legacy"."attempt_seed" IS 'Deterministic seed for shuffling questions/options within this attempt';



COMMENT ON COLUMN "public"."quiz_attempts_legacy"."version" IS 'Optimistic locking version. Incremented on each submit to prevent race conditions.';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2_2026_03" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_attempts_v2_2026_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2_2026_04" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_attempts_v2_2026_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2_2026_07" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_attempts_v2_2026_07" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2_2026_10" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_attempts_v2_2026_10" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts_v2_historic" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "score" numeric(5,2),
    "expires_at" timestamp with time zone NOT NULL,
    "question_manifest" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_adaptive" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "attempt_seed" "uuid" DEFAULT "gen_random_uuid"(),
    "assignment_id" "uuid",
    "submitted_at" timestamp with time zone,
    "passed" boolean,
    "time_spent" integer DEFAULT 0,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "tab_switch_count" integer DEFAULT 0,
    "focus_loss_count" integer DEFAULT 0,
    "cheating_signals" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "quiz_attempts_v2_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'abandoned'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_attempts_v2_historic" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_cheating_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "signal_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_cheating_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_cheating_events" IS 'Append-only cheating signal events recorded during quiz attempts';



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
    "tenant_id" "uuid" NOT NULL,
    "question_type" "public"."question_type" DEFAULT 'MCQ'::"public"."question_type",
    "points" integer DEFAULT 10,
    "explanation" "text",
    "question_bank_id" "uuid"
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quiz_questions"."question_type" IS 'Type of question: MCQ, TRUE_FALSE, MULTIPLE_SELECT, SHORT_ANSWER, ESSAY';



COMMENT ON COLUMN "public"."quiz_questions"."points" IS 'Point value for this question (used in scoring)';



COMMENT ON COLUMN "public"."quiz_questions"."explanation" IS 'Explanation shown after grading when show_correct_answers is enabled';



CREATE TABLE IF NOT EXISTS "public"."quiz_stats" (
    "quiz_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "total_attempts" integer DEFAULT 0,
    "total_unique_students" integer DEFAULT 0,
    "avg_score" numeric(5,2) DEFAULT 0,
    "median_score" numeric(5,2) DEFAULT 0,
    "highest_score" numeric(5,2) DEFAULT 0,
    "lowest_score" numeric(5,2) DEFAULT 0,
    "avg_time_seconds" integer DEFAULT 0,
    "pass_rate" numeric(5,2) DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_stats" IS 'Precomputed aggregate statistics per quiz, updated incrementally by triggers';



CREATE TABLE IF NOT EXISTS "public"."quiz_submission_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_submission_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::"text"[])))
);


ALTER TABLE "public"."quiz_submission_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
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
    "is_published" boolean DEFAULT false,
    "total_points" integer DEFAULT 100,
    "mode" "public"."quiz_mode" DEFAULT 'graded'::"public"."quiz_mode",
    "show_correct_answers" boolean DEFAULT false,
    "available_from" timestamp with time zone,
    "available_until" timestamp with time zone,
    "course_id" "uuid",
    "module_id" "uuid",
    "origin_class_id" "uuid"
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quizzes"."total_points" IS 'Sum of points for all questions in this quiz.';



COMMENT ON COLUMN "public"."quizzes"."mode" IS 'Quiz mode: practice (unlimited, show answers), graded (limited attempts), exam (1 attempt, no answers shown)';



COMMENT ON COLUMN "public"."quizzes"."show_correct_answers" IS 'Whether to show correct answers after submission';



COMMENT ON COLUMN "public"."quizzes"."available_from" IS 'Quiz is available starting from this timestamp';



COMMENT ON COLUMN "public"."quizzes"."available_until" IS 'Quiz is available until this timestamp';



COMMENT ON COLUMN "public"."quizzes"."origin_class_id" IS 'The class where this quiz was originally created. Visibility is determined by quiz_assignments.';



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
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "class_id" "uuid"
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


CREATE OR REPLACE VIEW "public"."user_profiles" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."tenant_id",
    "p"."email",
    "p"."full_name",
    "p"."avatar_url",
    "r"."role",
    "p"."level",
    "p"."created_at",
    "p"."updated_at"
   FROM ("public"."profiles" "p"
     LEFT JOIN ( SELECT DISTINCT ON ("user_roles"."user_id") "user_roles"."user_id",
            "user_roles"."role"
           FROM "public"."user_roles"
          ORDER BY "user_roles"."user_id", "user_roles"."created_at" DESC) "r" ON (("p"."id" = "r"."user_id")));


ALTER VIEW "public"."user_profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_profiles" IS 'Aggregated profile + role view. security_invoker=true.';



CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."quiz_attempt_questions_v2" ATTACH PARTITION "public"."quiz_a_q_v2_2026_03" FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempt_questions_v2" ATTACH PARTITION "public"."quiz_a_q_v2_2026_04" FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempt_questions_v2" ATTACH PARTITION "public"."quiz_a_q_v2_historic" FOR VALUES FROM (MINVALUE) TO ('2026-03-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempts_v2" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03" FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempts_v2" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04" FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempts_v2" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07" FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempts_v2" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10" FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');



ALTER TABLE ONLY "public"."quiz_attempts_v2" ATTACH PARTITION "public"."quiz_attempts_v2_historic" FOR VALUES FROM (MINVALUE) TO ('2026-03-01 00:00:00+00');



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



ALTER TABLE ONLY "public"."assignment_rate_limits"
    ADD CONSTRAINT "assignment_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_rate_limits"
    ADD CONSTRAINT "assignment_rate_limits_user_id_key" UNIQUE ("user_id");



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



ALTER TABLE ONLY "public"."leaderboards_weekly"
    ADD CONSTRAINT "leaderboards_weekly_pkey" PRIMARY KEY ("tenant_id", "class_id", "user_id", "week_start");



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_chunks"
    ADD CONSTRAINT "lesson_chunks_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_bank_usage"
    ADD CONSTRAINT "question_bank_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_stats"
    ADD CONSTRAINT "question_stats_pkey" PRIMARY KEY ("question_id", "quiz_id");



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions_v2"
    ADD CONSTRAINT "quiz_attempt_questions_v2_pkey" PRIMARY KEY ("attempt_id", "question_id", "started_at");



ALTER TABLE ONLY "public"."quiz_a_q_v2_2026_03"
    ADD CONSTRAINT "quiz_a_q_v2_2026_03_pkey" PRIMARY KEY ("attempt_id", "question_id", "started_at");



ALTER TABLE ONLY "public"."quiz_a_q_v2_2026_04"
    ADD CONSTRAINT "quiz_a_q_v2_2026_04_pkey" PRIMARY KEY ("attempt_id", "question_id", "started_at");



ALTER TABLE ONLY "public"."quiz_a_q_v2_historic"
    ADD CONSTRAINT "quiz_a_q_v2_historic_pkey" PRIMARY KEY ("attempt_id", "question_id", "started_at");



ALTER TABLE ONLY "public"."quiz_answer_history"
    ADD CONSTRAINT "quiz_answer_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_attempt_id_question_id_key" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_attempt_id_question_id_key" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempt_telemetry"
    ADD CONSTRAINT "quiz_attempt_telemetry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts_v2"
    ADD CONSTRAINT "quiz_attempts_v2_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_attempts_v2_2026_03"
    ADD CONSTRAINT "quiz_attempts_v2_2026_03_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_attempts_v2_2026_04"
    ADD CONSTRAINT "quiz_attempts_v2_2026_04_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_attempts_v2_2026_07"
    ADD CONSTRAINT "quiz_attempts_v2_2026_07_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_attempts_v2_2026_10"
    ADD CONSTRAINT "quiz_attempts_v2_2026_10_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_attempts_v2_historic"
    ADD CONSTRAINT "quiz_attempts_v2_historic_pkey" PRIMARY KEY ("id", "started_at");



ALTER TABLE ONLY "public"."quiz_cheating_events"
    ADD CONSTRAINT "quiz_cheating_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_stats"
    ADD CONSTRAINT "quiz_stats_pkey" PRIMARY KEY ("quiz_id");



ALTER TABLE ONLY "public"."quiz_submission_queue"
    ADD CONSTRAINT "quiz_submission_queue_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "unique_assignment_attempt" UNIQUE ("assignment_id", "student_id", "attempt_number");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "unique_user_lesson" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "uq_leaderboards_tenant_user" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "uq_quiz_class" UNIQUE ("quiz_id", "class_id");



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "uq_quiz_student_attempt" UNIQUE ("quiz_id", "student_id", "attempt_number");



ALTER TABLE ONLY "public"."ai_tutor_rate_limits"
    ADD CONSTRAINT "uq_rate_limit_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id", "tenant_id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id", "tenant_id");



CREATE INDEX "idx_activity_events_class_id" ON "public"."activity_events" USING "btree" ("class_id");



CREATE INDEX "idx_activity_events_course_id" ON "public"."activity_events" USING "btree" ("course_id");



CREATE INDEX "idx_activity_events_created" ON "public"."activity_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_events_gamification_lookup" ON "public"."activity_events" USING "btree" ("tenant_id", "user_id", "created_at" DESC);



CREATE INDEX "idx_activity_events_tenant" ON "public"."activity_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_events_type" ON "public"."activity_events" USING "btree" ("event_type");



CREATE INDEX "idx_activity_events_user" ON "public"."activity_events" USING "btree" ("user_id");



CREATE INDEX "idx_activity_logs_action" ON "public"."activity_logs" USING "btree" ("action");



CREATE INDEX "idx_activity_logs_tenant_id" ON "public"."activity_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_logs_tenant_user" ON "public"."activity_logs" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_activity_logs_user" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_admin_audit_logs_action" ON "public"."admin_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_logs_admin_user_id" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_target_user_id" ON "public"."admin_audit_logs" USING "btree" ("target_user_id");



CREATE INDEX "idx_admin_audit_logs_tenant_id" ON "public"."admin_audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_feedback_message" ON "public"."ai_tutor_feedback" USING "btree" ("message_id");



CREATE INDEX "idx_ai_generation_metadata_question_id" ON "public"."ai_generation_metadata" USING "btree" ("question_id");



CREATE INDEX "idx_ai_messages_session_created" ON "public"."ai_tutor_messages" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "idx_ai_messages_tenant" ON "public"."ai_tutor_messages" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_sessions_active_lookup" ON "public"."ai_tutor_sessions" USING "btree" ("user_id", "lesson_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_ai_sessions_tenant_user" ON "public"."ai_tutor_sessions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_ai_sessions_user_lesson" ON "public"."ai_tutor_sessions" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "idx_ai_tutor_cache_course_id" ON "public"."ai_tutor_cache" USING "btree" ("course_id");



CREATE INDEX "idx_ai_tutor_cache_tenant_id" ON "public"."ai_tutor_cache" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_tutor_feedback_tenant_id" ON "public"."ai_tutor_feedback" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_tutor_feedback_user_id" ON "public"."ai_tutor_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_ai_tutor_interactions_lesson_id" ON "public"."ai_tutor_interactions" USING "btree" ("lesson_id");



CREATE INDEX "idx_ai_tutor_interactions_tenant" ON "public"."ai_tutor_interactions" USING "btree" ("tenant_id");



CREATE INDEX "idx_ai_tutor_interactions_tenant_id" ON "public"."ai_tutor_interactions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_ai_tutor_interactions_user" ON "public"."ai_tutor_interactions" USING "btree" ("user_id");



CREATE INDEX "idx_ai_tutor_rate_limits_user" ON "public"."ai_tutor_rate_limits" USING "btree" ("user_id");



CREATE INDEX "idx_ai_tutor_sessions_lesson_id" ON "public"."ai_tutor_sessions" USING "btree" ("lesson_id");



CREATE INDEX "idx_analytics_audit_course_user" ON "public"."analytics_audit" USING "btree" ("course_id", "user_id");



CREATE INDEX "idx_analytics_audit_tenant_id" ON "public"."analytics_audit" USING "btree" ("tenant_id");



CREATE INDEX "idx_analytics_audit_user_id" ON "public"."analytics_audit" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_metrics_tenant_id" ON "public"."analytics_metrics" USING "btree" ("tenant_id");



CREATE INDEX "idx_announcement_rsvps_tenant_id" ON "public"."announcement_rsvps" USING "btree" ("tenant_id");



CREATE INDEX "idx_announcements_author" ON "public"."announcements" USING "btree" ("created_by");



CREATE INDEX "idx_announcements_course" ON "public"."announcements" USING "btree" ("course_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_announcements_pinned_created" ON "public"."announcements" USING "btree" ("is_pinned" DESC, "created_at" DESC);



CREATE INDEX "idx_announcements_status" ON "public"."announcements" USING "btree" ("status");



CREATE INDEX "idx_announcements_tenant" ON "public"."announcements" USING "btree" ("tenant_id");



CREATE INDEX "idx_answer_history_attempt" ON "public"."quiz_answer_history" USING "btree" ("attempt_id");



CREATE INDEX "idx_answer_history_question" ON "public"."quiz_answer_history" USING "btree" ("question_id");



CREATE INDEX "idx_answer_history_tenant" ON "public"."quiz_answer_history" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_submissions_assignment" ON "public"."assignment_submissions" USING "btree" ("assignment_id");



CREATE INDEX "idx_assignment_submissions_assignment_status" ON "public"."assignment_submissions" USING "btree" ("assignment_id", "status");



CREATE INDEX "idx_assignment_submissions_student" ON "public"."assignment_submissions" USING "btree" ("student_id");



CREATE INDEX "idx_assignment_submissions_tenant" ON "public"."assignment_submissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_submissions_tenant_id" ON "public"."assignment_submissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_submissions_tenant_student_assign" ON "public"."assignment_submissions" USING "btree" ("tenant_id", "student_id", "assignment_id");



CREATE INDEX "idx_assignments_class" ON "public"."assignments" USING "btree" ("class_id");



CREATE INDEX "idx_assignments_course_id" ON "public"."assignments" USING "btree" ("course_id");



CREATE INDEX "idx_assignments_lesson" ON "public"."assignments" USING "btree" ("lesson_id");



CREATE INDEX "idx_assignments_tenant" ON "public"."assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignments_tenant_id" ON "public"."assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_rate_limits_user" ON "public"."assignment_rate_limits" USING "btree" ("user_id");



CREATE INDEX "idx_assignment_rate_limits_tenant" ON "public"."assignment_rate_limits" USING "btree" ("tenant_id");



CREATE INDEX "idx_assignment_rate_limits_reset" ON "public"."assignment_rate_limits" USING "btree" ("reset_at");



CREATE INDEX "idx_attempt_selected_options" ON "public"."quiz_attempt_questions_legacy" USING "gin" ("selected_option_ids");



CREATE INDEX "idx_attempt_status" ON "public"."quiz_attempts_legacy" USING "btree" ("status");



CREATE INDEX "idx_attempt_student_quiz" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id", "quiz_id");



CREATE INDEX "idx_attendance_enrollment" ON "public"."attendance_records" USING "btree" ("enrollment_id");



CREATE INDEX "idx_attendance_records_tenant_enrollment" ON "public"."attendance_records" USING "btree" ("tenant_id", "enrollment_id");



CREATE INDEX "idx_attendance_records_tenant_id" ON "public"."attendance_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_cheating_events_attempt" ON "public"."quiz_cheating_events" USING "btree" ("attempt_id");



CREATE INDEX "idx_cheating_events_student" ON "public"."quiz_cheating_events" USING "btree" ("student_id");



CREATE INDEX "idx_cheating_events_tenant" ON "public"."quiz_cheating_events" USING "btree" ("tenant_id");



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



CREATE INDEX "idx_course_classes_course" ON "public"."course_classes" USING "btree" ("course_id");



CREATE INDEX "idx_course_classes_tenant" ON "public"."course_classes" USING "btree" ("tenant_id");



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



CREATE INDEX "idx_course_progress_course_user" ON "public"."course_progress" USING "btree" ("course_id", "user_id");



COMMENT ON INDEX "public"."idx_course_progress_course_user" IS 'Critical for fetching student progress per course in analytics';



CREATE INDEX "idx_course_progress_percentage" ON "public"."course_progress" USING "btree" ("percentage" DESC);



CREATE INDEX "idx_course_progress_tenant_course" ON "public"."course_progress" USING "btree" ("tenant_id", "course_id");



CREATE INDEX "idx_course_progress_tenant_user" ON "public"."course_progress" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_course_progress_user_course" ON "public"."course_progress" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_course_stats_course" ON "public"."course_stats" USING "btree" ("course_id");



CREATE INDEX "idx_course_stats_tenant" ON "public"."course_stats" USING "btree" ("tenant_id");



CREATE INDEX "idx_courses_created_by" ON "public"."courses" USING "btree" ("created_by");



CREATE INDEX "idx_courses_tenant_created_by" ON "public"."courses" USING "btree" ("tenant_id", "created_by");



CREATE INDEX "idx_courses_tenant_id" ON "public"."courses" USING "btree" ("tenant_id");



CREATE INDEX "idx_courses_tenant_status" ON "public"."courses" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_discussions_announcement" ON "public"."discussions" USING "btree" ("announcement_id");



CREATE INDEX "idx_discussions_author_id" ON "public"."discussions" USING "btree" ("author_id");



CREATE INDEX "idx_discussions_course_created" ON "public"."discussions" USING "btree" ("course_id", "created_at" DESC);



CREATE INDEX "idx_discussions_created_at" ON "public"."discussions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_discussions_lesson_created" ON "public"."discussions" USING "btree" ("lesson_id", "created_at" DESC);



CREATE INDEX "idx_discussions_lesson_id" ON "public"."discussions" USING "btree" ("lesson_id");



CREATE INDEX "idx_discussions_parent" ON "public"."discussions" USING "btree" ("parent_id");



CREATE INDEX "idx_discussions_parent_created" ON "public"."discussions" USING "btree" ("parent_id", "created_at");



CREATE INDEX "idx_discussions_tenant_course_author" ON "public"."discussions" USING "btree" ("tenant_id", "course_id", "author_id");



CREATE INDEX "idx_discussions_tenant_course_created" ON "public"."discussions" USING "btree" ("tenant_id", "course_id", "created_at" DESC);



CREATE INDEX "idx_discussions_tenant_id" ON "public"."discussions" USING "btree" ("tenant_id");



CREATE INDEX "idx_enrollments_class" ON "public"."enrollments" USING "btree" ("class_id");



CREATE INDEX "idx_enrollments_class_id" ON "public"."enrollments" USING "btree" ("class_id");



CREATE INDEX "idx_enrollments_course_class_status" ON "public"."enrollments" USING "btree" ("class_id", "status");



CREATE INDEX "idx_enrollments_course_user_status" ON "public"."course_enrollments" USING "btree" ("course_id", "user_id", "status");



CREATE INDEX "idx_enrollments_student" ON "public"."enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_enrollments_student_id" ON "public"."enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_enrollments_tenant_course" ON "public"."course_enrollments" USING "btree" ("tenant_id", "course_id");



CREATE INDEX "idx_enrollments_tenant_id" ON "public"."enrollments" USING "btree" ("tenant_id");



CREATE INDEX "idx_enrollments_tenant_user" ON "public"."course_enrollments" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_grades_graded_by" ON "public"."grades" USING "btree" ("graded_by");



CREATE INDEX "idx_grades_tenant_id" ON "public"."grades" USING "btree" ("tenant_id");



CREATE INDEX "idx_grades_tenant_submission" ON "public"."grades" USING "btree" ("tenant_id", "submission_id");



CREATE INDEX "idx_interactions_lesson" ON "public"."ai_tutor_interactions" USING "btree" ("lesson_id", "created_at" DESC);



CREATE INDEX "idx_interactions_tenant" ON "public"."ai_tutor_interactions" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_interactions_user" ON "public"."ai_tutor_interactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_invoices_student" ON "public"."invoices" USING "btree" ("student_id");



CREATE INDEX "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "idx_leaderboards_tenant_points" ON "public"."leaderboards" USING "btree" ("tenant_id", "points" DESC);



CREATE INDEX "idx_leaderboards_user_id" ON "public"."leaderboards" USING "btree" ("user_id");



CREATE INDEX "idx_learning_events_course_timestamp" ON "public"."learning_events" USING "btree" ("course_id", "timestamp" DESC);



CREATE INDEX "idx_learning_events_event_type" ON "public"."learning_events" USING "btree" ("event_type");



CREATE INDEX "idx_learning_events_processed" ON "public"."learning_events" USING "btree" ("processed_at") WHERE ("processing_status" = 'pending'::"text");



CREATE INDEX "idx_learning_events_tenant_user" ON "public"."learning_events" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_learning_events_user_timestamp" ON "public"."learning_events" USING "btree" ("user_id", "timestamp" DESC);



CREATE INDEX "idx_lesson_module" ON "public"."lessons" USING "btree" ("module_id");



CREATE INDEX "idx_lesson_progress_completed" ON "public"."lesson_progress" USING "btree" ("completed");



CREATE INDEX "idx_lesson_progress_completed_user" ON "public"."lesson_progress" USING "btree" ("completed", "user_id");



CREATE INDEX "idx_lesson_progress_course_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id", "user_id", "completed");



CREATE INDEX "idx_lesson_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_lesson_id" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_tenant_id" ON "public"."lesson_progress" USING "btree" ("tenant_id");



CREATE INDEX "idx_lesson_progress_tenant_user_lesson" ON "public"."lesson_progress" USING "btree" ("tenant_id", "user_id", "lesson_id");



CREATE INDEX "idx_lesson_progress_user" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_progress_user_id" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_resources_lesson" ON "public"."lesson_resources" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_resources_lesson_id" ON "public"."lesson_resources" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_resources_lesson_tenant" ON "public"."lesson_resources" USING "btree" ("lesson_id", "tenant_id");



CREATE INDEX "idx_lesson_resources_order" ON "public"."lesson_resources" USING "btree" ("lesson_id", "order_index");



CREATE INDEX "idx_lesson_resources_search" ON "public"."lesson_resources" USING "gin" ("search_vector");



CREATE INDEX "idx_lesson_resources_tenant_id" ON "public"."lesson_resources" USING "btree" ("tenant_id");



CREATE INDEX "idx_lesson_resources_tenant_lesson_id" ON "public"."lesson_resources" USING "btree" ("tenant_id", "lesson_id");



CREATE INDEX "idx_lessons_status" ON "public"."lessons" USING "btree" ("is_published") WHERE ("is_published" = true);



CREATE INDEX "idx_lessons_tenant_id" ON "public"."lessons" USING "btree" ("tenant_id");



CREATE INDEX "idx_lessons_tenant_module" ON "public"."lessons" USING "btree" ("tenant_id", "module_id");



CREATE INDEX "idx_lessons_tenant_module_id" ON "public"."lessons" USING "btree" ("tenant_id", "module_id");



CREATE INDEX "idx_lessons_tenant_module_order" ON "public"."lessons" USING "btree" ("tenant_id", "module_id", "order");



CREATE INDEX "idx_module_dependencies_depends_on" ON "public"."module_dependencies" USING "btree" ("depends_on_module_id");



CREATE INDEX "idx_module_lessons_order" ON "public"."lessons" USING "btree" ("module_id", "order");



CREATE INDEX "idx_modules_tenant" ON "public"."modules" USING "btree" ("tenant_id");



CREATE INDEX "idx_modules_tenant_id" ON "public"."modules" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_created_desc" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_tenant_user" ON "public"."notifications" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_tenant_id" ON "public"."payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_payments_tenant_invoice" ON "public"."payments" USING "btree" ("tenant_id", "invoice_id");



CREATE INDEX "idx_profiles_level" ON "public"."profiles" USING "btree" ("level");



CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_progress_tenant_user" ON "public"."lesson_progress" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_progress_user" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_progress_user_lesson" ON "public"."lesson_progress" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "idx_qa_class_id" ON "public"."quiz_assignments" USING "btree" ("class_id");



CREATE INDEX "idx_qa_class_tenant" ON "public"."quiz_assignments" USING "btree" ("class_id", "tenant_id");



CREATE INDEX "idx_qa_quiz_id" ON "public"."quiz_assignments" USING "btree" ("quiz_id");



CREATE INDEX "idx_qa_status" ON "public"."quiz_assignments" USING "btree" ("status");



CREATE INDEX "idx_qa_tenant_id" ON "public"."quiz_assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_qa_v2_assignment_student_status" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "idx_qa_v2_assignment_submitted" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "idx_qa_v2_quiz_student_status" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "idx_qaq_v2_attempt_question" ON ONLY "public"."quiz_attempt_questions_v2" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "idx_question_bank_tenant" ON "public"."question_bank" USING "btree" ("tenant_id");



CREATE INDEX "idx_question_bank_topic" ON "public"."question_bank" USING "btree" ("topic_id");



CREATE INDEX "idx_question_bank_type" ON "public"."question_bank" USING "btree" ("question_type");



CREATE INDEX "idx_question_options_question" ON "public"."question_options" USING "btree" ("question_id");



CREATE INDEX "idx_question_stats_question" ON "public"."question_stats" USING "btree" ("question_id");



CREATE INDEX "idx_question_stats_tenant" ON "public"."question_stats" USING "btree" ("tenant_id");



CREATE INDEX "idx_question_tags_question" ON "public"."question_tags" USING "btree" ("question_id");



CREATE INDEX "idx_question_usage_question" ON "public"."question_bank_usage" USING "btree" ("question_id");



CREATE INDEX "idx_question_usage_quiz" ON "public"."question_bank_usage" USING "btree" ("quiz_id");



CREATE INDEX "idx_question_usage_tenant" ON "public"."question_bank_usage" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_answers_attempt_id" ON "public"."quiz_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_quiz_answers_option_id" ON "public"."quiz_answers" USING "btree" ("option_id");



CREATE INDEX "idx_quiz_answers_question_id" ON "public"."quiz_answers" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_answers_tenant_id" ON "public"."quiz_answers" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_attempt_questions_attempt" ON "public"."quiz_attempt_questions_legacy" USING "btree" ("attempt_id");



CREATE INDEX "idx_quiz_attempt_questions_qtype" ON "public"."quiz_attempt_questions_legacy" USING "btree" ("question_type");



CREATE INDEX "idx_quiz_attempt_telemetry_attempt" ON "public"."quiz_attempt_telemetry" USING "btree" ("attempt_id");



CREATE INDEX "idx_quiz_attempt_user" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_cleanup_lookup" ON "public"."quiz_attempts_legacy" USING "btree" ("status", "last_heartbeat_at") WHERE ("status" = 'in_progress'::"public"."attempt_status");



CREATE INDEX "idx_quiz_attempts_lesson_id" ON "public"."quiz_attempts_legacy" USING "btree" ("lesson_id");



CREATE INDEX "idx_quiz_attempts_quiz" ON "public"."quiz_attempts_legacy" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_quiz_id" ON "public"."quiz_attempts_legacy" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_quiz_student" ON "public"."quiz_attempts_legacy" USING "btree" ("quiz_id", "student_id");



COMMENT ON INDEX "public"."idx_quiz_attempts_quiz_student" IS 'Critical for quiz pass rate calculation in analytics';



CREATE INDEX "idx_quiz_attempts_seed" ON "public"."quiz_attempts_legacy" USING "btree" ("attempt_seed");



CREATE UNIQUE INDEX "idx_quiz_attempts_single_active" ON "public"."quiz_attempts_legacy" USING "btree" ("tenant_id", "quiz_id", "student_id") WHERE ("status" = 'in_progress'::"public"."attempt_status");



CREATE INDEX "idx_quiz_attempts_status" ON "public"."quiz_attempts_legacy" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['graded'::"public"."attempt_status", 'submitted'::"public"."attempt_status"]));



CREATE INDEX "idx_quiz_attempts_status_enum" ON "public"."quiz_attempts_legacy" USING "btree" ("status");



CREATE INDEX "idx_quiz_attempts_student" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_student_id" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id");



CREATE INDEX "idx_quiz_attempts_student_quiz" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id", "quiz_id");



CREATE INDEX "idx_quiz_attempts_student_status_started" ON "public"."quiz_attempts_legacy" USING "btree" ("student_id", "status", "started_at" DESC);



CREATE INDEX "idx_quiz_attempts_submitted_hist" ON "public"."quiz_attempts_legacy" USING "btree" ("submitted_at") WHERE (("status" = 'submitted'::"public"."attempt_status") OR ("status" = 'graded'::"public"."attempt_status"));



CREATE INDEX "idx_quiz_attempts_tenant_id" ON "public"."quiz_attempts_legacy" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_attempts_tenant_quiz" ON "public"."quiz_attempts_legacy" USING "btree" ("tenant_id", "quiz_id");



CREATE INDEX "idx_quiz_attempts_tenant_student" ON "public"."quiz_attempts_legacy" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "idx_quiz_attempts_v2_student_quiz" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "idx_quiz_options_question" ON "public"."quiz_options" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_options_tenant_id" ON "public"."quiz_options" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_questions_question_bank" ON "public"."quiz_questions" USING "btree" ("question_bank_id");



CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_questions_tenant_id" ON "public"."quiz_questions" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_stats_tenant" ON "public"."quiz_stats" USING "btree" ("tenant_id");



CREATE INDEX "idx_quiz_submit_queue_status" ON "public"."quiz_submission_queue" USING "btree" ("status", "submitted_at");



CREATE INDEX "idx_quizzes_available" ON "public"."quizzes" USING "btree" ("available_from", "available_until");



CREATE INDEX "idx_quizzes_class" ON "public"."quizzes" USING "btree" ("class_id");



CREATE INDEX "idx_quizzes_course_id" ON "public"."quizzes" USING "btree" ("course_id");



CREATE INDEX "idx_quizzes_lesson" ON "public"."quizzes" USING "btree" ("lesson_id");



CREATE INDEX "idx_quizzes_mode" ON "public"."quizzes" USING "btree" ("mode");



CREATE INDEX "idx_quizzes_origin_class_id" ON "public"."quizzes" USING "btree" ("origin_class_id");



CREATE INDEX "idx_quizzes_status_tenant" ON "public"."quizzes" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_quizzes_tenant_id" ON "public"."quizzes" USING "btree" ("tenant_id");



CREATE INDEX "idx_rate_limits_user" ON "public"."ai_tutor_rate_limits" USING "btree" ("user_id");



CREATE INDEX "idx_recommendations_course_lesson" ON "public"."recommendations" USING "btree" ("course_id", "lesson_id");



CREATE INDEX "idx_recommendations_tenant_id" ON "public"."recommendations" USING "btree" ("tenant_id");



CREATE INDEX "idx_recommendations_tenant_user" ON "public"."recommendations" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_recommendations_user" ON "public"."recommendations" USING "btree" ("user_id");



CREATE INDEX "idx_resources_tenant_lesson" ON "public"."lesson_resources" USING "btree" ("tenant_id", "lesson_id");



CREATE INDEX "idx_rsvps_announcement" ON "public"."announcement_rsvps" USING "btree" ("announcement_id");



CREATE INDEX "idx_rsvps_user" ON "public"."announcement_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_student_concept_mastery" ON "public"."student_concept_mastery" USING "btree" ("student_id", "course_id");



CREATE INDEX "idx_student_concept_mastery_course_tenant" ON "public"."student_concept_mastery" USING "btree" ("course_id", "tenant_id");



CREATE INDEX "idx_student_concept_mastery_tenant_id" ON "public"."student_concept_mastery" USING "btree" ("tenant_id");



CREATE INDEX "idx_submissions_assignment" ON "public"."assignment_submissions" USING "btree" ("assignment_id");



CREATE INDEX "idx_submissions_student" ON "public"."assignment_submissions" USING "btree" ("student_id");



CREATE INDEX "idx_tenant_modules_module_id" ON "public"."tenant_modules" USING "btree" ("module_id");



CREATE UNIQUE INDEX "idx_unique_quiz_question_bank" ON "public"."quiz_questions" USING "btree" ("quiz_id", "question_bank_id") WHERE ("question_bank_id" IS NOT NULL);



CREATE INDEX "idx_user_badges_badge_tenant" ON "public"."user_badges" USING "btree" ("badge_id", "tenant_id");



CREATE INDEX "idx_user_badges_tenant_id" ON "public"."user_badges" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_badges_user" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_invitations_created_at" ON "public"."user_invitations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_invitations_tenant_id" ON "public"."user_invitations" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_invitations_token" ON "public"."user_invitations" USING "btree" ("token");



CREATE INDEX "idx_user_points_class_id" ON "public"."user_points" USING "btree" ("class_id");



CREATE INDEX "idx_user_points_tenant_user" ON "public"."user_points" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_user_profiles_tenant" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_tenant_id" ON "public"."user_roles" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_tenant_id" ON "public"."user_streaks" USING "btree" ("tenant_id");



CREATE INDEX "idx_v2_aq_attempt_question" ON ONLY "public"."quiz_attempt_questions_v2" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "idx_v2_aq_tenant" ON ONLY "public"."quiz_attempt_questions_v2" USING "btree" ("tenant_id");



CREATE INDEX "idx_v2_assignment_submitted" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "idx_v2_expires_in_progress" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "idx_v2_heartbeat_in_progress" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "idx_v2_quiz_status_score" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "idx_v2_student_active_status" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "idx_v2_tenant_student" ON ONLY "public"."quiz_attempts_v2" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "idx_weekly_leaderboard_lookup" ON "public"."leaderboards_weekly" USING "btree" ("tenant_id", "class_id", "week_start", "score" DESC);



CREATE INDEX "quiz_a_q_v2_2026_03_attempt_id_question_id_idx" ON "public"."quiz_a_q_v2_2026_03" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_2026_03_attempt_id_question_id_idx1" ON "public"."quiz_a_q_v2_2026_03" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_2026_03_tenant_id_idx" ON "public"."quiz_a_q_v2_2026_03" USING "btree" ("tenant_id");



CREATE INDEX "quiz_a_q_v2_2026_04_attempt_id_question_id_idx" ON "public"."quiz_a_q_v2_2026_04" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_2026_04_attempt_id_question_id_idx1" ON "public"."quiz_a_q_v2_2026_04" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_2026_04_tenant_id_idx" ON "public"."quiz_a_q_v2_2026_04" USING "btree" ("tenant_id");



CREATE INDEX "quiz_a_q_v2_historic_attempt_id_question_id_idx" ON "public"."quiz_a_q_v2_historic" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_historic_attempt_id_question_id_idx1" ON "public"."quiz_a_q_v2_historic" USING "btree" ("attempt_id", "question_id");



CREATE INDEX "quiz_a_q_v2_historic_tenant_id_idx" ON "public"."quiz_a_q_v2_historic" USING "btree" ("tenant_id");



CREATE INDEX "quiz_attempts_v2_2026_03_assignment_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_03_assignment_id_submitted_at_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "quiz_attempts_v2_2026_03_assignment_id_submitted_at_idx1" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_03_expires_at_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_03_last_heartbeat_at_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_03_quiz_id_status_score_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_03_quiz_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_03_student_id_quiz_id_status_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_03_student_id_quiz_id_status_idx1" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_03_tenant_id_student_id_idx" ON "public"."quiz_attempts_v2_2026_03" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "quiz_attempts_v2_2026_04_assignment_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_04_assignment_id_submitted_at_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "quiz_attempts_v2_2026_04_assignment_id_submitted_at_idx1" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_04_expires_at_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_04_last_heartbeat_at_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_04_quiz_id_status_score_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_04_quiz_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_04_student_id_quiz_id_status_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_04_student_id_quiz_id_status_idx1" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_04_tenant_id_student_id_idx" ON "public"."quiz_attempts_v2_2026_04" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "quiz_attempts_v2_2026_07_assignment_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_07_assignment_id_submitted_at_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "quiz_attempts_v2_2026_07_assignment_id_submitted_at_idx1" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_07_expires_at_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_07_last_heartbeat_at_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_07_quiz_id_status_score_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_07_quiz_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_07_student_id_quiz_id_status_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_07_student_id_quiz_id_status_idx1" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_07_tenant_id_student_id_idx" ON "public"."quiz_attempts_v2_2026_07" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "quiz_attempts_v2_2026_10_assignment_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_10_assignment_id_submitted_at_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "quiz_attempts_v2_2026_10_assignment_id_submitted_at_idx1" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_10_expires_at_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_10_last_heartbeat_at_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_10_quiz_id_status_score_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_2026_10_quiz_id_student_id_status_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_10_student_id_quiz_id_status_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "quiz_attempts_v2_2026_10_student_id_quiz_id_status_idx1" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_2026_10_tenant_id_student_id_idx" ON "public"."quiz_attempts_v2_2026_10" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "quiz_attempts_v2_historic_assignment_id_student_id_status_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("assignment_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_historic_assignment_id_submitted_at_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("assignment_id", "submitted_at" DESC);



CREATE INDEX "quiz_attempts_v2_historic_assignment_id_submitted_at_idx1" ON "public"."quiz_attempts_v2_historic" USING "btree" ("assignment_id", "submitted_at" DESC NULLS LAST) WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_historic_expires_at_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("expires_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_historic_last_heartbeat_at_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("last_heartbeat_at") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_historic_quiz_id_status_score_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("quiz_id", "status", "score") WHERE (("status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]));



CREATE INDEX "quiz_attempts_v2_historic_quiz_id_student_id_status_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("quiz_id", "student_id", "status");



CREATE INDEX "quiz_attempts_v2_historic_student_id_quiz_id_status_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("student_id", "quiz_id", "status");



CREATE INDEX "quiz_attempts_v2_historic_student_id_quiz_id_status_idx1" ON "public"."quiz_attempts_v2_historic" USING "btree" ("student_id", "quiz_id", "status") WHERE (("status")::"text" = 'in_progress'::"text");



CREATE INDEX "quiz_attempts_v2_historic_tenant_id_student_id_idx" ON "public"."quiz_attempts_v2_historic" USING "btree" ("tenant_id", "student_id");



ALTER INDEX "public"."idx_qaq_v2_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_2026_03_attempt_id_question_id_idx";



ALTER INDEX "public"."idx_v2_aq_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_2026_03_attempt_id_question_id_idx1";



ALTER INDEX "public"."quiz_attempt_questions_v2_pkey" ATTACH PARTITION "public"."quiz_a_q_v2_2026_03_pkey";



ALTER INDEX "public"."idx_v2_aq_tenant" ATTACH PARTITION "public"."quiz_a_q_v2_2026_03_tenant_id_idx";



ALTER INDEX "public"."idx_qaq_v2_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_2026_04_attempt_id_question_id_idx";



ALTER INDEX "public"."idx_v2_aq_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_2026_04_attempt_id_question_id_idx1";



ALTER INDEX "public"."quiz_attempt_questions_v2_pkey" ATTACH PARTITION "public"."quiz_a_q_v2_2026_04_pkey";



ALTER INDEX "public"."idx_v2_aq_tenant" ATTACH PARTITION "public"."quiz_a_q_v2_2026_04_tenant_id_idx";



ALTER INDEX "public"."idx_qaq_v2_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_historic_attempt_id_question_id_idx";



ALTER INDEX "public"."idx_v2_aq_attempt_question" ATTACH PARTITION "public"."quiz_a_q_v2_historic_attempt_id_question_id_idx1";



ALTER INDEX "public"."quiz_attempt_questions_v2_pkey" ATTACH PARTITION "public"."quiz_a_q_v2_historic_pkey";



ALTER INDEX "public"."idx_v2_aq_tenant" ATTACH PARTITION "public"."quiz_a_q_v2_historic_tenant_id_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_assignment_id_student_id_status_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_assignment_id_submitted_at_idx";



ALTER INDEX "public"."idx_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_assignment_id_submitted_at_idx1";



ALTER INDEX "public"."idx_v2_expires_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_expires_at_idx";



ALTER INDEX "public"."idx_v2_heartbeat_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_last_heartbeat_at_idx";



ALTER INDEX "public"."quiz_attempts_v2_pkey" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_pkey";



ALTER INDEX "public"."idx_v2_quiz_status_score" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_quiz_id_status_score_idx";



ALTER INDEX "public"."idx_qa_v2_quiz_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_quiz_id_student_id_status_idx";



ALTER INDEX "public"."idx_quiz_attempts_v2_student_quiz" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_student_id_quiz_id_status_idx";



ALTER INDEX "public"."idx_v2_student_active_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_student_id_quiz_id_status_idx1";



ALTER INDEX "public"."idx_v2_tenant_student" ATTACH PARTITION "public"."quiz_attempts_v2_2026_03_tenant_id_student_id_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_assignment_id_student_id_status_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_assignment_id_submitted_at_idx";



ALTER INDEX "public"."idx_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_assignment_id_submitted_at_idx1";



ALTER INDEX "public"."idx_v2_expires_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_expires_at_idx";



ALTER INDEX "public"."idx_v2_heartbeat_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_last_heartbeat_at_idx";



ALTER INDEX "public"."quiz_attempts_v2_pkey" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_pkey";



ALTER INDEX "public"."idx_v2_quiz_status_score" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_quiz_id_status_score_idx";



ALTER INDEX "public"."idx_qa_v2_quiz_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_quiz_id_student_id_status_idx";



ALTER INDEX "public"."idx_quiz_attempts_v2_student_quiz" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_student_id_quiz_id_status_idx";



ALTER INDEX "public"."idx_v2_student_active_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_student_id_quiz_id_status_idx1";



ALTER INDEX "public"."idx_v2_tenant_student" ATTACH PARTITION "public"."quiz_attempts_v2_2026_04_tenant_id_student_id_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_assignment_id_student_id_status_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_assignment_id_submitted_at_idx";



ALTER INDEX "public"."idx_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_assignment_id_submitted_at_idx1";



ALTER INDEX "public"."idx_v2_expires_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_expires_at_idx";



ALTER INDEX "public"."idx_v2_heartbeat_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_last_heartbeat_at_idx";



ALTER INDEX "public"."quiz_attempts_v2_pkey" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_pkey";



ALTER INDEX "public"."idx_v2_quiz_status_score" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_quiz_id_status_score_idx";



ALTER INDEX "public"."idx_qa_v2_quiz_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_quiz_id_student_id_status_idx";



ALTER INDEX "public"."idx_quiz_attempts_v2_student_quiz" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_student_id_quiz_id_status_idx";



ALTER INDEX "public"."idx_v2_student_active_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_student_id_quiz_id_status_idx1";



ALTER INDEX "public"."idx_v2_tenant_student" ATTACH PARTITION "public"."quiz_attempts_v2_2026_07_tenant_id_student_id_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_assignment_id_student_id_status_idx";



ALTER INDEX "public"."idx_qa_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_assignment_id_submitted_at_idx";



ALTER INDEX "public"."idx_v2_assignment_submitted" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_assignment_id_submitted_at_idx1";



ALTER INDEX "public"."idx_v2_expires_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_expires_at_idx";



ALTER INDEX "public"."idx_v2_heartbeat_in_progress" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_last_heartbeat_at_idx";



ALTER INDEX "public"."quiz_attempts_v2_pkey" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_pkey";



ALTER INDEX "public"."idx_v2_quiz_status_score" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_quiz_id_status_score_idx";



ALTER INDEX "public"."idx_qa_v2_quiz_student_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_quiz_id_student_id_status_idx";



ALTER INDEX "public"."idx_quiz_attempts_v2_student_quiz" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_student_id_quiz_id_status_idx";



ALTER INDEX "public"."idx_v2_student_active_status" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_student_id_quiz_id_status_idx1";



ALTER INDEX "public"."idx_v2_tenant_student" ATTACH PARTITION "public"."quiz_attempts_v2_2026_10_tenant_id_student_id_idx";



CREATE OR REPLACE FUNCTION "public"."check_assignment_rate_limit"("p_user_id" "uuid", "p_limit" integer DEFAULT 10, "p_window" interval DEFAULT '01:00:00'::interval) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_record record;
BEGIN
    -- Get tenant
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    SELECT * INTO v_record FROM public.assignment_rate_limits WHERE user_id = p_user_id AND tenant_id = v_tenant_id;

    IF v_record IS NULL THEN
        INSERT INTO public.assignment_rate_limits (user_id, tenant_id, request_count, window_start, reset_at)
        VALUES (p_user_id, v_tenant_id, 1, now(), now() + p_window);
        RETURN true;
    END IF;

    -- Reset if window passed
    IF now() > v_record.reset_at THEN
        UPDATE public.assignment_rate_limits
        SET
            request_count = 1,
            window_start = now(),
            reset_at = now() + p_window
        WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
        RETURN true;
    END IF;

    -- Check limit
    IF v_record.request_count >= p_limit THEN
        RETURN false;
    END IF;

    -- Increment
    UPDATE public.assignment_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id AND tenant_id = v_tenant_id;

    RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_assignment_rate_limit"("p_user_id" "uuid", "p_limit" integer, "p_window" interval) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."submit_assignment_attempt"("p_assignment_id" "uuid", "p_content" "text", "p_submission_text" "text", "p_file_url" "text", "p_link_url" "text", "p_client_request_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_assignment record;
    v_existing_submission record;
    v_attempt_number integer;
    v_is_late boolean := false;
    v_late_penalty_percent integer := 0;
    v_due_date timestamptz;
BEGIN
    -- Security: Get tenant and user
    v_tenant_id := get_my_tenant_id();
    v_user_id := auth.uid();
    IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Rate limiting check
    IF NOT check_assignment_rate_limit(v_user_id) THEN
        RAISE EXCEPTION 'Rate limit exceeded for assignment submissions';
    END IF;

    -- Get assignment details
    SELECT * INTO v_assignment FROM public.assignments
    WHERE id = p_assignment_id AND tenant_id = v_tenant_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Check if user is enrolled in the class
    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.classes c ON c.id = e.class_id
        WHERE e.student_id = v_user_id AND e.class_id = v_assignment.class_id
          AND e.status = 'ACTIVE' AND e.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Not enrolled in this class';
    END IF;

    -- Check if assignment is published
    IF NOT v_assignment.is_published THEN
        RAISE EXCEPTION 'Assignment is not published';
    END IF;

    -- Check availability
    IF v_assignment.available_from IS NOT NULL AND now() < v_assignment.available_from THEN
        RAISE EXCEPTION 'Assignment is not yet available';
    END IF;

    -- Idempotency check
    IF p_client_request_id IS NOT NULL THEN
        SELECT * INTO v_existing_submission FROM public.assignment_submissions
        WHERE assignment_id = p_assignment_id AND student_id = v_user_id
          AND client_request_id = p_client_request_id AND tenant_id = v_tenant_id;

        IF v_existing_submission.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'submission_id', v_existing_submission.id,
                'message', 'Submission already exists (idempotent)'
            );
        END IF;
    END IF;

    -- Get current attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
    FROM public.assignment_submissions
    WHERE assignment_id = p_assignment_id AND student_id = v_user_id AND tenant_id = v_tenant_id;

    -- Check max attempts
    IF v_attempt_number > v_assignment.max_attempts THEN
        RAISE EXCEPTION 'Maximum attempts exceeded';
    END IF;

    -- Late submission detection
    v_due_date := v_assignment.due_date;
    IF v_due_date IS NOT NULL AND now() > v_due_date THEN
        v_is_late := true;
        v_late_penalty_percent := v_assignment.late_penalty_percent;
    END IF;

    -- Insert submission
    INSERT INTO public.assignment_submissions (
        assignment_id, student_id, tenant_id, content, submission_text,
        file_url, link_url, status, attempt_number, is_late,
        late_penalty_percent, client_request_id, submitted_at
    ) VALUES (
        p_assignment_id, v_user_id, v_tenant_id, p_content, p_submission_text,
        p_file_url, p_link_url, 'SUBMITTED', v_attempt_number, v_is_late,
        v_late_penalty_percent, p_client_request_id, now()
    ) RETURNING id INTO v_existing_submission;

    -- Award XP for submission
    PERFORM public.add_user_points(v_user_id, 10);

    -- Log activity
    PERFORM public.create_activity_event(
        v_tenant_id, v_user_id, 'ASSIGNMENT_SUBMITTED',
        'assignment', p_assignment_id, v_assignment.class_id, v_assignment.course_id,
        jsonb_build_object('attempt_number', v_attempt_number, 'is_late', v_is_late)
    );

    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_existing_submission.id,
        'attempt_number', v_attempt_number,
        'is_late', v_is_late,
        'late_penalty_percent', v_late_penalty_percent
    );
END;
$$;


ALTER FUNCTION "public"."submit_assignment_attempt"("p_assignment_id" "uuid", "p_content" "text", "p_submission_text" "text", "p_file_url" "text", "p_link_url" "text", "p_client_request_id" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_assignment_submission_bundle"("p_assignment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_assignment record;
    v_submissions jsonb;
BEGIN
    -- Security: Get tenant and user
    v_tenant_id := get_my_tenant_id();
    v_user_id := auth.uid();
    IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get assignment details
    SELECT * INTO v_assignment FROM public.assignments
    WHERE id = p_assignment_id AND tenant_id = v_tenant_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Check permissions: teacher of class or admin
    IF NOT public.has_role('ADMIN') AND NOT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = v_assignment.class_id AND teacher_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get all submissions for this assignment
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'student_id', s.student_id,
            'student_name', p.full_name,
            'attempt_number', s.attempt_number,
            'status', s.status,
            'score', s.score,
            'raw_score', s.raw_score,
            'is_late', s.is_late,
            'late_penalty_percent', s.late_penalty_percent,
            'submitted_at', s.submitted_at,
            'graded_at', s.graded_at,
            'feedback', s.feedback,
            'submission_text', s.submission_text,
            'file_url', s.file_url,
            'link_url', s.link_url
        )
    ), '[]'::jsonb) INTO v_submissions
    FROM public.assignment_submissions s
    JOIN public.profiles p ON p.id = s.student_id
    WHERE s.assignment_id = p_assignment_id AND s.tenant_id = v_tenant_id
    ORDER BY s.submitted_at DESC;

    RETURN jsonb_build_object(
        'assignment', jsonb_build_object(
            'id', v_assignment.id,
            'title', v_assignment.title,
            'description', v_assignment.description,
            'due_date', v_assignment.due_date,
            'max_attempts', v_assignment.max_attempts,
            'max_points', v_assignment.max_points,
            'late_penalty_percent', v_assignment.late_penalty_percent
        ),
        'submissions', v_submissions
    );
END;
$$;


ALTER FUNCTION "public"."get_assignment_submission_bundle"("p_assignment_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_assignment_grading_queue"("p_class_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("submission_id" "uuid", "assignment_id" "uuid", "assignment_title" "text", "student_id" "uuid", "student_name" "text", "attempt_number" integer, "submitted_at" timestamp with time zone, "is_late" boolean, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
BEGIN
    -- Security: Get tenant and user
    v_tenant_id := get_my_tenant_id();
    v_user_id := auth.uid();
    IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check permissions: teacher of class or admin
    IF NOT public.has_role('ADMIN') AND NOT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = p_class_id AND teacher_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        s.id as submission_id,
        s.assignment_id,
        a.title as assignment_title,
        s.student_id,
        p.full_name as student_name,
        s.attempt_number,
        s.submitted_at,
        s.is_late,
        s.status::text
    FROM public.assignment_submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    JOIN public.profiles p ON p.id = s.student_id
    WHERE a.class_id = p_class_id
      AND a.tenant_id = v_tenant_id
      AND s.tenant_id = v_tenant_id
      AND s.status = 'SUBMITTED'
    ORDER BY s.submitted_at ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_assignment_grading_queue"("p_class_id" "uuid", "p_limit" integer) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_assignment_analytics"("p_assignment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_assignment record;
    v_stats jsonb;
BEGIN
    -- Security: Get tenant and user
    v_tenant_id := get_my_tenant_id();
    v_user_id := auth.uid();
    IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get assignment details
    SELECT * INTO v_assignment FROM public.assignments
    WHERE id = p_assignment_id AND tenant_id = v_tenant_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Check permissions: teacher of class or admin
    IF NOT public.has_role('ADMIN') AND NOT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = v_assignment.class_id AND teacher_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Calculate analytics
    SELECT jsonb_build_object(
        'total_submissions', COUNT(*),
        'unique_students', COUNT(DISTINCT student_id),
        'avg_attempts', ROUND(AVG(attempt_number)::numeric, 2),
        'late_submissions', COUNT(*) FILTER (WHERE is_late = true),
        'graded_submissions', COUNT(*) FILTER (WHERE status = 'GRADED'),
        'avg_score', ROUND(AVG(score)::numeric, 2),
        'avg_raw_score', ROUND(AVG(raw_score)::numeric, 2),
        'max_score', MAX(score),
        'min_score', MIN(score),
        'score_distribution', (
            SELECT jsonb_object_agg(
                CASE
                    WHEN score >= 90 THEN '90-100'
                    WHEN score >= 80 THEN '80-89'
                    WHEN score >= 70 THEN '70-79'
                    WHEN score >= 60 THEN '60-69'
                    ELSE '0-59'
                END,
                cnt
            )
            FROM (
                SELECT
                    CASE
                        WHEN score >= 90 THEN '90-100'
                        WHEN score >= 80 THEN '80-89'
                        WHEN score >= 70 THEN '70-79'
                        WHEN score >= 60 THEN '60-69'
                        ELSE '0-59'
                    END as range,
                    COUNT(*) as cnt
                FROM public.assignment_submissions
                WHERE assignment_id = p_assignment_id AND tenant_id = v_tenant_id
                  AND status = 'GRADED' AND score IS NOT NULL
                GROUP BY range
            ) d
        ),
        'submission_timeline', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', DATE(submitted_at),
                    'count', cnt
                )
            )
            FROM (
                SELECT DATE(submitted_at) as date, COUNT(*) as cnt
                FROM public.assignment_submissions
                WHERE assignment_id = p_assignment_id AND tenant_id = v_tenant_id
                GROUP BY DATE(submitted_at)
                ORDER BY DATE(submitted_at)
            ) t
        )
    ) INTO v_stats
    FROM public.assignment_submissions
    WHERE assignment_id = p_assignment_id AND tenant_id = v_tenant_id;

    RETURN v_stats;
END;
$$;


ALTER FUNCTION "public"."get_assignment_analytics"("p_assignment_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."send_assignment_reminders"("p_assignment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_assignment record;
    v_reminder_count integer := 0;
    v_hours_until_due integer;
BEGIN
    -- Security: Get tenant and user
    v_tenant_id := get_my_tenant_id();
    v_user_id := auth.uid();
    IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get assignment details
    SELECT * INTO v_assignment FROM public.assignments
    WHERE id = p_assignment_id AND tenant_id = v_tenant_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Check permissions: teacher of class or admin
    IF NOT public.has_role('ADMIN') AND NOT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = v_assignment.class_id AND teacher_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check if reminders are enabled
    IF NOT v_assignment.reminder_enabled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reminders are disabled for this assignment');
    END IF;

    -- Calculate hours until due
    IF v_assignment.due_date IS NOT NULL THEN
        v_hours_until_due := EXTRACT(EPOCH FROM (v_assignment.due_date - now())) / 3600;
    ELSE
        v_hours_until_due := NULL;
    END IF;

    -- Send reminders to students who haven't submitted
    INSERT INTO public.notifications (
        tenant_id, user_id, actor_id, title, message, type, entity_id, link
    )
    SELECT
        v_tenant_id,
        e.student_id,
        v_user_id,
        'Assignment Reminder: ' || v_assignment.title,
        CASE
            WHEN v_hours_until_due IS NOT NULL AND v_hours_until_due > 0 THEN
                'Assignment "' || v_assignment.title || '" is due in ' ||
                ROUND(v_hours_until_due::numeric, 1) || ' hours. Please submit before the deadline.'
            WHEN v_hours_until_due IS NOT NULL AND v_hours_until_due <= 0 THEN
                'Assignment "' || v_assignment.title || '" is overdue. Please submit as soon as possible.'
            ELSE
                'Assignment "' || v_assignment.title || '" is available for submission.'
        END,
        'ASSIGNMENT',
        p_assignment_id,
        '/learning/' || v_assignment.course_id
    FROM public.enrollments e
    WHERE e.class_id = v_assignment.class_id
      AND e.status = 'ACTIVE'
      AND e.tenant_id = v_tenant_id
      AND NOT EXISTS (
          SELECT 1 FROM public.assignment_submissions s
          WHERE s.assignment_id = p_assignment_id
            AND s.student_id = e.student_id
            AND s.tenant_id = v_tenant_id
            AND s.status IN ('SUBMITTED', 'GRADED')
      );

    GET DIAGNOSTICS v_reminder_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'reminders_sent', v_reminder_count,
        'assignment_id', p_assignment_id
    );
END;
$$;


ALTER FUNCTION "public"."send_assignment_reminders"("p_assignment_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE TRIGGER "after_assignment_submission" AFTER INSERT ON "public"."assignment_submissions" FOR EACH ROW WHEN (("new"."status" = 'SUBMITTED'::"public"."submission_status")) EXECUTE FUNCTION "public"."on_assignment_submitted"();



CREATE OR REPLACE TRIGGER "after_assignment_submission_update" AFTER UPDATE ON "public"."assignment_submissions" FOR EACH ROW WHEN ((("new"."status" = 'SUBMITTED'::"public"."submission_status") AND ("old"."status" IS DISTINCT FROM 'SUBMITTED'::"public"."submission_status"))) EXECUTE FUNCTION "public"."on_assignment_submitted"();



CREATE OR REPLACE TRIGGER "assignments_updated_at" BEFORE UPDATE ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "class_announcements_updated_at" BEFORE UPDATE ON "public"."class_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "course_modules_updated_at" BEFORE UPDATE ON "public"."course_modules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "grades_updated_at" BEFORE UPDATE ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "lesson_progress_completed_trigger" AFTER UPDATE ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_lesson_completed"();



CREATE OR REPLACE TRIGGER "lesson_progress_update_course_trigger_insert" AFTER INSERT ON "public"."lesson_progress" FOR EACH ROW WHEN (("new"."status" = 'completed'::"text")) EXECUTE FUNCTION "public"."trigger_update_course_progress"();



CREATE OR REPLACE TRIGGER "lesson_progress_update_course_trigger_update" AFTER UPDATE OF "status" ON "public"."lesson_progress" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"text") AND ("old"."status" IS DISTINCT FROM "new"."status"))) EXECUTE FUNCTION "public"."trigger_update_course_progress"();



CREATE OR REPLACE TRIGGER "lesson_resources_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."lesson_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_resource_search_vector"();



CREATE OR REPLACE TRIGGER "lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_announcement_published" AFTER INSERT OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."notify_announcement_published"();



CREATE OR REPLACE TRIGGER "on_assignment_graded" AFTER UPDATE ON "public"."assignment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_assignment_graded"();



CREATE OR REPLACE TRIGGER "on_course_class_deleted" AFTER DELETE ON "public"."course_classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_course_unassigned_from_class"();



CREATE OR REPLACE TRIGGER "on_course_class_inserted" AFTER INSERT ON "public"."course_classes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_course_assigned_to_class"();



CREATE OR REPLACE TRIGGER "on_course_published" AFTER UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."notify_course_published"();



CREATE OR REPLACE TRIGGER "on_discussion_reply" AFTER INSERT ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_discussion_reply"();



CREATE OR REPLACE TRIGGER "on_enrollment_inserted" AFTER INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_student_joined_class"();



CREATE OR REPLACE TRIGGER "on_enrollment_updated" AFTER UPDATE OF "status" ON "public"."enrollments" FOR EACH ROW WHEN ((("old"."status" IS DISTINCT FROM "new"."status") AND ("new"."status" = 'ACTIVE'::"public"."enrollment_status"))) EXECUTE FUNCTION "public"."handle_student_joined_class"();



CREATE OR REPLACE TRIGGER "on_module_created_add_to_tenants" AFTER INSERT ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_module_for_all_tenants"();



CREATE OR REPLACE TRIGGER "on_quiz_published" AFTER UPDATE ON "public"."lessons" FOR EACH ROW WHEN (("new"."type" = 'quiz'::"text")) EXECUTE FUNCTION "public"."notify_quiz_published"();



CREATE OR REPLACE TRIGGER "on_tenant_created_add_modules" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_modules_for_tenant"();



CREATE OR REPLACE TRIGGER "on_user_points_changed" AFTER INSERT OR UPDATE OF "points" ON "public"."user_points" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_points_to_leaderboard"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "quiz_attempt_passed_trigger" AFTER INSERT ON "public"."quiz_attempts_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_quiz_passed"();



CREATE OR REPLACE TRIGGER "quiz_attempt_passed_trigger_v2" AFTER UPDATE ON "public"."quiz_attempts_v2" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_quiz_passed"();



CREATE OR REPLACE TRIGGER "quizzes_set_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quizzes_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_assignments_updated_at" BEFORE UPDATE ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_assignment_rate_limits_updated_at" BEFORE UPDATE ON "public"."assignment_rate_limits" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_course_insights_updated_at" BEFORE UPDATE ON "public"."course_insights" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_discussions_updated_at" BEFORE UPDATE ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_learning_event_tenant_trigger" BEFORE INSERT ON "public"."learning_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_learning_event_tenant"();



CREATE OR REPLACE TRIGGER "set_quiz_attempt_questions_updated_at" BEFORE UPDATE ON "public"."quiz_attempt_questions_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenant_id_activity_logs" BEFORE INSERT ON "public"."activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_assignment_submissions" BEFORE INSERT ON "public"."assignment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_assignments" BEFORE INSERT ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_assignment_rate_limits" BEFORE INSERT ON "public"."assignment_rate_limits" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_attendance_records" BEFORE INSERT ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_class_announcements" BEFORE INSERT ON "public"."class_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_class_schedules" BEFORE INSERT ON "public"."class_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_classes" BEFORE INSERT ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_course_modules" BEFORE INSERT ON "public"."course_modules" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



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



CREATE OR REPLACE TRIGGER "set_tenant_id_quiz_attempts" BEFORE INSERT ON "public"."quiz_attempts_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_quiz_attempts_v2" BEFORE INSERT ON "public"."quiz_attempts_v2" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



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



CREATE OR REPLACE TRIGGER "trg_lesson_resources_updated_at" BEFORE UPDATE ON "public"."lesson_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_modules_updated_at" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_process_progress_events" AFTER INSERT ON "public"."activity_events" FOR EACH ROW EXECUTE FUNCTION "public"."process_progress_events"();



CREATE OR REPLACE TRIGGER "trg_qa_updated_at" BEFORE UPDATE ON "public"."quiz_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_quiz_assignment_updated_at"();



CREATE OR REPLACE TRIGGER "trg_question_bank_updated_at" BEFORE UPDATE ON "public"."question_bank" FOR EACH ROW EXECUTE FUNCTION "public"."update_question_timestamp"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_activity" AFTER INSERT ON "public"."quiz_attempts_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quiz_attempt_activity"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_activity_v2" AFTER INSERT ON "public"."quiz_attempts_v2" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quiz_attempt_activity"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_stats" AFTER UPDATE ON "public"."quiz_attempts_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."trg_update_quiz_stats"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_stats_v2" AFTER UPDATE OF "status" ON "public"."quiz_attempts_v2" FOR EACH ROW WHEN ((("new"."status")::"text" = 'graded'::"text")) EXECUTE FUNCTION "public"."trg_update_quiz_stats"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_status_change" AFTER INSERT OR UPDATE ON "public"."quiz_attempts_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quiz_attempt_status_change"();



CREATE OR REPLACE TRIGGER "trg_quiz_attempt_status_change_v2" AFTER INSERT OR UPDATE OF "status" ON "public"."quiz_attempts_v2" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quiz_attempt_status_change"();



CREATE OR REPLACE TRIGGER "trg_quiz_badges" AFTER UPDATE OF "status" ON "public"."quiz_attempts_legacy" FOR EACH ROW WHEN ((("new"."status" = 'graded'::"public"."attempt_status") AND ("old"."status" <> 'graded'::"public"."attempt_status"))) EXECUTE FUNCTION "public"."handle_quiz_badges"();



CREATE OR REPLACE TRIGGER "trg_quiz_badges_v2" AFTER UPDATE OF "status" ON "public"."quiz_attempts_v2" FOR EACH ROW WHEN ((("new"."status")::"text" = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::"text"[]))) EXECUTE FUNCTION "public"."handle_quiz_badges"();



CREATE OR REPLACE TRIGGER "trg_single_active_attempt" BEFORE INSERT ON "public"."quiz_attempts_v2" FOR EACH ROW WHEN ((("new"."status")::"text" = 'in_progress'::"text")) EXECUTE FUNCTION "public"."check_single_active_attempt"();



CREATE OR REPLACE TRIGGER "trg_streak_badges" AFTER INSERT OR UPDATE OF "current_streak" ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_streak_badges"();



CREATE OR REPLACE TRIGGER "trg_streak_on_activity" AFTER INSERT ON "public"."activity_events" FOR EACH ROW EXECUTE FUNCTION "public"."handle_streak_on_activity"();



CREATE OR REPLACE TRIGGER "trg_sync_points_to_weekly" AFTER INSERT ON "public"."user_points" FOR EACH ROW EXECUTE FUNCTION "public"."sync_points_to_weekly_leaderboard"();



CREATE OR REPLACE TRIGGER "trg_validate_attempt_status_guard" BEFORE UPDATE ON "public"."quiz_attempts_legacy" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."trg_validate_attempt_status_change"();



CREATE OR REPLACE TRIGGER "trg_validate_attempt_status_guard" BEFORE UPDATE ON "public"."quiz_attempts_v2" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_attempt_status_change"();



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



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generation_metadata"
    ADD CONSTRAINT "ai_generation_metadata_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."assignment_rate_limits"
    ADD CONSTRAINT "assignment_rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_rate_limits"
    ADD CONSTRAINT "assignment_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."leaderboards_weekly"
    ADD CONSTRAINT "leaderboards_weekly_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leaderboards_weekly"
    ADD CONSTRAINT "leaderboards_weekly_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leaderboards_weekly"
    ADD CONSTRAINT "leaderboards_weekly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_events"
    ADD CONSTRAINT "learning_events_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



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



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."question_bank_usage"
    ADD CONSTRAINT "question_bank_usage_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank_usage"
    ADD CONSTRAINT "question_bank_usage_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_stats"
    ADD CONSTRAINT "question_stats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."quiz_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."quiz_options"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_attempt_questions_legacy"
    ADD CONSTRAINT "quiz_attempt_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE "public"."quiz_attempt_questions_v2"
    ADD CONSTRAINT "quiz_attempt_questions_v2_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE "public"."quiz_attempt_questions_v2"
    ADD CONSTRAINT "quiz_attempt_questions_v2_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempt_telemetry"
    ADD CONSTRAINT "quiz_attempt_telemetry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."quiz_assignments"("id");



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts_legacy"
    ADD CONSTRAINT "quiz_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE "public"."quiz_attempts_v2"
    ADD CONSTRAINT "quiz_attempts_v2_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."quiz_assignments"("id");



ALTER TABLE "public"."quiz_attempts_v2"
    ADD CONSTRAINT "quiz_attempts_v2_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE "public"."quiz_attempts_v2"
    ADD CONSTRAINT "quiz_attempts_v2_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."quiz_attempts_v2"
    ADD CONSTRAINT "quiz_attempts_v2_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_cheating_events"
    ADD CONSTRAINT "quiz_cheating_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_cheating_events"
    ADD CONSTRAINT "quiz_cheating_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quiz_cheating_events"
    ADD CONSTRAINT "quiz_cheating_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_bank"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_stats"
    ADD CONSTRAINT "quiz_stats_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_stats"
    ADD CONSTRAINT "quiz_stats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_submission_queue"
    ADD CONSTRAINT "quiz_submission_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_origin_class_id_fkey" FOREIGN KEY ("origin_class_id") REFERENCES "public"."classes"("id");



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



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins access attempt answers" ON "public"."quiz_attempt_questions_v2" USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role"))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins access quiz attempts" ON "public"."quiz_attempts_v2" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can insert invitations" ON "public"."user_invitations" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can manage analytics circuit breaker" ON "public"."analytics_circuit_breaker" USING ("public"."has_role"('ADMIN'::"public"."app_role"));



CREATE POLICY "Admins can manage tenant insights" ON "public"."course_insights" USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can read answer history" ON "public"."quiz_answer_history" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."tenant_id" = "quiz_answer_history"."tenant_id") AND ("ur"."role" = 'ADMIN'::"public"."app_role"))))));



CREATE POLICY "Admins can update invitations" ON "public"."user_invitations" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can view admin audit logs" ON "public"."admin_audit_logs" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can view analytics metrics" ON "public"."analytics_metrics" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can view analytics rate limits" ON "public"."analytics_rate_limits" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can view audit logs" ON "public"."analytics_audit" FOR SELECT USING (("public"."has_role"('ADMIN'::"public"."app_role") AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "Admins can view invitations" ON "public"."user_invitations" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Admins can view tenant analytics audit" ON "public"."analytics_audit" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins read telemetry" ON "public"."quiz_attempt_telemetry" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ( SELECT "public"."has_role"('ADMIN'::"public"."app_role") AS "has_role")));



CREATE POLICY "Admins update quiz attempts" ON "public"."quiz_attempts_v2" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Authors and Teachers can delete discussions" ON "public"."discussions" FOR DELETE USING ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "discussions"."course_id") AND ("c"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Service role can insert admin audit logs" ON "public"."admin_audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Students access their attempts" ON "public"."quiz_attempts_v2" FOR SELECT USING ((("student_id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_my_tenant_id"())));



CREATE POLICY "Students create attempts" ON "public"."quiz_attempts_v2" FOR INSERT WITH CHECK ((("student_id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_my_tenant_id"())));



CREATE POLICY "Students insert own attempt questions" ON "public"."quiz_attempt_questions_v2" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "a"
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("a"."student_id" = "auth"."uid"()))))));



CREATE POLICY "Students insert own telemetry" ON "public"."quiz_attempt_telemetry" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "qa"
  WHERE (("qa"."id" = "quiz_attempt_telemetry"."attempt_id") AND ("qa"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Students read course cache" ON "public"."ai_tutor_cache" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "e"
  WHERE (("e"."course_id" = "ai_tutor_cache"."course_id") AND ("e"."user_id" = "auth"."uid"()) AND ("e"."status" = 'ACTIVE'::"public"."enrollment_status")))));



CREATE POLICY "Students read own attempt answers" ON "public"."quiz_attempt_questions_v2" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "a"
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("a"."student_id" = "auth"."uid"()))))));



CREATE POLICY "Students read own mastery" ON "public"."student_concept_mastery" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("student_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Students update own attempt answers" ON "public"."quiz_attempt_questions_v2" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "a"
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("a"."student_id" = "auth"."uid"()))))));



CREATE POLICY "Students update own attempt questions" ON "public"."quiz_attempt_questions_v2" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "a"
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("a"."student_id" = "auth"."uid"()))))));



CREATE POLICY "Students write own attempt answers" ON "public"."quiz_attempt_questions_v2" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_v2" "a"
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("a"."student_id" = "auth"."uid"()))))));



CREATE POLICY "System can insert learning events" ON "public"."learning_events" FOR INSERT WITH CHECK ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Teachers access quiz attempts" ON "public"."quiz_attempts_v2" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_attempts_v2"."quiz_id") AND ("q"."tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."is_course_creator"("q"."course_id") OR (("q"."origin_class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."origin_class_id")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."quiz_assignments" "qa"
     JOIN "public"."classes" "c" ON (("c"."id" = "qa"."class_id")))
  WHERE (("qa"."quiz_id" = "quiz_attempts_v2"."quiz_id") AND "public"."is_class_teacher"("qa"."class_id") AND ("qa"."tenant_id" = "public"."get_my_tenant_id"())))))));



CREATE POLICY "Teachers and Admins can delete course_classes" ON "public"."course_classes" FOR DELETE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ((("auth"."jwt"() ->> 'role'::"text") = 'TEACHER'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"))));



CREATE POLICY "Teachers and Admins can insert course_classes" ON "public"."course_classes" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ((("auth"."jwt"() ->> 'role'::"text") = 'TEACHER'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"))));



CREATE POLICY "Teachers can read answer history" ON "public"."quiz_answer_history" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (EXISTS ( SELECT 1
   FROM (("public"."quiz_attempts_v2" "qa"
     JOIN "public"."quizzes" "q" ON (("qa"."quiz_id" = "q"."id")))
     JOIN "public"."classes" "c" ON (("q"."class_id" = "c"."id")))
  WHERE (("qa"."id" = "quiz_answer_history"."attempt_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Teachers can view related analytics audit" ON "public"."analytics_audit" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = 'teacher'::"text") AND (("user_id" = "auth"."uid"()) OR ("course_id" IN ( SELECT "courses"."id"
   FROM "public"."courses"
  WHERE ("courses"."tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"))))));



CREATE POLICY "Teachers can view tenant course progress" ON "public"."course_progress" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



CREATE POLICY "Teachers can view tenant course stats" ON "public"."course_stats" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



CREATE POLICY "Teachers can view tenant insights" ON "public"."course_insights" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



CREATE POLICY "Teachers can view tenant learning events" ON "public"."learning_events" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



CREATE POLICY "Teachers read attempt answers" ON "public"."quiz_attempt_questions_v2" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_attempts_v2" "a"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "a"."quiz_id")))
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("public"."is_course_creator"("q"."course_id") OR (("q"."origin_class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."origin_class_id")) OR (EXISTS ( SELECT 1
           FROM "public"."quiz_assignments" "qa"
          WHERE (("qa"."quiz_id" = "a"."quiz_id") AND "public"."is_class_teacher"("qa"."class_id"))))))))));



CREATE POLICY "Teachers read telemetry" ON "public"."quiz_attempt_telemetry" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (EXISTS ( SELECT 1
   FROM (("public"."quiz_attempts_v2" "qa"
     JOIN "public"."quizzes" "q" ON (("qa"."quiz_id" = "q"."id")))
     JOIN "public"."classes" "c" ON (("q"."class_id" = "c"."id")))
  WHERE (("qa"."id" = "quiz_attempt_telemetry"."attempt_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Teachers update attempt answers" ON "public"."quiz_attempt_questions_v2" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_attempts_v2" "a"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "a"."quiz_id")))
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("public"."is_course_creator"("q"."course_id") OR (("q"."origin_class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."origin_class_id")) OR (EXISTS ( SELECT 1
           FROM "public"."quiz_assignments" "qa"
          WHERE (("qa"."quiz_id" = "a"."quiz_id") AND "public"."is_class_teacher"("qa"."class_id"))))))))));



CREATE POLICY "Teachers view attempt answers for their classes" ON "public"."quiz_attempt_questions_v2" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."quiz_attempts_v2" "a"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "a"."quiz_id")))
     JOIN "public"."classes" "c" ON (("c"."id" = "q"."class_id")))
  WHERE (("a"."id" = "quiz_attempt_questions_v2"."attempt_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers view attempts for their classes" ON "public"."quiz_attempts_v2" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."quizzes" "q"
     JOIN "public"."classes" "c" ON (("c"."id" = "q"."class_id")))
  WHERE (("q"."id" = "quiz_attempts_v2"."quiz_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Tenant access cheating events" ON "public"."quiz_cheating_events" FOR SELECT USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenants manage cache" ON "public"."ai_tutor_cache" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "Tenants manage concept mastery" ON "public"."student_concept_mastery" TO "authenticated" USING ((("tenant_id" = ( SELECT "student_concept_mastery"."tenant_id"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("tenant_id" = ("current_setting"('app.current_tenant'::"text", true))::"uuid")));



CREATE POLICY "Users can create discussions in their courses" ON "public"."discussions" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "ce"
  WHERE (("ce"."course_id" = "ce"."course_id") AND ("ce"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "discussions"."course_id") AND ("c"."created_by" = "auth"."uid"())))))));



CREATE POLICY "Users can insert their own answers" ON "public"."quiz_answers" FOR INSERT WITH CHECK (("attempt_id" IN ( SELECT "quiz_attempts_legacy"."id"
   FROM "public"."quiz_attempts_legacy"
  WHERE ("quiz_attempts_legacy"."student_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own attempt questions" ON "public"."quiz_attempt_questions_legacy" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_legacy" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions_legacy"."attempt_id") AND ("qa"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own notifications" ON "public"."notifications" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read leaderboard in their tenant" ON "public"."leaderboards" FOR SELECT USING (("tenant_id" = (( SELECT ("auth"."jwt"() ->> 'tenant_id'::"text")))::"uuid"));



CREATE POLICY "Users can update their own attempt questions" ON "public"."quiz_attempt_questions_legacy" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_legacy" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions_legacy"."attempt_id") AND ("qa"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can view course stats for their tenant" ON "public"."course_stats" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "Users can view course_classes for their tenant" ON "public"."course_classes" FOR SELECT USING ((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")));



CREATE POLICY "Users can view courses" ON "public"."courses" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "Users can view discussions in their courses" ON "public"."discussions" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "ce"
  WHERE (("ce"."course_id" = "discussions"."course_id") AND ("ce"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "discussions"."course_id") AND ("c"."created_by" = "auth"."uid"())))) OR "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "Users can view leaderboards for their tenant" ON "public"."leaderboards" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "Users can view own analytics rate limits" ON "public"."analytics_rate_limits" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "Users can view own course progress" ON "public"."course_progress" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Users can view own learning events" ON "public"."learning_events" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Users can view own rate limits" ON "public"."analytics_rate_limits" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view tenant activity events" ON "public"."activity_events" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "Users can view their own answers" ON "public"."quiz_answers" FOR SELECT USING (("attempt_id" IN ( SELECT "quiz_attempts_legacy"."id"
   FROM "public"."quiz_attempts_legacy"
  WHERE ("quiz_attempts_legacy"."student_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own attempt questions" ON "public"."quiz_attempt_questions_legacy" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts_legacy" "qa"
  WHERE (("qa"."id" = "quiz_attempt_questions_legacy"."attempt_id") AND ("qa"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" = (( SELECT ("auth"."jwt"() ->> 'tenant_id'::"text")))::"uuid")));



CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "Users can view weekly leaderboards in their tenant" ON "public"."leaderboards_weekly" FOR SELECT USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "activity_logs_insert" ON "public"."activity_logs" FOR INSERT WITH CHECK (("public"."is_module_enabled"('analytics'::"text") AND (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "activity_logs_select" ON "public"."activity_logs" FOR SELECT USING (("public"."is_module_enabled"('analytics'::"text") AND (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"('ADMIN'::"public"."app_role")))));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_delete_any_discussion" ON "public"."discussions" FOR DELETE TO "authenticated" USING (("public"."has_role"('ADMIN'::"public"."app_role") AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "admins_manage_recommendations" ON "public"."recommendations" TO "authenticated" USING (("public"."has_role"('ADMIN'::"public"."app_role") AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



ALTER TABLE "public"."ai_generation_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_circuit_breaker" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcement_rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anyone_read_published_courses" ON "public"."courses" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"public"."course_status") AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



ALTER TABLE "public"."assignment_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignment_submissions_insert" ON "public"."assignment_submissions" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("student_id" = "auth"."uid"())));



CREATE POLICY "assignment_submissions_select" ON "public"."assignment_submissions" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (("student_id" = "auth"."uid"()) OR "public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignments_insert" ON "public"."assignments" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "assignments_select" ON "public"."assignments" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "assignments_update" ON "public"."assignments" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "authors_delete_discussions" ON "public"."discussions" FOR DELETE USING ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'ADMIN'::"public"."app_role"))))));



CREATE POLICY "authors_delete_discussions_v4" ON "public"."discussions" FOR DELETE USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND (("author_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"))));



CREATE POLICY "authors_insert_discussions_v1" ON "public"."discussions" FOR INSERT WITH CHECK ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "authors_update_discussions" ON "public"."discussions" FOR UPDATE USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "badges_select" ON "public"."badges" FOR SELECT USING (true);



CREATE POLICY "classes_delete" ON "public"."classes" FOR DELETE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "classes_insert" ON "public"."classes" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "classes_select" ON "public"."classes" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "classes_update" ON "public"."classes" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



ALTER TABLE "public"."course_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_enrollments_select" ON "public"."course_enrollments" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



ALTER TABLE "public"."course_insights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_modules_delete_owner" ON "public"."course_modules" FOR DELETE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_modules"."course_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "course_modules_insert_owner" ON "public"."course_modules" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_modules"."course_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "course_modules_update_owner" ON "public"."course_modules" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_modules"."course_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role")))) WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



ALTER TABLE "public"."course_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_progress_select" ON "public"."course_progress" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"('TEACHER'::"public"."app_role") OR "public"."has_role"('ADMIN'::"public"."app_role"))));



ALTER TABLE "public"."course_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_delete" ON "public"."courses" FOR DELETE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "courses_delete_owner" ON "public"."courses" FOR DELETE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "courses_insert" ON "public"."courses" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "courses_select" ON "public"."courses" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "courses_select_own_tenant_admin" ON "public"."courses" FOR SELECT USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['TEACHER'::"text", 'ADMIN'::"text"]))));



CREATE POLICY "courses_select_tenant" ON "public"."courses" FOR SELECT USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("status" = 'published'::"public"."course_status")));



CREATE POLICY "courses_update" ON "public"."courses" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "courses_update_owner" ON "public"."courses" FOR UPDATE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("created_by" = "auth"."uid"())));



ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussions_pin_teacher" ON "public"."discussions" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "discussions"."course_id") AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "discussions_update_author" ON "public"."discussions" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("author_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("author_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "enrolled_students_read_assignments" ON "public"."assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments"
  WHERE (("course_enrollments"."course_id" = "assignments"."course_id") AND ("course_enrollments"."user_id" = "auth"."uid"()) AND ("course_enrollments"."tenant_id" = "assignments"."tenant_id")))));



CREATE POLICY "enrolled_students_read_assignments_v4" ON "public"."assignments" FOR SELECT USING ((("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid") AND ("is_published" = true) AND (EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "e"
  WHERE (("e"."course_id" = "assignments"."course_id") AND ("e"."user_id" = "auth"."uid"()) AND ("e"."tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"))))));



CREATE POLICY "enrollments_delete_admin" ON "public"."course_enrollments" FOR DELETE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text")));



CREATE POLICY "enrollments_insert" ON "public"."enrollments" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "enrollments_insert_admin" ON "public"."course_enrollments" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text")));



CREATE POLICY "enrollments_select" ON "public"."enrollments" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_teacher"("class_id") OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "enrollments_select_own" ON "public"."course_enrollments" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "enrollments_select_teacher" ON "public"."course_enrollments" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



ALTER TABLE "public"."leaderboards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leaderboards_weekly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_progress_insert" ON "public"."lesson_progress" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "lesson_progress_insert_own" ON "public"."lesson_progress" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "lesson_progress_select" ON "public"."lesson_progress" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"('TEACHER'::"public"."app_role") OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "lesson_progress_select_own" ON "public"."lesson_progress" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "lesson_progress_select_teacher" ON "public"."lesson_progress" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "lesson_progress_update" ON "public"."lesson_progress" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "lesson_progress_update_own" ON "public"."lesson_progress" FOR UPDATE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."lesson_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_resources_delete_owner" ON "public"."lesson_resources" FOR DELETE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "lesson_resources"."lesson_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "lesson_resources_insert_owner" ON "public"."lesson_resources" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "lesson_resources"."lesson_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "lesson_resources_select_tenant" ON "public"."lesson_resources" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "lesson_resources_update_owner" ON "public"."lesson_resources" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "l"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("l"."id" = "lesson_resources"."lesson_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role")))) WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_delete" ON "public"."lessons" FOR DELETE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "lessons_delete_owner" ON "public"."lessons" FOR DELETE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "lessons_insert" ON "public"."lessons" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "lessons_insert_owner" ON "public"."lessons" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "lessons_select" ON "public"."lessons" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "lessons_select_tenant" ON "public"."lessons" FOR SELECT USING ((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")));



CREATE POLICY "lessons_update" ON "public"."lessons" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "lessons_update_owner" ON "public"."lessons" FOR UPDATE USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("c"."tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"('ADMIN'::"public"."app_role")))) WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "module_dependencies_select" ON "public"."module_dependencies" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_delete" ON "public"."modules" FOR DELETE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "modules_delete_teacher" ON "public"."modules" FOR DELETE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['TEACHER'::"text", 'ADMIN'::"text"]))));



CREATE POLICY "modules_insert" ON "public"."modules" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "modules_insert_teacher" ON "public"."modules" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['TEACHER'::"text", 'ADMIN'::"text"]))));



CREATE POLICY "modules_select" ON "public"."modules" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "modules_select_tenant" ON "public"."modules" FOR SELECT USING ((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")));



CREATE POLICY "modules_update" ON "public"."modules" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "modules_update_teacher" ON "public"."modules" FOR UPDATE USING (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['TEACHER'::"text", 'ADMIN'::"text"]))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK ((("id" = "auth"."uid"()) AND ("tenant_id" = "public"."get_my_tenant_id"())));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "qa_delete" ON "public"."quiz_assignments" FOR DELETE TO "authenticated" USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "quiz_assignments"."class_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."tenant_id" = "quiz_assignments"."tenant_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'ADMIN'::"public"."app_role")))))));



CREATE POLICY "qa_insert" ON "public"."quiz_assignments" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "quiz_assignments"."class_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."tenant_id" = "quiz_assignments"."tenant_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'ADMIN'::"public"."app_role")))))));



CREATE POLICY "qa_select" ON "public"."quiz_assignments" FOR SELECT TO "authenticated" USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "quiz_assignments"."class_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."tenant_id" = "quiz_assignments"."tenant_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."enrollments" "e"
  WHERE (("e"."class_id" = "quiz_assignments"."class_id") AND ("e"."student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("e"."tenant_id" = "quiz_assignments"."tenant_id") AND ("e"."status" = 'ACTIVE'::"public"."enrollment_status")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'ADMIN'::"public"."app_role")))))));



CREATE POLICY "qa_update" ON "public"."quiz_assignments" FOR UPDATE TO "authenticated" USING ((("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")) AND ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "quiz_assignments"."class_id") AND ("c"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."tenant_id" = "quiz_assignments"."tenant_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'ADMIN'::"public"."app_role"))))))) WITH CHECK (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



ALTER TABLE "public"."question_bank" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_bank_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_answer_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempt_questions_legacy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempt_questions_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempt_telemetry" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts_insert_student" ON "public"."quiz_attempts_legacy" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("student_id" = "auth"."uid"()) AND "public"."has_feature"('quiz'::"text")));



ALTER TABLE "public"."quiz_attempts_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts_select" ON "public"."quiz_attempts_legacy" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_attempts_legacy"."quiz_id") AND (("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id"))))) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "quiz_attempts_select_own" ON "public"."quiz_attempts_legacy" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("student_id" = "auth"."uid"()) AND "public"."has_feature"('quiz'::"text")));



CREATE POLICY "quiz_attempts_select_teacher" ON "public"."quiz_attempts_legacy" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")) AND "public"."has_feature"('quiz'::"text")));



ALTER TABLE "public"."quiz_attempts_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts_v2_2026_04" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts_v2_2026_07" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts_v2_2026_10" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_cheating_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_options_delete" ON "public"."quiz_options" FOR DELETE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_questions" "qq"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "qq"."quiz_id")))
  WHERE (("qq"."id" = "quiz_options"."question_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_options_insert" ON "public"."quiz_options" FOR INSERT WITH CHECK (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_questions" "qq"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "qq"."quiz_id")))
  WHERE (("qq"."id" = "quiz_options"."question_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_options_select" ON "public"."quiz_options" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_questions" "qq"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "qq"."quiz_id")))
  WHERE (("qq"."id" = "quiz_options"."question_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_member"("q"."class_id")) OR (("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_options_update" ON "public"."quiz_options" FOR UPDATE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM ("public"."quiz_questions" "qq"
     JOIN "public"."quizzes" "q" ON (("q"."id" = "qq"."quiz_id")))
  WHERE (("qq"."id" = "quiz_options"."question_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_questions_delete" ON "public"."quiz_questions" FOR DELETE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_questions_insert" ON "public"."quiz_questions" FOR INSERT WITH CHECK (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_questions_select" ON "public"."quiz_questions" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_member"("q"."class_id")) OR (("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



CREATE POLICY "quiz_questions_update" ON "public"."quiz_questions" FOR UPDATE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ((("q"."class_id" IS NOT NULL) AND "public"."is_class_teacher"("q"."class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role")))))));



ALTER TABLE "public"."quiz_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_stats_select_teacher" ON "public"."quiz_stats" FOR SELECT USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."tenant_id" = "quiz_stats"."tenant_id") AND ("ur"."role" = ANY (ARRAY['ADMIN'::"public"."app_role", 'TEACHER'::"public"."app_role"])))))));



ALTER TABLE "public"."quiz_submission_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_delete" ON "public"."quizzes" FOR DELETE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND ((("class_id" IS NOT NULL) AND "public"."is_class_teacher"("class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "quizzes_insert" ON "public"."quizzes" FOR INSERT WITH CHECK (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND ((("class_id" IS NOT NULL) AND "public"."is_class_teacher"("class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "quizzes_select" ON "public"."quizzes" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ((("class_id" IS NOT NULL) AND "public"."is_class_member"("class_id")) OR (("class_id" IS NOT NULL) AND "public"."is_class_teacher"("class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



CREATE POLICY "quizzes_update" ON "public"."quizzes" FOR UPDATE USING (("public"."is_module_enabled"('quizzes'::"text") AND ("tenant_id" = "public"."get_my_tenant_id"()) AND ((("class_id" IS NOT NULL) AND "public"."is_class_teacher"("class_id")) OR "public"."has_role"('ADMIN'::"public"."app_role"))));



ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendations_select" ON "public"."recommendations" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "service_insert" ON "public"."ai_tutor_interactions" FOR INSERT WITH CHECK (false);



CREATE POLICY "service_role_all_interactions" ON "public"."ai_tutor_interactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_rate_limits" ON "public"."ai_tutor_rate_limits" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_only" ON "public"."ai_tutor_rate_limits" USING (false);



CREATE POLICY "staff_manage_announcements" ON "public"."announcements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."tenant_id" = "announcements"."tenant_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur"
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['TEACHER'::"public"."app_role", 'ADMIN'::"public"."app_role"]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."tenant_id" = "up"."tenant_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur"
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['TEACHER'::"public"."app_role", 'ADMIN'::"public"."app_role"])))))))));



ALTER TABLE "public"."student_concept_mastery" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_manage_own_submissions" ON "public"."assignment_submissions" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "students_read_announcements" ON "public"."announcements" FOR SELECT USING ((("status" = 'published'::"text") AND (("course_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."enrollments" "e"
     JOIN "public"."classes" "cl" ON (("cl"."id" = "e"."class_id")))
  WHERE (("cl"."course_id" = "announcements"."course_id") AND ("e"."student_id" = "auth"."uid"())))))));



CREATE POLICY "students_read_own" ON "public"."ai_tutor_interactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "teachers_grade_submissions" ON "public"."assignment_submissions" USING ((EXISTS ( SELECT 1
   FROM ("public"."assignments" "a"
     JOIN "public"."course_enrollments" "e" ON (("a"."course_id" = "e"."course_id")))
  WHERE (("a"."id" = "assignment_submissions"."assignment_id") AND ("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])) AND ("e"."tenant_id" = "assignment_submissions"."tenant_id")))));



CREATE POLICY "teachers_manage_assignments" ON "public"."assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments"
  WHERE (("course_enrollments"."course_id" = "assignments"."course_id") AND ("course_enrollments"."user_id" = "auth"."uid"()) AND ("course_enrollments"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])) AND ("course_enrollments"."tenant_id" = "assignments"."tenant_id")))));



CREATE POLICY "teachers_view_rsvps" ON "public"."announcement_rsvps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."announcements" "a"
     LEFT JOIN "public"."classes" "c" ON (("c"."course_id" = "a"."course_id")))
  WHERE (("a"."id" = "announcement_rsvps"."announcement_id") AND (("c"."teacher_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur"
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'ADMIN'::"public"."app_role")))))))));



CREATE POLICY "tenant_isolation_ai_metadata" ON "public"."ai_generation_metadata" USING (("question_id" IN ( SELECT "question_bank"."id"
   FROM "public"."question_bank"
  WHERE ("question_bank"."tenant_id" = "public"."get_my_tenant_id"()))));



CREATE POLICY "tenant_isolation_question_options" ON "public"."question_options" USING (("question_id" IN ( SELECT "question_bank"."id"
   FROM "public"."question_bank"
  WHERE ("question_bank"."tenant_id" = "public"."get_my_tenant_id"()))));



CREATE POLICY "tenant_isolation_question_stats" ON "public"."question_stats" USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "tenant_isolation_question_tags" ON "public"."question_tags" USING (("question_id" IN ( SELECT "question_bank"."id"
   FROM "public"."question_bank"
  WHERE ("question_bank"."tenant_id" = "public"."get_my_tenant_id"()))));



CREATE POLICY "tenant_isolation_question_usage" ON "public"."question_bank_usage" USING (("tenant_id" = "public"."get_my_tenant_id"()));



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges_insert" ON "public"."user_badges" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "user_badges_select" ON "public"."user_badges" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_points_insert" ON "public"."user_points" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



CREATE POLICY "user_points_select" ON "public"."user_points" FOR SELECT USING (("tenant_id" = "public"."get_my_tenant_id"()));



CREATE POLICY "user_points_update" ON "public"."user_points" FOR UPDATE USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role")))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND ("public"."has_role"('ADMIN'::"public"."app_role") OR "public"."has_role"('TEACHER'::"public"."app_role"))));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin_manage" ON "public"."user_roles" USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role"))) WITH CHECK ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



CREATE POLICY "user_roles_select_self" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_roles_select_tenant_admin" ON "public"."user_roles" FOR SELECT USING ((("tenant_id" = "public"."get_my_tenant_id"()) AND "public"."has_role"('ADMIN'::"public"."app_role")));



ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_create_discussions" ON "public"."discussions" FOR INSERT WITH CHECK (((("tenant_id")::"text" = ("auth"."jwt"() ->> 'tenant_id'::"text")) AND ("author_id" = "auth"."uid"())));



CREATE POLICY "users_manage_own_rsvps" ON "public"."announcement_rsvps" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_read_discussions" ON "public"."discussions" FOR SELECT USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));



CREATE POLICY "users_read_own_interactions" ON "public"."ai_tutor_interactions" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "users_read_own_rate_limits" ON "public"."ai_tutor_rate_limits" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid")));



CREATE POLICY "users_read_own_recommendations" ON "public"."recommendations" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id"))));



CREATE POLICY "users_read_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("tenant_id" = ( SELECT "public"."get_my_tenant_id"() AS "get_my_tenant_id")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






GRANT ALL ON SCHEMA "public" TO "postgres";
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_question_to_quiz"("p_question_bank_id" "uuid", "p_quiz_id" "uuid", "p_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_question_to_quiz"("p_question_bank_id" "uuid", "p_quiz_id" "uuid", "p_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_question_to_quiz"("p_question_bank_id" "uuid", "p_quiz_id" "uuid", "p_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_tenants"("p_search" "text", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_tenants"("p_search" "text", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_tenants"("p_search" "text", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_role_filter" "public"."app_role", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_role_filter" "public"."app_role", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_role_filter" "public"."app_role", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."analytics_health_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."analytics_health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."analytics_health_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_question"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_question"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_question"("p_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_module_for_all_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_module_for_all_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_module_for_all_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_modules_for_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_modules_for_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_modules_for_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_set_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_set_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_set_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_badge_if_qualified"("p_user_id" "uuid", "p_badge_name" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."award_badge_if_qualified"("p_user_id" "uuid", "p_badge_name" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_badge_if_qualified"("p_user_id" "uuid", "p_badge_name" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_save_answers"("p_attempt_id" "uuid", "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_save_answers"("p_attempt_id" "uuid", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_save_answers"("p_attempt_id" "uuid", "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_analytics_rate_limit"("p_user_id" "uuid", "p_limit" integer, "p_window" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."check_analytics_rate_limit"("p_user_id" "uuid", "p_limit" integer, "p_window" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_analytics_rate_limit"("p_user_id" "uuid", "p_limit" integer, "p_window" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_single_active_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_single_active_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_single_active_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stale_quiz_attempts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stale_quiz_attempts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stale_quiz_attempts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_level"("p_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_level"("p_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_level"("p_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_activity_event"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_event_type" "public"."activity_event_type", "p_entity_type" "text", "p_entity_id" "uuid", "p_class_id" "uuid", "p_course_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_activity_event"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_event_type" "public"."activity_event_type", "p_entity_type" "text", "p_entity_id" "uuid", "p_class_id" "uuid", "p_course_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_activity_event"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_event_type" "public"."activity_event_type", "p_entity_type" "text", "p_entity_id" "uuid", "p_class_id" "uuid", "p_course_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_class"("p_name" "text", "p_course_id" "uuid", "p_max_students" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_class"("p_name" "text", "p_course_id" "uuid", "p_max_students" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_class"("p_name" "text", "p_course_id" "uuid", "p_max_students" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_question"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_question"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_question"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."enroll_student"("p_join_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."enroll_student"("p_join_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enroll_student"("p_join_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_quiz_attempt_partition"("p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_dead_attempt"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."expire_dead_attempt"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_dead_attempt"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_join_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_join_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_join_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_attempt_detail"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_attempt_detail"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attempt_detail"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_lesson_viewer_payload"("p_lesson_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_module_id"("module_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_module_id"("module_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_module_id"("module_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_classes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_classes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_classes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_question"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question"("p_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question_difficulty"("p_assignment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_question_difficulty"("p_assignment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question_difficulty"("p_assignment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question_options"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_question_options"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question_options"("p_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_progress_bundle"("p_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_progress_bundle"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_progress_bundle"("p_student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer, "p_cursor_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer, "p_cursor_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_analytics"("p_course_id" "uuid", "p_limit" integer, "p_cursor_student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tutor_context"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_lesson_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tutor_context"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_lesson_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tutor_context"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_lesson_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."grade_attempt_question"("p_attempt_question_id" "uuid", "p_points_earned" numeric, "p_is_correct" boolean, "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grade_attempt_question"("p_attempt_question_id" "uuid", "p_points_earned" numeric, "p_is_correct" boolean, "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grade_attempt_question"("p_attempt_question_id" "uuid", "p_points_earned" numeric, "p_is_correct" boolean, "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_assignment_graded"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_assignment_graded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_assignment_graded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_assignment_submission_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_assignment_submission_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_assignment_submission_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_course_assigned_to_class"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_course_assigned_to_class"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_course_assigned_to_class"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_course_unassigned_from_class"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_course_unassigned_from_class"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_course_unassigned_from_class"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_enrollment_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_enrollment_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_enrollment_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lesson_progress_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lesson_progress_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lesson_progress_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quiz_attempt_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quiz_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quiz_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quiz_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_streak_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_streak_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_streak_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_streak_on_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_streak_on_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_streak_on_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_student_joined_class"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_student_joined_class"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_student_joined_class"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_feature"("feature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_feature"("feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_feature"("feature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_course_creator"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_course_creator"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_course_creator"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_class"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_class"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_class"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_enrolled_in_course"("course_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_module_enabled"("module_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_module_enabled"("module_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_module_enabled"("module_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_analytics_access"("p_action" "text", "p_course_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_lesson_complete"("p_lesson_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_lesson_complete"("p_lesson_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_lesson_complete"("p_lesson_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_announcement_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_announcement_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_announcement_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_assignment_graded"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_assignment_graded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_assignment_graded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_course_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_course_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_course_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_quiz_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_quiz_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_quiz_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_assignment_submitted"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_assignment_submitted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_assignment_submitted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_progress_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_progress_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_progress_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_attempt_score"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_attempt_score"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_attempt_score"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_course_progress_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_course_progress_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_course_progress_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_leaderboard"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_leaderboard"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_leaderboard"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid", "p_week_start" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid", "p_week_start" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid", "p_week_start" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_analytics_metric"("p_metric_name" "text", "p_value" double precision, "p_labels" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_cheating_signal"("p_attempt_id" "uuid", "p_signal_type" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_cheating_signal"("p_attempt_id" "uuid", "p_signal_type" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_cheating_signal"("p_attempt_id" "uuid", "p_signal_type" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid", "p_module_id" "uuid", "p_lesson_id" "uuid", "p_quiz_id" "uuid", "p_assignment_id" "uuid", "p_event_data" "jsonb", "p_duration_seconds" integer, "p_device_type" "text", "p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid", "p_module_id" "uuid", "p_lesson_id" "uuid", "p_quiz_id" "uuid", "p_assignment_id" "uuid", "p_event_data" "jsonb", "p_duration_seconds" integer, "p_device_type" "text", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_learning_event"("p_event_type" "text", "p_course_id" "uuid", "p_module_id" "uuid", "p_lesson_id" "uuid", "p_quiz_id" "uuid", "p_assignment_id" "uuid", "p_event_data" "jsonb", "p_duration_seconds" integer, "p_device_type" "text", "p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_quiz_heartbeat"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_quiz_heartbeat"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_quiz_heartbeat"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_course_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_course_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_course_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_course_analytics_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_course_analytics_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_course_analytics_mv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_course_stats"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_weekly_leaderboard"("p_tenant_id" "uuid", "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_publish_course"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_publish_course"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_publish_course"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reorder_course_modules"("p_course_id" "uuid", "p_module_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reorder_course_modules"("p_course_id" "uuid", "p_module_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reorder_course_modules"("p_course_id" "uuid", "p_module_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reorder_lesson_resources"("p_lesson_id" "uuid", "p_resource_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reorder_lesson_resources"("p_lesson_id" "uuid", "p_resource_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reorder_lesson_resources"("p_lesson_id" "uuid", "p_resource_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reorder_module_lessons"("p_module_id" "uuid", "p_lesson_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reorder_module_lessons"("p_module_id" "uuid", "p_lesson_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reorder_module_lessons"("p_module_id" "uuid", "p_lesson_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_quiz_builder"("p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_quiz_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_lesson_resources"("p_tenant_id" "uuid", "p_course_id" "uuid", "p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_questions"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_difficulty_level" integer, "p_question_type" "text", "p_search_query" "text", "p_tags" "text"[], "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_questions"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_difficulty_level" integer, "p_question_type" "text", "p_search_query" "text", "p_tags" "text"[], "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_questions"("p_subject_id" "uuid", "p_topic_id" "uuid", "p_difficulty_level" integer, "p_question_type" "text", "p_search_query" "text", "p_tags" "text"[], "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_learning_event_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_learning_event_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_learning_event_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_points_to_weekly_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_points_to_weekly_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_points_to_weekly_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_points_to_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_points_to_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_points_to_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_analytics_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_analytics_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_analytics_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_update_quiz_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_update_quiz_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_update_quiz_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_attempt_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_attempt_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_attempt_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_lesson_completed"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_lesson_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_lesson_completed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_quiz_passed"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_quiz_passed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_quiz_passed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_course_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_course_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_course_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_session_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_session_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_session_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lesson_progress_monotonic"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_progress_percentage" integer, "p_last_position" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_lesson_progress_monotonic"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_progress_percentage" integer, "p_last_position" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lesson_progress_monotonic"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_progress_percentage" integer, "p_last_position" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lesson_resource_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lesson_resource_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lesson_resource_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_question"("p_question_id" "uuid", "p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_question"("p_question_id" "uuid", "p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_question"("p_question_id" "uuid", "p_subject_id" "uuid", "p_topic_id" "uuid", "p_question_type" "text", "p_question_text" "text", "p_explanation" "text", "p_difficulty_level" integer, "p_options" "jsonb", "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_question_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_question_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_question_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quiz_assignment_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quiz_assignment_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quiz_assignment_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_checkout_submission_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."v1_checkout_submission_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_checkout_submission_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_get_assignment_results"("p_assignment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_get_assignment_results"("p_assignment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_get_assignment_results"("p_assignment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_get_quiz_results"("p_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_get_quiz_results"("p_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_get_quiz_results"("p_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_save_answer"("p_attempt_id" "uuid", "p_question_id" "uuid", "p_selected_option_ids" "uuid"[], "p_text_answer" "text", "p_client_version" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."v1_save_answer"("p_attempt_id" "uuid", "p_question_id" "uuid", "p_selected_option_ids" "uuid"[], "p_text_answer" "text", "p_client_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_save_answer"("p_attempt_id" "uuid", "p_question_id" "uuid", "p_selected_option_ids" "uuid"[], "p_text_answer" "text", "p_client_version" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_save_partial_answers"("p_attempt_id" "uuid", "p_answers" "jsonb", "p_client_version" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."v1_save_partial_answers"("p_attempt_id" "uuid", "p_answers" "jsonb", "p_client_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_save_partial_answers"("p_attempt_id" "uuid", "p_answers" "jsonb", "p_client_version" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_start_attempt"("p_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_start_attempt"("p_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_start_attempt"("p_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid", "p_assignment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid", "p_assignment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_start_quiz_attempt"("p_quiz_id" "uuid", "p_assignment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid", "p_final_answers" "jsonb", "p_telemetry_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid", "p_final_answers" "jsonb", "p_telemetry_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."v1_submit_quiz_attempt"("p_attempt_id" "uuid", "p_final_answers" "jsonb", "p_telemetry_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_attempt_transition"("p_old_status" "text", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_attempt_transition"("p_old_status" "text", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_attempt_transition"("p_old_status" "text", "p_new_status" "text") TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."activity_events" TO "anon";
GRANT ALL ON TABLE "public"."activity_events" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_events" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_generation_metadata" TO "anon";
GRANT ALL ON TABLE "public"."ai_generation_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_generation_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_cache" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_feedback" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_interactions" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_audit" TO "anon";
GRANT ALL ON TABLE "public"."analytics_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_audit" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_circuit_breaker" TO "anon";
GRANT ALL ON TABLE "public"."analytics_circuit_breaker" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_circuit_breaker" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_metrics" TO "anon";
GRANT ALL ON TABLE "public"."analytics_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."analytics_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_rsvps" TO "anon";
GRANT ALL ON TABLE "public"."announcement_rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_rsvps" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_submissions" TO "anon";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."class_announcements" TO "anon";
GRANT ALL ON TABLE "public"."class_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."class_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."class_schedules" TO "anon";
GRANT ALL ON TABLE "public"."class_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."class_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."course_progress" TO "anon";
GRANT ALL ON TABLE "public"."course_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."course_progress" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_analytics_mv" TO "service_role";



GRANT ALL ON TABLE "public"."course_classes" TO "anon";
GRANT ALL ON TABLE "public"."course_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."course_classes" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_insights" TO "anon";
GRANT ALL ON TABLE "public"."course_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."course_insights" TO "service_role";



GRANT ALL ON TABLE "public"."course_modules" TO "anon";
GRANT ALL ON TABLE "public"."course_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."course_modules" TO "service_role";



GRANT ALL ON TABLE "public"."course_stats" TO "anon";
GRANT ALL ON TABLE "public"."course_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."course_stats" TO "service_role";



GRANT ALL ON TABLE "public"."discussions" TO "anon";
GRANT ALL ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT ALL ON TABLE "public"."grades" TO "anon";
GRANT ALL ON TABLE "public"."grades" TO "authenticated";
GRANT ALL ON TABLE "public"."grades" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboards" TO "anon";
GRANT ALL ON TABLE "public"."leaderboards" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboards" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboards_weekly" TO "anon";
GRANT ALL ON TABLE "public"."leaderboards_weekly" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboards_weekly" TO "service_role";



GRANT ALL ON TABLE "public"."learning_events" TO "anon";
GRANT ALL ON TABLE "public"."learning_events" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_events" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_chunks" TO "anon";
GRANT ALL ON TABLE "public"."lesson_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_resources" TO "anon";
GRANT ALL ON TABLE "public"."lesson_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_resources" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."module_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."module_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."module_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."question_bank" TO "anon";
GRANT ALL ON TABLE "public"."question_bank" TO "authenticated";
GRANT ALL ON TABLE "public"."question_bank" TO "service_role";



GRANT ALL ON TABLE "public"."question_bank_usage" TO "anon";
GRANT ALL ON TABLE "public"."question_bank_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."question_bank_usage" TO "service_role";



GRANT ALL ON TABLE "public"."question_options" TO "anon";
GRANT ALL ON TABLE "public"."question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."question_options" TO "service_role";



GRANT ALL ON TABLE "public"."question_stats" TO "anon";
GRANT ALL ON TABLE "public"."question_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."question_stats" TO "service_role";



GRANT ALL ON TABLE "public"."question_tags" TO "anon";
GRANT ALL ON TABLE "public"."question_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tags" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_questions_v2" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_questions_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_questions_v2" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_03" TO "anon";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_03" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_03" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_04" TO "anon";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_04" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_2026_04" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_a_q_v2_historic" TO "anon";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_historic" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_a_q_v2_historic" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_answer_history" TO "anon";
GRANT ALL ON TABLE "public"."quiz_answer_history" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_answer_history" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_answers" TO "anon";
GRANT ALL ON TABLE "public"."quiz_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_answers" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_assignments" TO "anon";
GRANT ALL ON TABLE "public"."quiz_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_questions_legacy" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_questions_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_questions_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempt_telemetry" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempt_telemetry" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempt_telemetry" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."quiz_attempts_legacy" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."quiz_attempts_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_03" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_03" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_03" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_04" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_04" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_04" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_07" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_07" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_07" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_10" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_10" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_2026_10" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts_v2_historic" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_historic" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts_v2_historic" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_cheating_events" TO "anon";
GRANT ALL ON TABLE "public"."quiz_cheating_events" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_cheating_events" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_options" TO "anon";
GRANT ALL ON TABLE "public"."quiz_options" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_options" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_stats" TO "anon";
GRANT ALL ON TABLE "public"."quiz_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_stats" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_submission_queue" TO "anon";
GRANT ALL ON TABLE "public"."quiz_submission_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_submission_queue" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."student_concept_mastery" TO "anon";
GRANT ALL ON TABLE "public"."student_concept_mastery" TO "authenticated";
GRANT ALL ON TABLE "public"."student_concept_mastery" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_modules" TO "anon";
GRANT ALL ON TABLE "public"."tenant_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_modules" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_points" TO "anon";
GRANT ALL ON TABLE "public"."user_points" TO "authenticated";
GRANT ALL ON TABLE "public"."user_points" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";





























