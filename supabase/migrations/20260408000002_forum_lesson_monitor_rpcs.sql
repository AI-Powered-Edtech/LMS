-- Forum participation + lesson monitor RPCs
-- Adds course-scoped analytics endpoints required by teacher dashboards.

CREATE OR REPLACE FUNCTION public.get_forum_participation(
  p_course_id uuid,
  p_tenant_id uuid,
  p_class_id uuid DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.get_my_tenant_id();
  v_is_authorized boolean := false;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF p_course_id IS NULL THEN
    RAISE EXCEPTION 'Course wajib diisi';
  END IF;

  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant_id THEN
    RAISE EXCEPTION 'Tenant tidak valid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Kursus tidak ditemukan';
  END IF;

  SELECT (
    public.has_role('ADMIN'::public.app_role)
    OR public.has_role('TEACHER'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = p_course_id
        AND c.tenant_id = v_tenant_id
        AND c.created_by = v_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id
        AND ce.user_id = v_user_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
        AND ce.role = 'teacher'
    )
  )
  INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  WITH eligible_students AS (
    SELECT DISTINCT
      e.student_id,
      COALESCE(
        NULLIF(trim(p.full_name), ''),
        NULLIF(trim(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
        p.email,
        'Siswa'
      ) AS student_name
    FROM public.enrollments e
    JOIN public.classes cl
      ON cl.id = e.class_id
    LEFT JOIN public.profiles p
      ON p.id = e.student_id
    WHERE e.tenant_id = v_tenant_id
      AND cl.tenant_id = v_tenant_id
      AND cl.course_id = p_course_id
      AND e.status = 'ACTIVE'
      AND (p_class_id IS NULL OR e.class_id = p_class_id)
  ),
  filtered_discussions AS (
    SELECT
      d.id,
      d.author_id,
      d.parent_id,
      d.created_at
    FROM public.discussions d
    JOIN eligible_students es
      ON es.student_id = d.author_id
    WHERE d.tenant_id = v_tenant_id
      AND d.course_id = p_course_id
      AND d.lesson_id IS NULL
      AND d.announcement_id IS NULL
      AND COALESCE(d.is_deleted, false) = false
      AND (p_date_from IS NULL OR d.created_at >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at < (p_date_to + INTERVAL '1 day'))
  ),
  per_student AS (
    SELECT
      es.student_id,
      es.student_name,
      COUNT(fd.id) FILTER (WHERE fd.parent_id IS NULL)::int AS total_posts,
      COUNT(fd.id) FILTER (WHERE fd.parent_id IS NOT NULL)::int AS total_comments,
      MAX(fd.created_at) AS last_activity,
      COUNT(fd.id)::int AS total_activity
    FROM eligible_students es
    LEFT JOIN filtered_discussions fd
      ON fd.author_id = es.student_id
    GROUP BY es.student_id, es.student_name
  ),
  max_activity AS (
    SELECT COALESCE(MAX(ps.total_activity), 0)::int AS max_total_activity
    FROM per_student ps
  ),
  participants_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'student_id', ps.student_id,
          'student_name', ps.student_name,
          'total_posts', ps.total_posts,
          'total_comments', ps.total_comments,
          'last_activity', ps.last_activity,
          'participation_rate',
            CASE
              WHEN ma.max_total_activity > 0
                THEN ROUND((ps.total_activity::numeric / ma.max_total_activity::numeric) * 100, 1)
              ELSE 0
            END
        )
        ORDER BY ps.total_activity DESC, ps.student_name
      ),
      '[]'::jsonb
    ) AS value
    FROM per_student ps
    CROSS JOIN max_activity ma
  ),
  timeline_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date', t.activity_date::text,
          'posts', t.posts,
          'comments', t.comments,
          'total_activity', t.total_activity
        )
        ORDER BY t.activity_date
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        date_trunc('day', fd.created_at)::date AS activity_date,
        COUNT(fd.id) FILTER (WHERE fd.parent_id IS NULL)::int AS posts,
        COUNT(fd.id) FILTER (WHERE fd.parent_id IS NOT NULL)::int AS comments,
        COUNT(fd.id)::int AS total_activity
      FROM filtered_discussions fd
      GROUP BY 1
      ORDER BY 1
    ) t
  ),
  summary_json AS (
    SELECT jsonb_build_object(
      'total_posts',
        COALESCE((SELECT SUM(CASE WHEN fd.parent_id IS NULL THEN 1 ELSE 0 END)::int FROM filtered_discussions fd), 0),
      'total_comments',
        COALESCE((SELECT SUM(CASE WHEN fd.parent_id IS NOT NULL THEN 1 ELSE 0 END)::int FROM filtered_discussions fd), 0),
      'total_participants',
        COALESCE((SELECT COUNT(*)::int FROM eligible_students), 0),
      'average_participation_rate',
        COALESCE((
          SELECT ROUND(AVG(
            CASE
              WHEN ma.max_total_activity > 0
                THEN (ps.total_activity::numeric / ma.max_total_activity::numeric) * 100
              ELSE 0
            END
          ), 1)
          FROM per_student ps
          CROSS JOIN max_activity ma
        ), 0)
    ) AS value
  )
  SELECT jsonb_build_object(
    'participants', (SELECT value FROM participants_json),
    'timeline', (SELECT value FROM timeline_json),
    'summary', (SELECT value FROM summary_json)
  )
  INTO v_result;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'participants', '[]'::jsonb,
      'timeline', '[]'::jsonb,
      'summary', jsonb_build_object(
        'total_posts', 0,
        'total_comments', 0,
        'total_participants', 0,
        'average_participation_rate', 0
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_forum_participation(uuid, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_forum_participation(uuid, uuid, uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_lesson_progress_monitor(
  p_course_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.get_my_tenant_id();
  v_is_authorized boolean := false;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF p_course_id IS NULL THEN
    RAISE EXCEPTION 'Course wajib diisi';
  END IF;

  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant_id THEN
    RAISE EXCEPTION 'Tenant tidak valid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Kursus tidak ditemukan';
  END IF;

  SELECT (
    public.has_role('ADMIN'::public.app_role)
    OR public.has_role('TEACHER'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = p_course_id
        AND c.tenant_id = v_tenant_id
        AND c.created_by = v_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id
        AND ce.user_id = v_user_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
        AND ce.role = 'teacher'
    )
  )
  INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  WITH course_info AS (
    SELECT c.id AS course_id, c.title AS course_name
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.tenant_id = v_tenant_id
  ),
  students AS (
    SELECT DISTINCT
      s.student_id,
      COALESCE(
        NULLIF(trim(p.full_name), ''),
        NULLIF(trim(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
        p.email,
        'Siswa'
      ) AS student_name
    FROM (
      SELECT ce.user_id AS student_id
      FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
        AND ce.role = 'student'
      UNION
      SELECT e.student_id
      FROM public.enrollments e
      JOIN public.classes cl ON cl.id = e.class_id
      WHERE e.tenant_id = v_tenant_id
        AND cl.tenant_id = v_tenant_id
        AND cl.course_id = p_course_id
        AND e.status = 'ACTIVE'
    ) s
    LEFT JOIN public.profiles p ON p.id = s.student_id
  ),
  lessons_in_course AS (
    SELECT
      l.id AS lesson_id,
      l.title AS lesson_title,
      cm."order" AS module_order,
      l."order" AS lesson_order
    FROM public.lessons l
    JOIN public.course_modules cm
      ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id
      AND cm.tenant_id = v_tenant_id
      AND l.tenant_id = v_tenant_id
  ),
  student_lesson_matrix AS (
    SELECT
      s.student_id,
      s.student_name,
      lic.lesson_id,
      lic.lesson_title,
      ci.course_id,
      ci.course_name
    FROM students s
    CROSS JOIN lessons_in_course lic
    CROSS JOIN course_info ci
  ),
  lesson_progress_data AS (
    SELECT
      lp.user_id AS student_id,
      lp.lesson_id,
      COALESCE(lp.progress_percentage, CASE WHEN lp.completed THEN 100 ELSE 0 END, 0)::numeric AS progress_value,
      COALESCE(lp.completed, false) AS completed,
      lp.completed_at
    FROM public.lesson_progress lp
    JOIN lessons_in_course lic
      ON lic.lesson_id = lp.lesson_id
    WHERE lp.tenant_id = v_tenant_id
  ),
  xapi_data AS (
    SELECT
      xs.actor_id AS student_id,
      xs.object_id AS lesson_id,
      MAX(xs.stored) AS last_activity,
      SUM(
        CASE
          WHEN COALESCE(xs.result->>'duration_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (xs.result->>'duration_seconds')::numeric
          WHEN COALESCE(xs.result->>'time_spent_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (xs.result->>'time_spent_seconds')::numeric
          ELSE 0
        END
      ) / 60.0 AS time_spent_minutes,
      COUNT(*)::int AS activity_count
    FROM public.xapi_statements xs
    JOIN lessons_in_course lic
      ON lic.lesson_id = xs.object_id
    WHERE xs.tenant_id = v_tenant_id
      AND xs.object_type = 'lesson'
    GROUP BY xs.actor_id, xs.object_id
  ),
  student_lesson_data AS (
    SELECT
      m.student_id,
      m.student_name,
      m.lesson_id,
      m.lesson_title,
      m.course_id,
      m.course_name,
      COALESCE(lpd.progress_value, 0)::numeric AS progress_value,
      COALESCE(lpd.completed, false) AS completed,
      COALESCE(xd.time_spent_minutes, 0)::numeric AS time_spent_minutes,
      COALESCE(xd.last_activity, lpd.completed_at, now() - INTERVAL '365 days') AS last_activity
    FROM student_lesson_matrix m
    LEFT JOIN lesson_progress_data lpd
      ON lpd.student_id = m.student_id
     AND lpd.lesson_id = m.lesson_id
    LEFT JOIN xapi_data xd
      ON xd.student_id = m.student_id
     AND xd.lesson_id = m.lesson_id
  ),
  student_rollup AS (
    SELECT
      sld.student_id,
      sld.student_name,
      ROUND(AVG(sld.progress_value), 1)::numeric AS progress,
      ROUND(SUM(sld.time_spent_minutes), 1)::numeric AS time_spent,
      MAX(sld.last_activity) AS last_activity
    FROM student_lesson_data sld
    GROUP BY sld.student_id, sld.student_name
  ),
  student_current_lesson AS (
    SELECT ranked.student_id, ranked.lesson_title
    FROM (
      SELECT
        sld.student_id,
        sld.lesson_title,
        sld.last_activity,
        sld.progress_value,
        ROW_NUMBER() OVER (
          PARTITION BY sld.student_id
          ORDER BY sld.last_activity DESC, sld.progress_value DESC, sld.lesson_title
        ) AS rn
      FROM student_lesson_data sld
    ) ranked
    WHERE ranked.rn = 1
  ),
  student_activity AS (
    SELECT
      sr.student_id,
      sr.student_name,
      scl.lesson_title AS current_lesson,
      sr.progress,
      sr.time_spent,
      sr.last_activity,
      CASE
        WHEN sr.last_activity >= now() - INTERVAL '5 minutes' THEN 'active'
        WHEN sr.last_activity >= now() - INTERVAL '15 minutes' THEN 'idle'
        ELSE 'inactive'
      END AS status
    FROM student_rollup sr
    LEFT JOIN student_current_lesson scl
      ON scl.student_id = sr.student_id
  ),
  live_progress_rows AS (
    SELECT
      sld.lesson_id,
      sld.lesson_title,
      MIN(sld.course_id) AS course_id,
      MIN(sld.course_name) AS course_name,
      COUNT(*)::int AS total_students,
      COUNT(*) FILTER (WHERE sld.completed OR sld.progress_value >= 100)::int AS completed_students,
      COUNT(*) FILTER (
        WHERE sld.progress_value > 0
          AND sld.progress_value < 100
          AND NOT sld.completed
      )::int AS in_progress_students,
      COUNT(*) FILTER (WHERE sld.progress_value = 0 AND NOT sld.completed)::int AS not_started_students,
      ROUND(AVG(sld.progress_value), 1)::numeric AS average_progress,
      ROUND(AVG(sld.time_spent_minutes), 1)::numeric AS average_time_spent
    FROM student_lesson_data sld
    GROUP BY sld.lesson_id, sld.lesson_title
  ),
  timeline_source AS (
    SELECT
      xs.id::text AS event_id,
      xs.actor_id AS student_id,
      COALESCE(
        NULLIF(trim(p.full_name), ''),
        NULLIF(trim(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
        p.email,
        'Siswa'
      ) AS student_name,
      lic.lesson_id,
      lic.lesson_title,
      xs.verb,
      xs.stored
    FROM public.xapi_statements xs
    JOIN lessons_in_course lic
      ON lic.lesson_id = xs.object_id
    JOIN students st
      ON st.student_id = xs.actor_id
    LEFT JOIN public.profiles p
      ON p.id = xs.actor_id
    WHERE xs.tenant_id = v_tenant_id
      AND xs.object_type = 'lesson'
    ORDER BY xs.stored DESC
    LIMIT 50
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE sa.status = 'active')::int AS total_active_students,
      COALESCE((SELECT COUNT(*)::int FROM live_progress_rows lpr WHERE lpr.in_progress_students > 0), 0) AS total_lessons_in_progress,
      COUNT(*) FILTER (
        WHERE sa.status = 'inactive'
          OR (sa.progress < 30 AND sa.time_spent > 10)
      )::int AS students_needing_help,
      ROUND(COALESCE(AVG(sa.progress), 0), 1)::numeric AS average_completion_rate
    FROM student_activity sa
  )
  SELECT jsonb_build_object(
    'liveProgress',
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'lessonId', lpr.lesson_id,
            'lessonTitle', lpr.lesson_title,
            'courseId', lpr.course_id,
            'courseName', lpr.course_name,
            'totalStudents', lpr.total_students,
            'completedStudents', lpr.completed_students,
            'inProgressStudents', lpr.in_progress_students,
            'notStartedStudents', lpr.not_started_students,
            'averageProgress', lpr.average_progress,
            'averageTimeSpent', lpr.average_time_spent
          )
          ORDER BY lpr.lesson_title
        )
        FROM live_progress_rows lpr
      ), '[]'::jsonb),
    'studentActivity',
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'studentId', sa.student_id,
            'studentName', sa.student_name,
            'currentLesson', sa.current_lesson,
            'progress', sa.progress,
            'timeSpent', sa.time_spent,
            'lastActivity', sa.last_activity,
            'status', sa.status,
            'alerts',
              CASE
                WHEN sa.status = 'inactive' THEN jsonb_build_array('inactive')
                WHEN sa.progress < 30 AND sa.time_spent > 10 THEN jsonb_build_array('stuck')
                ELSE '[]'::jsonb
              END
          )
          ORDER BY sa.student_name
        )
        FROM student_activity sa
      ), '[]'::jsonb),
    'timeline',
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ts.event_id,
            'studentId', ts.student_id,
            'studentName', ts.student_name,
            'eventType',
              CASE
                WHEN lower(ts.verb) LIKE '%complete%' THEN 'completed'
                WHEN lower(ts.verb) LIKE '%start%' OR lower(ts.verb) LIKE '%initialize%' THEN 'started'
                WHEN lower(ts.verb) LIKE '%stuck%' THEN 'stuck'
                ELSE 'helped'
              END,
            'lessonId', ts.lesson_id,
            'lessonTitle', ts.lesson_title,
            'timestamp', ts.stored
          )
          ORDER BY ts.stored DESC
        )
        FROM timeline_source ts
      ), '[]'::jsonb),
    'summary',
      COALESCE((
        SELECT jsonb_build_object(
          'totalActiveStudents', s.total_active_students,
          'totalLessonsInProgress', s.total_lessons_in_progress,
          'studentsNeedingHelp', s.students_needing_help,
          'averageCompletionRate', s.average_completion_rate
        )
        FROM summary s
      ), jsonb_build_object(
        'totalActiveStudents', 0,
        'totalLessonsInProgress', 0,
        'studentsNeedingHelp', 0,
        'averageCompletionRate', 0
      ))
  )
  INTO v_result;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'liveProgress', '[]'::jsonb,
      'studentActivity', '[]'::jsonb,
      'timeline', '[]'::jsonb,
      'summary', jsonb_build_object(
        'totalActiveStudents', 0,
        'totalLessonsInProgress', 0,
        'studentsNeedingHelp', 0,
        'averageCompletionRate', 0
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_progress_monitor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_progress_monitor(uuid, uuid) TO authenticated;
