-- Migration 004: AI Tutor Sessions
-- Creates the ai_tutor_sessions table for persistent conversation history
-- between students and the AI tutor.

CREATE TABLE IF NOT EXISTS ai_tutor_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- user_id alias for consistency with the rest of the schema
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
    messages_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
    message_count   INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived', 'expired')),
    last_message_at TIMESTAMPTZ,
    tenant_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_student_lesson
    ON ai_tutor_sessions(student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_user_lesson
    ON ai_tutor_sessions(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_tenant
    ON ai_tutor_sessions(tenant_id);

ALTER TABLE ai_tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tutor_sessions_tenant_isolation" ON ai_tutor_sessions
    USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- Auto-set tenant_id on insert using the shared trigger function
CREATE TRIGGER set_ai_tutor_sessions_tenant
    BEFORE INSERT ON ai_tutor_sessions
    FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
