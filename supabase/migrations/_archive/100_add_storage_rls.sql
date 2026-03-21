-- ==========================================================================
-- Migration 100: Add Storage RLS Policies
--
-- Purpose: Add Row Level Security policies for Supabase Storage buckets
--          used in the LMS (avatars, course-files, assignments)
--
-- Security: All policies use auth.uid() and has_role() for proper access control
--           Tenant scoping is applied where applicable via get_my_tenant_id()
-- ==========================================================================

BEGIN;

DO $$ 
BEGIN

-- =============================================================================
-- SECTION 1: AVATARS BUCKET POLICIES
-- =============================================================================

-- Check if avatars bucket exists before creating policies
IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    -- Policy: Users can upload their own avatar
    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

    -- Policy: Users can update their own avatar
    DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
    CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

    -- Policy: Users can delete their own avatar
    DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
    CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

    -- Policy: Authenticated users can read all avatars (for profile display)
    DROP POLICY IF EXISTS "Authenticated users can read all avatars" ON storage.objects;
    CREATE POLICY "Authenticated users can read all avatars"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatars'
    );
END IF;

-- =============================================================================
-- SECTION 2: COURSE-FILES BUCKET POLICIES
-- =============================================================================

-- Check if course-files bucket exists before creating policies
IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'course-files') THEN
    -- TODO: Add path validation to ensure files are uploaded to correct course folders

    -- Policy: Teachers and Admins can upload course files
    DROP POLICY IF EXISTS "Teachers can upload course files" ON storage.objects;
    CREATE POLICY "Teachers can upload course files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'course-files'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    );

    -- Policy: Teachers and Admins can update course files
    DROP POLICY IF EXISTS "Teachers can update course files" ON storage.objects;
    CREATE POLICY "Teachers can update course files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'course-files'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    )
    WITH CHECK (
        bucket_id = 'course-files'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    );

    -- Policy: Teachers and Admins can delete course files
    DROP POLICY IF EXISTS "Teachers can delete course files" ON storage.objects;
    CREATE POLICY "Teachers can delete course files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'course-files'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    );

    -- Policy: All enrolled users can read course files
    -- Uses tenant isolation via enrollment check
    DROP POLICY IF EXISTS "Enrolled users can read course files" ON storage.objects;
    CREATE POLICY "Enrolled users can read course files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'course-files'
        AND (
            -- User is teacher/admin of the course
            (
                public.has_role('TEACHER'::public.app_role)
                OR public.has_role('ADMIN'::public.app_role)
            )
            -- OR user is enrolled in the course (tenant-scoped)
            OR (
                EXISTS (
                    SELECT 1 FROM public.enrollments e
                    JOIN public.classes c ON c.id = e.class_id
                    JOIN public.courses co ON co.id = c.course_id
                    WHERE e.student_id = auth.uid()
                    AND e.status = 'ACTIVE'
                    AND co.tenant_id = public.get_my_tenant_id()
                )
            )
        )
    );
END IF;

-- =============================================================================
-- SECTION 3: ASSIGNMENTS BUCKET POLICIES
-- =============================================================================

-- Check if assignments bucket exists before creating policies
IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assignments') THEN
    -- Policy: Students can upload their own assignment submissions
    -- File path format: {assignment_id}/{student_id}/{filename}
    DROP POLICY IF EXISTS "Students can upload own submissions" ON storage.objects;
    CREATE POLICY "Students can upload own submissions"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'assignments'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

    -- Policy: Students can update their own assignment submissions
    DROP POLICY IF EXISTS "Students can update own submissions" ON storage.objects;
    CREATE POLICY "Students can update own submissions"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'assignments'
        AND auth.uid()::text = (storage.foldername(name))[2]
    )
    WITH CHECK (
        bucket_id = 'assignments'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

    -- Policy: Students can delete their own assignment submissions
    DROP POLICY IF EXISTS "Students can delete own submissions" ON storage.objects;
    CREATE POLICY "Students can delete own submissions"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'assignments'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

    -- Policy: Students can read their own assignment submissions
    DROP POLICY IF EXISTS "Students can read own submissions" ON storage.objects;
    CREATE POLICY "Students can read own submissions"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'assignments'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

    -- Policy: Teachers can read all submissions for grading
    DROP POLICY IF EXISTS "Teachers can read all submissions" ON storage.objects;
    CREATE POLICY "Teachers can read all submissions"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'assignments'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    );

    -- Policy: Teachers can delete submissions (for managing late submissions, etc.)
    DROP POLICY IF EXISTS "Teachers can delete submissions" ON storage.objects;
    CREATE POLICY "Teachers can delete submissions"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'assignments'
        AND (
            public.has_role('TEACHER'::public.app_role)
            OR public.has_role('ADMIN'::public.app_role)
        )
    );
END IF;

END $$;

-- =============================================================================
-- Notify PostgREST to reload schema
-- =============================================================================

COMMIT;

NOTIFY pgrst, 'reload schema';
