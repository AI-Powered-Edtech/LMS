-- =============================================================================
-- EduSync LMS — SMA Nusantara Dev Seed File
-- =============================================================================
-- File ini digunakan untuk membuat tenant "SMA Nusantara Dev" beserta
-- 6 persona (akun) tambahan untuk keperluan pengujian.

BEGIN;

-- Pastikan pgcrypto tersedia untuk hashing password (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_tenant_id uuid;
    v_admin_id uuid := gen_random_uuid();
    v_kepsek_id uuid := gen_random_uuid();
    v_guru1_id uuid := gen_random_uuid();
    v_guru2_id uuid := gen_random_uuid();
    v_siswa1_id uuid := gen_random_uuid();
    v_siswa2_id uuid := gen_random_uuid();
    v_password_hash text := crypt('password123', gen_salt('bf'));
BEGIN
    -- 1. Buat Tenant SMA Nusantara Dev
    INSERT INTO public.tenants (id, name, slug, kind, is_active)
    VALUES (gen_random_uuid(), 'SMA Nusantara Dev', 'sma-nusantara-dev', 'organization', true)
    RETURNING id INTO v_tenant_id;

    -- 2. Buat Akun Users (public.users)
    INSERT INTO public.users (id, email, encrypted_password, email_confirmed_at)
    VALUES
        (v_admin_id, 'admin@nusantara.dev', v_password_hash, now()),
        (v_kepsek_id, 'kepsek@nusantara.dev', v_password_hash, now()),
        (v_guru1_id, 'guru1@nusantara.dev', v_password_hash, now()),
        (v_guru2_id, 'guru2@nusantara.dev', v_password_hash, now()),
        (v_siswa1_id, 'siswa1@nusantara.dev', v_password_hash, now()),
        (v_siswa2_id, 'siswa2@nusantara.dev', v_password_hash, now());

    -- 3. Buat Profiles (public.profiles)
    INSERT INTO public.profiles (id, tenant_id, email, first_name, last_name, is_active, is_demo)
    VALUES
        (v_admin_id, v_tenant_id, 'admin@nusantara.dev', 'Admin', 'Nusantara', true, true),
        (v_kepsek_id, v_tenant_id, 'kepsek@nusantara.dev', 'Kepsek', 'Nusantara', true, true),
        (v_guru1_id, v_tenant_id, 'guru1@nusantara.dev', 'Guru Satu', 'Nusantara', true, true),
        (v_guru2_id, v_tenant_id, 'guru2@nusantara.dev', 'Guru Dua', 'Nusantara', true, true),
        (v_siswa1_id, v_tenant_id, 'siswa1@nusantara.dev', 'Siswa Satu', 'Nusantara', true, true),
        (v_siswa2_id, v_tenant_id, 'siswa2@nusantara.dev', 'Siswa Dua', 'Nusantara', true, true);

    -- 4. Assign Roles (public.user_roles)
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES
        (v_admin_id, v_tenant_id, 'ADMIN'),
        (v_kepsek_id, v_tenant_id, 'ADMIN'),
        (v_guru1_id, v_tenant_id, 'TEACHER'),
        (v_guru2_id, v_tenant_id, 'TEACHER'),
        (v_siswa1_id, v_tenant_id, 'STUDENT'),
        (v_siswa2_id, v_tenant_id, 'STUDENT');

    -- 5. Set owner tenant
    UPDATE public.tenants SET owner_user_id = v_admin_id WHERE id = v_tenant_id;

    -- 6. Enable all modules for this tenant
    INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
    SELECT v_tenant_id, id, true
    FROM public.modules;

END $$;

COMMIT;
