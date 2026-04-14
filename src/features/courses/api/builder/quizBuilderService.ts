import { apiFetch } from '@/src/lib/api'

// ============================================================
// Types (exported for use in QuizBlockEditor)
// ============================================================

export interface QuizBlockData {
  id?: string
  title: string
  instructions: string | null
  max_attempts: number
  passing_score?: number
  shuffle_questions?: boolean
  shuffle_options?: boolean
  time_limit_minutes?: number
  status?: 'draft' | 'published' | 'archived'
  mode?: 'practice' | 'graded' | 'exam'
  show_correct_answers?: boolean
  available_from?: string | null
  available_until?: string | null
  questions: {
    id?: string
    text: string
    order: number
    question_type?: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY'
    points?: number
    explanation?: string | null
    options: {
      id?: string
      text: string
      is_correct: boolean
    }[]
  }[]
}

// ============================================================
// Service (tenant-aware)
// ============================================================

export const builderQuizService = {
  async getQuizByLesson(lessonId: string, tenantId: string) {
    const { data, error } = await apiFetch('/quizzes')

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data || null
  },

  async saveQuizData(
    lessonId: string,
    tenantId: string,
    data: QuizBlockData
  ): Promise<{ quiz_id: string }> {
    const { data: result, error } = await apiFetch('/rpc/save_quiz_builder', { method: 'POST', body: JSON.stringify({
          p_lesson_id: lessonId,
          p_tenant_id: tenantId,
          p_quiz_data: data,
        }) })
    if (error) throw new Error(error.message)
    return result as { quiz_id: string }
  },

  async publishQuiz(quizId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/quizzes')
    if (error) throw new Error(error.message)
  },

  async draftQuiz(quizId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/quizzes')
    if (error) throw new Error(error.message)
  },
}
