// ==========================================================================
// Quiz Question Management — quizQuestionManagement.ts
//
// Question CRUD, option replacement, grading, and assignment results.
// Extracted from quizManager.service.ts for modularity.
// ==========================================================================

import { supabase } from '@/src/services/supabase/client'

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
  const { data: questionRow, error: questionError } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: quizId,
      tenant_id: tenantId,
      text: question.text,
      question_type: question.question_type,
      points: question.points || 1,
      explanation: question.explanation || null,
      order: question.order,
    })
    .select('id, quiz_id, tenant_id, text, question_type, points, explanation, "order"')
    .single()

  if (questionError) throw questionError

  // Add options if provided
  if (question.options && question.options.length > 0) {
    const { error: optionError } = await supabase.from('quiz_options').insert(
      question.options.map((option) => ({
        question_id: questionRow.id,
        text: option.text,
        is_correct: option.is_correct,
        tenant_id: tenantId,
      }))
    )

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
  const { error } = await supabase
    .from('quiz_questions')
    .update(updates)
    .eq('id', questionId)
    .eq('tenant_id', tenantId)

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
  await supabase
    .from('quiz_options')
    .delete()
    .eq('question_id', questionId)
    .eq('tenant_id', tenantId)

  // Insert new options
  if (options.length > 0) {
    const { error } = await supabase.from('quiz_options').insert(
      options.map((option) => ({
        question_id: questionId,
        text: option.text,
        is_correct: option.is_correct,
        tenant_id: tenantId,
      }))
    )

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
  const { data, error } = await supabase.rpc('grade_attempt_question', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_points_earned: pointsEarned,
    p_is_correct: isCorrect,
    p_comment: comment ?? null,
  })

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
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('v1_get_assignment_results', {
    p_assignment_id: assignmentId,
  })

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching assignment results:', error)
    throw new Error(error.message || 'Failed to fetch assignment results')
  }

  return data || []
}
export async function deleteQuizQuestion(questionId: string, tenantId: string) {
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId)
    .eq('tenant_id', tenantId)
  if (error) throw error
}
