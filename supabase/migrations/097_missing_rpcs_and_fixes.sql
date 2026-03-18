-- =============================================================================
-- Migration 97: Missing RPCs & Invitation System
-- =============================================================================
--
-- CONTEXT:
--   Login.tsx calls supabase.rpc('validate_invitation', { p_token: token })
--   but this function was never created in any migration. The invitation
--   tables (user_invitations) and creation RPCs (admin_create_invitation)
--   exist from migration 95, but the acceptance/validation flow was missing.
--
-- SCOPE:
--   1. validate_invitation(p_token)      — called from Login.tsx (unauthenticated)
--   2. accept_invitation(p_token)        — called after successful registration
--   3. get_my_profile()                  — convenience RPC for frontend bootstrap
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: validate_invitation
-- =============================================================================
-- Called from Login.tsx BEFORE the user is authenticated (during registration).
-- Must be accessible to the 'anon' role.
--
-- Returns:
--   { valid: true, email, role (lowercase), tenant_id, tenant_name }
--   { valid: false, error: '...' }
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invite    public.user_invitations%ROWTYPE;
    v_tenant    public.tenants%ROWTYPE;
BEGIN
    -- Basic input validation
    IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Token tidak boleh kosong'
        );
    END IF;

    -- Find a pending, non-expired invitation matching this token
    SELECT *
    INTO   v_invite
    FROM   public.user_invitations
    WHERE  token      = p_token
      AND  status     = 'pending'
      AND  expires_at > now()
    LIMIT 1;

    IF v_invite IS NULL THEN
        -- Distinguish between "never existed", "expired", and "already used"
        -- for better UX error messages, without leaking existence info to
        -- unauthenticated callers.
        RETURN json_build_object(
            'valid', false,
            'error', 'Undangan tidak ditemukan, sudah kedaluwarsa, atau sudah digunakan'
        );
    END IF;

    -- Fetch tenant name for the welcome UI
    SELECT *
    INTO   v_tenant
    FROM   public.tenants
    WHERE  id = v_invite.tenant_id;

    RETURN json_build_object(
        'valid',       true,
        'email',       v_invite.email,
        -- Role is stored as app_role ENUM (UPPERCASE); return lowercase for frontend
        'role',        lower(v_invite.role::text),
        'tenant_id',   v_invite.tenant_id,
        'tenant_name', COALESCE(v_tenant.name, 'Unknown Institution')
    );
END;
$$;

ALTER FUNCTION public.validate_invitation(text) OWNER TO postgres;

-- Must be accessible to anon because user is not yet logged in
GRANT EXECUTE ON FUNCTION public.validate_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation(text) TO authenticated;

-- =============================================================================
-- SECTION 2: accept_invitation
-- =============================================================================
-- Called AFTER the user has successfully registered and their session is active.
-- This function:
--   1. Validates the token is still pending and not expired
--   2. Verifies the invitation email matches the authenticated user's email
--   3. Updates the invitation status to 'accepted'
--   4. Upserts the user's role in user_roles to match the invitation role
--      (overriding the default STUDENT role set by handle_new_user trigger)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id       uuid;
    v_user_email    text;
    v_invite        public.user_invitations%ROWTYPE;
    v_profile       public.profiles%ROWTYPE;
BEGIN
    -- Must be authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Basic input validation
    IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token tidak valid'
        );
    END IF;

    -- Get the pending, non-expired invitation
    SELECT *
    INTO   v_invite
    FROM   public.user_invitations
    WHERE  token      = p_token
      AND  status     = 'pending'
      AND  expires_at > now()
    LIMIT 1;

    IF v_invite IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Undangan tidak ditemukan, sudah kedaluwarsa, atau sudah digunakan'
        );
    END IF;

    -- Fetch the calling user's profile to verify email matches
    SELECT *
    INTO   v_profile
    FROM   public.profiles
    WHERE  id = v_user_id;

    IF v_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Profil pengguna tidak ditemukan'
        );
    END IF;

    -- Security check: invitation email must match the registering user's email.
    -- Use lower() for case-insensitive comparison.
    IF lower(v_profile.email) != lower(v_invite.email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email akun tidak cocok dengan undangan'
        );
    END IF;

    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET    status      = 'accepted',
           accepted_at = now()
    WHERE  id = v_invite.id;

    -- Upsert the invited role for this tenant.
    -- The handle_new_user trigger already created a STUDENT role entry.
    -- We need to replace/add the correct role from the invitation.
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_user_id, v_invite.role, v_invite.tenant_id)
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET role = EXCLUDED.role;

    -- Also ensure the user's profile is linked to the correct tenant
    -- (in case handle_new_user used a different tenant)
    UPDATE public.profiles
    SET    tenant_id = v_invite.tenant_id
    WHERE  id = v_user_id
      AND  (tenant_id IS NULL OR tenant_id != v_invite.tenant_id);

    RETURN json_build_object(
        'success',     true,
        'message',     'Bergabung berhasil! Selamat datang.',
        'tenant_id',   v_invite.tenant_id,
        'role',        lower(v_invite.role::text)
    );
END;
$$;

ALTER FUNCTION public.accept_invitation(text) OWNER TO postgres;

-- Only authenticated users can accept invitations
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- =============================================================================
-- SECTION 3: get_my_profile
-- =============================================================================
-- Convenience RPC for the frontend AuthContext bootstrap.
-- Returns the calling user's full profile + all tenant memberships + roles
-- in a single round-trip, replacing the two separate queries currently in
-- AuthContext.fetchUserData().
--
-- Returns:
--   {
--     profile: { id, email, first_name, last_name, avatar_url, tenant_id },
--     memberships: [
--       { tenant_id, tenant_name, tenant_slug, tenant_is_active, role }
--     ]
--   }
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id    uuid;
    v_profile    public.profiles%ROWTYPE;
    v_result     json;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
    INTO   v_profile
    FROM   public.profiles
    WHERE  id = v_user_id;

    IF v_profile IS NULL THEN
        RETURN json_build_object(
            'profile',     NULL,
            'memberships', '[]'::json
        );
    END IF;

    SELECT json_build_object(
        'profile', json_build_object(
            'id',         v_profile.id,
            'email',      v_profile.email,
            'first_name', v_profile.first_name,
            'last_name',  v_profile.last_name,
            'avatar_url', v_profile.avatar_url,
            'tenant_id',  v_profile.tenant_id
        ),
        'memberships', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'tenant_id',       ur.tenant_id,
                        'tenant_name',     t.name,
                        'tenant_slug',     t.slug,
                        'tenant_is_active', t.is_active,
                        'role',            lower(ur.role::text)
                    )
                    ORDER BY t.name
                )
                FROM public.user_roles ur
                JOIN public.tenants    t  ON t.id = ur.tenant_id
                WHERE ur.user_id = v_user_id
                  AND t.is_active = true
            ),
            '[]'::json
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_my_profile() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =============================================================================
-- SECTION 4: Ensure unique constraint on user_roles (user_id, tenant_id)
-- =============================================================================
-- accept_invitation uses ON CONFLICT (user_id, tenant_id) — this constraint
-- must exist. Add it if missing (safe: IF NOT EXISTS via DO block).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname      = 'user_roles_user_id_tenant_id_key'
          AND  conrelid     = 'public.user_roles'::regclass
    ) THEN
        -- Only add if there are no existing duplicate (user_id, tenant_id) pairs
        IF NOT EXISTS (
            SELECT user_id, tenant_id
            FROM   public.user_roles
            GROUP  BY user_id, tenant_id
            HAVING count(*) > 1
        ) THEN
            ALTER TABLE public.user_roles
                ADD CONSTRAINT user_roles_user_id_tenant_id_key
                UNIQUE (user_id, tenant_id);
        ELSE
            RAISE NOTICE 'Skipping unique constraint on user_roles: duplicate (user_id, tenant_id) pairs exist. Deduplicate first.';
        END IF;
    END IF;
END;
$$;

-- =============================================================================
-- SECTION 5: RLS for user_invitations — allow anon to read for validation
-- =============================================================================
-- validate_invitation is SECURITY DEFINER so it bypasses RLS, but we want
-- to be explicit that direct table access is still locked down.
-- (Policies already exist from migration 95; this is a safety reinforcement.)

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- No additional anon policies — anon must go through validate_invitation RPC.
-- Existing policies from migration 95 cover admin CRUD.

COMMIT;

NOTIFY pgrst, 'reload schema';
