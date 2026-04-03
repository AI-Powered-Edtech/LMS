-- Phase 36C: Certificate Template Customization
-- Allows teachers/admins to create branded certificate templates per course

CREATE TABLE IF NOT EXISTS public.certificate_templates (
    id               uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    course_id        uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    name             text NOT NULL,
    background_color text DEFAULT '#ffffff',
    accent_color     text DEFAULT '#2563eb',
    logo_url         text,
    header_text      text DEFAULT 'Sertifikat Penyelesaian',
    body_text        text DEFAULT 'Dengan bangga diberikan kepada',
    footer_text      text DEFAULT 'atas keberhasilan menyelesaikan kursus',
    show_date        boolean DEFAULT true,
    show_score       boolean DEFAULT false,
    show_teacher_sig boolean DEFAULT true,
    font_family      text DEFAULT 'serif',
    is_default       boolean DEFAULT false,
    tenant_id        uuid NOT NULL,
    created_by       uuid NOT NULL REFERENCES auth.users(id),
    created_at       timestamptz DEFAULT now() NOT NULL,
    updated_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cert_tmpl_tenant_id ON public.certificate_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cert_tmpl_course_id ON public.certificate_templates(course_id);
CREATE INDEX IF NOT EXISTS idx_cert_tmpl_is_default ON public.certificate_templates(tenant_id, is_default)
    WHERE is_default = true;

CREATE POLICY "cert_tmpl_tenant_isolation" ON public.certificate_templates
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.certificate_templates TO authenticated;

CREATE TRIGGER set_tenant_id_cert_tmpl
    BEFORE INSERT ON public.certificate_templates
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER touch_cert_tmpl_updated_at
    BEFORE UPDATE ON public.certificate_templates
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.certificate_templates IS
    'Branded certificate templates per tenant/course. Phase 36C.';
