-- =============================================================================
-- Migration: Auth bootstrap + tenant membership sync
-- =============================================================================
-- Purpose:
-- 1. Backfill tenant_memberships from legacy user_roles.
-- 2. Keep tenant_memberships and user_roles in sync for onboarding flows.
-- 3. Provide a single auth bootstrap RPC for the frontend login/workspace flow.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper: sync runtime membership + compatibility role projection
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_user_tenant_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_role TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_lower TEXT;
  v_role_upper public.app_role;
  v_membership_role TEXT;
BEGIN
  v_role_lower := lower(trim(p_role));

  IF v_role_lower NOT IN ('admin', 'teacher', 'student', 'parent', 'principal') THEN
    RAISE EXCEPTION 'Role tidak valid: %', p_role;
  END IF;

  IF lower(trim(p_status)) NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Status membership tidak valid: %', p_status;
  END IF;

  v_membership_role := upper(v_role_lower);

  INSERT INTO public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    status,
    joined_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    v_membership_role,
    lower(trim(p_status)),
    now(),
    now()
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();

  -- user_roles remains a compatibility projection for backend auth checks.
  -- The schema only guarantees uniqueness on (user_id, role), so this row
  -- represents the latest active tenant for that role.
  v_role_upper := upper(v_role_lower)::public.app_role;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (p_user_id, p_tenant_id, v_role_upper)
  ON CONFLICT (user_id, role) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    created_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_tenant_access(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_user_tenant_access(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill tenant_memberships from existing legacy user_roles rows
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.tenant_memberships (
  tenant_id,
  user_id,
  role,
  status,
  joined_at,
  created_at,
  updated_at
)
SELECT
  ur.tenant_id AS tenant_id,
  ur.user_id AS user_id,
  upper(ur.role::text) AS role,
  'active' AS status,
  ur.created_at AS joined_at,
  now() AS created_at,
  now() AS updated_at
FROM public.user_roles ur
JOIN public.tenants t ON t.id = ur.tenant_id
LEFT JOIN public.tenant_memberships tm
  ON tm.tenant_id = ur.tenant_id
 AND tm.user_id = ur.user_id
WHERE tm.id IS NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

UPDATE public.profiles p
SET
  tenant_id = fallback.tenant_id,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (tm.user_id)
    tm.user_id,
    tm.tenant_id
  FROM public.tenant_memberships tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.status = 'active'
    AND t.is_active = true
  ORDER BY tm.user_id, tm.joined_at DESC, tm.created_at DESC
) AS fallback
WHERE p.id = fallback.user_id
  AND p.tenant_id IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bootstrap RPC for deterministic post-auth resolution
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_auth_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_profile jsonb;
  v_memberships jsonb;
  v_default_tenant_id UUID;
  v_requires_email_verification BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.ensure_profile_exists();

  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'avatar_url', p.avatar_url,
    'tenant_id', p.tenant_id
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tenant_id', tm.tenant_id,
        'tenant_name', t.name,
        'tenant_slug', t.slug,
        'tenant_logo', NULL,
        'role', lower(tm.role),
        'status', tm.status,
        'is_active', t.is_active,
        'joined_at', tm.joined_at
      )
      ORDER BY
        CASE WHEN tm.status = 'active' AND t.is_active = true THEN 0 ELSE 1 END,
        tm.joined_at DESC,
        tm.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_memberships
  FROM public.tenant_memberships tm
  JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = v_user_id;

  SELECT COALESCE(
    (
      SELECT tm.tenant_id
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      JOIN public.profiles p ON p.id = tm.user_id
      WHERE tm.user_id = v_user_id
        AND tm.status = 'active'
        AND t.is_active = true
        AND p.tenant_id = tm.tenant_id
      ORDER BY tm.joined_at DESC
      LIMIT 1
    ),
    (
      SELECT tm.tenant_id
      FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = v_user_id
        AND tm.status = 'active'
        AND t.is_active = true
      ORDER BY tm.joined_at DESC
      LIMIT 1
    )
  )
  INTO v_default_tenant_id;

  SELECT (u.email_confirmed_at IS NULL)
  INTO v_requires_email_verification
  FROM auth.users u
  WHERE u.id = v_user_id;

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'memberships', COALESCE(v_memberships, '[]'::jsonb),
    'default_tenant_id', v_default_tenant_id,
    'requires_email_verification', COALESCE(v_requires_email_verification, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_auth_bootstrap() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_bootstrap() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Ensure Google/OAuth signup writes membership when tenant is pre-resolved
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id   uuid;
    v_first_name  text;
    v_last_name   text;
    v_full_name   text;
    v_avatar_url  text;
BEGIN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    IF v_tenant_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.tenants
            WHERE id = v_tenant_id AND is_active = true
        ) THEN
            v_tenant_id := NULL;
        END IF;
    END IF;

    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
    v_last_name  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    v_full_name  := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    IF v_first_name = '' AND v_full_name <> '' THEN
        v_first_name := split_part(v_full_name, ' ', 1);
        v_last_name  := NULLIF(
            trim(substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 1)),
            ''
        );
        IF v_last_name IS NULL THEN v_last_name := ''; END IF;
    END IF;

    INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        COALESCE(v_last_name, ''),
        NULLIF(v_avatar_url, ''),
        v_tenant_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
        last_name  = CASE WHEN profiles.last_name  = '' THEN EXCLUDED.last_name  ELSE profiles.last_name  END,
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
        tenant_id  = COALESCE(profiles.tenant_id, EXCLUDED.tenant_id);

    IF v_tenant_id IS NOT NULL THEN
        PERFORM public.sync_user_tenant_access(NEW.id, v_tenant_id, 'student', 'active');
    END IF;

    RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Onboarding RPCs must sync memberships in the same transaction
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF lower(p_role) NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'Peran harus admin atau teacher.';
  END IF;

  v_slug := lower(regexp_replace(trim(p_school_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.tenants (name, slug, is_active)
  VALUES (trim(p_school_name), v_slug, true)
  RETURNING id INTO v_tenant_id;

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

  PERFORM public.sync_user_tenant_access(v_user_id, v_tenant_id, lower(p_role), 'active');

  RETURN v_tenant_id;
END;
$$;


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

  SELECT COUNT(*) INTO v_student_count
  FROM public.class_students
  WHERE class_id = v_class.id;

  IF v_class.max_students IS NOT NULL AND v_student_count >= v_class.max_students THEN
    RAISE EXCEPTION 'Kelas sudah penuh (maksimal % siswa).', v_class.max_students;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_id = v_class.id AND student_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Anda sudah terdaftar di kelas ini.';
  END IF;

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

  PERFORM public.sync_user_tenant_access(v_user_id, v_class.tenant_id, 'student', 'active');

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class.id, v_user_id)
  ON CONFLICT DO NOTHING;

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


CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_validation JSON;
  v_invitation public.user_invitations%ROWTYPE;
  v_current_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk menerima undangan';
  END IF;

  v_validation := public.validate_invitation(p_token);
  IF NOT COALESCE((v_validation->>'valid')::BOOLEAN, false) THEN
    RETURN v_validation;
  END IF;

  SELECT email INTO v_current_email
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_current_email IS NOT NULL
     AND lower(trim(v_current_email)) <> lower(trim(v_validation->>'email')) THEN
    RAISE EXCEPTION 'Undangan ini ditujukan untuk email yang berbeda.';
  END IF;

  UPDATE public.user_invitations
  SET
    accepted_at = now(),
    status = 'accepted'
  WHERE token = p_token
  RETURNING * INTO v_invitation;

  UPDATE public.profiles
  SET
    tenant_id = COALESCE(tenant_id, v_invitation.tenant_id),
    updated_at = now()
  WHERE id = auth.uid();

  PERFORM public.sync_user_tenant_access(
    auth.uid(),
    v_invitation.tenant_id,
    lower(v_invitation.role::text),
    'active'
  );

  RETURN json_build_object(
    'success',   true,
    'tenant_id', v_invitation.tenant_id,
    'role',      lower(v_invitation.role::text)
  );
END;
$$;
