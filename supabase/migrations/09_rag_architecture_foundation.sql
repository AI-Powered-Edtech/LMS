-- ==============================================================================
-- Migration: 09_rag_architecture_foundation
-- Description: Phase 2 AI Tutor Retrieval-Augmented Generation schema.
-- Enables pgvector, creates chunk tables, embedding job queues, and search RPC.
-- ==============================================================================

-- ─── 1. Vector Extension ───
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 2. Lesson Resource Chunks Table ───
-- Stores chunked embedded text from lesson resources.
CREATE TABLE IF NOT EXISTS lesson_resource_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hierarchical references for RLS and strict filtering
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES lesson_resources(id) ON DELETE CASCADE,
  
  content_type text NOT NULL, -- e.g., 'text', 'transcript', 'summary'
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  
  -- Context Packing Budget Control
  token_count int NOT NULL,
  CONSTRAINT chunk_size_limit CHECK (token_count <= 600),

  -- Extensibility for tags, difficulty, etc.
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Vector embedding (Assume 768 dimensions for Google models e.g. text-embedding-004)
  embedding vector(768) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- ─── 3. Chunk Indexes ───

-- Essential for RLS and isolated semantic searches
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_course 
ON lesson_resource_chunks (tenant_id, course_id);

-- Used for lesson proximity boost
CREATE INDEX IF NOT EXISTS idx_chunks_lesson 
ON lesson_resource_chunks (lesson_id);

-- HNSW Vector Index optimized for recall and graph quality
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON lesson_resource_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);


-- ─── 4. Embedding Job Queue Table ───
-- Safely decouples database triggers from slow LLM/Network embedding operations
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES lesson_resources(id) ON DELETE CASCADE,
  
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts int DEFAULT 0,
  error_message text,
  
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Fast lookup for background workers polling the queue
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status 
ON embedding_jobs (status, created_at);


-- ─── 5. Automatic Ingestion Trigger ───
-- Automatically enqueue embedding jobs when a lesson_resource is created or updated
CREATE OR REPLACE FUNCTION enqueue_embedding_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We only enqueue if content has changed (for updates) or it's a new insert
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.content IS DISTINCT FROM OLD.content) THEN
    INSERT INTO embedding_jobs (tenant_id, resource_id, status)
    VALUES (NEW.tenant_id, NEW.id, 'pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enqueue_embedding_job ON lesson_resources;
CREATE TRIGGER trigger_enqueue_embedding_job
  AFTER INSERT OR UPDATE ON lesson_resources
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_embedding_job();


-- ─── 6. RAG Retrieval RPC (match_course_chunks_with_concepts) ───
-- Performs semantic search with exact-lesson proximity boosting AND concept metadata boosting
CREATE OR REPLACE FUNCTION match_course_chunks_with_concepts(
  p_tenant_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  query_embedding vector(768),
  p_concepts text[] DEFAULT '{}'::text[],
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 12
)
RETURNS TABLE (
  chunk_id uuid,
  lesson_id uuid,
  chunk_text text,
  token_count int,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lrc.id,
    lrc.lesson_id,
    lrc.chunk_text,
    lrc.token_count,
    lrc.metadata,
    
    -- Calculate Cosine Similarity (1 - Cosine Distance) 
    -- and ADD proximity boost if chunk belongs to the CURRENT lesson
    -- and ADD concept boost if chunk concepts overlaps with student question concepts
    (
      1 - (lrc.embedding <=> query_embedding)
      +
      CASE
        WHEN lrc.lesson_id = p_lesson_id THEN 0.05
        ELSE 0
      END
      +
      CASE
        WHEN lrc.metadata->'concepts' ?| p_concepts THEN 0.07 
        ELSE 0 
      END
    ) AS similarity

  FROM lesson_resource_chunks lrc

  WHERE lrc.tenant_id = p_tenant_id
    AND lrc.course_id = p_course_id
    -- Ensure the BASE similarity passes the threshold before boosting
    AND (1 - (lrc.embedding <=> query_embedding)) > match_threshold

  -- Sort by Final Score/Similarity descending
  ORDER BY similarity DESC

  LIMIT match_count;
END;
$$;


-- ─── 7. Student Knowledge Modeling (Concept Mastery) ───
-- Tracks a student's mastery level for individual concepts.
CREATE TABLE IF NOT EXISTS student_concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  concept text NOT NULL,
  mastery float DEFAULT 0.5 CHECK (mastery >= 0.0 AND mastery <= 1.0),
  confidence float DEFAULT 0.5,
  
  last_updated timestamptz DEFAULT now()
);

-- Fast lookup for a student's mastery profile within a course
CREATE INDEX IF NOT EXISTS idx_student_concept_mastery 
ON student_concept_mastery (student_id, course_id);


-- ─── 8. Semantic Answer Cache (Optimization Layer) ───
-- Caches generative answers based on the semantic similarity of the question
-- Drastically reduces LLM API costs for repeated/common questions.
CREATE TABLE IF NOT EXISTS ai_tutor_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  question_text text NOT NULL,
  question_embedding vector(768) NOT NULL,
  answer text NOT NULL,
  
  hit_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_hit_at timestamptz DEFAULT now()
);

-- HNSW Vector Index specifically for fast cache matching
CREATE INDEX IF NOT EXISTS idx_ai_tutor_cache_embedding
ON ai_tutor_cache
USING hnsw (question_embedding vector_cosine_ops);


-- ─── 9. Row Level Security (RLS) ───

-- Enable RLS
ALTER TABLE lesson_resource_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_cache ENABLE ROW LEVEL SECURITY;

-- Tenants/Admins can manage chunks within their tenant
CREATE POLICY "Tenants manage chunks"
  ON lesson_resource_chunks
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()) OR
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Students can read chunks if they are enrolled in the course
CREATE POLICY "Students read enrolled course chunks"
  ON lesson_resource_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = lesson_resource_chunks.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Tenants/Admins manage embedding jobs
CREATE POLICY "Tenants manage embedding jobs"
  ON embedding_jobs
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()) OR
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Students can read their own concept mastery
CREATE POLICY "Students read own mastery"
  ON student_concept_mastery
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Edge Functions (Service Role) handles updates/inserts, so no extra policy needed for writes.
-- Tenants/Admins can manage student_concept_mastery
CREATE POLICY "Tenants manage concept mastery"
  ON student_concept_mastery
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()) OR
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Students can read shared cached answers for their course
CREATE POLICY "Students read course cache"
  ON ai_tutor_cache
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = ai_tutor_cache.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );
  
-- Admins/edge function can write to cache
CREATE POLICY "Tenants manage cache"
  ON ai_tutor_cache
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()) OR
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );
