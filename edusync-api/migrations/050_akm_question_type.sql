-- 050_akm_question_type.sql
-- Fase 2 Unit 23: AKM-style question type
--
-- AKM (Asesmen Kompetensi Minimum) format: a stimulus (passage / chart /
-- video) followed by 3-6 sub-questions all referencing it. Database shape:
--   question_stimulus stores the stimulus content
--   quiz_questions.stimulus_id links to it (nullable for non-AKM questions)

CREATE TABLE IF NOT EXISTS public.question_stimuli (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title           TEXT,
    body            TEXT         NOT NULL,                    -- markdown / rich text
    media_url       TEXT,                                       -- optional: image / video / audio
    media_type      TEXT         CHECK (media_type IN ('image', 'video', 'audio', 'pdf') OR media_type IS NULL),
    source          TEXT,                                       -- citation
    created_by      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_stimuli_tenant ON public.question_stimuli(tenant_id);

ALTER TABLE public.quiz_questions
    ADD COLUMN IF NOT EXISTS stimulus_id UUID REFERENCES public.question_stimuli(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_stimulus
    ON public.quiz_questions(stimulus_id) WHERE stimulus_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_question_stimuli_updated_at ON public.question_stimuli;
CREATE OR REPLACE FUNCTION public.touch_question_stimuli_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_question_stimuli_updated_at
    BEFORE UPDATE ON public.question_stimuli
    FOR EACH ROW EXECUTE FUNCTION public.touch_question_stimuli_updated_at();
