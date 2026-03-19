-- ============================================================================
-- Migration 804: Storage Objects Metadata Table
-- ============================================================================
-- Adds ownership/audit tracking for files uploaded to Supabase Storage.
-- This table is the source of truth for file lifecycle management:
--   - Tenant isolation enforcement
--   - Orphan file cleanup
--   - Storage usage analytics
--   - Audit trail (who uploaded, when, what size)
--
-- lesson_resources.url remains the fast-path for rendering (no join needed).
-- storage_object_id links to the authoritative metadata for cleanup/audit.
-- ============================================================================

SET search_path = public;

-- ============================================================================
-- 1. storage_objects table
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL,
  course_id uuid,
  lesson_id uuid,
  block_id uuid,        -- lesson_resources.id that owns this file

  bucket text NOT NULL,
  object_path text NOT NULL,

  file_name text,        -- original filename for display
  mime_type text,
  file_size bigint,      -- bytes

  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_storage_objects_tenant
  ON storage_objects (tenant_id);

CREATE INDEX IF NOT EXISTS idx_storage_objects_lesson
  ON storage_objects (lesson_id);

CREATE INDEX IF NOT EXISTS idx_storage_objects_block
  ON storage_objects (block_id);

CREATE INDEX IF NOT EXISTS idx_storage_objects_uploaded_by
  ON storage_objects (uploaded_by);

-- ============================================================================
-- 3. Add storage_object_id to lesson_resources
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_resources' AND column_name = 'storage_object_id'
  ) THEN
    ALTER TABLE lesson_resources
      ADD COLUMN storage_object_id uuid REFERENCES storage_objects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. RLS on storage_objects
-- ============================================================================

ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;

-- Teachers/admins can insert metadata for their tenant
DROP POLICY IF EXISTS "Teachers can insert storage metadata" ON storage_objects;
CREATE POLICY "Teachers can insert storage metadata"
  ON storage_objects FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id::text = (auth.jwt() ->> 'tenant_id')
  );

-- Users can read storage metadata in their tenant
DROP POLICY IF EXISTS "Users can read storage metadata in tenant" ON storage_objects;
CREATE POLICY "Users can read storage metadata in tenant"
  ON storage_objects FOR SELECT
  TO authenticated
  USING (
    tenant_id::text = (auth.jwt() ->> 'tenant_id')
  );

-- Teachers/admins can delete storage metadata in their tenant
DROP POLICY IF EXISTS "Teachers can delete storage metadata" ON storage_objects;
CREATE POLICY "Teachers can delete storage metadata"
  ON storage_objects FOR DELETE
  TO authenticated
  USING (
    tenant_id::text = (auth.jwt() ->> 'tenant_id')
  );

-- ============================================================================
-- 5. Cleanup helper: delete storage_objects when lesson_resources is deleted
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_storage_on_resource_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark storage_object for cleanup (actual bucket deletion done by worker/cron)
  -- For now, just delete the metadata row. The orphan cleanup cron
  -- can later handle actual bucket file deletion.
  IF OLD.storage_object_id IS NOT NULL THEN
    DELETE FROM storage_objects WHERE id = OLD.storage_object_id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_cleanup_storage_on_resource_delete ON lesson_resources;
CREATE TRIGGER trg_cleanup_storage_on_resource_delete
  AFTER DELETE ON lesson_resources
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_storage_on_resource_delete();
