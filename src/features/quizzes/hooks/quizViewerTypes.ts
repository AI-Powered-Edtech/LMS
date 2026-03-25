import type { QuestionType as BaseQuestionType } from '@/src/features/quizzes'

export type QuestionType = BaseQuestionType

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  text: string
  order: number
  question_type?: QuestionType
  points?: number
  quiz_options: QuizOption[]
}

export interface MultiTypeAnswer {
  selected_option_ids: string[]
  text_answer?: string
}
