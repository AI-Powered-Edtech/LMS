-- ============================================================
-- EduSync LMS
-- Question Bank Migration
-- Version: 1.0
-- ============================================================

SET search_path = public;

-- ============================================================
-- 1. QUESTION BANK TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS question_bank (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL REFERENCES tenants(id),

    subject_id UUID,
    topic_id UUID,

    question_type TEXT NOT NULL,

    question_text TEXT NOT NULL,

    explanation TEXT,

    difficulty_level INTEGER DEFAULT 3,

    source TEXT DEFAULT 'manual',

    created_by UUID REFERENCES profiles(id),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    is_archived BOOLEAN DEFAULT FALSE
);


-- ============================================================
-- 2. QUESTION OPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS question_options (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL
    REFERENCES question_bank(id)
    ON DELETE CASCADE,

    option_text TEXT NOT NULL,

    is_correct BOOLEAN DEFAULT FALSE,

    order_index INTEGER DEFAULT 0
);


-- ============================================================
-- 3. QUESTION TAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS question_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL
    REFERENCES question_bank(id)
    ON DELETE CASCADE,

    tag TEXT NOT NULL
);


-- ============================================================
-- 4. QUESTION USAGE TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS question_bank_usage (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL
    REFERENCES question_bank(id)
    ON DELETE CASCADE,

    quiz_id UUID NOT NULL
    REFERENCES quizzes(id)
    ON DELETE CASCADE,

    tenant_id UUID NOT NULL,

    used_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 5. QUESTION ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS question_stats (

    question_id UUID PRIMARY KEY
    REFERENCES question_bank(id)
    ON DELETE CASCADE,

    total_answers INTEGER DEFAULT 0,

    correct_answers INTEGER DEFAULT 0,

    difficulty_index NUMERIC DEFAULT 0,

    discrimination_index NUMERIC DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 6. AI GENERATION METADATA
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_generation_metadata (

    question_id UUID
    REFERENCES question_bank(id)
    ON DELETE CASCADE,

    model TEXT,

    prompt TEXT,

    generation_cost NUMERIC DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 7. LESSON CHUNKS FOR RAG
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_chunks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    lesson_id UUID,

    content TEXT NOT NULL,

    embedding extensions.vector(1536)
);


-- ============================================================
-- 8. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_question_bank_tenant
ON question_bank(tenant_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_topic
ON question_bank(topic_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_type
ON question_bank(question_type);

CREATE INDEX IF NOT EXISTS idx_question_options_question
ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_question_tags_question
ON question_tags(question_id);

CREATE INDEX IF NOT EXISTS idx_question_usage_question
ON question_bank_usage(question_id);

CREATE INDEX IF NOT EXISTS idx_question_usage_quiz
ON question_bank_usage(quiz_id);

CREATE INDEX IF NOT EXISTS idx_question_usage_tenant
ON question_bank_usage(tenant_id);


-- ============================================================
-- 9. VECTOR INDEX (AI SEARCH)
-- ============================================================

-- CREATE INDEX IF NOT EXISTS lesson_chunks_embedding_idx
-- ON lesson_chunks
-- USING hnsw (embedding vector_cosine_ops);


-- ============================================================
-- 10. ENABLE RLS
-- ============================================================

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_metadata ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 11. RLS POLICIES
-- ============================================================

-- QUESTION BANK

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
CREATE POLICY tenant_isolation_question_bank
ON question_bank
FOR ALL
USING (tenant_id = get_my_tenant_id());


-- OPTIONS

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
DROP POLICY IF EXISTS tenant_isolation_question_options ON question_options;
CREATE POLICY tenant_isolation_question_options
ON question_options
FOR ALL
USING (
    question_id IN (
        SELECT id FROM question_bank
        WHERE tenant_id = get_my_tenant_id()
    )
);


-- TAGS

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
DROP POLICY IF EXISTS tenant_isolation_question_tags ON question_tags;
CREATE POLICY tenant_isolation_question_tags
ON question_tags
FOR ALL
USING (
    question_id IN (
        SELECT id FROM question_bank
        WHERE tenant_id = get_my_tenant_id()
    )
);


-- QUESTION USAGE

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
DROP POLICY IF EXISTS tenant_isolation_question_usage ON question_bank_usage;
CREATE POLICY tenant_isolation_question_usage
ON question_bank_usage
FOR ALL
USING (tenant_id = get_my_tenant_id());


-- QUESTION STATS

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
DROP POLICY IF EXISTS tenant_isolation_question_stats ON question_stats;
CREATE POLICY tenant_isolation_question_stats
ON question_stats
FOR ALL
USING (
    question_id IN (
        SELECT id FROM question_bank
        WHERE tenant_id = get_my_tenant_id()
    )
);


-- AI METADATA

DROP POLICY IF EXISTS tenant_isolation_question_bank ON question_bank;
DROP POLICY IF EXISTS tenant_isolation_ai_metadata ON ai_generation_metadata;
CREATE POLICY tenant_isolation_ai_metadata
ON ai_generation_metadata
FOR ALL
USING (
    question_id IN (
        SELECT id FROM question_bank
        WHERE tenant_id = get_my_tenant_id()
    )
);


-- ============================================================
-- 12. TRIGGER: UPDATE TIMESTAMP
-- ============================================================

CREATE OR REPLACE FUNCTION update_question_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = now();

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_question_bank_updated_at ON question_bank;
CREATE TRIGGER trg_question_bank_updated_at
BEFORE UPDATE ON question_bank
FOR EACH ROW
EXECUTE FUNCTION update_question_timestamp();


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
