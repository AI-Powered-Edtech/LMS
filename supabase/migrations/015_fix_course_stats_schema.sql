-- Fix course_stats table schema if it's missing columns from an older baseline
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'total_enrolled') THEN
        ALTER TABLE public.course_stats ADD COLUMN total_enrolled INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'active_students') THEN
        ALTER TABLE public.course_stats ADD COLUMN active_students INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'avg_progress') THEN
        ALTER TABLE public.course_stats ADD COLUMN avg_progress NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'avg_quiz_score') THEN
        ALTER TABLE public.course_stats ADD COLUMN avg_quiz_score NUMERIC DEFAULT 0;
    END IF;
    
    -- Add other potential missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'lesson_completion_rate') THEN
        ALTER TABLE public.course_stats ADD COLUMN lesson_completion_rate NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'quiz_pass_rate') THEN
        ALTER TABLE public.course_stats ADD COLUMN quiz_pass_rate NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_stats' AND column_name = 'at_risk_count') THEN
        ALTER TABLE public.course_stats ADD COLUMN at_risk_count INTEGER DEFAULT 0;
    END IF;
END $$;
