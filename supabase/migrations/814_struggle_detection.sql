-- ============================================================
-- SP-13a: Struggle Detection & Alerts
-- Adjustments from spec:
--   - threshold_medium/high: INT (0-11 scale, not 0.0-1.0 FLOAT)
--   - struggle_score in alerts: INT (matches student_lesson_signals)
--   - Role guard: has_role('TEACHER') OR has_role('ADMIN')
--   - Re-alert delta: +1 (integer, not +0.1)
--   - tenants table: confirmed as 'tenants'
-- ============================================================

CREATE TABLE IF NOT EXISTS public.struggle_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  threshold_medium        INT NOT NULL DEFAULT 3,
  threshold_high          INT NOT NULL DEFAULT 5,
  notification_enabled    BOOLEAN NOT NULL DEFAULT true,
  student_prompt_enabled  BOOLEAN NOT NULL DEFAULT true,
  cooldown_hours          INT NOT NULL DEFAULT 24,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE INDEX idx_struggle_config_tenant ON struggle_config(tenant_id);

ALTER TABLE public.struggle_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.struggle_config
  FOR ALL USING (tenant_id = get_my_tenant_id());

INSERT INTO public.struggle_config (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;


CREATE TABLE IF NOT EXISTS public.struggle_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  teacher_id    UUID NOT NULL,
  student_id    UUID NOT NULL,
  lesson_id     UUID NOT NULL REFERENCES lessons(id),
  course_id     UUID NOT NULL REFERENCES courses(id),
  struggle_score INT NOT NULL,
  severity      TEXT NOT NULL CHECK (severity IN ('medium', 'high')),
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, teacher_id, student_id, lesson_id)
);

CREATE INDEX idx_struggle_alerts_teacher
  ON struggle_alerts(tenant_id, teacher_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.struggle_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_alerts" ON public.struggle_alerts
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND teacher_id = auth.uid()
  );


CREATE OR REPLACE FUNCTION public.get_struggle_config()
RETURNS TABLE (
  threshold_medium        INT,
  threshold_high          INT,
  notification_enabled    BOOLEAN,
  student_prompt_enabled  BOOLEAN,
  cooldown_hours          INT
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sc.threshold_medium, sc.threshold_high, sc.notification_enabled,
         sc.student_prompt_enabled, sc.cooldown_hours
  FROM struggle_config sc
  WHERE sc.tenant_id = get_my_tenant_id();
$$;


CREATE OR REPLACE FUNCTION public.update_struggle_config(
  p_threshold_medium      INT DEFAULT NULL,
  p_threshold_high        INT DEFAULT NULL,
  p_notification_enabled  BOOLEAN DEFAULT NULL,
  p_student_prompt_enabled BOOLEAN DEFAULT NULL,
  p_cooldown_hours        INT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only teachers and admins can update struggle config';
  END IF;

  INSERT INTO struggle_config (tenant_id, threshold_medium, threshold_high,
    notification_enabled, student_prompt_enabled, cooldown_hours)
  VALUES (
    get_my_tenant_id(),
    COALESCE(p_threshold_medium, 3),
    COALESCE(p_threshold_high, 5),
    COALESCE(p_notification_enabled, true),
    COALESCE(p_student_prompt_enabled, true),
    COALESCE(p_cooldown_hours, 24)
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    threshold_medium       = COALESCE(p_threshold_medium, struggle_config.threshold_medium),
    threshold_high         = COALESCE(p_threshold_high, struggle_config.threshold_high),
    notification_enabled   = COALESCE(p_notification_enabled, struggle_config.notification_enabled),
    student_prompt_enabled = COALESCE(p_student_prompt_enabled, struggle_config.student_prompt_enabled),
    cooldown_hours         = COALESCE(p_cooldown_hours, struggle_config.cooldown_hours),
    updated_at             = now();
END;
$$;


CREATE OR REPLACE FUNCTION public.detect_new_struggles()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN
    SELECT DISTINCT tenant_id FROM struggle_config WHERE notification_enabled = true
  LOOP
    SELECT threshold_high, threshold_medium, cooldown_hours
    INTO v_config
    FROM struggle_config
    WHERE tenant_id = v_tenant.tenant_id;

    INSERT INTO struggle_alerts (
      tenant_id, teacher_id, student_id, lesson_id, course_id, struggle_score, severity
    )
    SELECT
      sls.tenant_id,
      c.created_by,
      sls.user_id,
      sls.lesson_id,
      cm.course_id,
      sls.struggle_score,
      CASE WHEN sls.struggle_score >= v_config.threshold_high THEN 'high' ELSE 'medium' END
    FROM student_lesson_signals sls
    JOIN lessons l       ON l.id  = sls.lesson_id
    JOIN course_modules cm ON cm.id = l.module_id
    JOIN courses c       ON c.id  = cm.course_id
    WHERE sls.tenant_id = v_tenant.tenant_id
      AND sls.struggle_score >= v_config.threshold_medium
      AND c.created_by IS NOT NULL
    ON CONFLICT (tenant_id, teacher_id, student_id, lesson_id)
    DO UPDATE SET
      struggle_score = EXCLUDED.struggle_score,
      severity       = EXCLUDED.severity,
      read_at = CASE
        WHEN EXCLUDED.struggle_score > struggle_alerts.struggle_score + 1
          AND (
            struggle_alerts.read_at IS NULL
            OR struggle_alerts.read_at < now() - (v_config.cooldown_hours || ' hours')::INTERVAL
          )
        THEN NULL
        ELSE struggle_alerts.read_at
      END;
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'detect-new-struggles',
  '3-58/5 * * * *',
  $$SELECT detect_new_struggles()$$
);


CREATE OR REPLACE FUNCTION public.get_struggle_alerts(
  p_unread_only BOOLEAN DEFAULT true,
  p_course_id   UUID    DEFAULT NULL,
  p_limit       INT     DEFAULT 50
)
RETURNS TABLE (
  alert_id       UUID,
  student_name   TEXT,
  student_id     UUID,
  lesson_title   TEXT,
  lesson_id      UUID,
  course_title   TEXT,
  course_id      UUID,
  struggle_score INT,
  severity       TEXT,
  created_at     TIMESTAMPTZ,
  read_at        TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sa.id, COALESCE(p.full_name, p.email, sa.student_id::TEXT),
    sa.student_id, l.title, sa.lesson_id, c.title, sa.course_id,
    sa.struggle_score, sa.severity, sa.created_at, sa.read_at
  FROM struggle_alerts sa
  JOIN lessons l  ON l.id = sa.lesson_id
  JOIN courses c  ON c.id = sa.course_id
  LEFT JOIN profiles p ON p.id = sa.student_id
  WHERE sa.tenant_id  = get_my_tenant_id()
    AND sa.teacher_id = auth.uid()
    AND (NOT p_unread_only OR sa.read_at IS NULL)
    AND (p_course_id IS NULL OR sa.course_id = p_course_id)
  ORDER BY sa.created_at DESC
  LIMIT p_limit;
$$;


CREATE OR REPLACE FUNCTION public.mark_alerts_read(p_alert_ids UUID[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE struggle_alerts
  SET read_at = now()
  WHERE id = ANY(p_alert_ids)
    AND tenant_id  = get_my_tenant_id()
    AND teacher_id = auth.uid()
    AND read_at IS NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_my_lesson_status(p_lesson_id UUID)
RETURNS TABLE (
  struggle_score        INT,
  severity              TEXT,
  prompt_enabled        BOOLEAN,
  completion_pct        NUMERIC,
  total_sessions        INT,
  video_replays         INT,
  total_time_spent      INT
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(sls.struggle_score, 0)::INT,
    CASE
      WHEN COALESCE(sls.struggle_score, 0) >= sc.threshold_high   THEN 'high'
      WHEN COALESCE(sls.struggle_score, 0) >= sc.threshold_medium THEN 'medium'
      ELSE 'low'
    END,
    sc.student_prompt_enabled,
    COALESCE(sls.completion_pct, 0),
    COALESCE(sls.session_count, 0),
    COALESCE(sls.video_replays, 0),
    COALESCE(sls.total_time_spent, 0)
  FROM struggle_config sc
  LEFT JOIN student_lesson_signals sls
    ON  sls.user_id   = auth.uid()
    AND sls.lesson_id = p_lesson_id
    AND sls.tenant_id = sc.tenant_id
  WHERE sc.tenant_id = get_my_tenant_id();
$$;


GRANT EXECUTE ON FUNCTION public.get_struggle_config()                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_struggle_config(INT, INT, BOOLEAN, BOOLEAN, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_struggle_alerts(BOOLEAN, UUID, INT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_alerts_read(UUID[])                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_lesson_status(UUID)                       TO authenticated;
