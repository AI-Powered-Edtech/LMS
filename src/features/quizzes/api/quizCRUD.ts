// ==========================================================================
// Quiz CRUD — quizCRUD.ts
//
// Create, read, update, delete, and status management for quizzes.
// Extracted from quizManager.service.ts for modularity.
// ==========================================================================
import { supabase } from '@/src/services/supabase/client'
import { logger } from '@/src/utils/logger'

import type { QuizMode } from '../types/quizzes.types'

// ── Helper ─────────────────────────────────────────────────────

export function deriveAssignmentStatus(
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

// ── Read Operations ────────────────────────────────────────────

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

// ── Write Operations ───────────────────────────────────────────

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
    .select(
      'id, title, origin_class_id, class_id, course_id, tenant_id, instructions, mode, time_limit_minutes, max_attempts, passing_score, shuffle_questions, shuffle_options, show_correct_answers, available_from, available_until, status, created_at, updated_at'
    )
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
    if (import.meta.env.DEV) logger.error('Failed to auto-create quiz assignment:', assignError)
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
