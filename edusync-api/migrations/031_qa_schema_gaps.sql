-- 031_qa_schema_gaps.sql
-- Create tables that the frontend expects but were missing from the baseline
-- schema. Before this migration, POST /api/v1/data/<table> returned 404 for
-- these, and the services silently swallowed the error -> empty-state with
-- no toast and no data. This migration seeds the minimal column set that the
-- frontend services already read/write today.

BEGIN;

-- content_templates -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('course','module','lesson')),
    title       TEXT NOT NULL,
    description TEXT,
    content     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_templates_tenant_type_idx
    ON public.content_templates (tenant_id, type, created_at DESC);

-- course_versions --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL,
    course_id      UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    commit_message TEXT,
    snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by     UUID NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, version_number)
);
CREATE INDEX IF NOT EXISTS course_versions_course_idx
    ON public.course_versions (tenant_id, course_id, version_number DESC);

-- course_action_logs -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_action_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id     UUID,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'publish','unpublish','submit_review','approve',
        'restore_version','add_collaborator','remove_collaborator','archive'
    )),
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_action_logs_course_idx
    ON public.course_action_logs (tenant_id, course_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id_from_course()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.courses
        WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_auto_tenant_course_action_logs ON public.course_action_logs;
CREATE TRIGGER trg_auto_tenant_course_action_logs
    BEFORE INSERT ON public.course_action_logs
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_course();

DROP TRIGGER IF EXISTS trg_auto_tenant_course_versions ON public.course_versions;
CREATE TRIGGER trg_auto_tenant_course_versions
    BEFORE INSERT ON public.course_versions
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_course();

-- peer_review_config -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.peer_review_config (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    assignment_id       UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    reviews_per_student INTEGER NOT NULL DEFAULT 2 CHECK (reviews_per_student BETWEEN 1 AND 10),
    is_anonymous        BOOLEAN NOT NULL DEFAULT TRUE,
    rubric_id           UUID,
    weight_in_grade     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight_in_grade BETWEEN 0 AND 100),
    status              TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','open','closed','completed')),
    due_date            TIMESTAMPTZ,
    created_by          UUID NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id)
);
CREATE INDEX IF NOT EXISTS peer_review_config_tenant_idx
    ON public.peer_review_config (tenant_id, status);

-- peer_reviews -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.peer_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    config_id       UUID NOT NULL REFERENCES public.peer_review_config(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL,
    submission_id   UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','in_progress','submitted','cancelled')),
    overall_score   NUMERIC(5,2),
    overall_comment TEXT,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (config_id, reviewer_id, submission_id)
);
CREATE INDEX IF NOT EXISTS peer_reviews_reviewer_idx
    ON public.peer_reviews (tenant_id, reviewer_id, status);
CREATE INDEX IF NOT EXISTS peer_reviews_submission_idx
    ON public.peer_reviews (tenant_id, submission_id);

COMMIT;
