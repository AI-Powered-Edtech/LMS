-- Add is_published to quizzes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='is_published') THEN
        ALTER TABLE public.quizzes ADD COLUMN is_published boolean DEFAULT false;
    END IF;
END $$;
