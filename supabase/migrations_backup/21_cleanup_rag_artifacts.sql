-- RAG Cleanup Migration
-- Drops legacy vector infrastructure safely and idempotently

DROP TABLE IF EXISTS lesson_resource_chunks CASCADE;
DROP TABLE IF EXISTS embedding_jobs CASCADE;

DROP FUNCTION IF EXISTS match_course_chunks CASCADE;
DROP FUNCTION IF EXISTS match_course_chunks_with_concepts CASCADE;
DROP FUNCTION IF EXISTS enqueue_embedding_job CASCADE;

DROP EXTENSION IF EXISTS vector CASCADE;
