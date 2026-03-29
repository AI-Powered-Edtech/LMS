-- ============================================================
-- SQA RLS Audit — 2026-03-29
-- Adds missing RLS enables and fill-in policies for tables
-- that have policy definitions in 000_baseline.sql but are
-- missing an explicit ENABLE ROW LEVEL SECURITY statement.
--
-- Tables already fully covered (not touched here):
--   user_roles          → ENABLE + policies in baseline
--   courses             → ENABLE + full CRUD policies in baseline
--   assignments         → ENABLE + policies in baseline
--   grades              → ENABLE + policy in 20260324000000_enterprise_hardening_rls.sql
--   notifications       → ENABLE + policies in baseline + 003_notifications.sql
--   lessons             → ENABLE + policies in baseline
--   discussions         → ENABLE + policies in baseline
--   quiz_attempts_v2    → ENABLE + policies in baseline
--
-- Tables addressed by this migration:
--   profiles            → policies exist in baseline but ENABLE was missing
--   enrollments         → policies exist in baseline but ENABLE was missing
--   course_modules      → policies exist in baseline but ENABLE was missing
--   quiz_questions      → policies exist in baseline but ENABLE was missing
--   quiz_options        → policies exist in baseline but ENABLE was missing
--   certificates        → table does not yet exist; placeholder guard included
-- ============================================================

-- -------------------------------------------------------
-- 1. profiles
--    Policies already in baseline:
--      profiles_select, profiles_insert, profiles_insert_own,
--      profiles_update_own, users_read_profiles
--    Missing: ENABLE ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent: add a tenant-scoped UPDATE guard if absent.
-- The existing profiles_update_own only checks id = auth.uid();
-- this adds a tenant_id boundary as a defence-in-depth layer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'sqa_profiles_update_tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "sqa_profiles_update_tenant"
        ON public.profiles
        FOR UPDATE
        USING (
          id        = auth.uid()
          AND tenant_id = (
            SELECT tenant_id FROM public.user_roles
            WHERE user_id = auth.uid()
            LIMIT 1
          )
        )
        WITH CHECK (
          id        = auth.uid()
          AND tenant_id = (
            SELECT tenant_id FROM public.user_roles
            WHERE user_id = auth.uid()
            LIMIT 1
          )
        )
    $policy$;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 2. enrollments
--    Policies already in baseline:
--      enrollments_select, enrollments_insert
--    Missing: ENABLE ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;

-- Ensure a catch-all DELETE guard exists (baseline had none).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'enrollments'
      AND policyname = 'sqa_enrollments_delete_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "sqa_enrollments_delete_admin"
        ON public.enrollments
        FOR DELETE
        USING (
          tenant_id = (
            SELECT tenant_id FROM public.user_roles
            WHERE user_id = auth.uid()
            LIMIT 1
          )
          AND public.has_role('ADMIN'::public.app_role)
        )
    $policy$;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 3. course_modules
--    Policies already in baseline:
--      course_modules_insert_owner, course_modules_update_owner,
--      course_modules_delete_owner
--      (and course_modules_update_strict from 20260324160000)
--    Missing: ENABLE ROW LEVEL SECURITY + a SELECT policy
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.course_modules ENABLE ROW LEVEL SECURITY;

-- Add a tenant-scoped SELECT policy so enrolled users can read modules.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'course_modules'
      AND policyname = 'sqa_course_modules_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "sqa_course_modules_select"
        ON public.course_modules
        FOR SELECT
        USING (
          tenant_id = (
            SELECT tenant_id FROM public.user_roles
            WHERE user_id = auth.uid()
            LIMIT 1
          )
        )
    $policy$;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 4. quiz_questions
--    Policies already in baseline:
--      quiz_questions_select, quiz_questions_insert,
--      quiz_questions_update, quiz_questions_delete
--    Missing: ENABLE ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 5. quiz_options
--    Policies already in baseline:
--      quiz_options_select, quiz_options_insert,
--      quiz_options_update, quiz_options_delete
--    Missing: ENABLE ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.quiz_options ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 6. certificates
--    Table does not yet exist in current schema.
--    Guard is wrapped in a DO block so this migration is
--    safe to re-run after the table is eventually created.
-- -------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'certificates'
  ) THEN
    EXECUTE 'ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY';

    -- SELECT: users can view their own certs within their tenant.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'certificates'
        AND policyname = 'sqa_certificates_select'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "sqa_certificates_select"
          ON public.certificates
          FOR SELECT
          USING (
            user_id   = auth.uid()
            AND tenant_id = (
              SELECT tenant_id FROM public.user_roles
              WHERE user_id = auth.uid()
              LIMIT 1
            )
          )
      $policy$;
    END IF;

    -- INSERT: service-role / triggers only — no user insert.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'certificates'
        AND policyname = 'sqa_certificates_insert_service'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "sqa_certificates_insert_service"
          ON public.certificates
          FOR INSERT
          WITH CHECK (false)  -- block direct user inserts; use service_role
      $policy$;
    END IF;
  END IF;
END
$$;
