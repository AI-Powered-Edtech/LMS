-- Migration 59: Fix quiz_answers unique constraint for ON CONFLICT
-- This enables idempotent answers within a quiz attempt

-- 1. Remove any potential duplicates before adding the constraint
-- This keeps the LATEST answer for each question in an attempt
DELETE FROM public.quiz_answers a
USING public.quiz_answers b
WHERE a.id < b.id
  AND a.attempt_id = b.attempt_id
  AND a.question_id = b.question_id;

-- 2. Add the missing unique constraint
-- The submit_quiz_attempt RPC requires this for its ON CONFLICT clause
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quiz_answers_attempt_id_question_id_key'
    ) THEN
        ALTER TABLE public.quiz_answers
        ADD CONSTRAINT quiz_answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);
    END IF;
END $$;
