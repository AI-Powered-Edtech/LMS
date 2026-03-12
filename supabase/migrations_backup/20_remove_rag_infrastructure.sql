-- ==========================================================================
-- Migration: 20_remove_rag_infrastructure
--
-- Safely removes deprecated components from the old RAG architecture.
-- Follows Lead Architect's guardrail: 
-- "JANGAN DROP ai_tutor_cache dulu... DROP yang lain."
-- ==========================================================================

-- ─── 1. Drop Functions ───
DROP FUNCTION IF EXISTS public.match_course_chunks_with_concepts(uuid, vector, float, int, uuid[]);
DROP FUNCTION IF EXISTS public.match_course_chunks(vector, float, int, uuid);
DROP FUNCTION IF EXISTS public.enqueue_embedding_job(uuid, text, text);

-- ─── 2. Drop Tables ───
-- Note: ai_tutor_cache is PRESERVED as per instructions.

DROP TABLE IF EXISTS public.lesson_resource_chunks CASCADE;
DROP TABLE IF EXISTS public.embedding_jobs CASCADE;

-- ─── 3. Cleanup Triggers/Extensions (Optional/Defensive) ───
-- We keep pgvector extension as it might be used by other future features, 
-- but we remove the specific RAG triggers if any existed on lesson_resources.
-- (Based on audit, there were no specific RAG triggers on lesson_resources except for FTS ones we just added).
