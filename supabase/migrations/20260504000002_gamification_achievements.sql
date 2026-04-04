-- ============================================================
-- Phase 37A: Achievement System (Badges & Certificates)
-- Deployed from _archive/821_achievements.sql
--
-- Tables:  badge_definitions, student_badges, certificates
-- RPCs:    check_badge_eligibility, get_student_badges,
--           issue_certificate, get_student_certificates
-- Seed:    8 system badge definitions (tenant_id = NULL)
-- Cron:    badge-eligibility-check every 5 min (if pg_cron available)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. badge_definitions — system + tenant custom badges
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES public.tenants(id),          -- NULL = system badge
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_emoji  TEXT NOT NULL DEFAULT '🏅',
    badge_type  TEXT NOT NULL CHECK (badge_type IN ('completion','streak','mastery','speed','social')),
    criteria    JSONB NOT NULL DEFAULT '{}',
    xp_reward   INTEGER NOT NULL DEFAULT 0,
    rarity      TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_def_tenant ON public.badge_definitions(tenant_id)
    WHERE tenant_id IS NOT NULL;

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.badge_definitions TO authenticated;

-- Students + teachers can read system badges + own-tenant badges
DROP POLICY IF EXISTS "badge_def_read" ON public.badge_definitions;
CREATE POLICY "badge_def_read" ON public.badge_definitions FOR SELECT
    USING (tenant_id IS NULL OR tenant_id = public.get_my_tenant_id());

-- Teachers/admins manage tenant-specific badges
DROP POLICY IF EXISTS "badge_def_manage" ON public.badge_definitions;
CREATE POLICY "badge_def_manage" ON public.badge_definitions FOR ALL
    USING (tenant_id = public.get_my_tenant_id() AND public.has_role('TEACHER'::public.app_role))
    WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.has_role('TEACHER'::public.app_role));


-- ────────────────────────────────────────────────────────────
-- 2. student_badges — earned badges (new SP-20 table)
--    (separate from legacy `user_badges` in baseline)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_badges (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id   UUID NOT NULL REFERENCES public.profiles(id),
    badge_id  UUID NOT NULL REFERENCES public.badge_definitions(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_user ON public.student_badges(tenant_id, user_id);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.student_badges TO authenticated;

-- Students read all in tenant (for leaderboard/showcase), system inserts via SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "student_badges_read" ON public.student_badges;
CREATE POLICY "student_badges_read" ON public.student_badges FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "student_badges_insert" ON public.student_badges;
CREATE POLICY "student_badges_insert" ON public.student_badges FOR INSERT
    WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE OR REPLACE TRIGGER set_tenant_id_student_badges
    BEFORE INSERT ON public.student_badges
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


-- ────────────────────────────────────────────────────────────
-- 3. certificates — issued course completion certificates
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certificates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
    user_id            UUID NOT NULL REFERENCES public.profiles(id),
    course_id          UUID NOT NULL REFERENCES public.courses(id),
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    template_config    JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON public.certificates(tenant_id, course_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.certificates TO authenticated;

DROP POLICY IF EXISTS "certificates_read" ON public.certificates;
CREATE POLICY "certificates_read" ON public.certificates FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "certificates_manage" ON public.certificates;
CREATE POLICY "certificates_manage" ON public.certificates FOR INSERT
    WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.has_role('TEACHER'::public.app_role));

CREATE OR REPLACE TRIGGER set_tenant_id_certificates
    BEFORE INSERT ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


-- ────────────────────────────────────────────────────────────
-- RPCs
-- ────────────────────────────────────────────────────────────

-- get_student_badges: earned badges + all active badge definitions for showcase
CREATE OR REPLACE FUNCTION public.get_student_badges(p_user_id UUID)
RETURNS TABLE (
    badge_id      UUID,
    name          TEXT,
    description   TEXT,
    icon_emoji    TEXT,
    badge_type    TEXT,
    xp_reward     INTEGER,
    rarity        TEXT,
    criteria      JSONB,
    is_earned     BOOLEAN,
    earned_at     TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        bd.id           AS badge_id,
        bd.name,
        bd.description,
        bd.icon_emoji,
        bd.badge_type,
        bd.xp_reward,
        bd.rarity,
        bd.criteria,
        (sb.id IS NOT NULL) AS is_earned,
        sb.earned_at
    FROM public.badge_definitions bd
    LEFT JOIN public.student_badges sb
        ON sb.badge_id = bd.id AND sb.user_id = p_user_id
    WHERE bd.is_active = true
      AND (bd.tenant_id IS NULL OR bd.tenant_id = public.get_my_tenant_id())
    ORDER BY
        (sb.id IS NOT NULL) DESC,  -- earned first
        bd.rarity = 'legendary' DESC,
        bd.rarity = 'epic' DESC,
        bd.rarity = 'rare' DESC,
        bd.name;
$$;


-- check_badge_eligibility: bulk-check and award badges based on criteria
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant  UUID := public.get_my_tenant_id();
    v_badge   RECORD;
    v_awarded INTEGER := 0;
    v_user    UUID;
    v_users   UUID[];
BEGIN
    -- Auth check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Collect target users
    IF p_user_id IS NOT NULL THEN
        v_users := ARRAY[p_user_id];
    ELSE
        -- All students with recent activity (last 24h)
        SELECT array_agg(DISTINCT user_id) INTO v_users
        FROM public.learning_events
        WHERE tenant_id = v_tenant
          AND created_at >= now() - interval '24 hours';
    END IF;

    IF v_users IS NULL THEN
        RETURN 0;
    END IF;

    -- Iterate active badge definitions
    FOR v_badge IN
        SELECT id, criteria, xp_reward
        FROM public.badge_definitions
        WHERE is_active = true
          AND (tenant_id IS NULL OR tenant_id = v_tenant)
    LOOP
        FOREACH v_user IN ARRAY v_users LOOP
            -- Skip if already earned
            IF EXISTS (
                SELECT 1 FROM public.student_badges
                WHERE user_id = v_user AND badge_id = v_badge.id
            ) THEN
                CONTINUE;
            END IF;

            -- Evaluate criteria by type
            IF (v_badge.criteria->>'type') = 'lessons_completed' THEN
                IF (
                    SELECT count(*)
                    FROM public.student_lesson_signals
                    WHERE user_id = v_user
                      AND tenant_id = v_tenant
                      AND is_completed = true
                ) >= (v_badge.criteria->>'threshold')::int THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'streak_days' THEN
                -- Count consecutive active days ending today
                IF (
                    WITH daily AS (
                        SELECT DISTINCT DATE(created_at) AS d
                        FROM public.learning_events
                        WHERE user_id = v_user AND tenant_id = v_tenant
                        ORDER BY d DESC
                    ),
                    numbered AS (
                        SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d DESC))::int AS grp
                        FROM daily
                    )
                    SELECT count(*)
                    FROM numbered
                    WHERE grp = (SELECT grp FROM numbered ORDER BY d DESC LIMIT 1)
                ) >= (v_badge.criteria->>'threshold')::int THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'course_completed' THEN
                IF EXISTS (
                    SELECT 1
                    FROM public.courses c
                    JOIN public.lessons l ON l.course_id = c.id
                    WHERE c.tenant_id = v_tenant
                    GROUP BY c.id
                    HAVING count(*) = count(*) FILTER (
                        WHERE EXISTS (
                            SELECT 1 FROM public.student_lesson_signals sls
                            WHERE sls.user_id = v_user
                              AND sls.lesson_id = l.id
                              AND sls.is_completed = true
                        )
                    )
                ) THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'courses_completed' THEN
                IF (
                    SELECT count(DISTINCT c.id)
                    FROM public.courses c
                    JOIN public.lessons l ON l.course_id = c.id
                    WHERE c.tenant_id = v_tenant
                    GROUP BY c.id
                    HAVING count(*) = count(*) FILTER (
                        WHERE EXISTS (
                            SELECT 1 FROM public.student_lesson_signals sls
                            WHERE sls.user_id = v_user
                              AND sls.lesson_id = l.id
                              AND sls.is_completed = true
                        )
                    )
                ) >= (v_badge.criteria->>'threshold')::int THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'quiz_perfect_score' THEN
                IF (
                    SELECT count(*)
                    FROM public.quiz_attempts_v2
                    WHERE student_id = v_user
                      AND tenant_id = v_tenant
                      AND status = 'graded'
                      AND score >= 100
                ) >= (v_badge.criteria->>'threshold')::int THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'course_master' THEN
                IF EXISTS (
                    SELECT 1
                    FROM public.courses c
                    JOIN public.lessons l ON l.course_id = c.id
                    WHERE c.tenant_id = v_tenant
                    GROUP BY c.id
                    HAVING
                        count(*) = count(*) FILTER (
                            WHERE EXISTS (
                                SELECT 1 FROM public.student_lesson_signals sls
                                WHERE sls.user_id = v_user
                                  AND sls.lesson_id = l.id
                                  AND sls.is_completed = true
                            )
                        )
                        AND coalesce(avg(
                            (SELECT sls.best_quiz_score FROM public.student_lesson_signals sls
                             WHERE sls.user_id = v_user AND sls.lesson_id = l.id
                               AND sls.best_quiz_score IS NOT NULL)
                        ), 0) >= 90
                ) THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;

            ELSIF (v_badge.criteria->>'type') = 'speed_learner' THEN
                IF EXISTS (
                    SELECT 1
                    FROM public.student_lesson_signals sls
                    JOIN public.lesson_analytics_summary las ON las.lesson_id = sls.lesson_id
                    WHERE sls.user_id = v_user
                      AND sls.tenant_id = v_tenant
                      AND sls.is_completed = true
                      AND las.avg_time_spent > 0
                      AND sls.total_time_spent < (las.avg_time_spent * 0.5)
                ) THEN
                    INSERT INTO public.student_badges (tenant_id, user_id, badge_id)
                    VALUES (v_tenant, v_user, v_badge.id)
                    ON CONFLICT DO NOTHING;
                    v_awarded := v_awarded + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_awarded;
END;
$$;


-- issue_certificate: teacher issues a certificate for a student
CREATE OR REPLACE FUNCTION public.issue_certificate(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
    id                 UUID,
    certificate_number TEXT,
    issued_at          TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant UUID := public.get_my_tenant_id();
    v_cert_number TEXT;
    v_tenant_short TEXT;
    v_id UUID;
    v_issued TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Teacher only
    IF NOT public.has_role('TEACHER'::public.app_role) THEN
        RAISE EXCEPTION 'Only teachers can issue certificates';
    END IF;

    -- Generate certificate number: CERT-{tenant_short}-{YYYYMMDD}-{random6}
    SELECT LEFT(REPLACE(t.name, ' ', ''), 4)
    INTO v_tenant_short
    FROM public.tenants t WHERE t.id = v_tenant;

    v_cert_number := 'CERT-'
        || UPPER(COALESCE(v_tenant_short, 'EDUS'))
        || '-' || TO_CHAR(now(), 'YYYYMMDD')
        || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));

    INSERT INTO public.certificates (tenant_id, user_id, course_id, certificate_number)
    VALUES (v_tenant, p_user_id, p_course_id, v_cert_number)
    RETURNING public.certificates.id, public.certificates.certificate_number, public.certificates.issued_at
    INTO v_id, v_cert_number, v_issued;

    RETURN QUERY SELECT v_id, v_cert_number, v_issued;
END;
$$;


-- get_student_certificates: student's earned certificates with course info
CREATE OR REPLACE FUNCTION public.get_student_certificates(p_user_id UUID)
RETURNS TABLE (
    id                 UUID,
    course_id          UUID,
    course_title       TEXT,
    certificate_number TEXT,
    issued_at          TIMESTAMPTZ,
    template_config    JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        cert.id,
        cert.course_id,
        c.title AS course_title,
        cert.certificate_number,
        cert.issued_at,
        cert.template_config
    FROM public.certificates cert
    JOIN public.courses c ON c.id = cert.course_id
    WHERE cert.user_id = p_user_id
      AND cert.tenant_id = public.get_my_tenant_id()
    ORDER BY cert.issued_at DESC;
$$;


-- ────────────────────────────────────────────────────────────
-- Seed 8 default system badges (tenant_id = NULL)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.badge_definitions (tenant_id, name, description, icon_emoji, badge_type, criteria, xp_reward, rarity)
VALUES
    (NULL, 'Semangat Awal', 'Menyelesaikan pelajaran pertama', '🔥', 'completion',
     '{"type":"lessons_completed","threshold":1}', 10, 'common'),
    (NULL, 'Bookworm', 'Menyelesaikan 10 pelajaran', '📚', 'completion',
     '{"type":"lessons_completed","threshold":10}', 25, 'common'),
    (NULL, 'Sharp Shooter', 'Mendapat nilai sempurna di 3 kuis', '🎯', 'mastery',
     '{"type":"quiz_perfect_score","threshold":3}', 50, 'rare'),
    (NULL, 'On Fire', 'Streak belajar 7 hari berturut-turut', '🔥', 'streak',
     '{"type":"streak_days","threshold":7}', 50, 'rare'),
    (NULL, 'Unstoppable', 'Streak belajar 30 hari berturut-turut', '💪', 'streak',
     '{"type":"streak_days","threshold":30}', 200, 'epic'),
    (NULL, 'Course Master', 'Menyelesaikan kursus dengan rata-rata nilai ≥ 90%', '🏆', 'mastery',
     '{"type":"course_master","threshold":90}', 150, 'epic'),
    (NULL, 'Scholar', 'Menyelesaikan 5 kursus', '🌟', 'completion',
     '{"type":"courses_completed","threshold":5}', 500, 'legendary'),
    (NULL, 'Speed Learner', 'Menyelesaikan pelajaran dalam < 50% waktu rata-rata', '⚡', 'speed',
     '{"type":"speed_learner","threshold":50}', 30, 'rare')
ON CONFLICT DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- pg_cron: badge eligibility check every 5 min
-- Wrapped in exception block — safe if pg_cron is not available
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
    PERFORM cron.unschedule('check-badge-eligibility');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    PERFORM cron.schedule(
        'check-badge-eligibility',
        '7-59/5 * * * *',
        $$SELECT public.check_badge_eligibility(NULL)$$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available — badge eligibility cron not scheduled';
END $$;

COMMENT ON TABLE public.badge_definitions IS 'System + tenant-custom badge definitions. Phase 37A.';
COMMENT ON TABLE public.student_badges IS 'Earned badges per student. Phase 37A.';
COMMENT ON TABLE public.certificates IS 'Course completion certificates. Phase 37A.';
