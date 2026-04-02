-- Migration: submission_annotations
-- Task 27.2: SpeedGrader Annotation Persistence
-- Menyimpan anotasi/komentar guru pada submission siswa.

CREATE TABLE IF NOT EXISTS public.submission_annotations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id),
  submission_id uuid       NOT NULL, -- references assignment_submissions(id)
  annotator_id uuid        NOT NULL REFERENCES auth.users(id),
  x_percent    float       NOT NULL CHECK (x_percent BETWEEN 0 AND 100),
  y_percent    float       NOT NULL CHECK (y_percent BETWEEN 0 AND 100),
  content      text        NOT NULL,
  color        text        NOT NULL DEFAULT '#FFD700',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_annotations ENABLE ROW LEVEL SECURITY;

-- Teachers dan Admin dapat mengelola anotasi dalam tenant mereka
CREATE POLICY "teacher_manage_annotations" ON public.submission_annotations
  FOR ALL USING (
    tenant_id = public.get_my_tenant_id() AND
    (
      public.has_role(auth.uid(), public.get_my_tenant_id(), 'TEACHER') OR
      public.has_role(auth.uid(), public.get_my_tenant_id(), 'ADMIN')
    )
  );

-- Trigger: otomatis set tenant_id dari profil user saat INSERT
CREATE TRIGGER auto_set_tenant_id_annotations
  BEFORE INSERT ON public.submission_annotations
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Trigger: otomatis update updated_at saat row diubah
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_annotations
  BEFORE UPDATE ON public.submission_annotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indeks untuk query performa
CREATE INDEX IF NOT EXISTS idx_annotations_submission_id
  ON public.submission_annotations(submission_id);

CREATE INDEX IF NOT EXISTS idx_annotations_tenant_id
  ON public.submission_annotations(tenant_id);
