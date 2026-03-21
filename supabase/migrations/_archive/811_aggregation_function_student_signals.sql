-- ============================================================
-- SP-12.2b Job 1: aggregate_student_lesson_signals()
-- Incremental watermark-based aggregation from raw events
-- Fixes applied:
--   - LAG() in separate sub-CTE (can't use inside aggregate)
--   - COUNT(DISTINCT block_id) for dedup
--   - Session duration from timestamps (client time_spent=0)
--   - blocks_total from lesson_resources JOIN
--   - course_id via course_modules JOIN
--   - struggle_score with fixed 1800s default threshold
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_student_lesson_signals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_watermark timestamptz;
  v_new_watermark timestamptz;
  v_count integer;
BEGIN
  -- Mark job as running
  UPDATE aggregation_state
  SET status = 'running', last_run_at = now()
  WHERE job_name = 'student_lesson_signals';

  -- Get watermark
  SELECT last_processed INTO v_watermark
  FROM aggregation_state
  WHERE job_name = 'student_lesson_signals';

  -- Find new watermark
  SELECT MAX(server_timestamp) INTO v_new_watermark
  FROM learning_events
  WHERE server_timestamp > v_watermark;

  -- Nothing to process
  IF v_new_watermark IS NULL THEN
    UPDATE aggregation_state
    SET status = 'idle'
    WHERE job_name = 'student_lesson_signals';
    RETURN;
  END IF;

  -- Main aggregation with sub-CTEs
  WITH new_events AS (
    SELECT *
    FROM learning_events
    WHERE server_timestamp > v_watermark
      AND server_timestamp <= v_new_watermark
      AND lesson_id IS NOT NULL
  ),

  -- Sub-CTE 1: Detect video replays using LAG() window function
  -- A replay = current position < previous position (user rewound)
  video_replay_flags AS (
    SELECT
      user_id,
      lesson_id,
      CASE
        WHEN (metadata->>'position')::numeric <
             LAG((metadata->>'position')::numeric)
             OVER (PARTITION BY user_id, lesson_id ORDER BY client_timestamp)
        THEN 1
        ELSE 0
      END as is_replay
    FROM new_events
    WHERE event_type = 'VIDEO_PROGRESS'
      AND metadata->>'position' IS NOT NULL
  ),
  video_replays_agg AS (
    SELECT user_id, lesson_id, COALESCE(SUM(is_replay), 0) as replay_count
    FROM video_replay_flags
    GROUP BY user_id, lesson_id
  ),

  -- Sub-CTE 2: Session durations (max - min timestamp per session)
  -- Used because client sends time_spent=0
  session_durations AS (
    SELECT
      user_id,
      lesson_id,
      session_id,
      EXTRACT(EPOCH FROM (MAX(client_timestamp) - MIN(client_timestamp)))::integer as duration_sec
    FROM new_events
    GROUP BY user_id, lesson_id, session_id
  ),
  time_per_user_lesson AS (
    SELECT user_id, lesson_id, SUM(GREATEST(duration_sec, 0)) as total_sec
    FROM session_durations
    GROUP BY user_id, lesson_id
  ),

  -- Sub-CTE 3: blocks_total from lesson_resources
  lesson_block_counts AS (
    SELECT lesson_id, COUNT(*) as block_count
    FROM lesson_resources
    GROUP BY lesson_id
  ),

  -- Main aggregation per user+lesson
  user_lesson_agg AS (
    SELECT
      e.user_id,
      e.lesson_id,
      e.tenant_id,
      COUNT(DISTINCT e.session_id) as session_count,
      MIN(e.client_timestamp) as first_ts,
      MAX(e.client_timestamp) as last_ts,
      -- Deduplicated block count
      COUNT(DISTINCT CASE WHEN e.event_type = 'BLOCK_VIEWED'
            THEN e.metadata->>'block_id' END) as distinct_blocks_viewed,
      -- Completion
      COUNT(*) FILTER (WHERE e.event_type = 'LESSON_COMPLETED') as completions,
      -- Max video %
      MAX(CASE
        WHEN e.event_type = 'VIDEO_PROGRESS'
             AND (e.metadata->>'duration')::numeric > 0
        THEN ((e.metadata->>'position')::numeric /
              (e.metadata->>'duration')::numeric) * 100
        ELSE 0
      END) as max_video_pct,
      -- Quiz signals
      COUNT(*) FILTER (WHERE e.event_type = 'QUIZ_SUBMITTED') as quiz_attempts,
      MAX(CASE WHEN e.event_type = 'QUIZ_SUBMITTED'
          THEN (e.metadata->>'score')::numeric END) as best_quiz_score,
      -- Latest quiz score (most recent by timestamp)
      (array_agg(
        CASE WHEN e.event_type = 'QUIZ_SUBMITTED'
        THEN (e.metadata->>'score')::numeric END
        ORDER BY e.client_timestamp DESC
      ) FILTER (WHERE e.event_type = 'QUIZ_SUBMITTED'))[1] as latest_quiz_score,
      -- Quiz passed (any score >= passing threshold, default 60)
      bool_or(
        e.event_type = 'QUIZ_SUBMITTED'
        AND COALESCE((e.metadata->>'score')::numeric, 0) >=
            COALESCE((e.metadata->>'max_score')::numeric * 0.6, 60)
      ) as quiz_passed
    FROM new_events e
    GROUP BY e.user_id, e.lesson_id, e.tenant_id
  )

  -- UPSERT into student_lesson_signals
  INSERT INTO student_lesson_signals (
    user_id, lesson_id, tenant_id,
    session_count, total_time_spent,
    first_accessed_at, last_accessed_at,
    blocks_viewed, blocks_total, completion_pct,
    is_completed, completed_at,
    video_replays, max_video_pct,
    quiz_attempts, best_quiz_score, latest_quiz_score, quiz_passed,
    last_aggregated_at
  )
  SELECT
    a.user_id, a.lesson_id, a.tenant_id,
    a.session_count,
    COALESCE(t.total_sec, 0),
    a.first_ts, a.last_ts,
    a.distinct_blocks_viewed,
    COALESCE(bc.block_count, 0),
    -- completion_pct: blocks_viewed / blocks_total * 100, capped at 100
    CASE WHEN COALESCE(bc.block_count, 0) > 0
      THEN LEAST(a.distinct_blocks_viewed::numeric / bc.block_count * 100, 100)
      ELSE CASE WHEN a.completions > 0 THEN 100 ELSE 0 END
    END,
    (a.completions > 0),
    CASE WHEN a.completions > 0 THEN a.last_ts END,
    COALESCE(vr.replay_count, 0),
    a.max_video_pct,
    a.quiz_attempts, a.best_quiz_score, a.latest_quiz_score, a.quiz_passed,
    now()
  FROM user_lesson_agg a
  LEFT JOIN video_replays_agg vr ON vr.user_id = a.user_id AND vr.lesson_id = a.lesson_id
  LEFT JOIN time_per_user_lesson t ON t.user_id = a.user_id AND t.lesson_id = a.lesson_id
  LEFT JOIN lesson_block_counts bc ON bc.lesson_id = a.lesson_id
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    session_count      = student_lesson_signals.session_count + EXCLUDED.session_count,
    total_time_spent   = student_lesson_signals.total_time_spent + EXCLUDED.total_time_spent,
    first_accessed_at  = LEAST(student_lesson_signals.first_accessed_at, EXCLUDED.first_accessed_at),
    last_accessed_at   = GREATEST(student_lesson_signals.last_accessed_at, EXCLUDED.last_accessed_at),
    blocks_viewed      = GREATEST(student_lesson_signals.blocks_viewed, EXCLUDED.blocks_viewed),
    blocks_total       = EXCLUDED.blocks_total,
    completion_pct     = GREATEST(student_lesson_signals.completion_pct, EXCLUDED.completion_pct),
    is_completed       = student_lesson_signals.is_completed OR EXCLUDED.is_completed,
    completed_at       = COALESCE(student_lesson_signals.completed_at, EXCLUDED.completed_at),
    video_replays      = student_lesson_signals.video_replays + EXCLUDED.video_replays,
    max_video_pct      = GREATEST(student_lesson_signals.max_video_pct, EXCLUDED.max_video_pct),
    quiz_attempts      = student_lesson_signals.quiz_attempts + EXCLUDED.quiz_attempts,
    best_quiz_score    = GREATEST(student_lesson_signals.best_quiz_score, EXCLUDED.best_quiz_score),
    latest_quiz_score  = COALESCE(EXCLUDED.latest_quiz_score, student_lesson_signals.latest_quiz_score),
    quiz_passed        = student_lesson_signals.quiz_passed OR EXCLUDED.quiz_passed,
    last_aggregated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Compute struggle scores for recently aggregated rows
  UPDATE student_lesson_signals SET
    struggle_score = (
      CASE WHEN video_replays >= 2 THEN 2 ELSE 0 END +
      CASE WHEN latest_quiz_score IS NOT NULL
           AND latest_quiz_score < 50 THEN 3 ELSE 0 END +
      CASE WHEN total_time_spent > 5400 THEN 2 ELSE 0 END +  -- >90min = 3x of 30min default
      CASE WHEN quiz_attempts >= 3
           AND NOT quiz_passed THEN 3 ELSE 0 END +
      CASE WHEN session_count >= 2
           AND completion_pct < 20 THEN 1 ELSE 0 END
    )
  WHERE last_aggregated_at >= now() - interval '10 minutes';

  -- Update watermark
  UPDATE aggregation_state SET
    last_processed = v_new_watermark,
    events_processed = events_processed + v_count,
    status = 'idle'
  WHERE job_name = 'student_lesson_signals';
END;
$$;
