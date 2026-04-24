-- Migrasi 025 — Personal & Multi-Tenant untuk guru
-- Implementasi kebijakan tenant: guru dapat berdiri sendiri (personal tenant)
-- atau tergabung di satu/lebih organization tenants melalui kode undangan.
--
-- CATATAN: Mengandung CREATE TYPE + DDL tabel. Jalankan dengan:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 025_personal_and_multi_tenant.sql

-- 1. Enum baru untuk membedakan personal tenant vs organization tenant.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_kind') THEN
        CREATE TYPE public.tenant_kind AS ENUM ('personal', 'organization');
    END IF;
END$$;

-- 2. Tambah metadata ke tabel tenants. Default 'organization' supaya baseline
--    tenant seed (00000000-...-000001) tetap dianggap organization.
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS kind public.tenant_kind NOT NULL DEFAULT 'organization',
    ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS tenants_owner_idx
    ON public.tenants(owner_user_id)
    WHERE owner_user_id IS NOT NULL;

-- 3. Tabel tenant_invites: kode undangan untuk menarik guru/murid ke tenant.
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    role public.app_role NOT NULL DEFAULT 'TEACHER',
    email text,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    expires_at timestamptz,
    used_at timestamptz,
    used_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_invites_tenant_idx
    ON public.tenant_invites(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tenant_invites_unused_idx
    ON public.tenant_invites(code)
    WHERE used_at IS NULL;

ALTER TABLE public.tenant_invites OWNER TO postgres;

-- 4. RPC: provision_personal_tenant.
--    Dipanggil saat seorang guru mendaftar tanpa kode undangan. Membuat
--    tenant kind='personal' yang dimiliki user tsb, menambah membership
--    user_roles(role=TEACHER), dan meng-update profile.tenant_id.
--    RETURNS JSON agar resolver VIL menerima — bukan RETURNS TABLE.
CREATE OR REPLACE FUNCTION public.provision_personal_tenant(
    p_user_id uuid,
    p_display_name text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_slug text;
    v_counter int := 0;
    v_base_slug text;
BEGIN
    -- Sudah punya personal tenant? kembalikan yang ada.
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE owner_user_id = p_user_id AND kind = 'personal'
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        RETURN json_build_object('tenant_id', v_tenant_id, 'created', false);
    END IF;

    -- Generate slug unik dari display_name (fallback: user:<uuid>).
    v_base_slug := lower(regexp_replace(COALESCE(NULLIF(p_display_name, ''), 'user-' || p_user_id::text), '[^a-z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    IF v_base_slug = '' THEN
        v_base_slug := 'user-' || substring(p_user_id::text, 1, 8);
    END IF;
    v_slug := v_base_slug;

    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
        v_counter := v_counter + 1;
        v_slug := v_base_slug || '-' || v_counter::text;
    END LOOP;

    INSERT INTO public.tenants (name, slug, is_active, kind, owner_user_id)
    VALUES (
        COALESCE(NULLIF(p_display_name, ''), 'Ruang Pribadi'),
        v_slug,
        true,
        'personal',
        p_user_id
    )
    RETURNING id INTO v_tenant_id;

    -- Daftarkan user sebagai teacher di tenant ini.
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (p_user_id, v_tenant_id, 'TEACHER', now())
    ON CONFLICT DO NOTHING;

    -- Sinkronisasi profile.tenant_id bila belum diset.
    UPDATE public.profiles
    SET tenant_id = v_tenant_id, updated_at = now()
    WHERE id = p_user_id
      AND (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

    RETURN json_build_object('tenant_id', v_tenant_id, 'created', true);
END;
$$;

COMMENT ON FUNCTION public.provision_personal_tenant(uuid, text) IS
    'Membuat (jika belum ada) personal tenant untuk seorang guru solo. Return: { tenant_id uuid, created bool }.';

-- 5. RPC: redeem_tenant_invite.
--    Dipanggil saat user menebus kode undangan — bisa saat register baru
--    atau saat user sudah login ingin bergabung ke tenant lain.
CREATE OR REPLACE FUNCTION public.redeem_tenant_invite(
    p_code text,
    p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite public.tenant_invites%ROWTYPE;
BEGIN
    SELECT * INTO v_invite
    FROM public.tenant_invites
    WHERE code = p_code
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invite_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_invite.used_at IS NOT NULL THEN
        RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0001';
    END IF;

    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
        RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'P0001';
    END IF;

    -- Tambah membership (idempoten).
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (p_user_id, v_invite.tenant_id, v_invite.role, now())
    ON CONFLICT DO NOTHING;

    -- Tandai invite sebagai used.
    UPDATE public.tenant_invites
    SET used_at = now(), used_by = p_user_id
    WHERE id = v_invite.id;

    RETURN json_build_object(
        'tenant_id', v_invite.tenant_id,
        'role', v_invite.role::text
    );
END;
$$;

COMMENT ON FUNCTION public.redeem_tenant_invite(text, uuid) IS
    'Menebus kode undangan tenant. Mendaftarkan user ke tenant dengan role dari invite. Return: { tenant_id uuid, role text }.';

-- 6. RLS untuk tenant_invites: hanya tenant pemilik yang boleh list/insert;
--    semua user authenticated boleh SELECT by code tertentu via RPC
--    redeem (RPC adalah SECURITY DEFINER jadi bypass RLS by design).
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_invites_tenant_select ON public.tenant_invites;
CREATE POLICY tenant_invites_tenant_select
    ON public.tenant_invites
    FOR SELECT
    USING (tenant_id::text = current_setting('request.jwt.claim.tenant_id', true));

DROP POLICY IF EXISTS tenant_invites_tenant_insert ON public.tenant_invites;
CREATE POLICY tenant_invites_tenant_insert
    ON public.tenant_invites
    FOR INSERT
    WITH CHECK (tenant_id::text = current_setting('request.jwt.claim.tenant_id', true));
