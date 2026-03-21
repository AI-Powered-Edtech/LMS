-- Migration 28: Schema Cleanup
-- Move vector extension to dedicated schema and enable leaked password protection

-- 1. Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Move vector extension to extensions schema (if possible)
-- Note: This requires superuser or specific permissions, typically handled by Supabase platform
-- but we include it in the migration for documentation/local testing.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER EXTENSION vector SET SCHEMA extensions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move vector extension - might be managed or insufficient permissions';
END $$;

-- 3. Enable leaked password protection
-- This is a Supabase Auth setting, typically enabled via UI or API, 
-- but we can ensure it is reflected in our infrastructure tracking.
-- Note: There is no direct SQL command to enable this in the DB as it's an Auth service config.
-- We document it here as a requirement.

COMMENT ON SCHEMA extensions IS 'Dedicated schema for database extensions to maintain a clean public schema.';
