-- Ensure all gradebook tables from SP-2 exist (Fix for incomplete 002 migration on remote)
CREATE TABLE IF NOT EXISTS public.gradebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  score numeric NOT NULL,
  max_score numeric NOT NULL,
  feedback text,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- RLS
ALTER TABLE public.gradebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dummy gradebook_entries policy" ON public.gradebook_entries FOR SELECT USING (false AND auth.uid()::text = 'tenant_id');
