-- SP-22: Custom Dashboard Builder
CREATE TABLE dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    layout JSONB NOT NULL DEFAULT '[]',
    widgets JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dashboard_configs_tenant ON dashboard_configs(tenant_id);
CREATE INDEX idx_dashboard_configs_created_by ON dashboard_configs(created_by);

ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_dashboards" ON dashboard_configs
    FOR ALL USING (
        created_by = auth.uid() AND has_role('TEACHER'::app_role)
    );

CREATE POLICY "teachers_read_shared_dashboards" ON dashboard_configs
    FOR SELECT USING (
        is_shared = true AND tenant_id = get_my_tenant_id() AND has_role('TEACHER'::app_role)
    );

-- RPCs
CREATE OR REPLACE FUNCTION save_dashboard(
    p_name TEXT,
    p_layout JSONB,
    p_widgets JSONB,
    p_is_shared BOOLEAN DEFAULT false,
    p_description TEXT DEFAULT NULL,
    p_dashboard_id UUID DEFAULT NULL
) RETURNS dashboard_configs AS $$
DECLARE
    v_result dashboard_configs;
BEGIN
    IF p_dashboard_id IS NOT NULL THEN
        UPDATE dashboard_configs SET
            name = p_name,
            description = p_description,
            layout = p_layout,
            widgets = p_widgets,
            is_shared = p_is_shared,
            updated_at = now()
        WHERE id = p_dashboard_id AND created_by = auth.uid()
        RETURNING * INTO v_result;
    ELSE
        INSERT INTO dashboard_configs (tenant_id, created_by, name, description, layout, widgets, is_shared)
        VALUES (get_my_tenant_id(), auth.uid(), p_name, p_description, p_layout, p_widgets, p_is_shared)
        RETURNING * INTO v_result;
    END IF;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_dashboards(p_include_shared BOOLEAN DEFAULT true)
RETURNS SETOF dashboard_configs AS $$
    SELECT * FROM dashboard_configs
    WHERE (created_by = auth.uid())
       OR (p_include_shared AND is_shared AND tenant_id = get_my_tenant_id())
    ORDER BY is_default DESC, updated_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_dashboard(p_dashboard_id UUID)
RETURNS dashboard_configs AS $$
    SELECT * FROM dashboard_configs
    WHERE id = p_dashboard_id
      AND (created_by = auth.uid() OR (is_shared AND tenant_id = get_my_tenant_id()))
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_dashboard(p_dashboard_id UUID)
RETURNS VOID AS $$
    DELETE FROM dashboard_configs WHERE id = p_dashboard_id AND created_by = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Seed 2 default dashboards per existing tenant
DO $$
DECLARE
    v_tenant RECORD;
    v_teacher_id UUID;
BEGIN
    FOR v_tenant IN SELECT id FROM tenants LIMIT 10 LOOP
        SELECT p.id INTO v_teacher_id FROM profiles p
            JOIN user_roles ur ON ur.user_id = p.id
            WHERE p.tenant_id = v_tenant.id AND ur.role = 'TEACHER' LIMIT 1;
        IF v_teacher_id IS NOT NULL THEN
            INSERT INTO dashboard_configs (tenant_id, created_by, name, description, layout, widgets, is_default, is_shared)
            VALUES
            (v_tenant.id, v_teacher_id, 'Overview Kelas', 'Tampilan umum performa kelas',
             '[{"widget_id":"w1","x":0,"y":0,"w":3,"h":2},{"widget_id":"w2","x":3,"y":0,"w":3,"h":2},{"widget_id":"w3","x":6,"y":0,"w":3,"h":2},{"widget_id":"w4","x":9,"y":0,"w":3,"h":2},{"widget_id":"w5","x":0,"y":2,"w":6,"h":4},{"widget_id":"w6","x":6,"y":2,"w":6,"h":4}]'::jsonb,
             '[{"id":"w1","type":"metric_card","config":{"metric":"total_students","label":"Total Siswa"}},{"id":"w2","type":"metric_card","config":{"metric":"avg_engagement","label":"Avg Engagement"}},{"id":"w3","type":"metric_card","config":{"metric":"at_risk_count","label":"Siswa Berisiko"}},{"id":"w4","type":"metric_card","config":{"metric":"avg_completion","label":"Avg Completion"}},{"id":"w5","type":"pie_chart","config":{"metric":"segment_distribution","label":"Segmentasi Siswa"}},{"id":"w6","type":"risk_radar","config":{"label":"Radar Risiko"}}]'::jsonb,
             true, true),
            (v_tenant.id, v_teacher_id, 'Detail Performa', 'Analisis mendalam performa belajar',
             '[{"widget_id":"w1","x":0,"y":0,"w":12,"h":4},{"widget_id":"w2","x":0,"y":4,"w":6,"h":4},{"widget_id":"w3","x":6,"y":4,"w":6,"h":4}]'::jsonb,
             '[{"id":"w1","type":"funnel","config":{"label":"Funnel Penyelesaian"}},{"id":"w2","type":"heatmap","config":{"label":"Retention Heatmap"}},{"id":"w3","type":"leaderboard","config":{"label":"Top Siswa"}}]'::jsonb,
             false, true)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
