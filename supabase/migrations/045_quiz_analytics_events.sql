-- Phase 4: Analytics Events
-- Extending activity_event_type enum and implementing trigger for telemetry

-- 1. Extend activity_event_type enum
-- Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction block with other commands in some PG versions.
-- We use DO block to check for existence and add them safely.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_STARTED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_STARTED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_SUBMITTED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_SUBMITTED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_GRADED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_GRADED';
    END IF;
END $$;

-- 2. Trigger Function for Quiz Telemetry
CREATE OR REPLACE FUNCTION public.handle_quiz_attempt_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type public.activity_event_type;
    v_course_id UUID;
    v_class_id UUID;
BEGIN
    -- Only trigger on status change or fresh insert
    IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Map status to event type
    CASE NEW.status
        WHEN 'in_progress' THEN v_event_type := 'QUIZ_STARTED'::public.activity_event_type;
        WHEN 'submitted' THEN v_event_type := 'QUIZ_SUBMITTED'::public.activity_event_type;
        WHEN 'graded' THEN v_event_type := 'QUIZ_GRADED'::public.activity_event_type;
        ELSE RETURN NEW; -- EXPIRED, ABANDONED are ignored for now
    END CASE;

    -- Resolve Course and Class context
    SELECT 
        q.class_id,
        CASE 
            WHEN q.lesson_id IS NOT NULL THEN (
                SELECT m.course_id 
                FROM public.lessons l 
                JOIN public.course_modules m ON l.module_id = m.id 
                WHERE l.id = q.lesson_id
            )
            ELSE NULL 
        END as course_id
    INTO v_class_id, v_course_id
    FROM public.quizzes q
    WHERE q.id = NEW.quiz_id;

    -- Log to activity_events
    INSERT INTO public.activity_events (
        tenant_id,
        user_id,
        event_type,
        entity_type,
        entity_id,
        class_id,
        course_id,
        metadata
    ) VALUES (
        NEW.tenant_id,
        NEW.student_id,
        v_event_type,
        'quiz_attempt',
        NEW.id,
        v_class_id,
        v_course_id,
        jsonb_build_object(
            'quiz_id', NEW.quiz_id,
            'status', NEW.status,
            'score', NEW.score,
            'attempt_number', NEW.attempt_number,
            'passing_score', (SELECT passing_score FROM public.quizzes WHERE id = NEW.quiz_id)
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trg_quiz_attempt_status_change ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_attempt_status_change
AFTER INSERT OR UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.handle_quiz_attempt_status_change();
