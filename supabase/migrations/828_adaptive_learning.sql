-- SP-25: Adaptive Learning Recommendations
CREATE TABLE IF NOT EXISTS learning_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('next_lesson','review_quiz','practice_weak_topic','take_break','continue_course')),
    target_id UUID,
    reason TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.5,
    priority INT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','shown','accepted','dismissed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    acted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON learning_recommendations(tenant_id, user_id, status);

ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_own_recommendations" ON learning_recommendations;
CREATE POLICY "students_read_own_recommendations" ON learning_recommendations
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_manage_recommendations" ON learning_recommendations;
CREATE POLICY "system_manage_recommendations" ON learning_recommendations
    FOR ALL USING (true) WITH CHECK (true);

-- Generate recommendations for a user or all active students
CREATE OR REPLACE FUNCTION generate_recommendations(p_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
    v_student RECORD;
BEGIN
    FOR v_student IN
        SELECT DISTINCT p.id AS user_id, p.tenant_id
        FROM profiles p
        JOIN user_roles ur ON ur.user_id = p.id
        WHERE ur.role = 'STUDENT'
          AND (p_user_id IS NULL OR p.id = p_user_id)
          AND EXISTS (
              SELECT 1 FROM learning_events le
              WHERE le.user_id = p.id AND le.created_at > now() - interval '7 days'
          )
    LOOP
        -- Delete old pending recommendations
        DELETE FROM learning_recommendations
        WHERE user_id = v_student.user_id AND status = 'pending';

        -- Rule 1: Low quiz score -> review_quiz
        INSERT INTO learning_recommendations (tenant_id, user_id, course_id, recommendation_type, target_id, reason, confidence, priority)
        SELECT DISTINCT ON (le.course_id)
            v_student.tenant_id,
            v_student.user_id,
            le.course_id,
            'review_quiz',
            le.lesson_id,
            'Skor kuis di pelajaran ini masih rendah, coba review dulu',
            0.85,
            3
        FROM learning_events le
        WHERE le.user_id = v_student.user_id
          AND le.event_type = 'QUIZ_SUBMITTED'
          AND (le.metadata->>'score')::numeric < 60
          AND le.created_at > now() - interval '14 days'
        LIMIT 2
        ON CONFLICT DO NOTHING;

        -- Rule 2: Broken streak -> continue_course
        INSERT INTO learning_recommendations (tenant_id, user_id, course_id, recommendation_type, target_id, reason, confidence, priority)
        SELECT
            v_student.tenant_id,
            v_student.user_id,
            e.course_id,
            'continue_course',
            NULL,
            'Ayo lanjut belajar! Mulai dari yang ringan',
            0.75,
            2
        FROM enrollments e
        WHERE e.user_id = v_student.user_id
          AND e.progress_percentage < 100
        ORDER BY e.progress_percentage ASC
        LIMIT 1
        ON CONFLICT DO NOTHING;

        -- Rule 3: Completed lesson -> next_lesson
        INSERT INTO learning_recommendations (tenant_id, user_id, course_id, recommendation_type, target_id, reason, confidence, priority)
        SELECT
            v_student.tenant_id,
            v_student.user_id,
            le.course_id,
            'next_lesson',
            NULL,
            'Kamu sudah selesai, lanjut ke pelajaran berikutnya!',
            0.90,
            4
        FROM learning_events le
        WHERE le.user_id = v_student.user_id
          AND le.event_type = 'LESSON_COMPLETED'
          AND le.created_at > now() - interval '1 day'
        LIMIT 1
        ON CONFLICT DO NOTHING;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_recommendations(p_user_id UUID, p_limit INT DEFAULT 5)
RETURNS SETOF learning_recommendations AS $$
    SELECT * FROM learning_recommendations
    WHERE user_id = p_user_id AND status = 'pending'
    ORDER BY priority DESC, created_at DESC
    LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_recommendation_action(p_recommendation_id UUID, p_action TEXT)
RETURNS VOID AS $$
    UPDATE learning_recommendations
    SET status = p_action, acted_at = now()
    WHERE id = p_recommendation_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- pg_cron: schedule generate_recommendations every 10 minutes
SELECT cron.schedule(
    'generate-recommendations',
    '9,19,29,39,49,59 * * * *',
    $$SELECT generate_recommendations()$$
);
