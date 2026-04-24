-- 040_kurmer_assessment.sql
-- Fase 2 Kurmer Assessment

-- curriculum_items (CP / ATP)
CREATE TABLE IF NOT EXISTS public.curriculum_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CP', 'ATP')),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    parent_id UUID REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_tenant ON public.curriculum_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_subject ON public.curriculum_items (subject_id);

-- Lesson / Assignment tagging to CP/ATP
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;

-- P5 Module (Projek Penguatan Profil Pelajar Pancasila)
CREATE TABLE IF NOT EXISTS public.p5_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    theme TEXT NOT NULL,
    description TEXT,
    coordinator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_p5_projects_tenant ON public.p5_projects (tenant_id);

CREATE TABLE IF NOT EXISTS public.p5_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID REFERENCES public.p5_projects(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dimension TEXT NOT NULL,
    score TEXT NOT NULL CHECK (score IN ('BB', 'MB', 'BSH', 'SB')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_p5_assessments_tenant ON public.p5_assessments (tenant_id);

-- Domain Events (Outbox Pattern)
CREATE TABLE IF NOT EXISTS public.domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_domain_events_status ON public.domain_events (status);
CREATE INDEX IF NOT EXISTS idx_domain_events_tenant ON public.domain_events (tenant_id);

-- Trigger for pg_notify
CREATE OR REPLACE FUNCTION notify_domain_event() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('domain_events', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_notify_trigger
AFTER INSERT ON public.domain_events
FOR EACH ROW EXECUTE FUNCTION notify_domain_event();
