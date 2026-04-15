import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import * as v from 'valibot'

// ─────────────────────────────────────────────────────────
// Valibot Schemas
// ─────────────────────────────────────────────────────────

export const quizOptionSchema = v.object({
  id: v.optional(v.string()),
  text: v.pipe(v.string(), v.minLength(1, 'Opsi tidak boleh kosong')),
  is_correct: v.boolean(),
})

export const quizQuestionSchema = v.object({
  id: v.optional(v.string()),
  text: v.pipe(v.string(), v.minLength(1, 'Pertanyaan wajib diisi')),
  order: v.number(),
  question_type: v.picklist([
    'MCQ',
    'TRUE_FALSE',
    'MULTIPLE_SELECT',
    'SHORT_ANSWER',
    'ESSAY',
  ] as const),
  points: v.pipe(v.number(), v.minValue(1, 'Poin minimal 1')),
  explanation: v.nullable(v.string()),
  tenant_id: v.optional(v.string()),
  options: v.array(quizOptionSchema),
})

export const quizFormSchema = v.object({
  id: v.optional(v.string()),
  title: v.pipe(v.string(), v.minLength(1, 'Judul kuis wajib diisi')),
  instructions: v.string(),
  mode: v.picklist(['practice', 'graded', 'exam'] as const),
  time_limit_minutes: v.nullable(v.pipe(v.number(), v.minValue(0, 'Waktu tidak boleh negatif'))),
  max_attempts: v.pipe(v.number(), v.minValue(1, 'Minimal 1 percobaan')),
  passing_score: v.pipe(
    v.number(),
    v.minValue(0, 'Nilai lulus minimal 0'),
    v.maxValue(100, 'Nilai lulus maksimal 100')
  ),
  shuffle_questions: v.boolean(),
  shuffle_options: v.boolean(),
  show_correct_answers: v.boolean(),
  available_from: v.string(),
  due_at: v.string(),
  status: v.picklist(['draft', 'published', 'archived'] as const),
  questions: v.array(quizQuestionSchema),
})

export type QuizFormData = v.InferInput<typeof quizFormSchema>
export type QuizQuestion = v.InferInput<typeof quizQuestionSchema>

// ─────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────

export const emptyForm: QuizFormData = {
  title: '',
  instructions: '',
  mode: 'graded',
  time_limit_minutes: 15,
  max_attempts: 3,
  passing_score: 70,
  shuffle_questions: false,
  shuffle_options: false,
  show_correct_answers: false,
  available_from: '',
  due_at: '',
  status: 'draft',
  questions: [],
}

/**
 * EduSync LMS — Quiz Form Hook
 * Wraps react-hook-form with valibot validation and custom helper methods
 * for adding/removing questions and options.
 */
export function useQuizForm(initialForm: QuizFormData = emptyForm) {
  const formMethods = useForm<QuizFormData>({
    resolver: valibotResolver(quizFormSchema),
    defaultValues: initialForm,
    mode: 'onChange',
  })

  // We expose some legacy helper styles if needed, or we'll use useFieldArray in the components
  return {
    ...formMethods,
  }
}
