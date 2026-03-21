import { supabase } from '@/src/lib/supabase'
import type { QuestionType } from '@/src/features/quizzes'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface QuestionBankOption {
  id?: string
  option_text: string
  is_correct: boolean
  order_index: number
}

export interface QuestionBankItem {
  id: string
  subject_id: string | null
  topic_id: string | null
  question_type: QuestionType
  question_text: string
  explanation: string | null
  difficulty_level: number
  created_at: string
  tags: string[]
  options?: QuestionBankOption[]
}

export interface CreateQuestionPayload {
  subject_id?: string
  topic_id?: string
  type: QuestionType
  text: string
  explanation?: string
  difficulty_level?: number
  options: Omit<QuestionBankOption, 'id'>[]
  tags: string[]
}

export interface UpdateQuestionPayload extends CreateQuestionPayload {
  id: string
}

interface SearchQuestionsFilters {
  subject?: string
  topic?: string
  difficulty?: number
  questionType?: string
  query?: string
  tags?: string[]
  limit?: number
  offset?: number
}

// ────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────

export const questionBankService = {
  async createQuestion(payload: CreateQuestionPayload) {
    const { data, error } = await supabase.rpc('create_question', {
      p_subject_id: payload.subject_id || null,
      p_topic_id: payload.topic_id || null,
      p_question_type: payload.type,
      p_question_text: payload.text,
      p_explanation: payload.explanation || null,
      p_difficulty_level: payload.difficulty_level || 3,
      p_options: payload.options,
      p_tags: payload.tags,
    })

    if (error) throw error
    return data
  },

  async updateQuestion(payload: UpdateQuestionPayload) {
    // Prepare options with IDs if they exist
    const formattedOptions = payload.options.map(
      (opt: { id?: string; option_text: string; is_correct: boolean; order_index: number }) => ({
        id: opt.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        order_index: opt.order_index,
      })
    )

    const { data, error } = await supabase.rpc('update_question', {
      p_question_id: payload.id,
      p_subject_id: payload.subject_id || null,
      p_topic_id: payload.topic_id || null,
      p_question_type: payload.type,
      p_question_text: payload.text,
      p_explanation: payload.explanation || null,
      p_difficulty_level: payload.difficulty_level || 3,
      p_options: formattedOptions,
      p_tags: payload.tags,
    })

    if (error) throw error
    return data
  },

  async searchQuestions(filters: SearchQuestionsFilters): Promise<QuestionBankItem[]> {
    const { data, error } = await supabase.rpc('search_questions', {
      p_subject_id: filters.subject || null,
      p_topic_id: filters.topic || null,
      p_difficulty_level: filters.difficulty || null,
      p_question_type: filters.questionType || null,
      p_search_query: filters.query || null,
      p_tags: filters.tags || null,
      p_limit: filters.limit ?? 20,
      p_offset: filters.offset ?? 0,
    })

    if (error) throw error
    return data as QuestionBankItem[]
  },

  async getQuestion(questionId: string): Promise<QuestionBankItem> {
    const { data, error } = await supabase.rpc('get_question', {
      p_question_id: questionId,
    })

    if (error) throw error
    return data as QuestionBankItem
  },

  async getQuestionOptions(questionId: string): Promise<QuestionBankOption[]> {
    const { data, error } = await supabase.rpc('get_question_options', {
      p_question_id: questionId,
    })

    if (error) throw error
    return data as QuestionBankOption[]
  },

  async addQuestionToQuiz(
    questionId: string,
    quizId: string,
    _points: number = 1,
    orderIndex: number = 0
  ) {
    const { data, error } = await supabase.rpc('add_question_to_quiz', {
      p_quiz_id: quizId,
      p_question_bank_id: questionId,
      p_order: orderIndex,
    })

    if (error) throw error
    return data
  },

  async archiveQuestion(questionId: string) {
    const { data, error } = await supabase.rpc('archive_question', {
      p_question_id: questionId,
    })

    if (error) throw error
    return data
  },
}
