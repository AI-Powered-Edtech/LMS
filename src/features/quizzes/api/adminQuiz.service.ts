/**
 * adminQuiz.service.ts — Admin-level quiz analytics service
 *
 * Provides aggregated quiz data across all classes within a tenant.
 * Used by the Admin Quiz Overview dashboard.
 */

import { apiFetch } from '@/src/lib/api'
import { validateArray } from '@/src/shared/lib/validate'
import { QuizRowSchema } from '@/src/shared/schemas'

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
export async function getSchoolQuizOverview(_tenantId: string): Promise<AdminQuizOverviewItem[]> {
  // Fetch quizzes with their class and creator info
  const { data: quizzes, error } = await apiFetch('/quizzes')

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching school quizzes:', error)
    throw error
  }
  validateArray(QuizRowSchema, quizzes || [], 'adminQuiz.getSchoolQuizOverview')

  if (!quizzes || quizzes.length === 0) return []

  // Fetch quiz stats for all quizzes in one query
  const _quizIds = (quizzes as any[]).map((q: any) => q.id)
  const { data: stats } = await apiFetch('/quiz_stats')

  const statsMap = new Map((stats ?? []).map((s: any) => [s.quiz_id, s]))

  return (quizzes as any[]).map((q: any) => {
    const stat = statsMap.get(q.id) as any
    const classes = q.classes as unknown as { name: string } | null
    const profiles = q.profiles as unknown as { full_name: string } | null
    const questions = q.quiz_questions as unknown as { id: string }[] | null

    return {
      quiz_id: q.id,
      quiz_title: q.title ?? 'Untitled',
      class_name: classes?.name ?? null,
      teacher_name: profiles?.full_name ?? null,
      status: q.status ?? 'draft',
      question_count: questions?.length ?? 0,
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
  _limit: number = 50
): Promise<AntiCheatAuditEntry[]> {
  const { data, error } = await apiFetch('/quiz_cheating_signals')

  if (error) {
    if (import.meta.env.DEV) console.error('Error fetching audit log:', error)
    throw error
  }

  if (!data || data.length === 0) return []

  return (data as any[]).map((row: any) => {
    const attempt = row.quiz_attempts_v2 as unknown as Record<string, unknown>
    const profiles = attempt?.profiles as unknown as { full_name: string } | null
    const quizzes = attempt?.quizzes as unknown as { title: string } | null

    return {
      signal_id: row.id,
      attempt_id: row.attempt_id,
      student_name: profiles?.full_name ?? 'Siswa',
      quiz_title: quizzes?.title ?? '-',
      signal_type: row.signal_type,
      signal_count: 1,
      created_at: row.created_at,
    }
  })
}
