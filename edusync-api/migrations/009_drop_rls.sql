-- Migration 009: Drop all RLS policies
--
-- Context: Database is now self-hosted in Docker (no longer Supabase).
-- RLS was previously kept as defense-in-depth against PostgREST access.
-- Now that the database is fully isolated (only accessible via VIL Rust backend),
-- RLS policies can be removed. The VIL backend enforces tenant isolation via
-- explicit tenant_id filters in every query.
--
-- This supersedes migration 008 (which only revoked anon grants without removing policies).

-- ── Drop all RLS policies on public schema ────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- ── Disable RLS on all public tables ─────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- ── Update schema comment ─────────────────────────────────────────────────────
COMMENT ON SCHEMA public IS
    'EduSync LMS — Self-hosted PostgreSQL (Docker, Phase 7).
     All data access via VIL Rust backend only.
     RLS removed — tenant isolation enforced by VIL middleware.';
