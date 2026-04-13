// Public API for the quizzes feature

// Types — only externally consumed
export type {
  AssignmentResultRow,
  QuestionType,
  QuizAssignment,
  QuizAttempt,
  QuizAttemptQuestion,
  QuizAttemptResult,
  QuizMode,
  StudentQuizAssignment,
  SubmitAnswer,
} from './types/quizzes.types'

// Backward-compat namespace (mirrors legacy services/quizService.ts export)
export * as quizService from './api/quizzes.service'

// Hooks
export { useOfflineQuiz } from './hooks/useOfflineQuiz'
