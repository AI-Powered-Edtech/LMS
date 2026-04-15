// Quiz Assignment Service - Assignment Management API
// Extracted from quizService.ts for the Quiz Engine Refactor

import { db } from '@/services/db'

import type { AssignmentUpsertInput, QuizAssignment } from '../types/quizzes.types'

interface QuizAssignmentRow {
  id: string
  quiz_id: string
  class_id: string
  tenant_id: string
  status: QuizAssignment['status']
  available_from?: string | null
  due_at?: string | null
  max_attempts?: number | null
}

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
  } = await db.auth.getUser()

  // Get quiz details
  const { data: quiz, error: quizError } = await db
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

  const { error } = await db
    .from('quiz_assignments')
    .upsert(rows, { onConflict: 'quiz_id,class_id' })

  if (error) throw error
}

/**
 * Get all assignments for a specific quiz
 */
export async function getAssignmentsByQuiz(quizId: string, tenantId: string) {
  const { data, error } = await db
    .from('quiz_assignments')
    .select('id, quiz_id, class_id, tenant_id, status, available_from, due_at, max_attempts')
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as QuizAssignmentRow[]
  const classIds = rows.map((row) => row.class_id)
  const { data: classes, error: classError } =
    classIds.length > 0
      ? await db.from('classes').select('id, name').eq('tenant_id', tenantId).in('id', classIds)
      : { data: [], error: null }

  if (classError) throw classError

  const classMap = new Map(
    ((classes ?? []) as Array<{ id: string; name: string | null }>).map((klass) => [
      klass.id,
      klass,
    ])
  )

  return rows.map((row) => ({
    ...row,
    classes: classMap.get(row.class_id) ?? null,
  })) as QuizAssignment[]
}

/**
 * Get all assignments for a specific class
 */
export async function getAssignmentsByClass(classId: string, tenantId: string) {
  const { data, error } = await db
    .from('quiz_assignments')
    .select('id, quiz_id, class_id, tenant_id, status, available_from, due_at, max_attempts')
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)

  if (error) throw error

  const rows = (data ?? []) as QuizAssignmentRow[]
  const quizIds = rows.map((row) => row.quiz_id)

  const [{ data: classes, error: classError }, { data: quizzes, error: quizError }] =
    await Promise.all([
      db.from('classes').select('id, name').eq('tenant_id', tenantId).eq('id', classId),
      quizIds.length > 0
        ? db
            .from('quizzes')
            .select('id, title, mode, passing_score, status, time_limit_minutes, max_attempts')
            .eq('tenant_id', tenantId)
            .in('id', quizIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (classError) throw classError
  if (quizError) throw quizError

  const { data: questions, error: questionError } =
    quizIds.length > 0
      ? await db
          .from('quiz_questions')
          .select('id, quiz_id')
          .eq('tenant_id', tenantId)
          .in('quiz_id', quizIds)
      : { data: [], error: null }

  if (questionError) throw questionError

  const classRecord = ((classes ?? []) as Array<{ id: string; name: string | null }>)[0] ?? null
  const questionMap = new Map<string, Array<{ id: string }>>()
  ;((questions ?? []) as Array<{ id: string; quiz_id: string }>).forEach((question) => {
    const existing = questionMap.get(question.quiz_id) ?? []
    existing.push({ id: question.id })
    questionMap.set(question.quiz_id, existing)
  })
  const quizMap = new Map(
    (
      (quizzes ?? []) as Array<{
        id: string
        title: string
        mode: string
        passing_score: number | null
        status: string
        time_limit_minutes: number | null
        max_attempts: number | null
      }>
    ).map((quiz) => [
      quiz.id,
      {
        ...quiz,
        quiz_questions: questionMap.get(quiz.id) ?? [],
      },
    ])
  )

  return rows.map((row) => ({
    ...row,
    classes: classRecord,
    quizzes: quizMap.get(row.quiz_id) ?? null,
  }))
}

/**
 * Remove a quiz assignment (unassign from class)
 */
export async function removeQuizAssignment(assignmentId: string, tenantId: string) {
  const { error } = await db
    .from('quiz_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}

/**
 * Fetch quiz assignments for a specific class (used by Quiz Gradebook).
 * Returns assignment ID, quiz_id, max_attempts, and joined quiz title/passing_score.
 */
export async function getClassQuizAssignments(
  classId: string,
  tenantId: string
): Promise<
  Array<{
    id: string
    quiz_id: string
    title: string
    passing_score: number
    max_attempts: number | null
  }>
> {
  const { data, error } = await db
    .from('quiz_assignments')
    .select('id, quiz_id, max_attempts')
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as Array<{ id: string; quiz_id: string; max_attempts: number | null }>
  const quizIds = rows.map((row) => row.quiz_id)
  const { data: quizzes, error: quizError } =
    quizIds.length > 0
      ? await db
          .from('quizzes')
          .select('id, title, passing_score, max_attempts, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'published')
          .in('id', quizIds)
      : { data: [], error: null }

  if (quizError) throw quizError

  const quizMap = new Map(
    (
      (quizzes ?? []) as Array<{
        id: string
        title: string | null
        passing_score: number | null
        max_attempts: number | null
        status: string
      }>
    ).map((quiz) => [quiz.id, quiz])
  )

  return rows
    .filter((assignment) => quizMap.has(assignment.quiz_id))
    .map((assignment) => {
      const quiz = quizMap.get(assignment.quiz_id)
      return {
        id: assignment.id,
        quiz_id: assignment.quiz_id,
        title: quiz?.title || 'Kuis',
        passing_score: quiz?.passing_score || 70,
        max_attempts: assignment.max_attempts ?? quiz?.max_attempts ?? null,
      }
    })
}

/**
 * Fetch teacher's classes for a tenant (used by Quiz Gradebook class selector).
 */
export async function getTeacherClasses(
  teacherId: string,
  tenantId: string
): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await db
    .from('classes')
    .select('id, name')
    .eq('teacher_id', teacherId)
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Array<{ id: string; name: string }>
}
