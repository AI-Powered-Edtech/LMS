-- ============================================================================
-- AI Course Builder Copilot — Foundation Migration
-- Creates ai_builder_artifacts table, apply RPCs, and feature flag seed.
-- ============================================================================

-- ─── 1. Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_builder_artifacts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id      uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by     uuid        NOT NULL REFERENCES auth.users(id),
  artifact_kind  text        NOT NULL CHECK (artifact_kind IN ('outline','lesson_draft','assessment','transform')),
  target_type    text        NOT NULL CHECK (target_type IN ('course','module','lesson','block')),
  target_id      uuid,
  source_type    text        NOT NULL CHECK (source_type IN ('prompt','file','lesson')),
  source_ref_id  uuid,
  prompt_config  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  output         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status         text        NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','applied','dismissed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_builder_artifacts IS 'Tracks all AI-generated artifacts from the Course Builder Copilot drawer.';

-- ─── 2. Triggers ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_tenant_id_ai_builder_artifacts ON public.ai_builder_artifacts;
CREATE TRIGGER set_tenant_id_ai_builder_artifacts
  BEFORE INSERT ON public.ai_builder_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

DROP TRIGGER IF EXISTS touch_updated_at_ai_builder_artifacts ON public.ai_builder_artifacts;
CREATE TRIGGER touch_updated_at_ai_builder_artifacts
  BEFORE UPDATE ON public.ai_builder_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── 3. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_builder_artifacts_tenant_course_created
  ON public.ai_builder_artifacts (tenant_id, course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_builder_artifacts_target
  ON public.ai_builder_artifacts (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_ai_builder_artifacts_kind_status
  ON public.ai_builder_artifacts (artifact_kind, status);

CREATE INDEX IF NOT EXISTS idx_ai_builder_artifacts_created_by
  ON public.ai_builder_artifacts (created_by);

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_builder_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_builder_artifacts_select" ON public.ai_builder_artifacts;
CREATE POLICY "ai_builder_artifacts_select"
  ON public.ai_builder_artifacts FOR SELECT
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "ai_builder_artifacts_insert" ON public.ai_builder_artifacts;
CREATE POLICY "ai_builder_artifacts_insert"
  ON public.ai_builder_artifacts FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "ai_builder_artifacts_update" ON public.ai_builder_artifacts;
CREATE POLICY "ai_builder_artifacts_update"
  ON public.ai_builder_artifacts FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "ai_builder_artifacts_delete" ON public.ai_builder_artifacts;
CREATE POLICY "ai_builder_artifacts_delete"
  ON public.ai_builder_artifacts FOR DELETE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND created_by = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_builder_artifacts TO authenticated;

-- ─── 5. apply_ai_outline_artifact RPC ────────────────────────────────────────
-- Atomically inserts selected modules + lessons from an outline artifact.
-- Modeled after import_content_template (20260324150000).

CREATE OR REPLACE FUNCTION public.apply_ai_outline_artifact(
  p_artifact_id      uuid,
  p_course_id        uuid,
  p_selected_modules jsonb  -- [{ title, lessons: [{ title, type, duration_minutes }] }]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id     uuid;
  v_module        jsonb;
  v_lesson        jsonb;
  v_new_module_id uuid;
  v_new_lesson_id uuid;
  v_mod_order     integer;
  v_les_order     integer;
  v_created_ids   jsonb := '{"modules":[],"lessons":[]}'::jsonb;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := public.get_my_tenant_id();

  -- Validate p_selected_modules schema
  IF jsonb_typeof(p_selected_modules) != 'array' THEN
    RAISE EXCEPTION 'p_selected_modules must be a valid JSON array';
  END IF;

  FOR v_module IN SELECT value FROM jsonb_array_elements(p_selected_modules) LOOP
    -- Check required fields exist and are correct types
    IF NOT (
         v_module ? 'title'
         AND jsonb_typeof(v_module->'title') = 'string'
         AND length(trim(v_module->>'title')) > 0
         AND v_module ? 'lessons'
         AND jsonb_typeof(v_module->'lessons') = 'array'
       ) THEN
      RAISE EXCEPTION 'Invalid module item: must contain non-empty "title" string and "lessons" array';
    END IF;

    -- Validate lessons array items
    FOR v_lesson IN SELECT value FROM jsonb_array_elements(v_module->'lessons') LOOP
      IF NOT (
           v_lesson ? 'title'
           AND jsonb_typeof(v_lesson->'title') = 'string'
           AND length(trim(v_lesson->>'title')) > 0
         ) THEN
        RAISE EXCEPTION 'Invalid lesson item: must contain non-empty "title" string';
      END IF;

      -- Optional fields validation
      IF (v_lesson ? 'duration_minutes') AND jsonb_typeof(v_lesson->'duration_minutes') != 'number' THEN
        RAISE EXCEPTION 'Invalid lesson item: "duration_minutes" must be an integer when present';
      END IF;
      IF (v_lesson ? 'type') AND jsonb_typeof(v_lesson->'type') != 'string' THEN
        RAISE EXCEPTION 'Invalid lesson item: "type" must be a string when present';
      END IF;

      -- No extra top-level properties allowed
      IF (
        SELECT count(*) FROM jsonb_object_keys(v_lesson)
      ) > 3 THEN
        RAISE EXCEPTION 'Invalid lesson item: unexpected extra properties found';
      END IF;
    END LOOP;

    -- No extra top-level module properties allowed
    IF (
      SELECT count(*) FROM jsonb_object_keys(v_module)
    ) > 2 THEN
      RAISE EXCEPTION 'Invalid module item: unexpected extra properties found';
    END IF;
  END LOOP;

  -- Validate artifact ownership and course scope
  PERFORM 1
  FROM public.ai_builder_artifacts
  WHERE id = p_artifact_id
    AND tenant_id = v_tenant_id
    AND created_by = auth.uid()
    AND artifact_kind = 'outline'
    AND course_id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artifact not found or access denied';
  END IF;

  -- Validate course
  PERFORM 1 FROM public.courses
  WHERE id = p_course_id AND tenant_id = v_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Current max module order
  SELECT COALESCE(MAX("order"), -1) INTO v_mod_order
  FROM public.course_modules
  WHERE course_id = p_course_id;

  -- Loop selected modules
  FOR v_module IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_selected_modules, '[]'::jsonb)) AS value
  LOOP
    v_mod_order := v_mod_order + 1;

    INSERT INTO public.course_modules (course_id, title, "order", tenant_id)
    VALUES (p_course_id, v_module->>'title', v_mod_order, v_tenant_id)
    RETURNING id INTO v_new_module_id;

    v_created_ids := jsonb_set(
      v_created_ids,
      '{modules}',
      (v_created_ids->'modules') || to_jsonb(v_new_module_id)
    );

    -- Loop lessons within module
    v_les_order := -1;
    FOR v_lesson IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_module->'lessons', '[]'::jsonb)) AS value
    LOOP
      v_les_order := v_les_order + 1;

      INSERT INTO public.lessons (
        module_id, title, "order", type, duration_minutes,
        is_published, tenant_id
      ) VALUES (
        v_new_module_id,
        v_lesson->>'title',
        v_les_order,
        CASE lower(COALESCE(v_lesson->>'type', 'article'))
          WHEN 'video' THEN 'video'
          WHEN 'quiz' THEN 'quiz'
          ELSE 'article'
        END,
        COALESCE(NULLIF(v_lesson->>'duration_minutes', '')::integer, 15),
        false,
        v_tenant_id
      ) RETURNING id INTO v_new_lesson_id;

      v_created_ids := jsonb_set(
        v_created_ids,
        '{lessons}',
        (v_created_ids->'lessons') || to_jsonb(v_new_lesson_id)
      );
    END LOOP;
  END LOOP;

  -- Mark artifact as applied
  UPDATE public.ai_builder_artifacts
  SET status = 'applied'
  WHERE id = p_artifact_id;

  RETURN v_created_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ai_outline_artifact(uuid, uuid, jsonb) TO authenticated;

-- ─── 6. apply_ai_lesson_artifact RPC ─────────────────────────────────────────
-- Atomically inserts selected blocks + upserts assignment for a lesson.
-- Quiz upsert is signaled back to the client (quiz_id='pending') because
-- the existing quiz save logic is complex and already implemented client-side.

CREATE OR REPLACE FUNCTION public.apply_ai_lesson_artifact(
  p_artifact_id        uuid,
  p_lesson_id          uuid,
  p_selected_blocks    jsonb,           -- [{ type, title, content, metadata }]
  p_quiz_payload       jsonb DEFAULT NULL,
  p_assignment_payload jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id            uuid;
  v_block                jsonb;
  v_new_resource_id      uuid;
  v_order                integer;
  v_course_id            uuid;
  v_existing_assignment  uuid;
  v_existing_assignment_block uuid;
  v_existing_quiz_block  uuid;
  v_new_assignment_id    uuid;
  v_saved_quiz           jsonb;
  v_normalized_block_type text;
  v_created_ids          jsonb := '{"blocks":[],"quiz_id":null,"assignment_id":null}'::jsonb;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := public.get_my_tenant_id();

  -- Validate p_selected_blocks schema
  IF p_selected_blocks IS NOT NULL THEN
    IF jsonb_typeof(p_selected_blocks) != 'array' THEN
      RAISE EXCEPTION 'p_selected_blocks must be a valid JSON array';
    END IF;

    FOR v_block IN SELECT value FROM jsonb_array_elements(p_selected_blocks) LOOP
      -- Check required fields exist and correct types
      IF NOT (
           v_block ? 'type'
           AND jsonb_typeof(v_block->'type') = 'string'
           AND length(trim(v_block->>'type')) > 0
           AND v_block ? 'title'
           AND jsonb_typeof(v_block->'title') = 'string'
           AND length(trim(v_block->>'title')) > 0
         ) THEN
        RAISE EXCEPTION 'Invalid block item: must contain non-empty "type" and "title" strings';
      END IF;

      -- Optional fields validation
      IF (v_block ? 'content') AND jsonb_typeof(v_block->'content') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'Invalid block item: "content" must be a string or null when present';
      END IF;
      IF (v_block ? 'metadata') AND jsonb_typeof(v_block->'metadata') != 'object' THEN
        RAISE EXCEPTION 'Invalid block item: "metadata" must be an object when present';
      END IF;
      IF (v_block ? 'url') AND jsonb_typeof(v_block->'url') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'Invalid block item: "url" must be a string or null when present';
      END IF;

      -- No extra top-level block properties allowed
      IF (
        SELECT count(*) FROM jsonb_object_keys(v_block)
      ) > 5 THEN
        RAISE EXCEPTION 'Invalid block item: unexpected extra properties found';
      END IF;
    END LOOP;
  END IF;

  -- Validate lesson and resolve course_id
  SELECT cm.course_id INTO v_course_id
  FROM public.lessons l
  JOIN public.course_modules cm ON cm.id = l.module_id
  WHERE l.id = p_lesson_id AND l.tenant_id = v_tenant_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  -- Validate artifact ownership and lesson scope
  PERFORM 1
  FROM public.ai_builder_artifacts
  WHERE id = p_artifact_id
    AND tenant_id = v_tenant_id
    AND created_by = auth.uid()
    AND artifact_kind IN ('lesson_draft', 'assessment')
    AND course_id = v_course_id
    AND (
      target_id IS NULL
      OR target_id = p_lesson_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artifact not found or access denied';
  END IF;

  -- Current max order for blocks
  SELECT COALESCE(MAX(order_index), -1) INTO v_order
  FROM public.lesson_resources
  WHERE lesson_id = p_lesson_id;

  -- Insert selected blocks as lesson_resources
  IF p_selected_blocks IS NOT NULL AND jsonb_array_length(p_selected_blocks) > 0 THEN
    FOR v_block IN
      SELECT value
      FROM jsonb_array_elements(p_selected_blocks) AS value
    LOOP
      v_order := v_order + 1;
      v_normalized_block_type := lower(COALESCE(v_block->>'type', 'text'));

      IF v_normalized_block_type NOT IN (
        'text',
        'video',
        'image',
        'file',
        'quiz',
        'assignment',
        'link',
        'document',
        'pdf',
        'scorm'
      ) THEN
        v_normalized_block_type := 'text';
      END IF;

      INSERT INTO public.lesson_resources (
        lesson_id, type, title, content, metadata, order_index, tenant_id, url
      ) VALUES (
        p_lesson_id,
        v_normalized_block_type,
        v_block->>'title',
        v_block->>'content',
        COALESCE(v_block->'metadata', '{}'::jsonb),
        v_order,
        v_tenant_id,
        COALESCE(v_block->>'url', '')
      ) RETURNING id INTO v_new_resource_id;

      v_created_ids := jsonb_set(
        v_created_ids,
        '{blocks}',
        (v_created_ids->'blocks') || to_jsonb(v_new_resource_id)
      );
    END LOOP;
  END IF;

  -- Ensure quiz exists in both data and block tree
  IF p_quiz_payload IS NOT NULL THEN
    SELECT id INTO v_existing_quiz_block
    FROM public.lesson_resources
    WHERE lesson_id = p_lesson_id
      AND tenant_id = v_tenant_id
      AND lower(type::text) = 'quiz'
    ORDER BY order_index
    LIMIT 1;

    IF v_existing_quiz_block IS NULL THEN
      v_order := v_order + 1;

      INSERT INTO public.lesson_resources (
        lesson_id, type, title, content, metadata, order_index, tenant_id, url
      ) VALUES (
        p_lesson_id,
        'quiz',
        COALESCE(p_quiz_payload->>'title', 'Kuis AI'),
        NULL,
        '{}'::jsonb,
        v_order,
        v_tenant_id,
        ''
      );
    END IF;

    v_saved_quiz := public.save_quiz_builder(
      p_lesson_id,
      v_tenant_id,
      p_quiz_payload
    );

    v_created_ids := jsonb_set(
      v_created_ids,
      '{quiz_id}',
      COALESCE(v_saved_quiz->'quiz_id', 'null'::jsonb)
    );
  END IF;

  -- Upsert assignment (at most one per lesson) and ensure assignment block exists
  IF p_assignment_payload IS NOT NULL THEN
    SELECT id INTO v_existing_assignment
    FROM public.assignments
    WHERE lesson_id = p_lesson_id AND tenant_id = v_tenant_id
    LIMIT 1;

    IF v_existing_assignment IS NOT NULL THEN
      UPDATE public.assignments SET
        title        = COALESCE(p_assignment_payload->>'title', title),
        instructions = COALESCE(p_assignment_payload->>'instructions', instructions),
        max_points   = COALESCE((p_assignment_payload->>'max_points')::integer, max_points),
        max_attempts = COALESCE((p_assignment_payload->>'max_attempts')::integer, max_attempts)
      WHERE id = v_existing_assignment;

      v_created_ids := jsonb_set(
        v_created_ids, '{assignment_id}', to_jsonb(v_existing_assignment)
      );
    ELSE
      INSERT INTO public.assignments (
        lesson_id, course_id, tenant_id, title, instructions,
        max_points, max_attempts, is_published, created_by
      ) VALUES (
        p_lesson_id, v_course_id, v_tenant_id,
        COALESCE(p_assignment_payload->>'title', 'Tugas AI'),
        p_assignment_payload->>'instructions',
        COALESCE((p_assignment_payload->>'max_points')::integer, 100),
        COALESCE((p_assignment_payload->>'max_attempts')::integer, 1),
        false,
        auth.uid()
      ) RETURNING id INTO v_new_assignment_id;

      v_created_ids := jsonb_set(
        v_created_ids, '{assignment_id}', to_jsonb(v_new_assignment_id)
      );
    END IF;

    SELECT id INTO v_existing_assignment_block
    FROM public.lesson_resources
    WHERE lesson_id = p_lesson_id
      AND tenant_id = v_tenant_id
      AND lower(type::text) = 'assignment'
    ORDER BY order_index
    LIMIT 1;

    IF v_existing_assignment_block IS NULL THEN
      v_order := v_order + 1;

      INSERT INTO public.lesson_resources (
        lesson_id, type, title, content, metadata, order_index, tenant_id, url
      ) VALUES (
        p_lesson_id,
        'assignment',
        COALESCE(p_assignment_payload->>'title', 'Tugas AI'),
        NULL,
        '{}'::jsonb,
        v_order,
        v_tenant_id,
        ''
      );
    END IF;
  END IF;

  -- Mark artifact as applied
  UPDATE public.ai_builder_artifacts
  SET status = 'applied'
  WHERE id = p_artifact_id;

  RETURN v_created_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ai_lesson_artifact(uuid, uuid, jsonb, jsonb, jsonb) TO authenticated;

-- ─── 7. Feature flag seed ────────────────────────────────────────────────────

INSERT INTO public.feature_flags (flag_name, enabled, tenant_ids, rollout_percentage, metadata)
VALUES (
  'ai_course_builder_copilot',
  true,
  '{}'::uuid[],
  0,
  '{"description": "AI Course Builder Copilot drawer in Course Builder"}'::jsonb
)
ON CONFLICT (flag_name) DO NOTHING;
