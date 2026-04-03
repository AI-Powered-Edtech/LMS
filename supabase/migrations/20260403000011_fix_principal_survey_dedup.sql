-- Fix: Prevent duplicate survey responses per respondent
-- FIXED: Added UNIQUE constraint + updated INSERT policy with active survey check
ALTER TABLE public.survey_responses
    ADD CONSTRAINT uq_survey_responses_respondent
    UNIQUE (survey_id, respondent_id);

-- Update INSERT policy to check for duplicates + active survey
DROP POLICY IF EXISTS "respondents_insert_responses" ON public.survey_responses;
CREATE POLICY "respondents_insert_responses"
    ON public.survey_responses
    FOR INSERT
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND auth.uid() IS NOT NULL
        AND respondent_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.satisfaction_surveys s
            WHERE s.id = survey_responses.survey_id
              AND s.status = 'active'
              AND s.tenant_id = get_my_tenant_id()
        )
    );
