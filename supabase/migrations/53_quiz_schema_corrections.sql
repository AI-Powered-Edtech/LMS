-- Migration 53: Quiz Schema Corrections
-- 1. Add missing total_points column to quizzes table
-- 2. Ensure all quiz attempts have a valid status and timestamp

-- Add total_points if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'total_points') THEN
        ALTER TABLE public.quizzes ADD COLUMN total_points INTEGER DEFAULT 100;
        COMMENT ON COLUMN public.quizzes.total_points IS 'Sum of points for all questions in this quiz.';
    END IF;
END $$;

-- 2. Fix potential nulls in quiz_attempts for new hardening logic
UPDATE public.quiz_attempts 
SET status = 'ABANDONED'::public.quiz_attempt_status 
WHERE status IS NULL;

-- 3. Ensure last_heartbeat_at exists and is populated for active attempts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_attempts' AND column_name = 'last_heartbeat_at') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN last_heartbeat_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

UPDATE public.quiz_attempts 
SET last_heartbeat_at = started_at 
WHERE last_heartbeat_at IS NULL AND started_at IS NOT NULL;
