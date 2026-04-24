-- 047_cp_tagging.sql
-- Fase 2 Unit 20: tag lesson/assignment/quiz to curriculum_items (CP/ATP)
--
-- Many-to-many: a lesson may cover multiple CPs; a CP may be touched by many
-- lessons. Same shape for assignments and quizzes. Aggregation views compute
-- nilai-per-CP downstream.

CREATE TABLE IF NOT EXISTS public.lesson_curriculum_items (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id          UUID         NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    curriculum_item_id UUID         NOT NULL REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    tenant_id          UUID         NOT NULL,
    weight             NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (lesson_id, curriculum_item_id)
);

CREATE TABLE IF NOT EXISTS public.assignment_curriculum_items (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id      UUID         NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    curriculum_item_id UUID         NOT NULL REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    tenant_id          UUID         NOT NULL,
    weight             NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (assignment_id, curriculum_item_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_curriculum_items (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id            UUID         NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    curriculum_item_id UUID         NOT NULL REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    tenant_id          UUID         NOT NULL,
    weight             NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (quiz_id, curriculum_item_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_ci_lesson ON public.lesson_curriculum_items(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ci_item   ON public.lesson_curriculum_items(curriculum_item_id);
CREATE INDEX IF NOT EXISTS idx_assignment_ci_assignment ON public.assignment_curriculum_items(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_ci_item       ON public.assignment_curriculum_items(curriculum_item_id);
CREATE INDEX IF NOT EXISTS idx_quiz_ci_quiz ON public.quiz_curriculum_items(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_ci_item ON public.quiz_curriculum_items(curriculum_item_id);
