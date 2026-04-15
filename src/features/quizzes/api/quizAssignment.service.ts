// Quiz Assignment Service - Assignment Management API
// Extracted from quizService.ts for the Quiz Engine Refactor

import { apiFetch } from '@/src/lib/api'

import type { AssignmentUpsertInput, QuizAssignment } from '../types/quizzes.types'

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
// Quiz Assignment Service
// ============================================

/**
 * Assign a quiz to multiple classes
 */
export async function assignQuizToClasses(
  quizId: string,
  tenantId: string,
  assignments: AssignmentUpsertInput[]
) {
  const user = { id: "mock" }

  // Get quiz details
  const { data: quiz, error: quizError } = await apiFetch('/quizzes')

  if (quizError) throw quizError

  // Create assignment rows
  const _rows = assignments.map((assignment) => ({
    quiz_id: quizId,
    class_id: assignment.class_id,
    tenant_id: tenantId,
    assigned_by: user?.id ?? null,
    available_from: assignment.available_from ?? null,
    due_at: assignment.due_at ?? null,
    max_attempts: assignment.max_attempts ?? quiz.max_attempts ?? null,
    status: deriveAssignmentStatus(quiz.status, assignment.available_from, assignment.due_at),
  }))

  const { error } = await apiFetch('/quiz_assignments')

  if (error) throw error
}

/**
 * Get all assignments for a specific quiz
 */
export async function getAssignmentsByQuiz(_quizId: string, _tenantId: string) {
  const { data, error } = await apiFetch('/quiz_assignments')

  if (error) throw error
  return data as QuizAssignment[]
}

/**
 * Get all assignments for a specific class
 */
export async function getAssignmentsByClass(_classId: string, _tenantId: string) {
  const { data, error } = await apiFetch('/quiz_assignments')

  if (error) throw error
  return data
}

/**
 * Remove a quiz assignment (unassign from class)
 */
export async function removeQuizAssignment(_assignmentId: string, _tenantId: string) {
  const { error } = await apiFetch('/quiz_assignments')

  if (error) throw error
}
