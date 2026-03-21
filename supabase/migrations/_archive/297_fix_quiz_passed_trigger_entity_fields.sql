-- =============================================================================
-- Migration 297: Fix trigger_quiz_passed_v2 — add required entity_type/entity_id
--
-- Bug: activity_events has NOT NULL on entity_type and entity_id.
-- Migration 296's trigger_quiz_passed_v2 omitted these columns, causing:
--   "null value in column entity_type of relation activity_events violates not-null constraint"
-- Fix: Include entity_type='quiz' and entity_id=NEW.quiz_id in the INSERT.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_quiz_passed_v2()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (
            tenant_id, user_id, event_type, entity_type, entity_id, metadata
        )
        VALUES (
            NEW.tenant_id,
            NEW.student_id,
            'QUIZ_PASSED',
            'quiz',
            NEW.quiz_id,
            jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score)
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
