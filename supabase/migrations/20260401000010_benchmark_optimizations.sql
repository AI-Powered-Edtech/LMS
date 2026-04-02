-- Migration for Performance Optimizations based on Benchmark
-- Added on 2026-04-01

-- 1. Indexing for Dashboard (courses filter by status & created_at)
CREATE INDEX IF NOT EXISTS idx_courses_status_created_at ON public.courses (status, created_at DESC);

-- 2. Indexing for Quiz Engine (quiz questions by course/quiz)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions (quiz_id);

-- 3. Indexing for Gradebook (quiz attempts sort by date)
-- Using the underlying table 'quiz_attempts_v2' as 'quiz_attempts' is a view
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_v2_submitted_at ON public.quiz_attempts_v2 (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_v2_student_submitted ON public.quiz_attempts_v2 (student_id, submitted_at DESC);

-- 4. Materialized View for Teacher Analytics to avoid heavy aggregations on each load
-- (Only created if it doesn't exist yet or drop/create logic)
DROP MATERIALIZED VIEW IF EXISTS mv_teacher_analytics;

CREATE MATERIALIZED VIEW mv_teacher_analytics AS
SELECT 
    c.id as course_id,
    c.tenant_id,
    c.title,
    c.status,
    COUNT(DISTINCT e.student_id) as total_students,
    COUNT(DISTINCT qa.id) as total_attempts,
    AVG(qa.score) as average_score
FROM 
    public.courses c
LEFT JOIN 
    public.enrollments e ON c.id = (SELECT course_id FROM public.classes WHERE id = e.class_id) AND e.status = 'ACTIVE'
LEFT JOIN 
    public.quizzes q ON c.id = q.course_id
LEFT JOIN 
    public.quiz_attempts_v2 qa ON q.id = qa.quiz_id AND qa.status = 'submitted'
GROUP BY 
    c.id, c.tenant_id, c.title, c.status;

-- Index for the Materialized View
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_teacher_analytics_course_id ON mv_teacher_analytics(course_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_teacher_analytics_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_analytics;
END;
$$;
