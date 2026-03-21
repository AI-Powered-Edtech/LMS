-- =============================================================================
-- seed_base.sql
-- Core infrastructure seed for EduSync LMS
-- =============================================================================
-- ORDER: Run this file FIRST before seed_demo.sql
-- =============================================================================
--
-- This file creates the foundational tenant infrastructure.
-- It is IDEMPOTENT - can be run multiple times safely.
--
-- IMPORTANT NOTES:
-- ----------------
-- 1. Users (auth.users) cannot be created via SQL directly - Supabase Auth
--    handles user creation for security reasons.
--
-- 2. To create demo users, you must use ONE of these methods:
--
--    a) Supabase Admin UI:
--       - Go to Authentication > Users in Supabase Dashboard
--       - Click "Add user" to create demo accounts
--
--    b) Supabase Admin API (via Edge Function or external tool):
--       - Use Supabase Admin API to create users
--       - Example: POST to /auth/v1/admin/users
--
--    c) Invite System:
--       - Users can be invited via the public registration flow
--       - Admins can create invitations using admin_create_invitation()
--
-- 3. Recommended demo accounts to create manually:
--    - teacher@demo.edusync.com (will be assigned TEACHER role)
--    - student@demo.edusync.com (will be assigned STUDENT role)
--
-- 4. After creating users in auth.users, run seed_demo.sql to:
--    - Create profiles for these users
--    - Assign roles (TEACHER, STUDENT)
--    - Create demo courses, modules, lessons, quizzes, and classes
--
-- 5. FOR DEV TENANT SETUP:
--    This script also seeds tenant_modules for the documented dev tenant
--    (ID: 00000000-0000-0000-0000-00000000000d, slug: 'dev') used in
--    AUTH_SETUP_GUIDE.md. This prevents "Failed to fetch tenant modules"
--    console errors in the admin dashboard.
-- =============================================================================

-- =============================================================================
-- SECTION 1: Create/Verify Dev Tenant (matches AUTH_SETUP_GUIDE.md)
-- =============================================================================
-- Dev tenant ID: 00000000-0000-0000-0000-00000000000d (slug: 'dev')
-- This tenant is documented in docs/AUTH_SETUP_GUIDE.md
-- =============================================================================
INSERT INTO tenants (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-00000000000d', 'EduSync Dev Tenant', 'dev', true, now())
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Dev tenant verified: 00000000-0000-0000-0000-00000000000d (slug: dev)'; END $$;

-- Seed tenant_modules for dev tenant
-- Run this after creating dev tenant and before using admin dashboard
INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
SELECT
    '00000000-0000-0000-0000-00000000000d'::uuid,
    m.id,
    CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END
FROM public.modules m
ON CONFLICT (tenant_id, module_id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Core modules enabled for dev tenant (prevents admin console error)'; END $$;

-- =============================================================================
-- SECTION 2: Create/Verify Demo School Tenant (legacy)
-- =============================================================================
DO $$
DECLARE
    v_tenant_id uuid;
    v_tenant_slug text := 'demo-school';
BEGIN
    -- Create the demo tenant if it doesn't exist
    -- Using gen_random_uuid() for the id as requested
    INSERT INTO tenants (id, name, slug, is_active, created_at)
    VALUES (gen_random_uuid(), 'Demo School', v_tenant_slug, true, now())
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_tenant_id;

    -- If the tenant already existed, get its ID
    IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM tenants WHERE slug = v_tenant_slug LIMIT 1;
    END IF;

    -- Log the tenant ID for reference (useful for debugging)
    RAISE NOTICE 'Demo tenant created/verified: % (slug: %)', v_tenant_id, v_tenant_slug;

    -- Enable core modules for the demo tenant
    -- This ensures all core LMS features are available
    INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
    SELECT 
        v_tenant_id,
        m.id,
        CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END
    FROM public.modules m
    ON CONFLICT (tenant_id, module_id) DO NOTHING;

    RAISE NOTICE 'Core modules enabled for demo tenant';

END $$;

-- =============================================================================
-- INSTRUCTIONS FOR SETTING UP DEMO USERS:
-- =============================================================================
--
-- After running this file, you need to manually create users in Supabase Auth:
--
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" to create:
--    - teacher@demo.edusync.com (or your preferred email)
--    - student@demo.edusync.com (or your preferred email)
--
-- 4. Once users are created in auth.users, run seed_demo.sql which will:
--    - Create profiles for these users
--    - Assign appropriate roles (TEACHER, STUDENT)
--    - Create sample courses, modules, lessons, quizzes, and classes
--
-- =============================================================================
-- NOTE: The user_ids in seed_demo.sql reference auth.users by email.
--       You must create matching users in Supabase Auth first!
-- =============================================================================
