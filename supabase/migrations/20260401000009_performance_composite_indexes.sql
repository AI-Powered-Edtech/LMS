-- =============================================================
-- EduSync LMS — Performance Optimization: Composite Indexes
-- =============================================================
-- This migration adds composite indexes to cover frequent 
-- multi-column filtering and sorting patterns.
-- =============================================================

-- 1. Courses list (tenant + sort by date)
CREATE INDEX IF NOT EXISTS idx_courses_tenant_created_at 
  ON public.courses (tenant_id, created_at DESC);

-- 2. Activity & Learning Events (tenant + recent history)
-- Accelerates analytics RPCs and live activity feeds
CREATE INDEX IF NOT EXISTS idx_activity_events_tenant_created_at
  ON public.activity_events (tenant_id, created_at DESC);

DO $$ 
BEGIN
    -- Handle schema differences between baseline and archived migrations for learning_events
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_events' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_learning_events_tenant_created_at ON public.learning_events (tenant_id, created_at DESC);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_events' AND column_name = 'timestamp') THEN
        CREATE INDEX IF NOT EXISTS idx_learning_events_tenant_timestamp ON public.learning_events (tenant_id, "timestamp" DESC);
    END IF;
END $$;

-- 3. Enrollment checks (tenant + class + status)
-- Covers join checks and pre-flight deletion checks
-- Correcting table name to 'enrollments' and column to 'class_id' based on schema
CREATE INDEX IF NOT EXISTS idx_enrollments_lookup
  ON public.enrollments (tenant_id, class_id, status);

-- 4. Content Analytics
-- Accelerates get_lesson_analytics and get_student_signals RPCs
CREATE INDEX IF NOT EXISTS idx_student_lesson_signals_lookup
  ON public.student_lesson_signals (tenant_id, lesson_id);

-- 5. Discussion/Forum (tenant + course + sort)
-- Correcting table name to 'discussions' based on schema
CREATE INDEX IF NOT EXISTS idx_discussions_tenant_course
  ON public.discussions (tenant_id, course_id, created_at DESC);
