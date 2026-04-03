-- Fix 1: Admin can manage all reports in tenant
DROP POLICY IF EXISTS "admins_manage_reports" ON public.scheduled_reports;
CREATE POLICY "admins_manage_reports"
    ON public.scheduled_reports
    FOR ALL
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id   = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    )
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id   = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    );

-- Fix 2: generate_report_data — email masking + pagination warning
-- FIXED: Signature match dengan fungsi asli di 013_export_reports.sql
-- Signature asli: generate_report_data(p_report_id UUID)
-- Menggunakan DROP FUNCTION IF EXISTS CASCADE untuk menghindari conflict signature
DROP FUNCTION IF EXISTS public.generate_report_data(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_report_data(p_report_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report      RECORD;
    v_caller_role TEXT;
    v_result      JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Verify ownership AND tenant
    SELECT * INTO v_report
    FROM public.scheduled_reports
    WHERE id         = p_report_id
      AND created_by = auth.uid()
      AND tenant_id  = get_my_tenant_id();

    IF NOT FOUND THEN
        -- Allow admin to generate any report in tenant
        SELECT * INTO v_report
        FROM public.scheduled_reports
        WHERE id        = p_report_id
          AND tenant_id = get_my_tenant_id();

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0404';
        END IF;
    END IF;

    -- Get caller role for PII decisions
    SELECT UPPER(ur.role::text) INTO v_caller_role
    FROM public.user_roles ur
    WHERE ur.user_id   = auth.uid()
      AND ur.tenant_id = get_my_tenant_id()
    ORDER BY
        CASE UPPER(ur.role::text)
            WHEN 'ADMIN' THEN 1
            WHEN 'TEACHER' THEN 2
            ELSE 3
        END
    LIMIT 1;

    IF v_report.report_type = 'student_list' THEN
        SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
        FROM (
            SELECT jsonb_build_object(
                'student_name', p.full_name,
                -- SECURITY: mask email for non-admin
                'email',
                    CASE WHEN v_caller_role = 'ADMIN'
                         THEN p.email
                         ELSE SUBSTRING(p.email, 1, 2) || '***@***'
                    END,
                'total_xp',   COALESCE(sxp.total_xp, 0),
                'level',      COALESCE(sxp.level, 1)
            ) AS row_data
            FROM public.profiles p
            LEFT JOIN public.student_xp_summary sxp
                   ON sxp.user_id   = p.id
                  AND sxp.tenant_id = p.tenant_id
            WHERE p.tenant_id = v_report.tenant_id
            LIMIT 500
        ) sub;

    ELSIF v_report.report_type = 'engagement' THEN
        SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
        FROM (
            SELECT jsonb_build_object(
                'student_name', p.full_name,
                'event_count',  COUNT(le.id),
                'last_active',  MAX(le.created_at)
            ) AS row_data
            FROM public.profiles p
            LEFT JOIN public.learning_events le
                   ON le.user_id   = p.id
                  AND le.tenant_id = p.tenant_id
            WHERE p.tenant_id = v_report.tenant_id
            GROUP BY p.id, p.full_name
            LIMIT 500
        ) sub;
    ELSE
        v_result := '[]'::jsonb;
    END IF;

    RETURN v_result;
END;
$$;
