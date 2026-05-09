import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'

import {
  type QuizFormData,
  QuizFormSchema,
  type QuizQuestion,
} from '@/shared/schemas/forms'

// Re-export types for backward compat with QuizManager / QuizEditorView importers.
export type { QuizFormData, QuizQuestion }

// ─────────────────────────────────────────────────────────
// Default form state
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
 * Wraps react-hook-form with valibot validation. Schema lives in
 * `@/shared/schemas/forms` for centralization (Task E-B1).
 */
export function useQuizForm(initialForm: QuizFormData = emptyForm) {
  const formMethods = useForm<QuizFormData>({
    resolver: valibotResolver(QuizFormSchema),
    defaultValues: initialForm,
    mode: 'onChange',
  })

  return {
    ...formMethods,
  }
}
