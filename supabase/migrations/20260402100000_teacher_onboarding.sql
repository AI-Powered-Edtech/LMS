-- =============================================================================
-- Migration: Teacher Onboarding Progress Tracking
-- Task 27.1 — Guided Onboarding Wizard untuk Guru Baru
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 1,
  completed_steps integer[] NOT NULL DEFAULT '{}',
  is_completed boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  -- Step result metadata (class created, course created, etc.)
  created_class_id uuid,
  created_class_join_code text,
  created_course_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.teacher_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS: teacher hanya bisa akses onboarding mereka sendiri
CREATE POLICY "teacher_onboarding_own"
  ON public.teacher_onboarding_progress
  FOR ALL
  USING (user_id = auth.uid());

-- Auto set tenant_id dari profile saat INSERT
CREATE TRIGGER auto_set_tenant_id_teacher_onboarding
  BEFORE INSERT ON public.teacher_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_teacher_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER teacher_onboarding_updated_at
  BEFORE UPDATE ON public.teacher_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_teacher_onboarding_updated_at();

-- Index untuk lookup cepat per user
CREATE INDEX IF NOT EXISTS idx_teacher_onboarding_user
  ON public.teacher_onboarding_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_teacher_onboarding_tenant
  ON public.teacher_onboarding_progress (tenant_id);

GRANT ALL ON TABLE public.teacher_onboarding_progress TO authenticated;
