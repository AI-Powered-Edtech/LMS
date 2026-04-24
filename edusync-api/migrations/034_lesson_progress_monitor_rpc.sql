-- 034_lesson_progress_monitor_rpc.sql
-- Adds get_lesson_progress_monitor RPC used by teacher LessonMonitor page.
-- Returns JSON matching LessonMonitorData on the frontend.
-- Gotcha #1: must RETURN JSON to be accepted by VIL RPC resolver.
-- Schema used:
--   lesson_progress (user_id, lesson_id, tenant_id, status, progress_percentage,
--                    completed, completed_at)
--   lessons (id, module_id, title, "order", tenant_id)
--   course_modules (id, course_id, title, "order", tenant_id)
--   courses (id, title, tenant_id)
--   course_enrollments (course_id, user_id, tenant_id, enrolled_at, role, status)
--   profiles (id, full_name, email)

CREATE OR REPLACE FUNCTION public.get_lesson_progress_monitor(
    p_course_id UUID,
    p_tenant_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_live_progress   JSON;
    v_student_act     JSON;
    v_timeline        JSON;
    v_total_active    INT;
    v_total_in_prog   INT;
    v_need_help       INT;
    v_avg_complete    NUMERIC;
BEGIN
    -- liveProgress: one card per lesson in the course
    SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.module_order NULLS LAST, x.lesson_order NULLS LAST), '[]'::json)
      INTO v_live_progress
    FROM (
        SELECT
            l.id::text                                               AS "lessonId",
            l.title                                                  AS "lessonTitle",
            c.id::text                                               AS "courseId",
            c.title                                                  AS "courseName",
            COALESCE(ce_counts.total_students, 0)                    AS "totalStudents",
            COALESCE(lp_stats.completed_students, 0)                 AS "completedStudents",
            COALESCE(lp_stats.in_progress_students, 0)               AS "inProgressStudents",
            GREATEST(
                COALESCE(ce_counts.total_students, 0)
                  - COALESCE(lp_stats.completed_students, 0)
                  - COALESCE(lp_stats.in_progress_students, 0),
                0
            )                                                        AS "notStartedStudents",
            COALESCE(lp_stats.avg_progress, 0)::numeric              AS "averageProgress",
            0::numeric                                               AS "averageTimeSpent",
            m."order"                                                AS module_order,
            l."order"                                                AS lesson_order
        FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        JOIN public.courses c        ON c.id = m.course_id
        LEFT JOIN (
            SELECT ce.course_id, COUNT(DISTINCT ce.user_id) AS total_students
            FROM public.course_enrollments ce
            WHERE ce.course_id = p_course_id
              AND ce.tenant_id = p_tenant_id
            GROUP BY ce.course_id
        ) ce_counts ON ce_counts.course_id = c.id
        LEFT JOIN (
            SELECT
                lp.lesson_id,
                COUNT(*) FILTER (WHERE lp.status = 'completed' OR lp.completed = TRUE)   AS completed_students,
                COUNT(*) FILTER (WHERE lp.status = 'in_progress')                         AS in_progress_students,
                AVG(COALESCE(lp.progress_percentage, 0))                                  AS avg_progress
            FROM public.lesson_progress lp
            WHERE lp.tenant_id = p_tenant_id
            GROUP BY lp.lesson_id
        ) lp_stats ON lp_stats.lesson_id = l.id
        WHERE c.id = p_course_id
          AND c.tenant_id = p_tenant_id
    ) x;

    -- studentActivity: latest per-student snapshot
    SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
      INTO v_student_act
    FROM (
        SELECT
            u.id::text                                              AS "studentId",
            COALESCE(u.full_name, u.email, u.id::text)              AS "studentName",
            latest.lesson_title                                     AS "currentLesson",
            COALESCE(latest.progress_percentage, 0)::numeric        AS "progress",
            0::numeric                                              AS "timeSpent",
            COALESCE(latest.last_activity, ce.enrolled_at, NOW())   AS "lastActivity",
            CASE
                WHEN latest.last_activity IS NULL                                        THEN 'inactive'
                WHEN latest.last_activity > NOW() - INTERVAL '15 minutes'                 THEN 'active'
                WHEN latest.last_activity > NOW() - INTERVAL '2 hours'                    THEN 'idle'
                ELSE 'inactive'
            END                                                     AS "status",
            '[]'::json                                              AS "alerts"
        FROM public.course_enrollments ce
        JOIN public.profiles u ON u.id = ce.user_id
        LEFT JOIN LATERAL (
            SELECT
                l.title                                               AS lesson_title,
                lp.progress_percentage,
                lp.completed_at                                        AS last_activity
            FROM public.lesson_progress lp
            JOIN public.lessons l ON l.id = lp.lesson_id
            JOIN public.course_modules m ON m.id = l.module_id
            WHERE lp.user_id = ce.user_id
              AND lp.tenant_id = p_tenant_id
              AND m.course_id = p_course_id
            ORDER BY lp.completed_at DESC NULLS LAST
            LIMIT 1
        ) latest ON TRUE
        WHERE ce.course_id = p_course_id
          AND ce.tenant_id = p_tenant_id
          AND COALESCE(ce.role, 'student') = 'student'
        LIMIT 200
    ) x;

    -- timeline: last 50 recorded progress events
    SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json)
      INTO v_timeline
    FROM (
        SELECT
            lp.id::text                                             AS "id",
            u.id::text                                              AS "studentId",
            COALESCE(u.full_name, u.email, u.id::text)              AS "studentName",
            CASE
                WHEN lp.completed = TRUE OR lp.status = 'completed' THEN 'completed'
                ELSE 'started'
            END                                                     AS "eventType",
            l.id::text                                              AS "lessonId",
            l.title                                                 AS "lessonTitle",
            COALESCE(lp.completed_at, NOW())                        AS "timestamp",
            NULL::text                                              AS "details"
        FROM public.lesson_progress lp
        JOIN public.profiles u ON u.id = lp.user_id
        JOIN public.lessons l  ON l.id = lp.lesson_id
        JOIN public.course_modules m ON m.id = l.module_id
        WHERE m.course_id = p_course_id
          AND lp.tenant_id = p_tenant_id
        ORDER BY lp.completed_at DESC NULLS LAST
        LIMIT 50
    ) x;

    -- summary aggregates
    SELECT
        COALESCE(SUM(CASE WHEN lp.completed_at > NOW() - INTERVAL '15 minutes' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN lp.status = 'in_progress' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(lp.progress_percentage, 0) < 30
                           AND COALESCE(lp.completed_at, NOW() - INTERVAL '1 year') < NOW() - INTERVAL '30 minutes'
                           AND lp.status <> 'completed'
                           AND COALESCE(lp.completed, FALSE) = FALSE
                          THEN 1 ELSE 0 END), 0),
        COALESCE(AVG(CASE WHEN lp.status = 'completed' OR lp.completed = TRUE
                          THEN 100
                          ELSE COALESCE(lp.progress_percentage, 0) END), 0)
    INTO v_total_active, v_total_in_prog, v_need_help, v_avg_complete
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND lp.tenant_id = p_tenant_id;

    RETURN json_build_object(
        'liveProgress',    v_live_progress,
        'studentActivity', v_student_act,
        'timeline',        v_timeline,
        'summary', json_build_object(
            'totalActiveStudents',    v_total_active,
            'totalLessonsInProgress', v_total_in_prog,
            'studentsNeedingHelp',    v_need_help,
            'averageCompletionRate',  ROUND(COALESCE(v_avg_complete, 0), 2)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lesson_progress_monitor(UUID, UUID) TO PUBLIC;
