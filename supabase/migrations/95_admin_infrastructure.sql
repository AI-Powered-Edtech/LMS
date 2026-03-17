-- Migration: 95_admin_infrastructure.sql
-- Description: Admin infrastructure layer for EduSync LMS
-- Created: 2026-03-17
-- 
-- This migration adds admin-focused tables and RPC functions without modifying existing core tables.
-- All tables include tenant_id for multi-tenant isolation.

-- =============================================================================
-- SECTION 1: ADMIN AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_user_id" "uuid",
    "target_entity_type" "text",
    "target_entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";

-- Indexes for admin_audit_logs
CREATE INDEX "idx_admin_audit_logs_tenant_id" ON "public"."admin_audit_logs" USING "btree" ("tenant_id");
CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_admin_audit_logs_admin_user_id" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");
CREATE INDEX "idx_admin_audit_logs_target_user_id" ON "public"."admin_audit_logs" USING "btree" ("target_user_id");
CREATE INDEX "idx_admin_audit_logs_action" ON "public"."admin_audit_logs" USING "btree" ("action");

-- Foreign key constraints
ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- =============================================================================
-- SECTION 2: USER INVITATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);

ALTER TABLE "public"."user_invitations" OWNER TO "postgres";

-- Indexes for user_invitations
CREATE INDEX "idx_user_invitations_tenant_id" ON "public"."user_invitations" USING "btree" ("tenant_id");
CREATE INDEX "idx_user_invitations_created_at" ON "public"."user_invitations" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");
CREATE INDEX "idx_user_invitations_token" ON "public"."user_invitations" USING "btree" ("token");
CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");

-- Foreign key constraints
ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- =============================================================================
-- SECTION 3: HELPER FUNCTION - LOG ADMIN ACTION
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."log_admin_action"(
    "p_action" "text",
    "p_target_user_id" "uuid" DEFAULT NULL,
    "p_target_entity_type" "text" DEFAULT NULL,
    "p_target_entity_id" "uuid" DEFAULT NULL,
    "p_metadata" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_audit_log_id uuid;
    v_tenant_id uuid;
    v_admin_user_id uuid;
BEGIN
    -- Get the current user's tenant and ID
    v_tenant_id := public.get_my_tenant_id();
    v_admin_user_id := auth.uid();
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Admin action requires tenant context';
    END IF;
    
    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin action requires authentication';
    END IF;
    
    -- Insert audit log
    INSERT INTO public.admin_audit_logs (
        tenant_id,
        admin_user_id,
        action,
        target_user_id,
        target_entity_type,
        target_entity_id,
        metadata
    ) VALUES (
        v_tenant_id,
        v_admin_user_id,
        p_action,
        p_target_user_id,
        p_target_entity_type,
        p_target_entity_id,
        p_metadata
    ) RETURNING id INTO v_audit_log_id;
    
    RETURN v_audit_log_id;
END;
$$;

ALTER FUNCTION "public"."log_admin_action"("p_action" "text", "p_target_user_id" "uuid", "p_target_entity_type" "text", "p_target_entity_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";

-- =============================================================================
-- SECTION 4: RPC FUNCTION - ADMIN LIST USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_list_users"(
    "p_search" "text" DEFAULT NULL,
    "p_role_filter" "public"."app_role" DEFAULT NULL,
    "p_is_active" boolean DEFAULT NULL,
    "p_limit" integer DEFAULT 50,
    "p_offset" integer DEFAULT 0
) RETURNS TABLE(
    "id" "uuid",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "full_name" "text",
    "is_active" boolean,
    "tenant_id" "uuid",
    "roles" "public"."app_role"[],
    "created_at" timestamp with time zone
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.full_name,
        p.is_active,
        p.tenant_id,
        COALESCE(
            array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL),
            '{}'::public.app_role[]
        ) AS roles,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
    WHERE p.tenant_id = v_tenant_id
        AND (p_search IS NULL OR 
            p.email ILIKE '%' || p_search || '%' OR
            p.first_name ILIKE '%' || p_search || '%' OR
            p.last_name ILIKE '%' || p_search || '%' OR
            p.full_name ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR ur.role = p_role_filter)
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
    GROUP BY p.id, p.email, p.first_name, p.last_name, p.full_name, p.is_active, p.tenant_id, p.created_at
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

ALTER FUNCTION "public"."admin_list_users"("p_search" "text", "p_role_filter" "public"."app_role", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

-- =============================================================================
-- SECTION 5: RPC FUNCTION - ADMIN SUSPEND USER
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_tenant_id uuid;
    v_user_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Prevent admin from suspending themselves
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot suspend your own account';
    END IF;
    
    -- Update user status to inactive
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = p_user_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_SUSPENDED',
        p_user_id,
        'profile',
        p_user_id,
        jsonb_build_object('suspended_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User suspended successfully',
        'user_id', p_user_id
    );
END;
$$;

ALTER FUNCTION "public"."admin_suspend_user"("p_user_id" "uuid") OWNER TO "postgres";

-- =============================================================================
-- SECTION 6: RPC FUNCTION - ADMIN ACTIVATE USER
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Update user status to active
    UPDATE public.profiles
    SET is_active = true, updated_at = now()
    WHERE id = p_user_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_ACTIVATED',
        p_user_id,
        'profile',
        p_user_id,
        jsonb_build_object('activated_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User activated successfully',
        'user_id', p_user_id
    );
END;
$$;

ALTER FUNCTION "public"."admin_activate_user"("p_user_id" "uuid") OWNER TO "postgres";

-- =============================================================================
-- SECTION 7: RPC FUNCTION - ADMIN ASSIGN ROLE
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_assign_role"(
    "p_user_id" "uuid",
    "p_role" "public"."app_role"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_user_exists boolean;
    v_existing_role public.app_role;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('STUDENT', 'TEACHER', 'ADMIN') THEN
        RAISE EXCEPTION 'Invalid role. Must be STUDENT, TEACHER, or ADMIN';
    END IF;
    
    -- Check if target user exists and belongs to same tenant
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND tenant_id = v_tenant_id
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found in your tenant';
    END IF;
    
    -- Check if user already has this role
    SELECT role INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role AND tenant_id = v_tenant_id;
    
    IF v_existing_role IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already has this role',
            'user_id', p_user_id,
            'role', p_role
        );
    END IF;
    
    -- Remove existing roles of the same type (optional: keep multiple roles)
    -- For now, we allow multiple roles per user
    
    -- Insert the new role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (p_user_id, p_role, v_tenant_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'ROLE_ASSIGNED',
        p_user_id,
        'user_roles',
        p_user_id,
        jsonb_build_object('assigned_role', p_role, 'assigned_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Role assigned successfully',
        'user_id', p_user_id,
        'role', p_role
    );
END;
$$;

ALTER FUNCTION "public"."admin_assign_role"("p_user_id" "uuid", "p_role" "public"."app_role") OWNER TO "postgres";

-- =============================================================================
-- SECTION 8: RPC FUNCTION - ADMIN LIST TENANTS (Super-admin only)
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_list_tenants"(
    "p_search" "text" DEFAULT NULL,
    "p_is_active" boolean DEFAULT NULL,
    "p_limit" integer DEFAULT 50,
    "p_offset" integer DEFAULT 0
) RETURNS TABLE(
    "id" "uuid",
    "name" "text",
    "slug" "text",
    "is_active" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "user_count" bigint,
    "teacher_count" bigint,
    "student_count" bigint,
    "admin_count" bigint
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Security check: must be admin (note: platform-level admin check would require different logic)
    -- For now, we check if user is admin in ANY tenant
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        t.updated_at,
        (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id) AS user_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'TEACHER') AS teacher_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'STUDENT') AS student_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'ADMIN') AS admin_count
    FROM public.tenants t
    WHERE (p_search IS NULL OR 
            t.name ILIKE '%' || p_search || '%' OR
            t.slug ILIKE '%' || p_search || '%')
        AND (p_is_active IS NULL OR t.is_active = p_is_active)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

ALTER FUNCTION "public"."admin_list_tenants"("p_search" "text", "p_is_active" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

-- =============================================================================
-- SECTION 9: RPC FUNCTION - ADMIN CREATE INVITATION
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_create_invitation"(
    "p_email" "text",
    "p_role" "public"."app_role",
    "p_expires_days" integer DEFAULT 7
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_invitation_token text;
    v_invitation_id uuid;
    v_invitation_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Validate email format
    IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('STUDENT', 'TEACHER', 'ADMIN') THEN
        RAISE EXCEPTION 'Invalid role. Must be STUDENT, TEACHER, or ADMIN';
    END IF;
    
    -- Check if invitation already exists for this email in this tenant
    SELECT EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE email = p_email AND tenant_id = v_tenant_id AND status = 'pending'
    ) INTO v_invitation_exists;
    
    IF v_invitation_exists THEN
        RAISE EXCEPTION 'Pending invitation already exists for this email';
    END IF;
    
    -- Generate unique token
    v_invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create invitation
    INSERT INTO public.user_invitations (
        tenant_id,
        email,
        invited_by,
        role,
        token,
        expires_at
    ) VALUES (
        v_tenant_id,
        p_email,
        auth.uid(),
        p_role,
        v_invitation_token,
        now() + (p_expires_days || ' days')::interval
    ) RETURNING id INTO v_invitation_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_INVITATION_CREATED',
        NULL,
        'user_invitations',
        v_invitation_id,
        jsonb_build_object('email', p_email, 'role', p_role, 'invited_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation created successfully',
        'invitation_id', v_invitation_id,
        'token', v_invitation_token,
        'expires_at', now() + (p_expires_days || ' days')::interval
    );
END;
$$;

ALTER FUNCTION "public"."admin_create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_expires_days" integer) OWNER TO "postgres";

-- =============================================================================
-- SECTION 10: RPC FUNCTION - ADMIN REVOKE INVITATION
-- =============================================================================

CREATE OR REPLACE FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
    v_invitation_exists boolean;
BEGIN
    -- Security check: must be admin
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User has no tenant assigned';
    END IF;
    
    -- Check if invitation exists
    SELECT EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE id = p_invitation_id AND tenant_id = v_tenant_id AND status = 'pending'
    ) INTO v_invitation_exists;
    
    IF NOT v_invitation_exists THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;
    
    -- Revoke invitation
    UPDATE public.user_invitations
    SET status = 'revoked'
    WHERE id = p_invitation_id AND tenant_id = v_tenant_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        'USER_INVITATION_REVOKED',
        NULL,
        'user_invitations',
        p_invitation_id,
        jsonb_build_object('revoked_by', auth.uid())
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation revoked successfully',
        'invitation_id', p_invitation_id
    );
END;
$$;

ALTER FUNCTION "public"."admin_revoke_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";

-- =============================================================================
-- SECTION 11: RLS POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;

-- Admin audit logs RLS policies
CREATE POLICY "Admins can view admin audit logs" ON "public"."admin_audit_logs" 
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() 
        AND public.has_role('ADMIN')
    );

CREATE POLICY "Service role can insert admin audit logs" ON "public"."admin_audit_logs" 
    FOR INSERT WITH CHECK (true);

-- User invitations RLS policies
CREATE POLICY "Admins can view invitations" ON "public"."user_invitations" 
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id() 
        AND public.has_role('ADMIN')
    );

CREATE POLICY "Admins can insert invitations" ON "public"."user_invitations" 
    FOR INSERT WITH CHECK (
        tenant_id = public.get_my_tenant_id() 
        AND public.has_role('ADMIN')
    );

CREATE POLICY "Admins can update invitations" ON "public"."user_invitations" 
    FOR UPDATE USING (
        tenant_id = public.get_my_tenant_id() 
        AND public.has_role('ADMIN')
    );

-- =============================================================================
-- SECTION 12: GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT ON "public"."admin_audit_logs" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."user_invitations" TO authenticated;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
