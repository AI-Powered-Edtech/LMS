-- =============================================================================
-- Migration: Fix handle_new_user trigger for Google OAuth users
-- =============================================================================
-- Problem: Google OAuth provides `full_name` / `name` in raw_user_meta_data,
-- NOT `first_name` / `last_name`. The old trigger only read first_name/last_name
-- resulting in empty names. Additionally, if the fallback tenant UUID doesn't
-- exist, the INSERT fails due to FK constraint → no profile row is created at all.
--
-- This migration:
-- 1. Fixes handle_new_user to parse Google OAuth metadata correctly
-- 2. Allows NULL tenant_id (for B2B onboarding flow — user picks tenant later)
-- 3. Creates ensure_profile_exists() RPC as a client-side safety net
-- 4. Backfills any existing auth.users that are missing profiles
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Allow NULL tenant_id on profiles (required for B2B onboarding)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Replace handle_new_user trigger function
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
    -- ── Step 1: Resolve tenant_id from signup metadata ──
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    -- Validate the supplied tenant exists and is active
    IF v_tenant_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.tenants
            WHERE id = v_tenant_id AND is_active = true
        ) THEN
            v_tenant_id := NULL;
        END IF;
    END IF;

    -- ── Step 2: Parse name from metadata ──
    -- Google OAuth uses: full_name, name, avatar_url
    -- Email/password uses: first_name, last_name
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

    -- If first_name is empty but full_name is available, split it
    IF v_first_name = '' AND v_full_name != '' THEN
        v_first_name := split_part(v_full_name, ' ', 1);
        v_last_name  := NULLIF(
            trim(substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 1)),
            ''
        );
        IF v_last_name IS NULL THEN v_last_name := ''; END IF;
    END IF;

    -- ── Step 3: Create profile row ──
    -- tenant_id may be NULL for B2B onboarding (user chooses school later)
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
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

    -- ── Step 4: Default role = STUDENT (only when tenant was resolved) ──
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (NEW.id, 'STUDENT', v_tenant_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create ensure_profile_exists() RPC — client-side safety net
-- ─────────────────────────────────────────────────────────────────────────────
-- Called by the frontend when it detects the profile is missing (406 error).
-- Uses auth.uid() so users can only create their own profile.
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id    uuid;
    v_email      text;
    v_meta       jsonb;
    v_first_name text;
    v_last_name  text;
    v_full_name  text;
    v_avatar_url text;
    v_result     json;
BEGIN
    -- Must be authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if profile already exists
    SELECT to_json(p.*) INTO v_result
    FROM public.profiles p
    WHERE p.id = v_user_id;

    IF v_result IS NOT NULL THEN
        RETURN v_result;
    END IF;

    -- Profile doesn't exist — create it from auth.users metadata
    SELECT email, raw_user_meta_data
    INTO v_email, v_meta
    FROM auth.users
    WHERE id = v_user_id;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;

    -- Parse name (same logic as handle_new_user)
    v_first_name := COALESCE(v_meta->>'first_name', '');
    v_last_name  := COALESCE(v_meta->>'last_name', '');
    v_full_name  := COALESCE(v_meta->>'full_name', v_meta->>'name', '');
    v_avatar_url := COALESCE(v_meta->>'avatar_url', v_meta->>'picture', '');

    IF v_first_name = '' AND v_full_name != '' THEN
        v_first_name := split_part(v_full_name, ' ', 1);
        v_last_name  := COALESCE(
            NULLIF(trim(substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 1)), ''),
            ''
        );
    END IF;

    INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, tenant_id)
    VALUES (
        v_user_id,
        v_email,
        v_first_name,
        v_last_name,
        NULLIF(v_avatar_url, ''),
        NULL  -- no tenant yet; B2B onboarding will assign one
    )
    ON CONFLICT (id) DO NOTHING;

    -- Return the newly created profile
    SELECT to_json(p.*) INTO v_result
    FROM public.profiles p
    WHERE p.id = v_user_id;

    RETURN v_result;
END;
$$;

ALTER FUNCTION public.ensure_profile_exists() OWNER TO postgres;

-- Grant to authenticated users only
REVOKE ALL ON FUNCTION public.ensure_profile_exists() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: Create profiles for any existing auth.users missing one
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, tenant_id)
SELECT
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'first_name',
        split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1),
        ''
    ),
    COALESCE(
        u.raw_user_meta_data->>'last_name',
        NULLIF(trim(substring(
            COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
            from length(split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1)) + 1
        )), ''),
        ''
    ),
    NULLIF(COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''), ''),
    NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
