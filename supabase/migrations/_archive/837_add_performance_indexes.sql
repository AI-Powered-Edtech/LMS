-- 837_add_performance_indexes.sql
-- Corrected: 2026-03-21 (fixed wrong column/table names from initial version)
-- Initial version used: student_id on xp_transactions (wrong), lesson_completions (non-existent),
-- quiz_attempts (wrong table), student_id on course_enrollments (wrong), student_id on student_badges (wrong)

-- xp_transactions: compound user+time index for time-window XP queries per user
-- (existing idx_xp_tx_user covers tenant+user; this adds time ordering for per-user time-window queries)
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created
  ON xp_transactions(user_id, created_at DESC);

-- quiz_attempts_v2: student's recent attempts ordered by time
-- (existing idx_quiz_attempts_v2_student_quiz covers student+quiz+status; this adds time ordering)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_v2_student_created
  ON quiz_attempts_v2(student_id, started_at DESC);

-- course_enrollments: student's enrolled courses
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course
  ON course_enrollments(user_id, course_id);

-- learning_events: per-user time-ordered events for activity feeds
-- (existing idx_learning_events_tenant_user lacks time; this adds it)
CREATE INDEX IF NOT EXISTS idx_learning_events_user_created
  ON learning_events(user_id, created_at DESC);

-- student_lesson_signals: lookup by user for streak/progress queries
-- (table uses user_id, not student_id; lesson_completions does not exist)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_student_lesson_signals_user_completed
    ON student_lesson_signals(user_id, is_completed, completed_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- student_badges: user badges ordered by earn date (for badge showcase sorting)
-- Extends existing idx_student_badges_user by adding earned_at ordering
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_student_badges_user_earned
    ON student_badges(user_id, earned_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- student_predictions: churn risk lookup per user+course
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_student_predictions_user_course
    ON student_predictions(user_id, course_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
