/**
 * adminQuiz.service.ts — Admin-level quiz analytics service
 *
 * Provides aggregated quiz data across all classes within a tenant.
 * Used by the Admin Quiz Overview dashboard.
 */

import { supabase } from '@/services/supabase/client'
import { validateArray } from '@/shared/lib/validate'
import { QuizRowSchema } from '@/shared/schemas'

// ─── Types ───────────────────────────────────────────────

export interface AdminQuizOverviewItem {
  quiz_id: string
  quiz_title: string
  class_name: string | null
  teacher_name: string | null
  status: string
  question_count: number
  total_attempts: number
  avg_score: number | null
  pass_rate: number | null
  created_at: string
}

export interface AntiCheatAuditEntry {
  signal_id: string
  attempt_id: string
  student_name: string
  quiz_title: string
  signal_type: string
  signal_count: number
  created_at: string
}

// ─── Service ─────────────────────────────────────────────

/**
 * Get school-wide quiz overview for admin dashboard.
 * Returns all quizzes in the tenant with aggregated stats.
 */
export async function getSchoolQuizOverview(tenantId: string): Promise<AdminQuizOverviewItem[]> {
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('id, title, status, created_at, class_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching school quizzes:', error)
    throw error
  }
  validateArray(QuizRowSchema, quizzes || [], 'adminQuiz.getSchoolQuizOverview')

  if (!quizzes || quizzes.length === 0) return []

  const quizIds = quizzes.map((q) => q.id)
  const classIds = quizzes.map((quiz) => quiz.class_id).filter(Boolean)

  const [{ data: stats }, { data: questions }, { data: classes, error: classesError }] =
    await Promise.all([
      supabase
        .from('quiz_stats')
        .select('quiz_id, total_attempts, avg_score, pass_rate')
        .in('quiz_id', quizIds)
        .eq('tenant_id', tenantId),
      supabase
        .from('quiz_questions')
        .select('id, quiz_id')
        .in('quiz_id', quizIds)
        .eq('tenant_id', tenantId),
      classIds.length > 0
        ? supabase
            .from('classes')
            .select('id, name, teacher_id')
            .eq('tenant_id', tenantId)
            .in('id', classIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (classesError) throw classesError

  const teacherIds = ((classes ?? []) as Array<{ teacher_id: string | null }>)
    .map((klass) => klass.teacher_id)
    .filter((teacherId): teacherId is string => Boolean(teacherId))

  const { data: teachers, error: teacherError } =
    teacherIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('tenant_id', tenantId)
          .in('id', teacherIds)
      : { data: [], error: null }

  if (teacherError) throw teacherError

  const statsMap = new Map((stats ?? []).map((s) => [s.quiz_id, s]))
  const questionCountMap = new Map<string, number>()
  ;((questions ?? []) as Array<{ quiz_id: string }>).forEach((question) => {
    questionCountMap.set(question.quiz_id, (questionCountMap.get(question.quiz_id) ?? 0) + 1)
  })
  const classMap = new Map(
    ((classes ?? []) as Array<{ id: string; name: string | null; teacher_id: string | null }>).map(
      (klass) => [klass.id, klass]
    )
  )
  const teacherMap = new Map(
    ((teachers ?? []) as Array<{ id: string; full_name: string | null }>).map((teacher) => [
      teacher.id,
      teacher.full_name,
    ])
  )

  return quizzes.map((q) => {
    const stat = statsMap.get(q.id)
    const klass = q.class_id ? classMap.get(q.class_id) : null

    return {
      quiz_id: q.id,
      quiz_title: q.title ?? 'Untitled',
      class_name: klass?.name ?? null,
      teacher_name: klass?.teacher_id ? (teacherMap.get(klass.teacher_id) ?? null) : null,
      status: q.status ?? 'draft',
      question_count: questionCountMap.get(q.id) ?? 0,
      total_attempts: stat?.total_attempts ?? 0,
      avg_score: stat?.avg_score ?? null,
      pass_rate: stat?.pass_rate ?? null,
      created_at: q.created_at,
    }
  })
}

/**
 * Get anti-cheat audit log for the entire school.
 * Returns recent cheating signals with student and quiz info.
 */
export async function getAntiCheatAuditLog(
  tenantId: string,
  limit: number = 50
): Promise<AntiCheatAuditEntry[]> {
  const { data, error } = await supabase
    .from('quiz_cheating_signals')
    .select('id, attempt_id, signal_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching audit log:', error)
    throw error
  }

  if (!data || data.length === 0) return []

  const attemptIds = data.map((row) => row.attempt_id)
  const { data: attempts, error: attemptError } = await supabase
    .from('quiz_attempts_v2')
    .select('id, student_id, quiz_id, tenant_id')
    .eq('tenant_id', tenantId)
    .in('id', attemptIds)

  if (attemptError) throw attemptError

  const filteredAttempts = (attempts ?? []) as Array<{
    id: string
    student_id: string
    quiz_id: string
  }>

  const studentIds = filteredAttempts.map((attempt) => attempt.student_id)
  const quizIds = filteredAttempts.map((attempt) => attempt.quiz_id)

  const [{ data: profiles, error: profileError }, { data: quizzes, error: quizError }] =
    await Promise.all([
      studentIds.length > 0
        ? supabase
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', tenantId)
            .in('id', studentIds)
        : Promise.resolve({ data: [], error: null }),
      quizIds.length > 0
        ? supabase
            .from('quizzes')
            .select('id, title')
            .eq('tenant_id', tenantId)
            .in('id', quizIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (profileError) throw profileError
  if (quizError) throw quizError

  const attemptMap = new Map(filteredAttempts.map((attempt) => [attempt.id, attempt]))
  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  )
  const quizMap = new Map(
    ((quizzes ?? []) as Array<{ id: string; title: string | null }>).map((quiz) => [
      quiz.id,
      quiz.title,
    ])
  )

  return data.map((row) => {
    const attempt = attemptMap.get(row.attempt_id)

    return {
      signal_id: row.id,
      attempt_id: row.attempt_id,
      student_name: attempt ? (profileMap.get(attempt.student_id) ?? 'Siswa') : 'Siswa',
      quiz_title: attempt ? (quizMap.get(attempt.quiz_id) ?? '-') : '-',
      signal_type: row.signal_type,
      signal_count: 1,
      created_at: row.created_at,
    }
  })
}
