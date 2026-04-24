-- 058_ai_polish.sql
-- Fase 6 Units 41-48: AI polish — schema scaffolding only
--
-- AUTHORITATIVE: AI providers = Groq (latency) + Anthropic Sonnet (quality)
-- per runbook §2. This migration adds the persistence layer; the LLM call
-- code lives in src/services/ai (FE) and edusync-api/crates/services (BE).

-- 41 — AuthoringAssist drafts: AI suggestions while editing a course/lesson.
CREATE TABLE IF NOT EXISTS public.authoring_assist_drafts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    author_id       UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type     TEXT         NOT NULL CHECK (target_type IN ('course', 'lesson', 'quiz', 'assignment')),
    target_id       UUID         NOT NULL,
    prompt          TEXT         NOT NULL,
    response        TEXT,
    provider        TEXT,                         -- 'groq', 'anthropic'
    model           TEXT,
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    accepted        BOOLEAN,                      -- did the author keep the suggestion?
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authoring_assist_target
    ON public.authoring_assist_drafts(target_type, target_id);

-- 42 — SpeedGrader AI scoring suggestions for assignment submissions.
CREATE TABLE IF NOT EXISTS public.speedgrader_suggestions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    rubric_json     JSONB,                        -- per-criteria scores
    suggested_score NUMERIC(5,2),
    suggested_feedback TEXT,
    teacher_accepted BOOLEAN,
    teacher_score   NUMERIC(5,2),
    teacher_feedback TEXT,
    provider        TEXT,
    model           TEXT,
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (submission_id)
);

-- 44 — Plagiarism reports (real, replacing the stub from gap-analysis §C).
-- The existing plagiarism_checks table stores results; add report metadata.
ALTER TABLE public.plagiarism_checks
    ADD COLUMN IF NOT EXISTS embedding_model TEXT,
    ADD COLUMN IF NOT EXISTS comparison_corpus_size INTEGER,
    ADD COLUMN IF NOT EXISTS top_match_submission_id UUID,
    ADD COLUMN IF NOT EXISTS top_match_similarity NUMERIC(5,2);

-- 45 — Principal narrative monthly insight.
CREATE TABLE IF NOT EXISTS public.principal_insights (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    month           DATE         NOT NULL,        -- YYYY-MM-01
    narrative       TEXT         NOT NULL,
    key_metrics     JSONB,
    provider        TEXT,
    model           TEXT,
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, month)
);

-- 46 — Parent weekly digest (AI-summarized).
CREATE TABLE IF NOT EXISTS public.parent_weekly_digests (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_start      DATE         NOT NULL,        -- Monday
    summary         TEXT         NOT NULL,
    activity_json   JSONB,                        -- raw input data for the summary
    sent_via        TEXT[],                       -- ['email', 'whatsapp']
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id, week_start)
);

-- 47 — Toxic content moderation.
CREATE TABLE IF NOT EXISTS public.moderation_classifications (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_type     TEXT         NOT NULL,        -- 'forum_post', 'comment', 'announcement'
    target_id       UUID         NOT NULL,
    classifier      TEXT         NOT NULL,        -- model identifier
    is_toxic        BOOLEAN      NOT NULL,
    confidence      NUMERIC(4,3),
    categories      TEXT[],                       -- ['hate', 'sexual', 'self_harm', ...]
    classified_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_target
    ON public.moderation_classifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_toxic
    ON public.moderation_classifications(tenant_id) WHERE is_toxic = true;

-- 48 — Semantic search index (cross-module).
CREATE TABLE IF NOT EXISTS public.semantic_search_index (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    source_type     TEXT         NOT NULL,        -- 'lesson', 'announcement', 'forum_post', 'rapor', ...
    source_id       UUID         NOT NULL,
    title           TEXT,
    snippet         TEXT,
    embedding       VECTOR(1536),                 -- pgvector
    indexed_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id)
);

-- pgvector index — ivfflat for cosine similarity on 1536-d vectors.
CREATE INDEX IF NOT EXISTS idx_semantic_search_embedding
    ON public.semantic_search_index
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
