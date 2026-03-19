-- ============================================================================
-- EduSync Storage Bucket Setup
-- ============================================================================
-- Run ONCE per Supabase project after `supabase db push`:
--
--   supabase db query scripts/setup-storage.sql
--
-- This script is idempotent (ON CONFLICT DO NOTHING).
-- ============================================================================

-- Bucket: course-content
-- Stores lesson video uploads, file attachments, assignment submissions.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-content',
  'course-content',
  false,                          -- private: served via signed URLs
  104857600,                      -- 100 MB max per file
  ARRAY[
    'video/mp4', 'video/webm', 'video/ogg',
    'application/pdf',
    'application/zip',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: lesson-images
-- Stores image blocks in lessons. Public CDN — no signed URL needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-images',
  'lesson-images',
  true,                           -- public: direct URL access, CDN cacheable
  10485760,                       -- 10 MB max per image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS Policies: course-content (private, tenant-scoped)
-- ============================================================================

-- Teachers/admins can upload to their tenant's folder
DROP POLICY IF EXISTS "Teachers can upload course content" ON storage.objects;
CREATE POLICY "Teachers can upload course content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-content'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('TEACHER', 'ADMIN')
  );

-- Enrolled students can read via signed URL (RLS enforced at object level)
DROP POLICY IF EXISTS "Enrolled students can read course content" ON storage.objects;
CREATE POLICY "Enrolled students can read course content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-content'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
  );

-- Teachers/admins can delete their tenant's files
DROP POLICY IF EXISTS "Teachers can delete course content" ON storage.objects;
CREATE POLICY "Teachers can delete course content"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-content'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('TEACHER', 'ADMIN')
  );

-- ============================================================================
-- RLS Policies: lesson-images (public bucket, tenant-scoped writes)
-- ============================================================================

-- Anyone can read public lesson images
DROP POLICY IF EXISTS "Public can read lesson images" ON storage.objects;
CREATE POLICY "Public can read lesson images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lesson-images');

-- Teachers/admins can upload images to their tenant's folder
DROP POLICY IF EXISTS "Teachers can upload lesson images" ON storage.objects;
CREATE POLICY "Teachers can upload lesson images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-images'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('TEACHER', 'ADMIN')
  );

-- Teachers/admins can delete their lesson images
DROP POLICY IF EXISTS "Teachers can delete lesson images" ON storage.objects;
CREATE POLICY "Teachers can delete lesson images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lesson-images'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('TEACHER', 'ADMIN')
  );
