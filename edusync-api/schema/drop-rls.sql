-- EduSync LMS — Drop all RLS policies
-- Run AFTER baseline is imported to clean up Supabase-specific RLS.
-- Safe because:
--   1. Database is no longer on Supabase (no PostgREST access)
--   2. VIL Rust backend enforces tenant isolation via tenant_id in every query
--   3. No external clients can reach PostgreSQL directly

-- ── Drop all public-schema policies ──────────────────────────────────────────
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

-- ── Tighten grants — postgres owns everything, no public/anon access ──────────
REVOKE ALL ON SCHEMA public FROM anon, PUBLIC;
GRANT ALL  ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS remaining_policies FROM pg_policies WHERE schemaname = 'public';
