// Quiz Domain Types
// Consolidated from quizService.ts for the Quiz Engine Refactor

// ============================================
// Enums
// ============================================

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY'

export type QuizMode = 'practice' | 'graded' | 'exam'

export type QuizStatus = 'draft' | 'published' | 'archived'

export type QuizAttemptStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'GRADED'
  | 'ABANDONED'

export type QuizAssignmentStatus = 'draft' | 'active' | 'scheduled' | 'ended'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

// ============================================
// Core Domain Types
// ============================================

export interface QuizOptionSnapshot {
  id: string
  text: string
  is_correct?: boolean
  order: number
}

export interface QuestionSnapshot {
  question_id: string
  text: string
  question_type: QuestionType
  points: number
  explanation: string | null
  options: QuizOptionSnapshot[]
}

export interface QuizAttemptQuestion {
  id: string
  question_id: string
  text: string
  explanation: string | null
  order_index: number
  question_type: QuestionType
  max_points: number
  selected_option_id: string | null
  selected_option_ids: string[]
  text_answer: string | null
  points_earned: number | null
  is_correct: boolean | null
  grader_comment: string | null
  graded_by: string | null
  graded_at: string | null
  quiz_options: QuizOptionSnapshot[]
  question_snapshot: QuestionSnapshot
}

export interface QuizAttemptResult {
  attempt_id: string
  status: string
  score: number
  passed: boolean | null
  total_correct: number
  correct_answers: number
  total_questions: number
  time_spent: number
  has_ungraded: boolean
  show_correct_answers: boolean
  version?: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  assignment_id: string | null
  student_id: string
  tenant_id: string
  status: QuizAttemptStatus
  score: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
  finished_at: string | null
  expires_at: string | null
  time_spent: number | null
  attempt_number: number
  attempt_seed: string | null
  version?: number
  // Backend field for resume functionality (quiz_attempts_v2.current_index)
  currentIndex?: number
  quizzes?: {
    title: string
    passing_score: number
    mode: QuizMode
    show_correct_answers: boolean
  } | null
  quiz_assignments?: {
    id: string
    class_id: string
    classes?: {
      id?: string
      name?: string | null
    } | null
  } | null
  quiz_attempt_questions?: QuizAttemptQuestion[]
}

export interface QuizAssignment {
  id: string
  quiz_id: string
  class_id: string
  tenant_id: string
  status: QuizAssignmentStatus
  available_from?: string | null
  due_at?: string | null
  max_attempts?: number | null
  classes?: {
    id?: string
    name?: string | null
  } | null
}

export interface StudentQuizAssignment {
  id: string
  assignment_id: string
  quiz_id: string
  class_id: string
  class_name: string
  title: string
  instructions: string | null
  mode: QuizMode
  status: QuizAssignmentStatus
  available_from?: string | null
  due_at?: string | null
  time_limit_minutes: number | null
  max_attempts: number | null
  passing_score: number | null
  show_correct_answers: boolean
  quiz_questions: Array<{ id: string }>
  quizzes?: {
    id: string
    title: string
    instructions: string | null
    mode: QuizMode
    time_limit_minutes: number | null
    max_attempts: number | null
    passing_score: number | null
    show_correct_answers: boolean
    status: string
    available_from?: string | null
    available_until?: string | null
    quiz_questions?: Array<{ id: string }>
  } | null
  classes?: {
    id?: string
    name?: string | null
  } | null
}

export interface SubmitAnswer {
  question_id: string
  selected_option_ids: string[]
  text_answer?: string
}

export interface AssignmentResultRow {
  attempt_id: string
  student_id: string
  student_name: string
  started_at: string
  submitted_at: string | null
  score: number | null
  status: string
  passed: boolean | null
  time_spent: number | null
  quiz_id: string
  quiz_title: string
  passing_score: number
  max_attempts: number | null
}

// ============================================
// Input Types
// ============================================

export type StartQuizAttemptInput =
  | string
  | {
      quizId: string
      assignmentId?: string | null
    }

export type AssignmentUpsertInput = {
  class_id: string
  available_from?: string
  due_at?: string
  max_attempts?: number | null
}

// ============================================
// Service Return Types
// ============================================

export interface StartQuizAttemptResult {
  attempt_id: string
  assignment_id?: string | null
  status: string
  recovered: boolean
  expires_at: string | null
  attempt_number?: number
  attempt_seed?: string
  version?: number
  question_manifest?: string[]
}
