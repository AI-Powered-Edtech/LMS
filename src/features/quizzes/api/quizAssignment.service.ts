// Quiz Assignment Service - Assignment Management API
// Extracted from quizService.ts for the Quiz Engine Refactor

import { supabase } from '../../../lib/supabase'
import type { QuizAssignment, AssignmentUpsertInput } from '../types/quizzes.types'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get quiz details
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('status, max_attempts')
    .eq('id', quizId)
    .single()

  if (quizError) throw quizError

  // Create assignment rows
  const rows = assignments.map((assignment) => ({
    quiz_id: quizId,
    class_id: assignment.class_id,
    tenant_id: tenantId,
    assigned_by: user?.id ?? null,
    available_from: assignment.available_from ?? null,
    due_at: assignment.due_at ?? null,
    max_attempts: assignment.max_attempts ?? quiz.max_attempts ?? null,
    status: deriveAssignmentStatus(quiz.status, assignment.available_from, assignment.due_at),
  }))

  const { error } = await supabase
    .from('quiz_assignments')
    .upsert(rows, { onConflict: 'quiz_id,class_id' })

  if (error) throw error
}

/**
 * Get all assignments for a specific quiz
 */
export async function getAssignmentsByQuiz(quizId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('quiz_assignments')
    .select(
      `
      *,
      classes (
        id,
        name
      )
    `
    )
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as QuizAssignment[]
}

/**
 * Get all assignments for a specific class
 */
export async function getAssignmentsByClass(classId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('quiz_assignments')
    .select(
      `
      *,
      classes (
        id,
        name
      ),
      quizzes (
        id,
        title,
        mode,
        passing_score,
        status,
        time_limit_minutes,
        max_attempts,
        quiz_questions (id)
      )
    `
    )
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)

  if (error) throw error
  return data
}

/**
 * Remove a quiz assignment (unassign from class)
 */
export async function removeQuizAssignment(assignmentId: string, tenantId: string) {
  const { error } = await supabase
    .from('quiz_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}
