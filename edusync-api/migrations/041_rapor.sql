-- 041_rapor.sql
-- Fase 3 Rapor

CREATE TABLE IF NOT EXISTS public.rapor_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'KURMER_2024',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rapor_templates_tenant ON public.rapor_templates (tenant_id);

CREATE TABLE IF NOT EXISTS public.rapor_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.rapor_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SIGNED_WALI', 'SIGNED_KEPSEK', 'PUBLISHED')),
    pdf_url TEXT,
    ai_narrative TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rapor_documents_tenant ON public.rapor_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rapor_documents_student ON public.rapor_documents (student_id);
