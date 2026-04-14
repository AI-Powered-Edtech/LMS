/**
 * adminQuiz.service.ts — Admin-level quiz analytics service
 *
 * Provides aggregated quiz data across all classes within a tenant.
 * Used by the Admin Quiz Overview dashboard.
 */
import { supabase } from '@/src/services/supabase/client'
import { validateArray } from '@/src/shared/lib/validate'
import { QuizRowSchema } from '@/src/shared/schemas'
import { logger } from '@/src/utils/logger'

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
  // Fetch quizzes with their class and creator info
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select(
      `
      id,
      title,
      status,
      created_at,
      classes ( name ),
      profiles!quizzes_created_by_fkey ( full_name ),
      quiz_questions ( id )
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) logger.error('Error fetching school quizzes:', error)
    throw error
  }
  validateArray(QuizRowSchema, quizzes || [], 'adminQuiz.getSchoolQuizOverview')

  if (!quizzes || quizzes.length === 0) return []

  // Fetch quiz stats for all quizzes in one query
  const quizIds = quizzes.map((q) => q.id)
  const { data: stats } = await supabase
    .from('quiz_stats')
    .select('quiz_id, total_attempts, avg_score, pass_rate')
    .in('quiz_id', quizIds)
    .eq('tenant_id', tenantId)

  const statsMap = new Map((stats ?? []).map((s) => [s.quiz_id, s]))

  return quizzes.map((q) => {
    const stat = statsMap.get(q.id)
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
  limit: number = 50
): Promise<AntiCheatAuditEntry[]> {
  const { data, error } = await supabase
    .from('quiz_cheating_signals')
    .select(
      `
      id,
      attempt_id,
      signal_type,
      created_at,
      quiz_attempts_v2!inner (
        student_id,
        tenant_id,
        profiles!quiz_attempts_v2_student_id_fkey ( full_name ),
        quizzes!quiz_attempts_v2_quiz_id_fkey ( title )
      )
    `
    )
    .eq('quiz_attempts_v2.tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (import.meta.env.DEV) logger.error('Error fetching audit log:', error)
    throw error
  }

  if (!data || data.length === 0) return []

  return data.map((row) => {
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
