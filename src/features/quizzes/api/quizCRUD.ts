// ==========================================================================
// Quiz CRUD — quizCRUD.ts
//
// Create, read, update, delete, and status management for quizzes.
// Extracted from quizManager.service.ts for modularity.
// ==========================================================================

import { apiFetch } from '@/src/lib/api'

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
  const { data, error } = await apiFetch('/quizzes')

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
  const { data, error } = await apiFetch('/quizzes')

  if (error) throw error
  return data
}

/**
 * Get quizzes by class
 */
export async function getQuizzesByClass(classId: string, tenantId: string) {
  const { data, error } = await apiFetch('/quiz_assignments')

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
  const { data, error } = await apiFetch('/quizzes')

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

  const { data, error } = await apiFetch('/quizzes')

  if (error) throw error

  // Auto-create assignment for the origin class
  const { error: assignError } = await apiFetch('/quiz_assignments')

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
  const { error } = await apiFetch('/quizzes')

  if (error) throw error
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string, tenantId: string) {
  const { error } = await apiFetch('/quizzes')

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
  const { error } = await apiFetch('/quizzes')

  if (error) throw error

  // Update all related assignment statuses
  const { data: assignments, error: assignmentError } = await apiFetch('/quiz_assignments')

  if (assignmentError) throw assignmentError

  if (!assignments || assignments.length === 0) return

  await Promise.all(
    assignments.map((assignment) =>
      apiFetch('/quiz_assignments')
    )
  )
}
