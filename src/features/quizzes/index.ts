// Public API for the quizzes feature

// Types — only externally consumed
export type {
  QuestionType,
  QuizMode,
  AssignmentResultRow,
  SubmitAnswer,
  QuizAssignment,
  QuizAttemptResult,
  QuizAttemptQuestion,
  StudentQuizAssignment,
  QuizAttempt,
} from './types/quizzes.types'

// Backward-compat namespace (mirrors legacy services/quizService.ts export)
export * as quizService from './api/quizzes.service'
