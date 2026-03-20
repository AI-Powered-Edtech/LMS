-- SP-23: Export & Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('dashboard','student_list','course_summary','engagement')),
    config JSONB NOT NULL DEFAULT '{}',
    schedule TEXT DEFAULT 'none' CHECK (schedule IN ('weekly','monthly','none')),
    export_format TEXT DEFAULT 'csv' CHECK (export_format IN ('csv','pdf')),
    last_generated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_manage_own_reports" ON scheduled_reports;
CREATE POLICY "teachers_manage_own_reports" ON scheduled_reports
    FOR ALL USING (created_by = auth.uid() AND has_role('TEACHER'::app_role));

CREATE OR REPLACE FUNCTION save_scheduled_report(
    p_name TEXT,
    p_report_type TEXT,
    p_config JSONB,
    p_schedule TEXT DEFAULT 'none',
    p_export_format TEXT DEFAULT 'csv',
    p_report_id UUID DEFAULT NULL
) RETURNS scheduled_reports AS $$
DECLARE v_result scheduled_reports;
BEGIN
    IF p_report_id IS NOT NULL THEN
        UPDATE scheduled_reports SET name=p_name, report_type=p_report_type, config=p_config, schedule=p_schedule, export_format=p_export_format
        WHERE id=p_report_id AND created_by=auth.uid() RETURNING * INTO v_result;
    ELSE
        INSERT INTO scheduled_reports (tenant_id, created_by, name, report_type, config, schedule, export_format)
        VALUES (get_my_tenant_id(), auth.uid(), p_name, p_report_type, p_config, p_schedule, p_export_format)
        RETURNING * INTO v_result;
    END IF;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_scheduled_reports()
RETURNS SETOF scheduled_reports AS $$
    SELECT * FROM scheduled_reports WHERE created_by = auth.uid() ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_scheduled_report(p_report_id UUID)
RETURNS VOID AS $$
    DELETE FROM scheduled_reports WHERE id = p_report_id AND created_by = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_report_data(p_report_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_report scheduled_reports;
    v_data JSONB;
    v_tenant_id UUID;
BEGIN
    SELECT * INTO v_report FROM scheduled_reports WHERE id = p_report_id AND created_by = auth.uid();
    IF NOT FOUND THEN RETURN NULL; END IF;

    v_tenant_id := v_report.tenant_id;

    IF v_report.report_type = 'student_list' THEN
        SELECT jsonb_agg(row_to_json(t)) INTO v_data FROM (
            SELECT p.full_name, p.email, ur.role::text AS role,
                   COALESCE(sxs.total_xp, 0) as total_xp,
                   COALESCE(sxs.level, 1) as level,
                   COALESCE(sxs.streak_current, 0) as streak_current
            FROM profiles p
            JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
            LEFT JOIN student_xp_summary sxs ON sxs.user_id = p.id AND sxs.tenant_id = v_tenant_id
            WHERE p.tenant_id = v_tenant_id AND ur.role = 'STUDENT'
            LIMIT 500
        ) t;
    ELSIF v_report.report_type = 'engagement' THEN
        SELECT jsonb_agg(row_to_json(t)) INTO v_data FROM (
            SELECT p.full_name,
                   COUNT(DISTINCT le.session_id) as total_sessions,
                   COUNT(le.id) as total_events,
                   MAX(le.created_at) as last_active
            FROM profiles p
            JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
            LEFT JOIN learning_events le ON le.user_id = p.id AND le.tenant_id = v_tenant_id
            WHERE p.tenant_id = v_tenant_id AND ur.role = 'STUDENT'
            GROUP BY p.id, p.full_name
            LIMIT 500
        ) t;
    ELSIF v_report.report_type = 'course_summary' THEN
        SELECT jsonb_agg(row_to_json(t)) INTO v_data FROM (
            SELECT c.title, c.status,
                   COUNT(DISTINCT e.user_id) as enrolled_students
            FROM courses c
            LEFT JOIN enrollments e ON e.course_id = c.id
            WHERE c.tenant_id = v_tenant_id
            GROUP BY c.id, c.title, c.status
            LIMIT 200
        ) t;
    ELSE
        v_data := '[]'::jsonb;
    END IF;

    UPDATE scheduled_reports SET last_generated_at = now() WHERE id = p_report_id;

    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
