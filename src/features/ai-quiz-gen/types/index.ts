export interface GenerateQuizConfig {
  lessonId: string
  questionCount: number
  questionTypes: ('MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER')[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GeneratedQuestion {
  text: string
  question_type: string
  points: number
  explanation: string
  options: Array<{ text: string; is_correct: boolean }>
}

export interface GenerateQuizResult {
  questions: GeneratedQuestion[]
  lesson_title: string
}
