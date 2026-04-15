-- EduSync LMS — PostgreSQL initialization
-- Runs BEFORE baseline.sql (mounted as 01-init.sql in docker-entrypoint-initdb.d)
-- Image: pgvector/pgvector:pg16

-- ── Schemas ───────────────────────────────────────────────────────────────────

-- extensions schema: baseline.sql installs pgcrypto and uuid-ossp here
CREATE SCHEMA IF NOT EXISTS extensions;

-- auth schema: Supabase GoTrue compatibility layer
-- VIL auth creates entries in both auth.users and public.profiles
CREATE SCHEMA IF NOT EXISTS auth;

-- storage schema stub: satisfies any FK references from baseline
CREATE SCHEMA IF NOT EXISTS storage;

-- ── Extensions (pgvector/pgvector:pg16 image) ─────────────────────────────────
-- Install into public so gen_random_uuid(), crypt(), etc. are on default search_path
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"       WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"        WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "citext"          WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"         WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "unaccent"        WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "vector"             WITH SCHEMA public;
-- pg_stat_statements requires shared_preload_libraries (set in docker-compose command)
-- Install into extensions schema to match baseline.sql expectation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- Create aliases in extensions schema so baseline search_path references resolve
-- (baseline installs pgcrypto/uuid-ossp WITH SCHEMA "extensions" — these are no-ops
--  if already installed; PostgreSQL allows multiple schemas for the same extension
--  in IF NOT EXISTS mode only if the extension is not yet installed, so we skip
--  the conflicting installs by pre-installing them above. The baseline lines become
--  harmless because IF NOT EXISTS skips them.)

-- ── auth.users table ──────────────────────────────────────────────────────────
-- Minimal Supabase-compatible table; VIL register() inserts here + public.profiles

CREATE TABLE IF NOT EXISTS auth.users (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                TEXT        UNIQUE,
    encrypted_password   TEXT,
    raw_user_meta_data   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    raw_app_meta_data    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sign_in_at      TIMESTAMPTZ,
    is_super_admin       BOOLEAN     DEFAULT FALSE,
    role                 TEXT        DEFAULT 'authenticated',
    banned_until         TIMESTAMPTZ,
    confirmation_token   TEXT,
    confirmed_at         TIMESTAMPTZ,
    email_confirmed_at   TIMESTAMPTZ,
    recovery_token       TEXT,
    aud                  TEXT        DEFAULT 'authenticated'
);

-- ── auth helper functions ─────────────────────────────────────────────────────
-- auth.uid() — returns current user ID from VIL session variable
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

-- auth.role() — returns current role from VIL session variable
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(current_setting('app.current_role', true), 'anon')
$$;

-- auth.jwt() — returns a minimal JWT claims JSONB from VIL session variables
-- Used by baseline.sql functions that call auth.jwt() ->> 'tenant_id' / 'role'
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'sub',       NULLIF(current_setting('app.current_user_id', true), ''),
    'role',      COALESCE(current_setting('app.current_role', true), 'anon'),
    'tenant_id', NULLIF(current_setting('app.current_tenant_id', true), '')
  )
$$;

-- ── public helper stubs ───────────────────────────────────────────────────────
-- These are created early so baseline.sql functions that reference them compile.
-- The full definitions in baseline.sql will replace these via CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := COALESCE(
            (SELECT tenant_id FROM public.user_roles  WHERE user_id = auth.uid() LIMIT 1),
            (SELECT tenant_id FROM public.profiles    WHERE id       = auth.uid() LIMIT 1)
        );
    END IF;
    RETURN NEW;
END;
$$;
