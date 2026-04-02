-- FIXED: B2 — restore_course_version missing auth.uid() and owner/admin check (CRITICAL)
-- Original function in 20260324150000_course_builder_phase1.sql had no authentication guard.

CREATE OR REPLACE FUNCTION public.restore_course_version(p_version_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_id   uuid;
    v_course_id uuid;
    v_tenant_id uuid;
    v_snapshot  jsonb;
    v_module    jsonb;
    v_lesson    jsonb;
    v_resource  jsonb;
    v_module_ids   uuid[] := '{}';
    v_lesson_ids   uuid[] := '{}';
    v_resource_ids uuid[] := '{}';
BEGIN
    -- FIXED: Check caller is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Verify and get snapshot (also enforces tenant isolation via get_my_tenant_id())
    SELECT course_id, tenant_id, snapshot
    INTO v_course_id, v_tenant_id, v_snapshot
    FROM public.course_versions
    WHERE id = p_version_id AND tenant_id = public.get_my_tenant_id();

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Version not found or access denied';
    END IF;

    -- FIXED: Verify caller is the course owner or an admin within the tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = v_course_id
          AND tenant_id = v_tenant_id
          AND created_by = v_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_user_id
          AND ur.tenant_id = v_tenant_id
          AND UPPER(ur.role::text) = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only the course owner or an admin can restore versions'
            USING ERRCODE = 'P0002';
    END IF;

    -- Loop through snapshot and UPSERT
    -- Modules
    FOR v_module IN SELECT * FROM jsonb_array_elements(v_snapshot)
    LOOP
        v_module_ids := array_append(v_module_ids, (v_module->>'module_id')::uuid);

        INSERT INTO public.course_modules (id, course_id, title, "order", tenant_id, updated_at)
        VALUES (
            (v_module->>'module_id')::uuid,
            v_course_id,
            v_module->>'module_title',
            (v_module->>'module_order')::integer,
            v_tenant_id,
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            title      = EXCLUDED.title,
            "order"    = EXCLUDED."order",
            updated_at = EXCLUDED.updated_at;

        -- Lessons
        FOR v_lesson IN SELECT * FROM jsonb_array_elements(v_module->'lessons')
        LOOP
            v_lesson_ids := array_append(v_lesson_ids, (v_lesson->>'id')::uuid);

            INSERT INTO public.lessons (
                id, module_id, title, content, "order", type, passing_score,
                is_published, duration_minutes, tenant_id, updated_at
            )
            VALUES (
                (v_lesson->>'id')::uuid,
                (v_module->>'module_id')::uuid,
                v_lesson->>'title',
                v_lesson->>'content',
                (v_lesson->>'order')::integer,
                v_lesson->>'type',
                (v_lesson->>'passing_score')::integer,
                (v_lesson->>'is_published')::boolean,
                (v_lesson->>'duration_minutes')::integer,
                v_tenant_id,
                now()
            )
            ON CONFLICT (id) DO UPDATE SET
                title            = EXCLUDED.title,
                content          = EXCLUDED.content,
                "order"          = EXCLUDED."order",
                type             = EXCLUDED.type,
                passing_score    = EXCLUDED.passing_score,
                is_published     = EXCLUDED.is_published,
                duration_minutes = EXCLUDED.duration_minutes,
                updated_at       = EXCLUDED.updated_at;

            -- Resources
            FOR v_resource IN SELECT * FROM jsonb_array_elements(v_lesson->'resources')
            LOOP
                v_resource_ids := array_append(v_resource_ids, (v_resource->>'id')::uuid);

                INSERT INTO public.lesson_resources (
                    id, lesson_id, type, url, title, content, metadata, order_index, tenant_id
                )
                VALUES (
                    (v_resource->>'id')::uuid,
                    (v_lesson->>'id')::uuid,
                    (v_resource->>'type')::public.resource_type,
                    v_resource->>'url',
                    v_resource->>'title',
                    v_resource->>'content',
                    COALESCE((v_resource->>'metadata')::jsonb, '{}'::jsonb),
                    (v_resource->>'order_index')::integer,
                    v_tenant_id
                )
                ON CONFLICT (id) DO UPDATE SET
                    type        = EXCLUDED.type,
                    url         = EXCLUDED.url,
                    title       = EXCLUDED.title,
                    content     = EXCLUDED.content,
                    metadata    = EXCLUDED.metadata,
                    order_index = EXCLUDED.order_index;
            END LOOP;
        END LOOP;
    END LOOP;

    -- DELETE orphaned resources (resources for this course that are not in the snapshot)
    DELETE FROM public.lesson_resources
    WHERE lesson_id IN (
        SELECT id FROM public.lessons WHERE module_id IN (
            SELECT id FROM public.course_modules WHERE course_id = v_course_id
        )
    )
    AND id != ALL(v_resource_ids);

    -- DELETE orphaned lessons
    DELETE FROM public.lessons
    WHERE module_id IN (
        SELECT id FROM public.course_modules WHERE course_id = v_course_id
    )
    AND id != ALL(v_lesson_ids);

    -- DELETE orphaned modules
    DELETE FROM public.course_modules
    WHERE course_id = v_course_id
    AND id != ALL(v_module_ids);

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;
