-- Phase 1: Course Builder Versioning & Template Library

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.course_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    snapshot jsonb NOT NULL,
    commit_message text,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('course', 'module', 'lesson')),
    title text NOT NULL,
    description text,
    content jsonb NOT NULL,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. RLS Policies
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant course versions" ON public.course_versions
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can insert course versions" ON public.course_versions
    FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can delete course versions" ON public.course_versions
    FOR DELETE USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can view their tenant templates" ON public.content_templates
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can insert templates" ON public.content_templates
    FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can update their tenant templates" ON public.content_templates
    FOR UPDATE USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "Users can delete templates" ON public.content_templates
    FOR DELETE USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- 3. Triggers for tenant_id autofill
CREATE TRIGGER set_tenant_id_course_versions
    BEFORE INSERT ON public.course_versions
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_content_templates
    BEFORE INSERT ON public.content_templates
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- 4. RPC Functions for Versioning
CREATE OR REPLACE FUNCTION public.save_course_version(p_course_id uuid, p_message text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_version_number int;
    v_snapshot jsonb;
    v_version_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify access and get tenant
    SELECT tenant_id INTO v_tenant_id
    FROM public.courses
    WHERE id = p_course_id AND tenant_id = public.get_my_tenant_id();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found or access denied';
    END IF;

    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.course_versions
    WHERE course_id = p_course_id;

    -- Build snapshot
    WITH module_data AS (
        SELECT 
            cm.id AS module_id,
            cm.title AS module_title,
            cm."order" AS module_order,
            (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', l.id,
                        'title', l.title,
                        'content', l.content,
                        'order', l."order",
                        'type', l.type,
                        'passing_score', l.passing_score,
                        'is_published', l.is_published,
                        'duration_minutes', l.duration_minutes,
                        'resources', (
                            SELECT COALESCE(jsonb_agg(
                                jsonb_build_object(
                                    'id', lr.id,
                                    'type', lr.type,
                                    'url', lr.url,
                                    'title', lr.title,
                                    'content', lr.content,
                                    'metadata', lr.metadata,
                                    'order_index', lr.order_index
                                ) ORDER BY lr.order_index
                            ), '[]'::jsonb)
                            FROM public.lesson_resources lr
                            WHERE lr.lesson_id = l.id
                        )
                    ) ORDER BY l."order"
                ), '[]'::jsonb)
                FROM public.lessons l
                WHERE l.module_id = cm.id
            ) AS lessons
        FROM public.course_modules cm
        WHERE cm.course_id = p_course_id
        ORDER BY cm."order"
    )
    SELECT COALESCE(jsonb_agg(row_to_json(module_data)), '[]'::jsonb) INTO v_snapshot
    FROM module_data;

    -- Insert version
    INSERT INTO public.course_versions (
        course_id, version_number, snapshot, commit_message, tenant_id, created_by
    ) VALUES (
        p_course_id, v_version_number, v_snapshot, p_message, v_tenant_id, v_user_id
    ) RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

CREATE OR REPLACE FUNCTION public.restore_course_version(p_version_id uuid)
RETURNS boolean AS $$
DECLARE
    v_course_id uuid;
    v_tenant_id uuid;
    v_snapshot jsonb;
    v_module jsonb;
    v_lesson jsonb;
    v_resource jsonb;
    v_module_ids uuid[] := '{}';
    v_lesson_ids uuid[] := '{}';
    v_resource_ids uuid[] := '{}';
BEGIN
    -- Verify and get snapshot
    SELECT course_id, tenant_id, snapshot 
    INTO v_course_id, v_tenant_id, v_snapshot
    FROM public.course_versions
    WHERE id = p_version_id AND tenant_id = public.get_my_tenant_id();

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Version not found or access denied';
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
            title = EXCLUDED.title,
            "order" = EXCLUDED."order",
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
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                "order" = EXCLUDED."order",
                type = EXCLUDED.type,
                passing_score = EXCLUDED.passing_score,
                is_published = EXCLUDED.is_published,
                duration_minutes = EXCLUDED.duration_minutes,
                updated_at = EXCLUDED.updated_at;

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
                    type = EXCLUDED.type,
                    url = EXCLUDED.url,
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    metadata = EXCLUDED.metadata,
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

-- 5. RPC Functions for Templates
CREATE OR REPLACE FUNCTION public.save_content_template(
    p_type text,
    p_title text,
    p_description text,
    p_source_id uuid
)
RETURNS uuid AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id uuid;
    v_content jsonb;
    v_template_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_type = 'course' THEN
        -- Verify access to course
        SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_source_id AND tenant_id = public.get_my_tenant_id();
        IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Course not found or access denied'; END IF;

        -- Build course snapshot (similar to versioning but without IDs)
        -- ... For simplicity in this sprint, we'll store the whole course tree
        WITH module_data AS (
            SELECT 
                cm.title AS title,
                cm."order" AS "order",
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', l.title,
                            'content', l.content,
                            'order', l."order",
                            'type', l.type,
                            'passing_score', l.passing_score,
                            'is_published', l.is_published,
                            'duration_minutes', l.duration_minutes,
                            'resources', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'type', lr.type,
                                        'url', lr.url,
                                        'title', lr.title,
                                        'content', lr.content,
                                        'metadata', lr.metadata,
                                        'order_index', lr.order_index
                                    ) ORDER BY lr.order_index
                                ), '[]'::jsonb)
                                FROM public.lesson_resources lr WHERE lr.lesson_id = l.id
                            )
                        ) ORDER BY l."order"
                    ), '[]'::jsonb)
                    FROM public.lessons l WHERE l.module_id = cm.id
                ) AS lessons
            FROM public.course_modules cm
            WHERE cm.course_id = p_source_id
            ORDER BY cm."order"
        )
        SELECT COALESCE(jsonb_agg(row_to_json(module_data)), '[]'::jsonb) INTO v_content FROM module_data;

    ELSIF p_type = 'module' THEN
        -- Verify access to module
        SELECT tenant_id INTO v_tenant_id FROM public.course_modules WHERE id = p_source_id AND tenant_id = public.get_my_tenant_id();
        IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Module not found or access denied'; END IF;

        -- Build module snapshot
        SELECT jsonb_build_object(
            'title', cm.title,
            'lessons', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'title', l.title,
                        'content', l.content,
                        'order', l."order",
                        'type', l.type,
                        'passing_score', l.passing_score,
                        'is_published', l.is_published,
                        'duration_minutes', l.duration_minutes,
                        'resources', (
                            SELECT COALESCE(jsonb_agg(
                                jsonb_build_object(
                                    'type', lr.type,
                                    'url', lr.url,
                                    'title', lr.title,
                                    'content', lr.content,
                                    'metadata', lr.metadata,
                                    'order_index', lr.order_index
                                ) ORDER BY lr.order_index
                            ), '[]'::jsonb)
                            FROM public.lesson_resources lr WHERE lr.lesson_id = l.id
                        )
                    ) ORDER BY l."order"
                ), '[]'::jsonb)
                FROM public.lessons l WHERE l.module_id = cm.id
            )
        ) INTO v_content
        FROM public.course_modules cm WHERE id = p_source_id;

    ELSIF p_type = 'lesson' THEN
        -- Verify access to lesson
        SELECT tenant_id INTO v_tenant_id FROM public.lessons WHERE id = p_source_id AND tenant_id = public.get_my_tenant_id();
        IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Lesson not found or access denied'; END IF;

        -- Build lesson snapshot
        SELECT jsonb_build_object(
            'title', l.title,
            'content', l.content,
            'type', l.type,
            'passing_score', l.passing_score,
            'is_published', l.is_published,
            'duration_minutes', l.duration_minutes,
            'resources', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'type', lr.type,
                        'url', lr.url,
                        'title', lr.title,
                        'content', lr.content,
                        'metadata', lr.metadata,
                        'order_index', lr.order_index
                    ) ORDER BY lr.order_index
                ), '[]'::jsonb)
                FROM public.lesson_resources lr WHERE lr.lesson_id = l.id
            )
        ) INTO v_content
        FROM public.lessons l WHERE id = p_source_id;

    ELSE
        RAISE EXCEPTION 'Invalid template type';
    END IF;

    -- Insert template
    INSERT INTO public.content_templates (
        type, title, description, content, tenant_id, created_by
    ) VALUES (
        p_type, p_title, p_description, v_content, v_tenant_id, v_user_id
    ) RETURNING id INTO v_template_id;

    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

CREATE OR REPLACE FUNCTION public.import_content_template(
    p_template_id uuid,
    p_target_id uuid, -- course_id if importing module/course, module_id if importing lesson
    p_order integer DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_template public.content_templates;
    v_tenant_id uuid;
    v_new_module_id uuid;
    v_new_lesson_id uuid;
    v_module jsonb;
    v_lesson jsonb;
    v_resource jsonb;
    v_actual_order integer;
BEGIN
    -- Get template
    SELECT * INTO v_template 
    FROM public.content_templates 
    WHERE id = p_template_id AND tenant_id = public.get_my_tenant_id();

    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found or access denied';
    END IF;

    v_tenant_id := v_template.tenant_id;

    IF v_template.type = 'course' THEN
        -- Verify target is a course
        PERFORM 1 FROM public.courses WHERE id = p_target_id AND tenant_id = v_tenant_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Target course not found'; END IF;

        -- Loop through modules in template content
        FOR v_module IN SELECT * FROM jsonb_array_elements(v_template.content)
        LOOP
            IF p_order IS NULL THEN
                SELECT COALESCE(MAX("order"), -1) + 1 INTO v_actual_order FROM public.course_modules WHERE course_id = p_target_id;
            ELSE
                v_actual_order := p_order;
            END IF;

            INSERT INTO public.course_modules (course_id, title, "order", tenant_id)
            VALUES (p_target_id, v_module->>'title', v_actual_order, v_tenant_id)
            RETURNING id INTO v_new_module_id;

            FOR v_lesson IN SELECT * FROM jsonb_array_elements(v_module->'lessons')
            LOOP
                INSERT INTO public.lessons (module_id, title, content, "order", type, passing_score, is_published, duration_minutes, tenant_id)
                VALUES (
                    v_new_module_id, v_lesson->>'title', v_lesson->>'content', (v_lesson->>'order')::integer,
                    v_lesson->>'type', (v_lesson->>'passing_score')::integer, (v_lesson->>'is_published')::boolean,
                    (v_lesson->>'duration_minutes')::integer, v_tenant_id
                ) RETURNING id INTO v_new_lesson_id;

                FOR v_resource IN SELECT * FROM jsonb_array_elements(v_lesson->'resources')
                LOOP
                    INSERT INTO public.lesson_resources (lesson_id, type, url, title, content, metadata, order_index, tenant_id)
                    VALUES (
                        v_new_lesson_id, (v_resource->>'type')::public.resource_type, v_resource->>'url',
                        v_resource->>'title', v_resource->>'content', COALESCE((v_resource->>'metadata')::jsonb, '{}'::jsonb),
                        (v_resource->>'order_index')::integer, v_tenant_id
                    );
                END LOOP;
            END LOOP;
        END LOOP;

    ELSIF v_template.type = 'module' THEN
        -- Verify target is a course
        PERFORM 1 FROM public.courses WHERE id = p_target_id AND tenant_id = v_tenant_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Target course not found'; END IF;

        IF p_order IS NULL THEN
            SELECT COALESCE(MAX("order"), -1) + 1 INTO v_actual_order FROM public.course_modules WHERE course_id = p_target_id;
        ELSE
            v_actual_order := p_order;
        END IF;

        INSERT INTO public.course_modules (course_id, title, "order", tenant_id)
        VALUES (p_target_id, v_template.content->>'title', v_actual_order, v_tenant_id)
        RETURNING id INTO v_new_module_id;

        FOR v_lesson IN SELECT * FROM jsonb_array_elements(v_template.content->'lessons')
        LOOP
            INSERT INTO public.lessons (module_id, title, content, "order", type, passing_score, is_published, duration_minutes, tenant_id)
            VALUES (
                v_new_module_id, v_lesson->>'title', v_lesson->>'content', (v_lesson->>'order')::integer,
                v_lesson->>'type', (v_lesson->>'passing_score')::integer, (v_lesson->>'is_published')::boolean,
                (v_lesson->>'duration_minutes')::integer, v_tenant_id
            ) RETURNING id INTO v_new_lesson_id;

            FOR v_resource IN SELECT * FROM jsonb_array_elements(v_lesson->'resources')
            LOOP
                INSERT INTO public.lesson_resources (lesson_id, type, url, title, content, metadata, order_index, tenant_id)
                VALUES (
                    v_new_lesson_id, (v_resource->>'type')::public.resource_type, v_resource->>'url',
                    v_resource->>'title', v_resource->>'content', COALESCE((v_resource->>'metadata')::jsonb, '{}'::jsonb),
                    (v_resource->>'order_index')::integer, v_tenant_id
                );
            END LOOP;
        END LOOP;

    ELSIF v_template.type = 'lesson' THEN
        -- Verify target is a module
        PERFORM 1 FROM public.course_modules WHERE id = p_target_id AND tenant_id = v_tenant_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Target module not found'; END IF;

        IF p_order IS NULL THEN
            SELECT COALESCE(MAX("order"), -1) + 1 INTO v_actual_order FROM public.lessons WHERE module_id = p_target_id;
        ELSE
            v_actual_order := p_order;
        END IF;

        INSERT INTO public.lessons (module_id, title, content, "order", type, passing_score, is_published, duration_minutes, tenant_id)
        VALUES (
            p_target_id, v_template.content->>'title', v_template.content->>'content', v_actual_order,
            v_template.content->>'type', (v_template.content->>'passing_score')::integer, (v_template.content->>'is_published')::boolean,
            (v_template.content->>'duration_minutes')::integer, v_tenant_id
        ) RETURNING id INTO v_new_lesson_id;

        FOR v_resource IN SELECT * FROM jsonb_array_elements(v_template.content->'resources')
        LOOP
            INSERT INTO public.lesson_resources (lesson_id, type, url, title, content, metadata, order_index, tenant_id)
            VALUES (
                v_new_lesson_id, (v_resource->>'type')::public.resource_type, v_resource->>'url',
                v_resource->>'title', v_resource->>'content', COALESCE((v_resource->>'metadata')::jsonb, '{}'::jsonb),
                (v_resource->>'order_index')::integer, v_tenant_id
            );
        END LOOP;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_course_versions_course_version
    ON public.course_versions (course_id, version_number);

CREATE INDEX IF NOT EXISTS idx_course_versions_tenant
    ON public.course_versions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_content_templates_tenant_type
    ON public.content_templates (tenant_id, type);

-- 7. Grants
GRANT ALL ON TABLE public.course_versions TO authenticated;
GRANT ALL ON TABLE public.content_templates TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_course_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_course_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_content_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_content_template TO authenticated;
