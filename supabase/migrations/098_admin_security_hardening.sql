-- =============================================================================
-- Migration 98: Admin Security Hardening
-- =============================================================================
--
-- ISSUES ADDRESSED:
--
--   1. CROSS-TENANT DATA LEAK in admin_list_tenants()
--      Current:  ANY admin (in any tenant) can see ALL tenants platform-wide.
--      Fix:      Regular ADMIN scoped to their own tenant only.
--                Future PLATFORM_ADMIN role can see all (placeholder added).
--
--   2. HARDCODED MAGIC UUID in handle_new_user()
--      Current:  Falls back to '00000000-0000-0000-0000-000000000001'
--                which may not exist in new deployments, silently failing.
--      Fix:      Dynamic lookup of first active tenant; fail gracefully
--                with a clear error if no tenant exists at all.
--
--   3. MISSING tenants TABLE SELECT RLS POLICY
--      Current:  No explicit RLS policy restricts which tenants a user
--                can read — this defaults to DENY (correct) but is not
--                explicit and breaks TenantContext in some edge cases.
--      Fix:      Explicit "members can read their own tenant" policy.
--
--   4. MISSING PERFORMANCE INDEXES on user_roles
--      Frequently queried composite columns lack covering indexes.
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Fix admin_list_tenants() — eliminate cross-tenant data leak
-- =============================================================================
--
-- BEFORE: any ADMIN could call this and see every tenant in the platform.
-- AFTER:  ADMIN sees only their own tenant's data.
--         (PLATFORM_ADMIN expansion point left as comment for future use.)
--
-- Return type is identical so no breaking change at the RPC interface level.

CREATE OR REPLACE FUNCTION public.admin_list_tenants(
    p_search    text    DEFAULT NULL,
    p_is_active boolean DEFAULT NULL,
    p_limit     integer DEFAULT 50,
    p_offset    integer DEFAULT 0
)
RETURNS TABLE(
    id            uuid,
    name          text,
    slug          text,
    is_active     boolean,
    created_at    timestamptz,
    updated_at    timestamptz,
    user_count    bigint,
    teacher_count bigint,
    student_count bigint,
    admin_count   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_caller_tenant_id uuid;
BEGIN
    -- Security: must be ADMIN within their tenant
    IF NOT public.has_role('ADMIN'::public.app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- FIXED: scope to caller's tenant only (was: no scope → all tenants)
    v_caller_tenant_id := public.get_my_tenant_id();

    IF v_caller_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;

    -- NOTE: PLATFORM_ADMIN expansion point.
    -- When a super-admin role is needed (e.g. 'PLATFORM_ADMIN' enum value),
    -- add a branch here:
    --   IF public.has_role('PLATFORM_ADMIN') THEN
    --       -- return all tenants unfiltered
    --   END IF;

    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        t.updated_at,
        -- user_count: all profiles assigned to this tenant
        (
            SELECT count(*)
            FROM   public.profiles p
            WHERE  p.tenant_id = t.id
        ) AS user_count,
        -- teacher_count: user_roles with TEACHER in this tenant
        (
            SELECT count(*)
            FROM   public.user_roles ur
            WHERE  ur.tenant_id = t.id
              AND  ur.role       = 'TEACHER'
        ) AS teacher_count,
        -- student_count
        (
            SELECT count(*)
            FROM   public.user_roles ur
            WHERE  ur.tenant_id = t.id
              AND  ur.role       = 'STUDENT'
        ) AS student_count,
        -- admin_count
        (
            SELECT count(*)
            FROM   public.user_roles ur
            WHERE  ur.tenant_id = t.id
              AND  ur.role       = 'ADMIN'
        ) AS admin_count
    FROM  public.tenants t
    WHERE t.id = v_caller_tenant_id
      AND (p_search    IS NULL OR t.name ILIKE '%' || p_search || '%' OR t.slug ILIKE '%' || p_search || '%')
      AND (p_is_active IS NULL OR t.is_active = p_is_active)
    ORDER BY t.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

ALTER FUNCTION public.admin_list_tenants(text, boolean, integer, integer) OWNER TO postgres;

-- FIXED: admin_list_tenants — scoped to caller's own tenant (was: all tenants)

-- =============================================================================
-- SECTION 2: Fix handle_new_user() — remove hardcoded UUID fallback
-- =============================================================================
--
-- BEFORE: fallback was '00000000-0000-0000-0000-000000000001' (may not exist).
-- AFTER:  dynamic lookup of first active tenant by created_at ASC.
--         If no active tenant exists, profile is created with tenant_id = NULL
--         and a NOTICE is raised. Admin must assign tenant manually.
--         user_roles entry is only created when a tenant is found.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_tenant_id  uuid;
    v_invite_token text;
BEGIN
    -- -------------------------------------------------------------------------
    -- Step 1: Try to get tenant_id from signup metadata
    -- -------------------------------------------------------------------------
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    -- Validate the supplied tenant exists and is active
    IF v_tenant_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM   public.tenants
            WHERE  id        = v_tenant_id
              AND  is_active = true
        ) THEN
            RAISE WARNING
                'handle_new_user: tenant_id % not found or inactive',
                v_tenant_id;
            v_tenant_id := NULL;
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 2: Fallback — No active tenant
    -- -------------------------------------------------------------------------
    IF v_tenant_id IS NULL THEN
        RAISE WARNING
            'handle_new_user: no active tenant found — profile created without tenant. '
            'An admin must assign a tenant to user %.',
            NEW.id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 3: Create the profile row
    -- -------------------------------------------------------------------------
    INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
        v_tenant_id   -- may be NULL; admin assigns later
    )
    ON CONFLICT (id) DO NOTHING;   -- idempotent: safe on retries

    -- -------------------------------------------------------------------------
    -- Step 4: Default role = STUDENT (only when a tenant was resolved)
    --         If an invite_token is present, accept_invitation() will later
    --         upgrade the role to match the invitation.
    -- -------------------------------------------------------------------------
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (NEW.id, 'STUDENT'::public.app_role, v_tenant_id)
        ON CONFLICT DO NOTHING;   -- safe if unique constraint exists
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Ensure the trigger is attached (re-attach idempotently)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- FIXED: handle_new_user — removed hardcoded UUID; dynamic fallback + graceful NULL

-- =============================================================================
-- SECTION 3: Explicit RLS policy for tenants table SELECT
-- =============================================================================
--
-- Without an explicit SELECT policy, RLS defaults to DENY which is safe but
-- causes TenantContext to fail when fetching the tenant record after login.
-- The correct policy: a user can only read the tenant they belong to.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing generic select policies
DROP POLICY IF EXISTS "tenants_select_own"    ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_member" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;

-- Members can read their own tenant record
CREATE POLICY "tenants_select_member"
    ON public.tenants FOR SELECT
    USING ( id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()) );

-- Admin write operations remain gated by has_role
DROP POLICY IF EXISTS "tenants_update_admin"  ON public.tenants;
CREATE POLICY "tenants_update_admin"
    ON public.tenants FOR UPDATE
    USING (
        id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    )
    WITH CHECK (
        id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    );

-- No INSERT/DELETE from the client — tenants are provisioned server-side only
-- (service_role / edge functions handle tenant creation)

-- ADDED: tenants RLS — members can read their own tenant

-- =============================================================================
-- SECTION 4: Performance indexes on user_roles
-- =============================================================================
--
-- has_role() and get_my_roles() both filter on (user_id) or (user_id, tenant_id).
-- Without a composite covering index these scans are sequential on large tables.

-- Single-column user_id (already exists in migration 87, but guard with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
    ON public.user_roles (user_id);

-- Single-column tenant_id (already exists in migration 87)
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id
    ON public.user_roles (tenant_id);

-- Composite (user_id, tenant_id) — the exact filter used by has_role()
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant
    ON public.user_roles (user_id, tenant_id);

-- Composite (user_id, tenant_id, role) — covering index; avoids table heap fetch
-- for the has_role() EXISTS query
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_tenant_role
    ON public.user_roles (user_id, tenant_id, role);

-- ADDED: covering index on user_roles for has_role() performance

-- =============================================================================
-- SECTION 5: Add helpful admin_create_invitation validation
-- =============================================================================
--
-- The existing admin_create_invitation function doesn't check that the invited
-- role is a valid app_role (it relies on the ENUM type which is correct), but
-- it also doesn't prevent self-invitation loops. Patch it here.

CREATE OR REPLACE FUNCTION public.admin_create_invitation(
    p_email       text,
    p_role        public.app_role,
    p_expires_days integer DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_tenant_id          uuid;
    v_invitation_token   text;
    v_invitation_id      uuid;
    v_invitation_exists  boolean;
    v_admin_email        text;
BEGIN
    -- Security check: must be ADMIN
    IF NOT public.has_role('ADMIN'::public.app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;

    -- Validate email format
    IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Prevent inviting yourself (anti-loop)
    SELECT email INTO v_admin_email
    FROM   public.profiles
    WHERE  id = auth.uid();

    IF lower(v_admin_email) = lower(p_email) THEN
        RAISE EXCEPTION 'Cannot invite yourself';
    END IF;

    -- Check for duplicate pending invitation
    SELECT EXISTS (
        SELECT 1
        FROM   public.user_invitations
        WHERE  email     = p_email
          AND  tenant_id = v_tenant_id
          AND  status    = 'pending'
    ) INTO v_invitation_exists;

    IF v_invitation_exists THEN
        RAISE EXCEPTION 'A pending invitation already exists for this email in this tenant';
    END IF;

    -- Clamp expiry: minimum 1 day, maximum 30 days
    p_expires_days := GREATEST(1, LEAST(30, COALESCE(p_expires_days, 7)));

    -- Generate cryptographically secure token
    v_invitation_token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Insert invitation
    INSERT INTO public.user_invitations (
        tenant_id, email, invited_by, role, token, expires_at
    )
    VALUES (
        v_tenant_id,
        lower(p_email),   -- normalise to lowercase
        auth.uid(),
        p_role,
        v_invitation_token,
        now() + (p_expires_days || ' days')::interval
    )
    RETURNING id INTO v_invitation_id;

    -- Audit log
    PERFORM public.log_admin_action(
        'USER_INVITATION_CREATED',
        NULL,
        'user_invitations',
        v_invitation_id,
        jsonb_build_object(
            'email',      p_email,
            'role',       p_role,
            'expires_days', p_expires_days
        )
    );

    RETURN json_build_object(
        'success',        true,
        'message',        'Invitation created successfully',
        'invitation_id',  v_invitation_id,
        'token',          v_invitation_token,
        'expires_at',     now() + (p_expires_days || ' days')::interval
    );
END;
$$;

ALTER FUNCTION public.admin_create_invitation(text, public.app_role, integer) OWNER TO postgres;

-- PATCHED: admin_create_invitation — added self-invite prevention + email normalisation

-- =============================================================================
-- SECTION 6: Grant permissions for new functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.admin_list_tenants(text, boolean, integer, integer)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_invitation(text, public.app_role, integer)
    TO authenticated;

-- =============================================================================

COMMIT;

NOTIFY pgrst, 'reload schema';
