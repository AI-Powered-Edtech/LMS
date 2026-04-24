-- 061_app_audit_triggers.sql
-- Fase 7 Unit 50 follow-up: auto-write to app_audit_logs from key tables
--
-- Pattern: a generic trigger function reads NEW/OLD diff and inserts into
-- app_audit_logs. Actor info comes from session GUC `app.current_user_id`
-- which the API layer should set per request (via SET LOCAL).
--
-- Tables instrumented (high-stakes mutations only — not gradebook entries
-- or progress events because volume would dwarf real audit signal):
--   rapor_documents, rapor_signatures, invoices, payment_transactions,
--   tenant_memberships, user_roles, role_capabilities, integration_configs,
--   bos_expenses, ppdb_jalur

CREATE OR REPLACE FUNCTION public.app_audit_trigger()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
    actor_id uuid;
    actor_role text;
    diff_json jsonb;
    entity_id uuid;
    tenant uuid;
BEGIN
    -- Resolve actor from session GUC. NULL is acceptable (system actions).
    BEGIN
        actor_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
        actor_role := NULLIF(current_setting('app.current_user_role', true), '');
    EXCEPTION WHEN OTHERS THEN
        actor_id := NULL;
        actor_role := NULL;
    END;

    -- Compute diff. For UPDATE: jsonb of changed fields only. For INSERT/DELETE: full row.
    IF TG_OP = 'UPDATE' THEN
        WITH changed AS (
            SELECT key, n.value AS new_value, o.value AS old_value
              FROM jsonb_each(to_jsonb(NEW)) n
              JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
             WHERE n.value IS DISTINCT FROM o.value
        )
        SELECT jsonb_object_agg(key, jsonb_build_object('from', old_value, 'to', new_value))
          INTO diff_json
          FROM changed;
    ELSIF TG_OP = 'INSERT' THEN
        diff_json := jsonb_build_object('inserted', to_jsonb(NEW));
    ELSE
        diff_json := jsonb_build_object('deleted', to_jsonb(OLD));
    END IF;

    -- Skip writes that produced no observable diff (unchanged UPDATE).
    IF TG_OP = 'UPDATE' AND (diff_json IS NULL OR diff_json = '{}'::jsonb) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    entity_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'))::uuid;
    tenant := COALESCE((to_jsonb(NEW)->>'tenant_id'), (to_jsonb(OLD)->>'tenant_id'))::uuid;

    INSERT INTO public.app_audit_logs
        (tenant_id, actor_id, actor_role, action, entity_type, entity_id, diff)
    VALUES
        (tenant, actor_id, actor_role,
         TG_TABLE_NAME || '.' || lower(TG_OP),
         TG_TABLE_NAME, entity_id, diff_json);

    RETURN COALESCE(NEW, OLD);
END
$fn$;

-- Helper: bulk-attach trigger to a list of tables.
DO $$
DECLARE
    target_table text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'rapor_documents', 'rapor_signatures', 'invoices', 'payment_transactions',
        'tenant_memberships', 'user_roles', 'role_capabilities',
        'integration_configs', 'bos_expenses', 'ppdb_jalur', 'parent_student_links',
        'counseling_notes'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I; '
            'CREATE TRIGGER trg_audit_%I '
            'AFTER INSERT OR UPDATE OR DELETE ON public.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.app_audit_trigger();',
            target_table, target_table, target_table, target_table
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'audit trigger on % skipped: %', target_table, SQLERRM;
    END LOOP;
END $$;
