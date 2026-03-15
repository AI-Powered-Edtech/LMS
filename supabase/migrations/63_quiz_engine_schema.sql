-- ============================================================
-- Migration 63: Core Quiz Engine Schema — Phase 1
-- Adds multi-question-type support, quiz modes, full question
-- snapshots, stats tables, and performance indexes.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE public.question_type AS ENUM (
      'MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'ESSAY'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_mode') THEN
    CREATE TYPE public.quiz_mode AS ENUM ('practice', 'graded', 'exam');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. quiz_questions — add question_type, points, explanation
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE public.quiz_questions
      ADD COLUMN IF NOT EXISTS question_type public.question_type DEFAULT 'MCQ';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'points'
  ) THEN
    ALTER TABLE public.quiz_questions
      ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'explanation'
  ) THEN
    ALTER TABLE public.quiz_questions
      ADD COLUMN IF NOT EXISTS explanation TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.quiz_questions.question_type IS 'Type of question: MCQ, TRUE_FALSE, MULTIPLE_SELECT, SHORT_ANSWER, ESSAY';
COMMENT ON COLUMN public.quiz_questions.points IS 'Point value for this question (used in scoring)';
COMMENT ON COLUMN public.quiz_questions.explanation IS 'Explanation shown after grading when show_correct_answers is enabled';

-- ────────────────────────────────────────────────────────────
-- 3. quizzes — add mode, show_correct_answers, availability
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'mode'
  ) THEN
    ALTER TABLE public.quizzes
      ADD COLUMN IF NOT EXISTS mode public.quiz_mode DEFAULT 'graded';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'show_correct_answers'
  ) THEN
    ALTER TABLE public.quizzes
      ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'available_from'
  ) THEN
    ALTER TABLE public.quizzes
      ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'available_until'
  ) THEN
    ALTER TABLE public.quizzes
      ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.quizzes.mode IS 'Quiz mode: practice (unlimited, show answers), graded (limited attempts), exam (1 attempt, no answers shown)';
COMMENT ON COLUMN public.quizzes.show_correct_answers IS 'Whether to show correct answers after submission';
COMMENT ON COLUMN public.quizzes.available_from IS 'Quiz is available starting from this timestamp';
COMMENT ON COLUMN public.quizzes.available_until IS 'Quiz is available until this timestamp';

-- ────────────────────────────────────────────────────────────
-- 4. quiz_attempt_questions — multi-type + snapshot support
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'selected_option_ids'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS selected_option_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'text_answer'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS text_answer TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'points_earned'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS points_earned NUMERIC(5,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'is_correct'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'question_snapshot'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS question_snapshot JSONB DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS question_type public.question_type DEFAULT 'MCQ';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'max_points'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 10;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'grader_comment'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS grader_comment TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'graded_by'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempt_questions' AND column_name = 'graded_at'
  ) THEN
    ALTER TABLE public.quiz_attempt_questions
      ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.quiz_attempt_questions.selected_option_ids IS 'Array of selected option UUIDs (supports MULTIPLE_SELECT)';
COMMENT ON COLUMN public.quiz_attempt_questions.text_answer IS 'Text response for SHORT_ANSWER and ESSAY question types';
COMMENT ON COLUMN public.quiz_attempt_questions.question_snapshot IS 'Full immutable snapshot of question + options at attempt start';
COMMENT ON COLUMN public.quiz_attempt_questions.points_earned IS 'Points awarded (auto or manual grading)';
COMMENT ON COLUMN public.quiz_attempt_questions.is_correct IS 'Whether the answer is correct (NULL = not yet graded)';

-- Migrate existing selected_option_id → selected_option_ids[]
UPDATE public.quiz_attempt_questions
SET selected_option_ids = ARRAY[selected_option_id]
WHERE selected_option_id IS NOT NULL
  AND (selected_option_ids IS NULL OR selected_option_ids = '{}');

-- ────────────────────────────────────────────────────────────
-- 5. quiz_attempts — attempt_seed + fix unique constraint
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'attempt_seed'
  ) THEN
    ALTER TABLE public.quiz_attempts
      ADD COLUMN IF NOT EXISTS attempt_seed UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

COMMENT ON COLUMN public.quiz_attempts.attempt_seed IS 'Deterministic seed for shuffling questions/options within this attempt';

-- Drop the broken UNIQUE(quiz_id, student_id) constraint
-- so students can have multiple attempts per quiz
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quiz_attempts_quiz_id_student_id_key'
      AND conrelid = 'public.quiz_attempts'::regclass
  ) THEN
    ALTER TABLE public.quiz_attempts
      DROP CONSTRAINT quiz_attempts_quiz_id_student_id_key;
  END IF;
END $$;

-- Add the correct constraint: unique per quiz + student + attempt_number
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_quiz_student_attempt'
      AND conrelid = 'public.quiz_attempts'::regclass
  ) THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT uq_quiz_student_attempt
      UNIQUE (quiz_id, student_id, attempt_number);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. quiz_stats + question_stats tables
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_stats (
  quiz_id UUID PRIMARY KEY REFERENCES public.quizzes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  total_attempts INTEGER DEFAULT 0,
  total_unique_students INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  median_score NUMERIC(5,2) DEFAULT 0,
  highest_score NUMERIC(5,2) DEFAULT 0,
  lowest_score NUMERIC(5,2) DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  pass_rate NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.quiz_stats IS 'Precomputed aggregate statistics per quiz, updated incrementally by triggers';

CREATE TABLE IF NOT EXISTS public.question_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  total_answers INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  difficulty_rate NUMERIC(5,2) DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, quiz_id)
);

COMMENT ON TABLE public.question_stats IS 'Per-question aggregate statistics for difficulty analysis';

-- ────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────────────────────────────────

-- GIN index for multi-select answer queries
CREATE INDEX IF NOT EXISTS idx_attempt_selected_options
  ON public.quiz_attempt_questions USING GIN(selected_option_ids);

-- Stats table indexes
CREATE INDEX IF NOT EXISTS idx_quiz_stats_tenant
  ON public.quiz_stats(tenant_id);

CREATE INDEX IF NOT EXISTS idx_question_stats_quiz
  ON public.question_stats(quiz_id);

CREATE INDEX IF NOT EXISTS idx_question_stats_tenant
  ON public.question_stats(tenant_id);

-- Question type filter
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_qtype
  ON public.quiz_attempt_questions(question_type);

-- Quiz mode filter
CREATE INDEX IF NOT EXISTS idx_quizzes_mode
  ON public.quizzes(mode);

-- Quiz availability window
CREATE INDEX IF NOT EXISTS idx_quizzes_available
  ON public.quizzes(available_from, available_until);

-- Attempt seed for deterministic shuffle lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_seed
  ON public.quiz_attempts(attempt_seed);
