-- 065_gradebook_baseline.sql
-- U01 blocker fix: create baseline gradebook tables that migration 048
-- (dual-mode descriptor) expects via ALTER TABLE.
--
-- These tables were assumed to exist pre-migration-048 but were missing
-- from both schema/baseline.sql and all earlier migrations. Column
-- shapes inferred from FE usage in src/features/gradebook/api/gradebookApi.ts
-- and RPC `sync_gradebook_entries`.

CREATE TABLE IF NOT EXISTS public.gradebook_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  course_id   uuid,
  student_id  uuid NOT NULL,
  entity_type text NOT NULL,             -- 'assignment' | 'quiz' | 'column' | 'sentinel'
  entity_id   uuid,                      -- null for sentinel rows; FK inferred by entity_type
  score       numeric,
  max_score   numeric DEFAULT 100,
  feedback    text,
  graded_by   uuid,
  graded_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gradebook_entries_tenant
  ON public.gradebook_entries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_entries_course_student
  ON public.gradebook_entries (course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_entries_entity
  ON public.gradebook_entries (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_entries_updated
  ON public.gradebook_entries (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.gradebook_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  course_id   uuid,
  weighting   jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_gradebook_settings_tenant
  ON public.gradebook_settings (tenant_id);

-- Trigger: bump updated_at on UPDATE
CREATE OR REPLACE FUNCTION public._gradebook_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gradebook_entries_updated_at ON public.gradebook_entries;
CREATE TRIGGER trg_gradebook_entries_updated_at
  BEFORE UPDATE ON public.gradebook_entries
  FOR EACH ROW EXECUTE FUNCTION public._gradebook_touch_updated_at();

DROP TRIGGER IF EXISTS trg_gradebook_settings_updated_at ON public.gradebook_settings;
CREATE TRIGGER trg_gradebook_settings_updated_at
  BEFORE UPDATE ON public.gradebook_settings
  FOR EACH ROW EXECUTE FUNCTION public._gradebook_touch_updated_at();
