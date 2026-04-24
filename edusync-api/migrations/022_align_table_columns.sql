-- Migration 022: align table columns with frontend expectations
-- Frontend column requirements (derived from src/ service files):
--   calendar_events:            start_date, end_date, color, created_by
--   teacher_onboarding_progress: current_step, completed_steps, is_completed, dismissed,
--                               created_class_id, created_class_join_code, created_course_id
--   ai_generated_content:       file_name, file_type, assignment_type, bloom_level, question_count,
--                               summary, questions, used_at, source_type, lesson_id, subject,
--                               grade_level, curriculum_ref, created_by

-- calendar_events: replace starts_at/ends_at with start_date/end_date, add color + created_by
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS color      TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;
UPDATE public.calendar_events SET start_date = COALESCE(start_date, starts_at, NOW()) WHERE start_date IS NULL;
UPDATE public.calendar_events SET end_date   = COALESCE(end_date, ends_at)             WHERE end_date   IS NULL;
ALTER TABLE public.calendar_events ALTER COLUMN start_date SET NOT NULL;

-- teacher_onboarding_progress: rebuild with columns frontend expects
DROP TABLE IF EXISTS public.teacher_onboarding_progress;
CREATE TABLE public.teacher_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  current_step INT NOT NULL DEFAULT 1,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_class_id UUID,
  created_class_join_code TEXT,
  created_course_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tenant_id)
);

-- ai_generated_content: add all columns frontend selects
ALTER TABLE public.ai_generated_content
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS file_type       TEXT,
  ADD COLUMN IF NOT EXISTS assignment_type TEXT,
  ADD COLUMN IF NOT EXISTS bloom_level     TEXT,
  ADD COLUMN IF NOT EXISTS question_count  INT,
  ADD COLUMN IF NOT EXISTS summary         TEXT,
  ADD COLUMN IF NOT EXISTS questions       JSONB,
  ADD COLUMN IF NOT EXISTS used_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_type     TEXT,
  ADD COLUMN IF NOT EXISTS lesson_id       UUID,
  ADD COLUMN IF NOT EXISTS subject         TEXT,
  ADD COLUMN IF NOT EXISTS grade_level     TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_ref  TEXT,
  ADD COLUMN IF NOT EXISTS created_by      UUID;
