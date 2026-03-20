-- ============================================================
-- SP-12.2b Job 2: aggregate_lesson_analytics()
-- Full rebuild from student_lesson_signals (cheap, small table)
-- Fix: course_id via lessons → course_modules JOIN
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_lesson_analytics()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE aggregation_state
  SET status = 'running', last_run_at = now()
  WHERE job_name = 'lesson_analytics_summary';

  INSERT INTO lesson_analytics_summary (
    lesson_id, tenant_id, course_id,
    total_students, active_students_7d,
    completions, avg_completion_pct, completion_rate,
    avg_time_spent, median_time_spent,
    avg_quiz_score, quiz_pass_rate,
    avg_sessions_per_student, drop_off_rate,
    struggling_students, high_risk_students,
    last_aggregated_at
  )
  SELECT
    s.lesson_id,
    s.tenant_id,
    cm.course_id,
    -- Reach
    COUNT(DISTINCT s.user_id),
    COUNT(DISTINCT s.user_id) FILTER (
      WHERE s.last_accessed_at > now() - interval '7 days'
    ),
    -- Completion
    COUNT(*) FILTER (WHERE s.is_completed),
    AVG(s.completion_pct),
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE s.is_completed))::numeric / COUNT(*) * 100
      ELSE 0
    END,
    -- Time
    AVG(s.total_time_spent)::integer,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.total_time_spent)::integer,
    -- Quiz
    AVG(s.best_quiz_score) FILTER (WHERE s.quiz_attempts > 0),
    CASE WHEN COUNT(*) FILTER (WHERE s.quiz_attempts > 0) > 0
      THEN (COUNT(*) FILTER (WHERE s.quiz_passed))::numeric /
           COUNT(*) FILTER (WHERE s.quiz_attempts > 0) * 100
      ELSE NULL
    END,
    -- Engagement
    AVG(s.session_count),
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (
        WHERE NOT s.is_completed AND s.total_time_spent > 0
      ))::numeric / COUNT(*) * 100
      ELSE 0
    END,
    -- Struggle
    COUNT(*) FILTER (WHERE s.struggle_score >= 3),
    COUNT(*) FILTER (WHERE s.struggle_score >= 5),
    now()
  FROM student_lesson_signals s
  JOIN lessons l ON l.id = s.lesson_id
  JOIN course_modules cm ON cm.id = l.module_id
  GROUP BY s.lesson_id, s.tenant_id, cm.course_id
  ON CONFLICT (lesson_id) DO UPDATE SET
    tenant_id            = EXCLUDED.tenant_id,
    course_id            = EXCLUDED.course_id,
    total_students       = EXCLUDED.total_students,
    active_students_7d   = EXCLUDED.active_students_7d,
    completions          = EXCLUDED.completions,
    avg_completion_pct   = EXCLUDED.avg_completion_pct,
    completion_rate      = EXCLUDED.completion_rate,
    avg_time_spent       = EXCLUDED.avg_time_spent,
    median_time_spent    = EXCLUDED.median_time_spent,
    avg_quiz_score       = EXCLUDED.avg_quiz_score,
    quiz_pass_rate       = EXCLUDED.quiz_pass_rate,
    avg_sessions_per_student = EXCLUDED.avg_sessions_per_student,
    drop_off_rate        = EXCLUDED.drop_off_rate,
    struggling_students  = EXCLUDED.struggling_students,
    high_risk_students   = EXCLUDED.high_risk_students,
    last_aggregated_at   = now();

  UPDATE aggregation_state SET
    status = 'idle',
    last_run_at = now()
  WHERE job_name = 'lesson_analytics_summary';
END;
$$;


-- ============================================================
-- SP-12.2b Job 3: aggregate_course_analytics()
-- Rollup from lesson_analytics_summary
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_course_analytics()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO course_analytics_summary (
    course_id, tenant_id,
    total_students, active_students_7d,
    avg_completion_pct, avg_quiz_score,
    total_lessons, struggling_students,
    last_aggregated_at
  )
  SELECT
    las.course_id,
    las.tenant_id,
    -- total_students: distinct users across all lessons in course
    (SELECT COUNT(DISTINCT s.user_id)
     FROM student_lesson_signals s
     JOIN lessons l2 ON l2.id = s.lesson_id
     JOIN course_modules cm2 ON cm2.id = l2.module_id
     WHERE cm2.course_id = las.course_id),
    -- active_students_7d
    (SELECT COUNT(DISTINCT s.user_id)
     FROM student_lesson_signals s
     JOIN lessons l2 ON l2.id = s.lesson_id
     JOIN course_modules cm2 ON cm2.id = l2.module_id
     WHERE cm2.course_id = las.course_id
       AND s.last_accessed_at > now() - interval '7 days'),
    AVG(las.avg_completion_pct),
    AVG(las.avg_quiz_score),
    COUNT(*),
    -- struggling: distinct users with struggle_score >= 3 in this course
    (SELECT COUNT(DISTINCT s.user_id)
     FROM student_lesson_signals s
     JOIN lessons l2 ON l2.id = s.lesson_id
     JOIN course_modules cm2 ON cm2.id = l2.module_id
     WHERE cm2.course_id = las.course_id
       AND s.struggle_score >= 3),
    now()
  FROM lesson_analytics_summary las
  WHERE las.course_id IS NOT NULL
  GROUP BY las.course_id, las.tenant_id
  ON CONFLICT (course_id) DO UPDATE SET
    tenant_id          = EXCLUDED.tenant_id,
    total_students     = EXCLUDED.total_students,
    active_students_7d = EXCLUDED.active_students_7d,
    avg_completion_pct = EXCLUDED.avg_completion_pct,
    avg_quiz_score     = EXCLUDED.avg_quiz_score,
    total_lessons      = EXCLUDED.total_lessons,
    struggling_students= EXCLUDED.struggling_students,
    last_aggregated_at = now();

  UPDATE aggregation_state SET
    status = 'idle',
    last_run_at = now()
  WHERE job_name = 'course_analytics_summary';
END;
$$;


-- ============================================================
-- SP-12.2b: pg_cron Schedule
-- :00 → student signals, :01 → lesson summary, :02 → course summary
-- ============================================================

SELECT cron.schedule(
  'agg-student-signals',
  '*/5 * * * *',
  'SELECT aggregate_student_lesson_signals()'
);

SELECT cron.schedule(
  'agg-lesson-summary',
  '1-59/5 * * * *',
  'SELECT aggregate_lesson_analytics()'
);

SELECT cron.schedule(
  'agg-course-summary',
  '2-59/5 * * * *',
  'SELECT aggregate_course_analytics()'
);
