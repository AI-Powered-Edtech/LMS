-- ========================================================
-- Fix: Revoke anon access + Ensure RLS aktif untuk attendance
-- Issue: GRANT ALL ON TABLE attendance_records TO anon di baseline
-- Schema: attendance_records(id, enrollment_id, date, status, created_at, tenant_id)
--         TIDAK ADA kolom student_id — harus join via enrollments
-- ========================================================

-- 1. Revoke semua permission dari anon
REVOKE ALL ON TABLE public.attendance_records FROM anon;
REVOKE ALL ON TABLE public.attendance_records FROM public;

-- 2. Grant hanya authenticated access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_records TO authenticated;

-- 3. Ensure RLS enabled (safe if already enabled)
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate policies dengan clean names
DROP POLICY IF EXISTS "teacher_manage_attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "student_read_own_attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_teacher_manage" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_student_read" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_admin_access" ON public.attendance_records;

-- Teacher policy: manage attendance for classes they teach
-- Note: attendance_records links to enrollments, not directly to classes.
-- We join through enrollments → classes to verify teacher ownership.
CREATE POLICY "attendance_teacher_manage"
    ON public.attendance_records
    FOR ALL
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = attendance_records.enrollment_id
              AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = attendance_records.enrollment_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Student policy: read attendance for own records only
-- FIXED: attendance_records TIDAK punya kolom student_id.
-- Harus join melalui enrollments untuk verifikasi kepemilikan.
CREATE POLICY "attendance_student_read"
    ON public.attendance_records
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.id = attendance_records.enrollment_id
              AND e.student_id = auth.uid()
        )
    );

-- Admin policy: full access within tenant
CREATE POLICY "attendance_admin_access"
    ON public.attendance_records
    FOR ALL
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    )
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    );
