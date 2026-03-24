-- =============================================================================
-- Migration: Role-based onboarding RPCs
-- =============================================================================
-- Redesign onboarding flow to be role-based (like Duolingo for Schools):
-- 1. Guru → create school, become TEACHER
-- 2. Murid → join via class code, become STUDENT
-- 3. Admin → create school, become ADMIN
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Replace create_school_tenant to accept role parameter
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_school_tenant(
  p_school_name TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_slug TEXT;
  v_role public.app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate role
  IF lower(p_role) NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Peran harus admin atau teacher.';
  END IF;
  v_role := lower(p_role)::public.app_role;

  -- Generate slug from school name
  v_slug := lower(regexp_replace(trim(p_school_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- 1. Create new Tenant
  INSERT INTO public.tenants (name, slug, is_active)
  VALUES (trim(p_school_name), v_slug, true)
  RETURNING id INTO v_tenant_id;

  -- 2. Update profile: set name and tenant_id
  UPDATE public.profiles
  SET
    tenant_id = v_tenant_id,
    first_name = CASE
      WHEN (first_name IS NULL OR first_name = '') AND p_full_name IS NOT NULL
      THEN split_part(trim(p_full_name), ' ', 1)
      ELSE first_name
    END,
    last_name = CASE
      WHEN (last_name IS NULL OR last_name = '') AND p_full_name IS NOT NULL
      THEN COALESCE(NULLIF(trim(substring(trim(p_full_name) from length(split_part(trim(p_full_name), ' ', 1)) + 1)), ''), '')
      ELSE last_name
    END,
    updated_at = now()
  WHERE id = v_user_id;

  -- 3. Assign role in new tenant
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_school_tenant(TEXT, TEXT, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. New RPC: onboard_student_join_class — student joins via class code
-- ─────────────────────────────────────────────────────────────────────────────
-- A brand-new user (no tenant) enters a class join code.
-- This RPC:
--   1. Looks up the class by join_code
--   2. Gets the tenant_id from the class
--   3. Updates the user's profile.tenant_id
--   4. Creates a STUDENT role in that tenant
--   5. Enrolls the student in the class (class_students)
CREATE OR REPLACE FUNCTION public.onboard_student_join_class(
  p_join_code TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_class RECORD;
  v_student_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Find class by join code
  SELECT c.id, c.name, c.tenant_id, c.max_students, c.course_id,
         t.name AS tenant_name
  INTO v_class
  FROM public.classes c
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE upper(trim(c.join_code)) = upper(trim(p_join_code))
    AND t.is_active = true;

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Kode kelas tidak ditemukan atau sekolah tidak aktif.';
  END IF;

  -- Check max students
  SELECT COUNT(*) INTO v_student_count
  FROM public.class_students
  WHERE class_id = v_class.id;

  IF v_class.max_students IS NOT NULL AND v_student_count >= v_class.max_students THEN
    RAISE EXCEPTION 'Kelas sudah penuh (maksimal % siswa).', v_class.max_students;
  END IF;

  -- Check not already enrolled
  IF EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_id = v_class.id AND student_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Anda sudah terdaftar di kelas ini.';
  END IF;

  -- 1. Update profile: set tenant_id and name
  UPDATE public.profiles
  SET
    tenant_id = v_class.tenant_id,
    first_name = CASE
      WHEN (first_name IS NULL OR first_name = '') AND p_full_name IS NOT NULL
      THEN split_part(trim(p_full_name), ' ', 1)
      ELSE first_name
    END,
    last_name = CASE
      WHEN (last_name IS NULL OR last_name = '') AND p_full_name IS NOT NULL
      THEN COALESCE(NULLIF(trim(substring(trim(p_full_name) from length(split_part(trim(p_full_name), ' ', 1)) + 1)), ''), '')
      ELSE last_name
    END,
    updated_at = now()
  WHERE id = v_user_id;

  -- 2. Add STUDENT role in this tenant
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_user_id, v_class.tenant_id, 'STUDENT')
  ON CONFLICT DO NOTHING;

  -- 3. Enroll in the class
  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class.id, v_user_id)
  ON CONFLICT DO NOTHING;

  -- 4. Enroll in the course (if class has one)
  IF v_class.course_id IS NOT NULL THEN
    INSERT INTO public.enrollments (user_id, course_id, tenant_id)
    VALUES (v_user_id, v_class.course_id, v_class.tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'class_name', v_class.name,
    'school_name', v_class.tenant_name,
    'tenant_id', v_class.tenant_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.onboard_student_join_class(TEXT, TEXT) TO authenticated;
