// ==========================================================================
// Quiz Question Management — quizQuestionManagement.ts
//
// Question CRUD, option replacement, grading, and assignment results.
// Extracted from quizManager.service.ts for modularity.
// ==========================================================================

import { apiFetch } from '@/src/lib/api'

import type { QuestionType } from '../types/quizzes.types'

/**
 * Add a question to a quiz
 */
export async function addQuestionToQuiz(
  quizId: string,
  tenantId: string,

  question: {
    text: string
    question_type: QuestionType
    points?: number
    explanation?: string
    order: number
    options?: { text: string; is_correct: boolean }[]
  }
) {
  const { data: questionRow, error: questionError } = await apiFetch('/quiz_questions')

  if (questionError) throw questionError

  // Add options if provided
  if (question.options && question.options.length > 0) {
    const { error: optionError } = await apiFetch('/quiz_options')

    if (optionError) throw optionError
  }

  return questionRow
}

/**
 * Update a quiz question
 */
export async function updateQuizQuestion(
  questionId: string,
  updates: Record<string, unknown>,
  tenantId: string
) {
  const { error } = await apiFetch('/quiz_questions')

  if (error) throw error
}

/**
 * Replace all options for a question
 */
export async function replaceQuestionOptions(
  questionId: string,
  tenantId: string,

  options: { text: string; is_correct: boolean }[]
) {
  // Delete existing options
  await apiFetch('/quiz_options')

  // Insert new options
  if (options.length > 0) {
    const { error } = await apiFetch('/quiz_options')

    if (error) throw error
  }
}

/**
 * Grade a single question attempt
 */
export async function gradeAttemptQuestion(
  attemptId: string,
  questionId: string,
  _tenantId: string,
  pointsEarned: number,
  isCorrect: boolean,
  comment?: string
): Promise<{
  success: boolean
  attempt_id: string
  question_id: string
  points_earned: number
  is_correct: boolean
}> {
  const { data, error } = await apiFetch('/rpc/grade_attempt_question', { method: 'POST', body: JSON.stringify({
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_points_earned: pointsEarned,
      p_is_correct: isCorrect,
      p_comment: comment ?? null,
    }) })

  if (error) {
    if (import.meta.env.DEV) console.error('Error grading question:', error)
    throw new Error(error.message || 'Failed to grade question')
  }

  return data as {
    success: boolean
    attempt_id: string
    question_id: string
    points_earned: number
    is_correct: boolean
  }
}

/**
 * Get assignment results (all student attempts)
 */
export async function getAssignmentResults(assignmentId: string, _tenantId: string) {
  const session = { user: { id: "mock" } }
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await apiFetch('/rpc/v1_get_assignment_results', { method: 'POST', body: JSON.stringify({
      p_assignment_id: assignmentId,
    }) })

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching assignment results:', error)
    throw new Error(error.message || 'Failed to fetch assignment results')
  }

  return data || []
}
