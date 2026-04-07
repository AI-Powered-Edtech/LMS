-- Phase 39A: AI Authoring Unification
-- Adds source tracking, lesson provenance, and curriculum alignment columns
-- to ai_generated_content and ai_generation_logs tables.

-- ─── ai_generated_content: add provenance + curriculum columns ─────────────────

ALTER TABLE public.ai_generated_content
  ADD COLUMN IF NOT EXISTS source_type  text NOT NULL DEFAULT 'file'
    CHECK (source_type IN ('file', 'lesson')),
  ADD COLUMN IF NOT EXISTS lesson_id    uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject      text,
  ADD COLUMN IF NOT EXISTS grade_level  text,
  ADD COLUMN IF NOT EXISTS curriculum_ref text;

CREATE INDEX IF NOT EXISTS idx_ai_gen_content_lesson_id
  ON public.ai_generated_content(lesson_id)
  WHERE lesson_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_gen_content_source_type
  ON public.ai_generated_content(source_type);

-- ─── ai_generation_logs: add source tracking ──────────────────────────────────

ALTER TABLE public.ai_generation_logs
  ADD COLUMN IF NOT EXISTS source_type  text DEFAULT 'file'
    CHECK (source_type IN ('file', 'lesson')),
  ADD COLUMN IF NOT EXISTS lesson_id    uuid REFERENCES public.lessons(id) ON DELETE SET NULL;

-- ─── One-time data migration: normalize creator questions format ──────────────
-- Convert old creator questions (answer: number index) to canonical format
-- (options: Array<{text: string, is_correct: boolean}>)
-- Only affects rows where source_type = 'file' and questions contain the old format
-- (detected by absence of question_type field in first question)

DO $$
DECLARE
  rec RECORD;
  q jsonb;
  new_questions jsonb;
  new_q jsonb;
  opts jsonb;
  i integer;
  answer_idx integer;
BEGIN
  FOR rec IN
    SELECT id, questions
    FROM public.ai_generated_content
    WHERE assignment_type = 'quiz'
      AND jsonb_array_length(questions) > 0
      AND (questions->0->>'question_type') IS NULL  -- old format detection
  LOOP
    new_questions := '[]'::jsonb;

    FOR i IN 0 .. jsonb_array_length(rec.questions) - 1 LOOP
      q := rec.questions->i;

      -- Check if this question has 'options' as array of strings (old format)
      IF jsonb_typeof(q->'options') = 'array'
         AND jsonb_array_length(q->'options') > 0
         AND jsonb_typeof(q->'options'->0) = 'string' THEN

        answer_idx := COALESCE((q->>'answer')::integer, 0);
        opts := '[]'::jsonb;

        FOR j IN 0 .. jsonb_array_length(q->'options') - 1 LOOP
          opts := opts || jsonb_build_object(
            'text', q->'options'->j,
            'is_correct', (j = answer_idx)
          );
        END LOOP;

        new_q := jsonb_build_object(
          'id',            COALESCE(q->>'id', gen_random_uuid()::text),
          'text',          COALESCE(q->>'text', ''),
          'question_type', 'MCQ',
          'points',        10,
          'explanation',   COALESCE(q->>'explanation', ''),
          'bloomLevel',    q->>'bloomLevel',
          'options',       opts
        );
      ELSE
        -- Already new format or open question, keep as-is
        new_q := q;
        -- Ensure question_type exists for open questions
        IF (new_q->>'question_type') IS NULL THEN
          new_q := new_q || '{"question_type": "OPEN"}'::jsonb;
        END IF;
      END IF;

      new_questions := new_questions || jsonb_build_array(new_q);
    END LOOP;

    UPDATE public.ai_generated_content
    SET questions = new_questions,
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.ai_generated_content.source_type IS
  'Source of generated content: file (uploaded document) or lesson (lesson content)';
COMMENT ON COLUMN public.ai_generated_content.lesson_id IS
  'FK to lessons table when source_type = lesson';
COMMENT ON COLUMN public.ai_generated_content.subject IS
  'Mata pelajaran (optional curriculum alignment)';
COMMENT ON COLUMN public.ai_generated_content.grade_level IS
  'Target class/grade (optional, e.g. VII, 10, SD Kelas 5)';
COMMENT ON COLUMN public.ai_generated_content.curriculum_ref IS
  'Curriculum reference (optional, e.g. CP Fase D, Kurikulum Merdeka)';
