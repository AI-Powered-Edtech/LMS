-- 027_p2_backlog.sql
-- P2 backlog schema additions: onboarding_step, course_templates,
-- class_id pada tenant_invites (auto-enroll), dan helper view untuk
-- quorum approvals. Tidak mengubah objek yang sudah ada kecuali
-- penambahan kolom opsional.

BEGIN;

-- ── P2.4 Onboarding resumable ────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_step   text,
    ADD COLUMN IF NOT EXISTS onboarding_done   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS onboarding_data   jsonb   NOT NULL DEFAULT '{}'::jsonb;

-- ── P2.5 Template gallery ────────────────────────────────────────────────
-- Template kursus yang bisa dibrowse oleh guru lain.  Template tidak punya
-- hubungan FK ke courses.id karena course sumber bisa dihapus; kita
-- snapshot payload-nya.
CREATE TABLE IF NOT EXISTS public.course_templates (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    subject          text,
    level            text,
    cover_image_url  text,
    is_public        boolean NOT NULL DEFAULT false,
    payload          jsonb   NOT NULL,          -- snapshot modules + lessons
    created_by       uuid NOT NULL REFERENCES public.profiles(id),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_templates_tenant ON public.course_templates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_templates_public ON public.course_templates(is_public) WHERE is_public = true;

ALTER TABLE public.course_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_templates_select ON public.course_templates;
CREATE POLICY course_templates_select ON public.course_templates
    FOR SELECT USING (
        is_public = true
        OR tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

DROP POLICY IF EXISTS course_templates_insert ON public.course_templates;
CREATE POLICY course_templates_insert ON public.course_templates
    FOR INSERT WITH CHECK (
        tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

DROP POLICY IF EXISTS course_templates_update ON public.course_templates;
CREATE POLICY course_templates_update ON public.course_templates
    FOR UPDATE USING (
        tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

DROP POLICY IF EXISTS course_templates_delete ON public.course_templates;
CREATE POLICY course_templates_delete ON public.course_templates
    FOR DELETE USING (
        tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
    );

-- ── P2.8 Auto-enroll invite code ─────────────────────────────────────────
-- Tambahkan optional class_id pada tenant_invites.  Saat redeem_tenant_invite
-- dipanggil dan class_id terisi, RPC akan juga memasukkan student ke
-- enrollments secara otomatis.
ALTER TABLE public.tenant_invites
    ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_invites_class ON public.tenant_invites(class_id) WHERE class_id IS NOT NULL;

-- Redefinisi redeem_tenant_invite untuk support auto-enroll.
CREATE OR REPLACE FUNCTION public.redeem_tenant_invite(p_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite    public.tenant_invites%ROWTYPE;
    v_tenant    public.tenants%ROWTYPE;
    v_class     public.classes%ROWTYPE;
    v_enrolled  boolean := false;
BEGIN
    SELECT * INTO v_invite
      FROM public.tenant_invites
     WHERE code = p_code
       AND used_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVITE_INVALID_OR_EXPIRED' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_invite.tenant_id;

    -- Upsert role for user in the invited tenant.
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (p_user_id, v_invite.role, v_invite.tenant_id)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Upsert tenant_memberships (if table exists — defensive).
    INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
    VALUES (p_user_id, v_invite.tenant_id, v_invite.role)
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;

    -- Auto-enroll when invite is scoped to a class.
    IF v_invite.class_id IS NOT NULL THEN
        SELECT * INTO v_class FROM public.classes WHERE id = v_invite.class_id;
        IF FOUND THEN
            INSERT INTO public.enrollments (class_id, student_id, tenant_id, status)
            VALUES (v_class.id, p_user_id, v_invite.tenant_id, 'ACTIVE')
            ON CONFLICT (student_id, class_id) DO NOTHING;
            v_enrolled := true;
        END IF;
    END IF;

    UPDATE public.tenant_invites
       SET used_at = now(), used_by = p_user_id
     WHERE id = v_invite.id;

    RETURN json_build_object(
        'tenant_id',   v_invite.tenant_id,
        'tenant_name', v_tenant.name,
        'role',        v_invite.role,
        'class_id',    v_invite.class_id,
        'auto_enrolled', v_enrolled
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_tenant_invite(text, uuid) TO PUBLIC;

COMMIT;
