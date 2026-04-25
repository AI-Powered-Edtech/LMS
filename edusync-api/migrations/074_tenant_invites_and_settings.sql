-- 074_tenant_invites_and_settings.sql
-- Wave 4 cleanup: bring schema in line with tenant_admin / tenant_invites
-- handlers. Both have been writing against tables/columns that the baseline
-- snapshot doesn't include.
--
-- Two additions, both additive + idempotent:
--   1. `tenants.settings` JSONB — read by GET /tenant-settings, merged by
--      PATCH /tenant-settings. Earlier `tenant_invitations` design used a
--      different shape; this is the in-app settings blob.
--   2. `public.tenant_invites` table + `public.redeem_tenant_invite()` RPC —
--      the code-redemption invite flow used by tenant_invites.rs and
--      auth/register.rs (teacher signup with invite_code). Older
--      `tenant_invitations` (status/accepted_at) and `user_invitations`
--      (app_role enum) tables predate this design and stay in place; they
--      back different flows and we don't migrate data between them.

-- ─── tenants.settings ──────────────────────────────────────────────────────
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── tenant_invites ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code        TEXT            NOT NULL,
    role        public.app_role NOT NULL,
    email       TEXT,
    class_id    UUID            REFERENCES public.classes(id) ON DELETE SET NULL,
    created_by  UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ,
    used_at     TIMESTAMPTZ,
    used_by     UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant
    ON public.tenant_invites(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_code
    ON public.tenant_invites(code);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_unused
    ON public.tenant_invites(tenant_id) WHERE used_at IS NULL;

-- ─── redeem_tenant_invite RPC ──────────────────────────────────────────────
-- Looks up a pending, unexpired invite by its `code`, marks it used by
-- p_user_id, and inserts/updates the corresponding tenant_memberships +
-- user_roles rows so the redeeming user is immediately a tenant member with
-- the invited role.
--
-- Returns: { tenant_id, role } as jsonb, OR raises P0001 on invalid/expired/
-- already-used codes (caller surfaces 400).
--
-- SECURITY DEFINER so the auth/register.rs path can call it before the user
-- has a tenant_id in their JWT.
CREATE OR REPLACE FUNCTION public.redeem_tenant_invite(
    p_code     TEXT,
    p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_invite public.tenant_invites;
BEGIN
    SELECT * INTO v_invite
      FROM public.tenant_invites
     WHERE code = p_code
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invite not found' USING ERRCODE = 'P0001';
    END IF;
    IF v_invite.used_at IS NOT NULL THEN
        RAISE EXCEPTION 'invite already used' USING ERRCODE = 'P0001';
    END IF;
    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
        RAISE EXCEPTION 'invite expired' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.tenant_invites
       SET used_at = now(),
           used_by = p_user_id
     WHERE id = v_invite.id;

    -- Ensure profile is on the right tenant (auth.register seeds a profile
    -- with the default tenant; flip it to the invite's tenant).
    UPDATE public.profiles
       SET tenant_id = v_invite.tenant_id,
           updated_at = now()
     WHERE id = p_user_id;

    INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, joined_at)
    VALUES (v_invite.tenant_id, p_user_id, lower(v_invite.role::text), 'active', now())
    ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            status = 'active';

    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (p_user_id, v_invite.tenant_id, v_invite.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object(
        'tenant_id', v_invite.tenant_id,
        'role',      v_invite.role
    );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.redeem_tenant_invite(TEXT, UUID) TO PUBLIC;
