-- ==========================================================================
-- Migration 48: Quiz Final Hardening & Status Telemetry
--
-- 1. Adds ABANDONED and EXPIRED events to analytics.
-- 2. Ensures strict tenant isolation for heartbeat and signals.
-- 3. Adds cleanup observability logging.
-- ==========================================================================

-- 1. Extend activity_event_type enum for ABANDONED and EXPIRED
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_ABANDONED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_ABANDONED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_event_type' AND e.enumlabel = 'QUIZ_EXPIRED') THEN
        ALTER TYPE public.activity_event_type ADD VALUE 'QUIZ_EXPIRED';
    END IF;
END $$;

-- 2. Update Quiz Telemetry Trigger Function to handle ABANDONED and EXPIRED
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
        WHEN 'expired' THEN v_event_type := 'QUIZ_EXPIRED'::public.activity_event_type;
        WHEN 'abandoned' THEN v_event_type := 'QUIZ_ABANDONED'::public.activity_event_type;
        ELSE RETURN NEW;
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
            'tab_switch_count', NEW.tab_switch_count,
            'focus_loss_count', NEW.focus_loss_count,
            'triggered_by', CASE WHEN NEW.status IN ('abandoned', 'expired') THEN 'system_cleanup' ELSE 'user_action' END
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Refine record_quiz_heartbeat to be more defensive
CREATE OR REPLACE FUNCTION public.record_quiz_heartbeat(p_attempt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from profile to ensure strict isolation
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    
    UPDATE public.quiz_attempts
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id 
      AND student_id = auth.uid()
      AND tenant_id = v_tenant_id -- Explicit tenant check
      AND status = 'in_progress';
END;
$$;

-- 4. Refine record_cheating_signal to be more defensive
CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id UUID, 
    p_signal_type TEXT, 
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();

    UPDATE public.quiz_attempts
    SET 
        last_heartbeat_at = now(),
        tab_switch_count = CASE WHEN p_signal_type = 'TAB_SWITCH' THEN tab_switch_count + 1 ELSE tab_switch_count END,
        focus_loss_count = CASE WHEN p_signal_type = 'FOCUS_LOSS' THEN focus_loss_count + 1 ELSE focus_loss_count END,
        cheating_signals = cheating_signals || jsonb_build_array(
            jsonb_build_object(
                'type', p_signal_type,
                'timestamp', now(),
                'metadata', p_metadata
            )
        )
    WHERE id = p_attempt_id 
      AND student_id = auth.uid()
      AND tenant_id = v_tenant_id -- Explicit tenant check
      AND status = 'in_progress';
END;
$$;
