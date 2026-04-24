-- 066_role_enum_completeness.sql
-- U06.1/U07 follow-up: add PARENT + PRINCIPAL to app_role enum so the
-- 10-role matrix (per 06-roadmap Fase 1) is internally consistent.
-- Migration 046 created most roles but skipped PRINCIPAL (principal sekolah
-- was likely intended to map to ADMIN in the original design; dev_seed
-- + Indonesia school structure treat it as a distinct role).
--
-- Also adds PARENT, which is present in profiles/user_roles usage but
-- was omitted from the enum.

-- PostgreSQL limitation: ADD VALUE cannot run in a transaction block.
-- Therefore each ADD VALUE is issued as a standalone statement; psql
-- invokes each statement without wrapping BEGIN/COMMIT.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'PRINCIPAL') THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE ''PRINCIPAL''';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'PARENT') THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE ''PARENT''';
  END IF;
END $$;
