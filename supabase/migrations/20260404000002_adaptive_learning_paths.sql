-- ============================================================
-- Phase 31B: Adaptive Learning Paths
-- ============================================================

-- Add remedial flags to lessons
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS is_remedial boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS prerequisite_rule_id uuid;

-- learning_path_rules table
CREATE TABLE IF NOT EXISTS public.learning_path_rules (
    id                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    course_id         uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    source_lesson_id  uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    condition_type    text NOT NULL CHECK (condition_type IN (
        'quiz_score_below', 'quiz_score_above',
        'time_spent_below', 'assignment_score_below',
        'lesson_not_completed', 'always'
    )),
    condition_value   jsonb NOT NULL DEFAULT '{}',
    target_lesson_id  uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    priority          int DEFAULT 0,
    is_active         boolean DEFAULT true,
    label             text,
    tenant_id         uuid NOT NULL,
    created_by        uuid NOT NULL REFERENCES auth.users(id),
    created_at        timestamptz DEFAULT now() NOT NULL,
    updated_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.learning_path_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lpr_course_id       ON public.learning_path_rules(course_id);
CREATE INDEX IF NOT EXISTS idx_lpr_source_lesson   ON public.learning_path_rules(source_lesson_id);
CREATE INDEX IF NOT EXISTS idx_lpr_tenant_id       ON public.learning_path_rules(tenant_id);

CREATE POLICY "lpr_tenant_isolation" ON public.learning_path_rules
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.learning_path_rules TO authenticated;

CREATE TRIGGER set_tenant_id_learning_path_rules
    BEFORE INSERT ON public.learning_path_rules
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- RPC: evaluate_next_lesson
-- Returns the next lesson for a student given their current lesson and performance
CREATE OR REPLACE FUNCTION public.evaluate_next_lesson(
    p_user_id        uuid,
    p_course_id      uuid,
    p_current_lesson_id uuid,
    p_tenant_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_auth_uid      uuid;
    v_rule          record;
    v_quiz_score    numeric;
    v_time_spent    int;
    v_asgn_score    numeric;
    v_condition_met boolean;
    v_cond_val      jsonb;
BEGIN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Evaluate each active rule for the current lesson, highest priority first
    FOR v_rule IN
        SELECT r.id, r.condition_type, r.condition_value, r.target_lesson_id, r.label
        FROM public.learning_path_rules r
        WHERE r.source_lesson_id = p_current_lesson_id
          AND r.course_id = p_course_id
          AND r.tenant_id = p_tenant_id
          AND r.is_active = true
        ORDER BY r.priority DESC
    LOOP
        v_condition_met := false;
        v_cond_val := v_rule.condition_value;

        CASE v_rule.condition_type
            WHEN 'quiz_score_below' THEN
                SELECT COALESCE(latest_quiz_score, 0) INTO v_quiz_score
                FROM public.student_lesson_signals
                WHERE user_id = p_user_id AND lesson_id = p_current_lesson_id;
                v_condition_met := COALESCE(v_quiz_score, 0) < COALESCE((v_cond_val->>'threshold')::numeric, 70);

            WHEN 'quiz_score_above' THEN
                SELECT COALESCE(latest_quiz_score, 0) INTO v_quiz_score
                FROM public.student_lesson_signals
                WHERE user_id = p_user_id AND lesson_id = p_current_lesson_id;
                v_condition_met := COALESCE(v_quiz_score, 0) >= COALESCE((v_cond_val->>'threshold')::numeric, 70);

            WHEN 'time_spent_below' THEN
                SELECT COALESCE(total_time_spent, 0) INTO v_time_spent
                FROM public.student_lesson_signals
                WHERE user_id = p_user_id AND lesson_id = p_current_lesson_id;
                v_condition_met := COALESCE(v_time_spent, 0) < COALESCE((v_cond_val->>'min_seconds')::int, 300);

            WHEN 'always' THEN
                v_condition_met := true;

            ELSE
                v_condition_met := false;
        END CASE;

        IF v_condition_met THEN
            RETURN jsonb_build_object(
                'next_lesson_id', v_rule.target_lesson_id,
                'reason',        v_rule.label,
                'rule_id',       v_rule.id,
                'is_adaptive',   true
            );
        END IF;
    END LOOP;

    -- No rule matched → return null (caller uses default sequential navigation)
    RETURN jsonb_build_object(
        'next_lesson_id', null,
        'is_adaptive',    false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_next_lesson(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_next_lesson(uuid, uuid, uuid, uuid) TO authenticated;
