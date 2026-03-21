-- ============================================================
-- SP-12.2a: Analytics Aggregation Tables
-- 4 tables: student_lesson_signals, lesson_analytics_summary,
--           course_analytics_summary, aggregation_state
-- ============================================================

-- 1. student_lesson_signals — per user + lesson grain
CREATE TABLE student_lesson_signals (
  user_id            uuid NOT NULL,
  lesson_id          uuid NOT NULL,
  tenant_id          uuid NOT NULL,

  -- Engagement signals
  session_count      integer DEFAULT 0,
  total_time_spent   integer DEFAULT 0,       -- seconds (derived from session duration)
  first_accessed_at  timestamptz,
  last_accessed_at   timestamptz,

  -- Progress signals
  blocks_viewed      integer DEFAULT 0,
  blocks_total       integer DEFAULT 0,
  completion_pct     numeric(5,2) DEFAULT 0,  -- 0.00 to 100.00
  is_completed       boolean DEFAULT false,
  completed_at       timestamptz,

  -- Video signals
  video_replays      integer DEFAULT 0,       -- rewind count
  max_video_pct      numeric(5,2) DEFAULT 0,  -- highest % reached

  -- Quiz signals
  quiz_attempts      integer DEFAULT 0,
  best_quiz_score    numeric(5,2),
  latest_quiz_score  numeric(5,2),
  quiz_passed        boolean DEFAULT false,

  -- Struggle detection (SP-13 merged)
  struggle_score     integer DEFAULT 0,

  -- Bookkeeping
  last_aggregated_at timestamptz DEFAULT now(),

  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_sls_tenant_lesson
  ON student_lesson_signals (tenant_id, lesson_id);
CREATE INDEX idx_sls_tenant_user
  ON student_lesson_signals (tenant_id, user_id);
CREATE INDEX idx_sls_struggle
  ON student_lesson_signals (tenant_id, struggle_score DESC)
  WHERE struggle_score >= 3;

ALTER TABLE student_lesson_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON student_lesson_signals
  USING (tenant_id = get_my_tenant_id());


-- 2. lesson_analytics_summary — per lesson grain
CREATE TABLE lesson_analytics_summary (
  lesson_id            uuid PRIMARY KEY,
  tenant_id            uuid NOT NULL,
  course_id            uuid,

  -- Reach
  total_students       integer DEFAULT 0,
  active_students_7d   integer DEFAULT 0,

  -- Completion
  completions          integer DEFAULT 0,
  avg_completion_pct   numeric(5,2) DEFAULT 0,
  completion_rate      numeric(5,2) DEFAULT 0,

  -- Time
  avg_time_spent       integer DEFAULT 0,       -- seconds
  median_time_spent    integer DEFAULT 0,

  -- Quiz
  avg_quiz_score       numeric(5,2),
  quiz_pass_rate       numeric(5,2),

  -- Engagement
  avg_sessions_per_student numeric(5,2) DEFAULT 1,
  drop_off_rate        numeric(5,2) DEFAULT 0,

  -- Struggle
  struggling_students  integer DEFAULT 0,
  high_risk_students   integer DEFAULT 0,

  last_aggregated_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_las_tenant
  ON lesson_analytics_summary (tenant_id);
CREATE INDEX idx_las_course
  ON lesson_analytics_summary (tenant_id, course_id);

ALTER TABLE lesson_analytics_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON lesson_analytics_summary
  USING (tenant_id = get_my_tenant_id());


-- 3. course_analytics_summary — per course grain
CREATE TABLE course_analytics_summary (
  course_id            uuid PRIMARY KEY,
  tenant_id            uuid NOT NULL,

  total_students       integer DEFAULT 0,
  active_students_7d   integer DEFAULT 0,
  avg_completion_pct   numeric(5,2) DEFAULT 0,
  avg_quiz_score       numeric(5,2),
  total_lessons        integer DEFAULT 0,
  struggling_students  integer DEFAULT 0,

  last_aggregated_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_cas_tenant ON course_analytics_summary (tenant_id);

ALTER TABLE course_analytics_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON course_analytics_summary
  USING (tenant_id = get_my_tenant_id());


-- 4. aggregation_state — watermark tracking
CREATE TABLE aggregation_state (
  job_name         text PRIMARY KEY,
  last_processed   timestamptz NOT NULL DEFAULT '1970-01-01',
  last_run_at      timestamptz DEFAULT now(),
  events_processed integer DEFAULT 0,
  status           text DEFAULT 'idle'
);

INSERT INTO aggregation_state (job_name, last_processed) VALUES
  ('student_lesson_signals', '1970-01-01'),
  ('lesson_analytics_summary', '1970-01-01'),
  ('course_analytics_summary', '1970-01-01')
ON CONFLICT (job_name) DO NOTHING;
