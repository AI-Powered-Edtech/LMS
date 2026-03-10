-- ==========================================================================
-- Migration: 19_restore_fts_schema
--
-- Synchronizes local migration history with the existing FTS infrastructure.
-- This migration is idempotent (IF NOT EXISTS) to account for existing DB state.
-- ==========================================================================

-- ─── 1. Add Search Vector Column ───
ALTER TABLE public.lesson_resources 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ─── 2. Create GIN Index ───
CREATE INDEX IF NOT EXISTS idx_lesson_resources_search 
ON public.lesson_resources USING GIN(search_vector);

-- ─── 3. Trigger Function for Vector Updates ───
CREATE OR REPLACE FUNCTION public.update_lesson_resource_search_vector()
RETURNS trigger AS $$
BEGIN
  -- Default to 'english' dictionary for text search logic
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. Apply Trigger ───
DROP TRIGGER IF EXISTS trg_lesson_resources_search_update ON public.lesson_resources;
CREATE TRIGGER trg_lesson_resources_search_update
  BEFORE INSERT OR UPDATE ON public.lesson_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_lesson_resource_search_vector();

-- ─── 5. Restore Search RPC ───
-- Note: This is reproduced from the actual DB definition found during audit.
CREATE OR REPLACE FUNCTION public.search_lesson_resources(
  p_tenant_id uuid, 
  p_course_id uuid, 
  p_query text, 
  p_limit integer DEFAULT 5
)
 RETURNS TABLE(resource_id uuid, lesson_id uuid, content text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
SELECT
  lr.id,
  lr.lesson_id,
  lr.content
FROM lesson_resources lr
JOIN lessons l ON l.id = lr.lesson_id
JOIN course_modules cm ON cm.id = l.module_id
WHERE lr.tenant_id = p_tenant_id
AND cm.course_id = p_course_id
AND lr.search_vector @@ plainto_tsquery('english', p_query)
LIMIT p_limit;
$function$;

-- ─── 6. Backfill existing data ───
UPDATE public.lesson_resources 
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;
