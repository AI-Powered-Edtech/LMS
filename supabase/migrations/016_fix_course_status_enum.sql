-- Fix course_status enum if it's missing values from an older baseline
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'course_status' AND e.enumlabel = 'in_review') THEN
        ALTER TYPE public.course_status ADD VALUE 'in_review';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'course_status' AND e.enumlabel = 'archived') THEN
        ALTER TYPE public.course_status ADD VALUE 'archived';
    END IF;
END $$;
