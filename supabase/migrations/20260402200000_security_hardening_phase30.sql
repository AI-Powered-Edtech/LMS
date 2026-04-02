-- =============================================================================
-- Migration 20260402200000: Security Hardening — Phase 29/30 RLS Audit Fixes
-- =============================================================================
-- Audit Date: 2026-04-02
-- Fixes identified vulnerabilities in parent/principal role migrations.
--
-- FINDINGS ADDRESSED:
--   [CRITICAL] F-01: has_role() 3-arg overload missing → policies on baseline_metrics,
--                    satisfaction_surveys, survey_responses silently fail
--   [HIGH]    F-02: parent_otp_codes SELECT allows OTP enumeration
--   [HIGH]    F-03: parent_otp_codes UPDATE allows column tampering (not just `used`)
--   [MEDIUM]  F-04: parent_teacher_threads missing tenant isolation for participants
--   [MEDIUM]  F-05: parent_digest_settings missing tenant isolation
--   [MEDIUM]  F-06: survey_responses missing respondent self-read policy
--   [MEDIUM]  F-07: survey_responses missing unique constraint (1 response per survey)
--   [HIGH]    F-08: get_executive_overview() callable by any authenticated user
-- =============================================================================

-- =====================================================================
-- F-01 FIX: Create 3-argument has_role() overload
-- =====================================================================
-- Migrations 000011 and 000012 call has_role(uuid, uuid, text) but only
-- has_role(app_role) exists. We create the 3-arg overload that checks
-- user_roles with explicit user_id, tenant_id, and role (as text cast
-- to app_role).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id   uuid,
  p_tenant_id uuid,
  p_role      text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id  = p_user_id
      AND tenant_id = p_tenant_id
      AND role = p_role::public.app_role
  );
END;
$$;

ALTER FUNCTION public.has_role(uuid, uuid, text) OWNER TO postgres;

-- =====================================================================
-- F-02 FIX: Restrict OTP SELECT — prevent enumeration
-- =====================================================================
-- Old policy: anyone can SELECT all non-expired, unused OTPs.
-- New policy: only service_role and the RPC functions (SECURITY DEFINER)
-- should read OTPs. Remove public SELECT entirely.
-- Verification is done via verify_parent_otp() RPC which is SECURITY DEFINER.
-- =====================================================================

DROP POLICY IF EXISTS "public_verify_otp" ON public.parent_otp_codes;

-- Admin-only SELECT for audit/debugging purposes
CREATE POLICY "admin_view_otp_codes" ON public.parent_otp_codes
  FOR SELECT USING (
    has_role('ADMIN'::public.app_role)
  );

-- =====================================================================
-- F-03 FIX: Restrict OTP UPDATE to only `used` column change
-- =====================================================================
-- Old policy allows UPDATE on any column. Replace with a more restrictive
-- policy that still allows the verify_parent_otp() RPC to work (it's
-- SECURITY DEFINER so it bypasses RLS), but prevent direct client abuse.
-- =====================================================================

DROP POLICY IF EXISTS "public_use_otp" ON public.parent_otp_codes;

-- No public UPDATE policy needed — verify_parent_otp() is SECURITY DEFINER
-- and bypasses RLS. This closes the column-tampering vector entirely.

-- =====================================================================
-- F-04 FIX: Add tenant isolation to parent_teacher_threads
-- =====================================================================
-- Old policy: parent_id = auth.uid() OR teacher_id = auth.uid()
-- Missing tenant_id check for participant access.
-- =====================================================================

DROP POLICY IF EXISTS "parent_own_threads" ON public.parent_teacher_threads;

CREATE POLICY "participant_access_threads" ON public.parent_teacher_threads
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND (
      parent_id = auth.uid()
      OR teacher_id = auth.uid()
      OR has_role('ADMIN'::public.app_role)
    )
  );

-- =====================================================================
-- F-05 FIX: Add tenant isolation to parent_digest_settings
-- =====================================================================
-- Old policy: parent_id = auth.uid() — no tenant check.
-- =====================================================================

DROP POLICY IF EXISTS "parent_own_digest_settings" ON public.parent_digest_settings;

CREATE POLICY "parent_own_digest_settings" ON public.parent_digest_settings
  FOR ALL USING (
    parent_id = auth.uid()
    AND tenant_id = get_my_tenant_id()
  );

-- =====================================================================
-- F-06 FIX: Add respondent self-read policy for survey_responses
-- =====================================================================
-- Respondents should be able to read their own submitted responses.
-- =====================================================================

CREATE POLICY "respondent_view_own_responses" ON public.survey_responses
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND respondent_id = auth.uid()
  );

-- =====================================================================
-- F-07 FIX: Add unique constraint for survey_responses
-- =====================================================================
-- Enforce: one response per survey per respondent at DB level.
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_survey_respondent
  ON public.survey_responses (survey_id, respondent_id)
  WHERE respondent_id IS NOT NULL;

-- =====================================================================
-- F-08 FIX: Replace get_executive_overview() with role check
-- =====================================================================
-- Old: any authenticated user can call and get all tenant metrics.
-- New: restrict to PRINCIPAL or ADMIN.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_executive_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id        uuid;
  v_total_students   integer;
  v_active_students  integer;
  v_total_teachers   integer;
  v_active_teachers  integer;
  v_total_courses    integer;
  v_avg_quiz_score   numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- SECURITY: Only PRINCIPAL or ADMIN may call this function
  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Forbidden: requires PRINCIPAL or ADMIN role';
  END IF;

  v_tenant_id := public.get_my_tenant_id();

  SELECT COUNT(*) INTO v_total_students
  FROM public.user_roles
  WHERE tenant_id = v_tenant_id AND role = 'STUDENT';

  SELECT COUNT(DISTINCT user_id) INTO v_active_students
  FROM public.activity_events
  WHERE tenant_id = v_tenant_id
    AND created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO v_total_teachers
  FROM public.user_roles
  WHERE tenant_id = v_tenant_id AND role = 'TEACHER';

  SELECT COUNT(DISTINCT teacher_id) INTO v_active_teachers
  FROM public.classrooms
  WHERE tenant_id = v_tenant_id
    AND created_at > now() - interval '30 days';

  SELECT COUNT(*) INTO v_total_courses
  FROM public.courses
  WHERE tenant_id = v_tenant_id AND status = 'published';

  SELECT AVG(score) INTO v_avg_quiz_score
  FROM public.quiz_attempts
  WHERE tenant_id = v_tenant_id AND status = 'completed';

  RETURN json_build_object(
    'total_students',   v_total_students,
    'active_students',  v_active_students,
    'total_teachers',   v_total_teachers,
    'active_teachers',  v_active_teachers,
    'total_courses',    v_total_courses,
    'avg_quiz_score',   ROUND(COALESCE(v_avg_quiz_score, 0), 1),
    'adoption_rate',    CASE
                          WHEN v_total_students > 0
                          THEN ROUND((v_active_students::numeric / v_total_students * 100), 1)
                          ELSE 0
                        END
  );
END;
$$;

-- =====================================================================
-- ADDITIONAL HARDENING: OTP rate-limit enforcement at DB constraint level
-- =====================================================================
-- The request_parent_otp() RPC already has application-level rate limiting
-- (max 3 per phone per hour). We add a DB-level check function for defense
-- in depth on the INSERT policy.
-- =====================================================================

DROP POLICY IF EXISTS "public_insert_otp" ON public.parent_otp_codes;

CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count integer;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
  FROM public.parent_otp_codes
  WHERE phone = p_phone
    AND created_at > now() - interval '1 hour';
  RETURN v_recent_count < 3;
END;
$$;

-- OTP INSERT: rate-limited to 3 per phone per hour at policy level
CREATE POLICY "rate_limited_insert_otp" ON public.parent_otp_codes
  FOR INSERT
  WITH CHECK (
    public.check_otp_rate_limit(phone)
  );

GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(text) TO authenticated;

-- =====================================================================
-- VERIFICATION NOTES
-- =====================================================================
-- After applying this migration, verify:
-- 1. Principal can access school_baseline_metrics (has_role 3-arg works)
-- 2. Principal can manage satisfaction_surveys
-- 3. OTP cannot be enumerated via SELECT
-- 4. Parent threads enforce tenant isolation
-- 5. Survey responses enforce 1-per-respondent
-- 6. get_executive_overview() rejects non-principal/admin callers
-- =====================================================================
