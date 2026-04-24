-- 032_qa_rpcs.sql
-- RPCs for tables introduced in 031_qa_schema_gaps.sql.
-- All functions RETURN JSON (VIL resolver tolak RETURNS TABLE).
-- Guard: hanya teacher/admin yang boleh nulis ke 3 RPC course-level;
-- assign_peer_reviews juga khusus teacher/admin.

BEGIN;

-- ── save_course_version ─────────────────────────────────────────────────
-- Snapshot struktur course (module + lesson) ke course_versions.
-- Return JSON { id, version_number, created_at }.
CREATE OR REPLACE FUNCTION public.save_course_version(
    p_course_id UUID,
    p_message   TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_user        UUID := public.current_user_id();
    v_role        TEXT := public.current_user_role();
    v_tenant      UUID;
    v_next_ver    INTEGER;
    v_snapshot    JSONB;
    v_row         public.course_versions%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF v_role NOT IN ('teacher','admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_ROLE' USING ERRCODE = '42501';
    END IF;

    SELECT tenant_id INTO v_tenant FROM public.courses WHERE id = p_course_id;
    IF v_tenant IS NULL THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO v_next_ver
      FROM public.course_versions
     WHERE course_id = p_course_id;

    SELECT COALESCE(
        jsonb_build_object(
            'modules',
            COALESCE(jsonb_agg(m ORDER BY m->>'order'), '[]'::jsonb)
        ),
        jsonb_build_object('modules', '[]'::jsonb)
    )
      INTO v_snapshot
      FROM (
        SELECT jsonb_build_object(
                   'id',      cm.id,
                   'title',   cm.title,
                   'order',   cm."order",
                   'lessons', COALESCE(
                       (SELECT jsonb_agg(
                                 jsonb_build_object(
                                   'id',           l.id,
                                   'title',        l.title,
                                   'order',        l."order",
                                   'is_published', COALESCE(l.is_published, FALSE)
                                 )
                                 ORDER BY l."order"
                               )
                          FROM public.lessons l
                         WHERE l.module_id = cm.id),
                       '[]'::jsonb
                   )
               ) AS m
          FROM public.course_modules cm
         WHERE cm.course_id = p_course_id
      ) sub;

    INSERT INTO public.course_versions (
        tenant_id, course_id, version_number, commit_message, snapshot, created_by
    ) VALUES (
        v_tenant, p_course_id, v_next_ver, p_message, v_snapshot, v_user
    )
    RETURNING * INTO v_row;

    RETURN json_build_object(
        'id',             v_row.id,
        'course_id',      v_row.course_id,
        'version_number', v_row.version_number,
        'commit_message', v_row.commit_message,
        'created_at',     v_row.created_at,
        'created_by',     v_row.created_by,
        'tenant_id',      v_row.tenant_id
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.save_course_version(UUID, TEXT) TO PUBLIC;

-- ── save_content_template ───────────────────────────────────────────────
-- Bikin template baru dari course/module/lesson yang sudah ada.
CREATE OR REPLACE FUNCTION public.save_content_template(
    p_type        TEXT,
    p_title       TEXT,
    p_description TEXT,
    p_source_id   UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_user    UUID := public.current_user_id();
    v_role    TEXT := public.current_user_role();
    v_tenant  UUID;
    v_content JSONB := '{}'::jsonb;
    v_row     public.content_templates%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF v_role NOT IN ('teacher','admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_ROLE' USING ERRCODE = '42501';
    END IF;
    IF p_type NOT IN ('course','module','lesson') THEN
        RAISE EXCEPTION 'INVALID_TEMPLATE_TYPE' USING ERRCODE = 'P0001';
    END IF;

    IF p_type = 'course' THEN
        SELECT tenant_id,
               jsonb_build_object(
                   'course', to_jsonb(c.*),
                   'modules', COALESCE((
                       SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id',      cm.id,
                                    'title',   cm.title,
                                    'order',   cm."order",
                                    'lessons', COALESCE(
                                        (SELECT jsonb_agg(to_jsonb(l.*) ORDER BY l."order")
                                           FROM public.lessons l
                                          WHERE l.module_id = cm.id),
                                        '[]'::jsonb)
                                )
                                ORDER BY cm."order"
                              )
                         FROM public.course_modules cm
                        WHERE cm.course_id = c.id
                   ), '[]'::jsonb)
               )
          INTO v_tenant, v_content
          FROM public.courses c
         WHERE c.id = p_source_id;
    ELSIF p_type = 'module' THEN
        SELECT cm.tenant_id,
               jsonb_build_object(
                   'module', to_jsonb(cm.*),
                   'lessons', COALESCE(
                       (SELECT jsonb_agg(to_jsonb(l.*) ORDER BY l."order")
                          FROM public.lessons l
                         WHERE l.module_id = cm.id),
                       '[]'::jsonb)
               )
          INTO v_tenant, v_content
          FROM public.course_modules cm
         WHERE cm.id = p_source_id;
    ELSE -- lesson
        SELECT l.tenant_id, jsonb_build_object('lesson', to_jsonb(l.*))
          INTO v_tenant, v_content
          FROM public.lessons l
         WHERE l.id = p_source_id;
    END IF;

    IF v_tenant IS NULL THEN
        RAISE EXCEPTION 'SOURCE_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.content_templates (
        tenant_id, type, title, description, content, created_by
    ) VALUES (
        v_tenant, p_type, p_title, p_description, v_content, v_user
    )
    RETURNING * INTO v_row;

    RETURN json_build_object(
        'id',          v_row.id,
        'tenant_id',   v_row.tenant_id,
        'type',        v_row.type,
        'title',       v_row.title,
        'description', v_row.description,
        'created_at',  v_row.created_at,
        'created_by',  v_row.created_by
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.save_content_template(TEXT, TEXT, TEXT, UUID) TO PUBLIC;

-- ── import_content_template ─────────────────────────────────────────────
-- Import template ke course/module target. Return ringkasan.
CREATE OR REPLACE FUNCTION public.import_content_template(
    p_template_id UUID,
    p_target_id   UUID,
    p_order       INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_user      UUID := public.current_user_id();
    v_role      TEXT := public.current_user_role();
    v_template  public.content_templates%ROWTYPE;
    v_tenant    UUID;
    v_new_id    UUID;
    v_order     INTEGER := COALESCE(p_order, 0);
    v_count     INTEGER := 0;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF v_role NOT IN ('teacher','admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_ROLE' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_template FROM public.content_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'TEMPLATE_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    IF v_template.type = 'lesson' THEN
        SELECT tenant_id INTO v_tenant FROM public.course_modules WHERE id = p_target_id;
        IF v_tenant IS NULL THEN
            RAISE EXCEPTION 'TARGET_MODULE_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO public.lessons (
            module_id, title, content, "order", tenant_id, type, is_published
        ) VALUES (
            p_target_id,
            COALESCE(v_template.content->'lesson'->>'title', v_template.title),
            v_template.content->'lesson'->>'content',
            v_order,
            v_tenant,
            COALESCE(v_template.content->'lesson'->>'type', 'article'),
            FALSE
        ) RETURNING id INTO v_new_id;
        v_count := 1;
    ELSIF v_template.type = 'module' THEN
        SELECT tenant_id INTO v_tenant FROM public.courses WHERE id = p_target_id;
        IF v_tenant IS NULL THEN
            RAISE EXCEPTION 'TARGET_COURSE_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO public.course_modules (course_id, title, "order", tenant_id)
        VALUES (
            p_target_id,
            COALESCE(v_template.content->'module'->>'title', v_template.title),
            v_order,
            v_tenant
        ) RETURNING id INTO v_new_id;

        INSERT INTO public.lessons (module_id, title, content, "order", tenant_id, type, is_published)
        SELECT v_new_id,
               COALESCE(l->>'title', 'Untitled'),
               l->>'content',
               COALESCE((l->>'order')::int, 0),
               v_tenant,
               COALESCE(l->>'type', 'article'),
               FALSE
          FROM jsonb_array_elements(COALESCE(v_template.content->'lessons', '[]'::jsonb)) l;
        v_count := 1 + (SELECT COUNT(*)
                          FROM jsonb_array_elements(COALESCE(v_template.content->'lessons', '[]'::jsonb)));
    ELSE -- course template: target is course_id; seed modules+lessons into it
        SELECT tenant_id INTO v_tenant FROM public.courses WHERE id = p_target_id;
        IF v_tenant IS NULL THEN
            RAISE EXCEPTION 'TARGET_COURSE_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;
        WITH mods AS (
            SELECT m, ROW_NUMBER() OVER () + v_order AS ord
              FROM jsonb_array_elements(COALESCE(v_template.content->'modules', '[]'::jsonb)) m
        ), new_mods AS (
            INSERT INTO public.course_modules (course_id, title, "order", tenant_id)
            SELECT p_target_id,
                   COALESCE(m->>'title', 'Untitled'),
                   ord,
                   v_tenant
              FROM mods
            RETURNING id, "order"
        )
        SELECT COUNT(*) INTO v_count FROM new_mods;
        v_new_id := p_target_id;
    END IF;

    RETURN json_build_object(
        'new_id', v_new_id,
        'inserted_count', v_count,
        'template_type', v_template.type
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.import_content_template(UUID, UUID, INTEGER) TO PUBLIC;

-- ── assign_peer_reviews ─────────────────────────────────────────────────
-- Random-assign reviewer ke submission SUBMITTED untuk assignment terkait.
-- Return total baris baru peer_reviews yang dibuat.
CREATE OR REPLACE FUNCTION public.assign_peer_reviews(
    p_config_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_user          UUID := public.current_user_id();
    v_role          TEXT := public.current_user_role();
    v_config        public.peer_review_config%ROWTYPE;
    v_reviews_per   INTEGER;
    v_total         INTEGER := 0;
    v_inserted      INTEGER := 0;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF v_role NOT IN ('teacher','admin') THEN
        RAISE EXCEPTION 'FORBIDDEN_ROLE' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_config FROM public.peer_review_config WHERE id = p_config_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PEER_REVIEW_CONFIG_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    v_reviews_per := GREATEST(1, COALESCE(v_config.reviews_per_student, 2));

    -- Pool submission SUBMITTED untuk assignment ini.
    WITH submissions AS (
        SELECT s.id AS submission_id, s.student_id
          FROM public.assignment_submissions s
         WHERE s.assignment_id = v_config.assignment_id
           AND s.tenant_id    = v_config.tenant_id
           AND s.status       = 'SUBMITTED'::submission_status
    ),
    reviewers AS (
        SELECT DISTINCT student_id FROM submissions
    ),
    -- Untuk tiap submission, ambil v_reviews_per reviewer acak ≠ author.
    pairs AS (
        SELECT sub.submission_id,
               r.student_id AS reviewer_id,
               ROW_NUMBER() OVER (
                   PARTITION BY sub.submission_id ORDER BY random()
               ) AS rn
          FROM submissions sub
          JOIN reviewers   r ON r.student_id <> sub.student_id
    ),
    picked AS (
        SELECT submission_id, reviewer_id
          FROM pairs
         WHERE rn <= v_reviews_per
    ),
    inserted AS (
        INSERT INTO public.peer_reviews (
            tenant_id, config_id, reviewer_id, submission_id, status
        )
        SELECT v_config.tenant_id, v_config.id, p.reviewer_id, p.submission_id, 'pending'
          FROM picked p
        ON CONFLICT (config_id, reviewer_id, submission_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted FROM inserted;

    SELECT COUNT(*) INTO v_total
      FROM public.peer_reviews
     WHERE config_id = v_config.id;

    UPDATE public.peer_review_config
       SET status = 'open'
     WHERE id = v_config.id
       AND status = 'draft';

    RETURN json_build_object(
        'config_id',       v_config.id,
        'inserted_count',  v_inserted,
        'total_reviews',   v_total,
        'reviews_per_student', v_reviews_per
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.assign_peer_reviews(UUID) TO PUBLIC;

COMMIT;
