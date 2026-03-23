// Quiz Manager Service - Teacher-facing API
// Extracted from quizService.ts for the Quiz Engine Refactor

import { supabase } from '@/src/services/supabase/client'

import type { QuestionType, QuizMode } from '../types/quizzes.types'

// ============================================
// Helper Functions
// ============================================

function deriveAssignmentStatus(
  quizStatus: string,
  availableFrom?: string | null,
  dueAt?: string | null
): 'draft' | 'active' | 'scheduled' | 'ended' {
  if (quizStatus !== 'published') return 'draft'

  const now = Date.now()
  if (dueAt && new Date(dueAt).getTime() < now) return 'ended'
  if (availableFrom && new Date(availableFrom).getTime() > now) return 'scheduled'
  return 'active'
}

// ============================================
// Quiz Manager Service
// ============================================

/**
 * Get all quizzes for a teacher (tenant-level)
 */
export async function getTeacherQuizzes(tenantId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
      *,
      quiz_assignments ( id, class_id ),
      quiz_questions ( id )
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(
    (
      quiz: Record<string, unknown> & { quiz_assignments?: unknown[]; quiz_questions?: unknown[] }
    ) => ({
      ...quiz,
      assignment_count: (quiz.quiz_assignments || []).length,
      question_count: (quiz.quiz_questions || []).length,
    })
  )
}

/**
 * Get quizzes by course
 */
export async function getQuizzesByCourse(courseId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
      *,
      quiz_questions (
        id, text, "order", question_type, points,
        quiz_options (id, text)
      )
    `
    )
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .eq('status', 'published')

  if (error) throw error
  return data
}

/**
 * Get quizzes by class
 */
export async function getQuizzesByClass(classId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('quiz_assignments')
    .select(
      `
      *,
      quizzes (
        id,
        title,
        status,
        mode,
        time_limit_minutes,
        max_attempts,
        passing_score,
        created_at,
        updated_at,
        available_from,
        available_until,
        show_correct_answers,
        shuffle_questions,
        shuffle_options,
        quiz_questions ( id )
      )
    `
    )
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .order('available_from', { ascending: false })

  if (error) throw error

  return (data || []).map(
    (assignment: Record<string, unknown> & { quizzes?: Record<string, unknown> }) => ({
      ...(assignment.quizzes || {}),
      assignment_id: assignment.id,
      assignment_status: assignment.status,
      assignment_available_from: assignment.available_from,
      assignment_due_at: assignment.due_at,
      question_count: ((assignment.quizzes?.quiz_questions as unknown[]) || []).length,
    })
  )
}

/**
 * Get quiz with all questions and options
 */
export async function getQuizWithQuestions(quizId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
      *,
      quiz_questions (
        id,
        text,
        "order",
        question_type,
        points,
        explanation,
        tenant_id,
        quiz_options ( id, text, is_correct )
      )
    `
    )
    .eq('id', quizId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw error

  if (data?.quiz_questions) {
    data.quiz_questions.sort((a: { order: number }, b: { order: number }) => a.order - b.order)
  }

  return data
}

/**
 * Create a new quiz
 */
export async function createQuiz(payload: {
  title: string
  class_id: string
  course_id?: string
  tenant_id: string
  instructions?: string
  mode?: QuizMode
  time_limit_minutes?: number
  max_attempts?: number
  passing_score?: number
  shuffle_questions?: boolean
  shuffle_options?: boolean
  show_correct_answers?: boolean
  available_from?: string | null
  due_at?: string | null
  available_until?: string | null
}) {
  const dueAt = payload.due_at ?? payload.available_until ?? null

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      title: payload.title,
      origin_class_id: payload.class_id,
      class_id: null,
      course_id: payload.course_id || null,
      tenant_id: payload.tenant_id,
      instructions: payload.instructions || null,
      mode: payload.mode || 'graded',
      time_limit_minutes: payload.time_limit_minutes || null,
      max_attempts: payload.max_attempts || 3,
      passing_score: payload.passing_score || 70,
      shuffle_questions: payload.shuffle_questions || false,
      shuffle_options: payload.shuffle_options || false,
      show_correct_answers: payload.show_correct_answers || false,
      available_from: payload.available_from || null,
      available_until: dueAt,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error

  // Auto-create assignment for the origin class
  const { error: assignError } = await supabase.from('quiz_assignments').upsert(
    {
      quiz_id: data.id,
      class_id: payload.class_id,
      tenant_id: payload.tenant_id,
      available_from: payload.available_from || null,
      due_at: dueAt,
      max_attempts: payload.max_attempts || 3,
      status: 'draft',
    },
    { onConflict: 'quiz_id,class_id' }
  )

  if (assignError) {
    if (import.meta.env.DEV) console.error('Failed to auto-create quiz assignment:', assignError)
    throw assignError
  }

  return data
}

/**
 * Update quiz details
 */
export async function updateQuiz(
  quizId: string,
  updates: Record<string, unknown>,
  tenantId: string
) {
  const { error } = await supabase
    .from('quizzes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', quizId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string, tenantId: string) {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}

/**
 * Set quiz status (draft/published)
 */
export async function setQuizStatus(
  quizId: string,
  status: 'draft' | 'published',
  tenantId: string
) {
  const { error } = await supabase
    .from('quizzes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quizId)
    .eq('tenant_id', tenantId)

  if (error) throw error

  // Update all related assignment statuses
  const { data: assignments, error: assignmentError } = await supabase
    .from('quiz_assignments')
    .select('id, available_from, due_at')
    .eq('quiz_id', quizId)

  if (assignmentError) throw assignmentError

  if (!assignments || assignments.length === 0) return

  await Promise.all(
    assignments.map((assignment) =>
      supabase
        .from('quiz_assignments')
        .update({
          status: deriveAssignmentStatus(status, assignment.available_from, assignment.due_at),
        })
        .eq('id', assignment.id)
    )
  )
}

// ============================================
// Question Management
// ============================================

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
    .select()
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

// ============================================
// Grading
// ============================================

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
