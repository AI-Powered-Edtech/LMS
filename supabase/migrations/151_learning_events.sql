-- ==========================================================================
-- Migration 15: Learning Events Table for AI Tutor
--
-- Foundation for AI-powered learning analytics, recommendations, and 
-- student risk detection.
--
-- This table captures granular learning events that power:
-- - AI Tutor context and recommendations
-- - Student engagement analytics
-- - Learning heatmaps
-- - Risk detection algorithms
-- ==========================================================================

-- Create learning_events table
CREATE TABLE IF NOT EXISTS public.learning_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    event_version integer DEFAULT 1,
    
    -- Context fields
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
    assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
    
    -- Event data (flexible JSONB for different event types)
    event_data jsonb DEFAULT '{}'::jsonb,
    
    -- Timing
    timestamp timestamptz DEFAULT now(),
    duration_seconds integer, -- For timed events like video watching
    
    -- Metadata
    device_type text,
    session_id text,
    ip_address inet,
    
    -- Processing status
    processed_at timestamptz,
    processing_status text DEFAULT 'pending' -- 'pending', 'processed', 'failed'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_learning_events_tenant_user ON public.learning_events(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_timestamp ON public.learning_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_course_timestamp ON public.learning_events(course_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_event_type ON public.learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_processed ON public.learning_events(processed_at) WHERE processing_status = 'pending';

-- Enable RLS
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own learning events"
ON public.learning_events FOR SELECT
USING (auth.uid() = user_id AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Teachers can view tenant learning events"
ON public.learning_events FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('teacher', 'admin')
);

CREATE POLICY "System can insert learning events"
ON public.learning_events FOR INSERT
WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
);

-- Create trigger function to auto-populate tenant_id
CREATE OR REPLACE FUNCTION public.set_learning_event_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Auto-set tenant_id from JWT if not provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    END IF;
    
    -- Auto-set user_id from JWT if not provided
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-set tenant
DROP TRIGGER IF EXISTS set_learning_event_tenant_trigger ON public.learning_events;
CREATE TRIGGER set_learning_event_tenant_trigger
BEFORE INSERT ON public.learning_events
FOR EACH ROW
EXECUTE FUNCTION public.set_learning_event_tenant();

-- Enum-like check for event types
COMMENT ON TABLE public.learning_events IS E'@enum event_type lesson_viewed, lesson_completed, video_started, video_completed, video_paused, quiz_started, quiz_completed, quiz_attempted, assignment_viewed, assignment_submitted, discussion_posted, course_enrolled, course_completed';

-- Add comment for documentation
COMMENT ON COLUMN public.learning_events.event_type IS 'Type of learning event: lesson_viewed, lesson_completed, video_started, video_completed, video_paused, quiz_started, quiz_completed, quiz_attempted, assignment_viewed, assignment_submitted, discussion_posted, course_enrolled, course_completed';

-- Create function to record learning events (for Edge Functions / API)
CREATE OR REPLACE FUNCTION public.record_learning_event(
    p_event_type text,
    p_course_id uuid DEFAULT NULL,
    p_module_id uuid DEFAULT NULL,
    p_lesson_id uuid DEFAULT NULL,
    p_quiz_id uuid DEFAULT NULL,
    p_assignment_id uuid DEFAULT NULL,
    p_event_data jsonb DEFAULT '{}'::jsonb,
    p_duration_seconds integer DEFAULT NULL,
    p_device_type text DEFAULT NULL,
    p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_event_id uuid;
    v_tenant_id uuid;
    v_user_id uuid;
BEGIN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    v_user_id := auth.uid();
    
    INSERT INTO public.learning_events (
        tenant_id,
        user_id,
        event_type,
        course_id,
        module_id,
        lesson_id,
        quiz_id,
        assignment_id,
        event_data,
        duration_seconds,
        device_type,
        session_id
    ) VALUES (
        v_tenant_id,
        v_user_id,
        p_event_type,
        p_course_id,
        p_module_id,
        p_lesson_id,
        p_quiz_id,
        p_assignment_id,
        p_event_data,
        p_duration_seconds,
        p_device_type,
        p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.record_learning_event IS 
'Records a learning event for analytics and AI Tutor. Required fields: event_type. 
Optional: course_id, module_id, lesson_id, quiz_id, assignment_id, event_data, duration_seconds, device_type, session_id.';
