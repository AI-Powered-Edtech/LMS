/**
 * suspiciousAttempts.service.ts — Anti-cheat review service for teachers
 *
 * Fetches cheating signals grouped by attempt, with student info.
 * Teachers can mark attempts as reviewed or override scores.
 */

import { supabase } from '@/src/services/supabase/client'
import { validateArray } from '@/src/shared/lib/validate'
import { CheatingSignalRowSchema } from '@/src/shared/schemas'

// ─── Types ───────────────────────────────────────────────

export interface SuspiciousAttempt {
  attempt_id: string
  student_id: string
  student_name: string
  quiz_title: string
  score: number | null
  status: string
  total_signals: number
  tab_switch_count: number
  window_blur_count: number
  other_signal_count: number
  first_signal_at: string | null
  last_signal_at: string | null
  severity: 'low' | 'medium' | 'high'
  is_reviewed: boolean
}

export interface CheatingSignal {
  id: string
  attempt_id: string
  signal_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Severity Classification ─────────────────────────────

function classifySeverity(tabSwitches: number, blurs: number): 'low' | 'medium' | 'high' {
  const total = tabSwitches + blurs
  if (total >= 5) return 'high'
  if (total >= 3) return 'medium'
  return 'low'
}

// ─── Service ─────────────────────────────────────────────

/**
 * Get suspicious attempts for a quiz — grouped by attempt with signal counts.
 */
export async function getSuspiciousAttempts(
  quizId: string,
  tenantId: string
): Promise<SuspiciousAttempt[]> {
  // Get all cheating signals for this quiz's attempts
  const { data: signals, error: signalError } = await supabase
    .from('quiz_cheating_signals')
    .select(
      `
      id,
      attempt_id,
      signal_type,
      metadata,
      created_at,
      quiz_attempts_v2!inner (
        id,
        student_id,
        quiz_id,
        score,
        status,
        tenant_id,
        profiles!quiz_attempts_v2_student_id_fkey ( full_name ),
        quizzes!quiz_attempts_v2_quiz_id_fkey ( title )
      )
    `
    )
    .eq('quiz_attempts_v2.quiz_id', quizId)
    .eq('quiz_attempts_v2.tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (signalError) {
    if (import.meta.env.DEV) console.error('Error fetching cheating signals:', signalError)
    throw signalError
  }
  validateArray(CheatingSignalRowSchema, signals || [], 'suspiciousAttempts.getSuspiciousAttempts')

  if (!signals || signals.length === 0) return []

  // Group signals by attempt_id
  const attemptMap = new Map<
    string,
    {
      signals: CheatingSignal[]
      attempt: Record<string, unknown>
    }
  >()

  for (const row of signals) {
    const attemptId = row.attempt_id
    const attempt = row.quiz_attempts_v2 as unknown as Record<string, unknown>

    if (!attemptMap.has(attemptId)) {
      attemptMap.set(attemptId, { signals: [], attempt })
    }

    attemptMap.get(attemptId)!.signals.push({
      id: row.id,
      attempt_id: row.attempt_id,
      signal_type: row.signal_type,
      metadata: row.metadata as Record<string, unknown> | null,
      created_at: row.created_at,
    })
  }

  // Transform to SuspiciousAttempt array
  const results: SuspiciousAttempt[] = []

  for (const [attemptId, { signals: sigs, attempt }] of attemptMap) {
    const tabSwitches = sigs.filter((s) => s.signal_type === 'TAB_SWITCH').length
    const blurs = sigs.filter((s) => s.signal_type === 'WINDOW_BLUR').length
    const others = sigs.length - tabSwitches - blurs
    const profiles = attempt.profiles as { full_name: string } | null
    const quizzes = attempt.quizzes as { title: string } | null

    results.push({
      attempt_id: attemptId,
      student_id: attempt.student_id as string,
      student_name: profiles?.full_name ?? 'Siswa',
      quiz_title: quizzes?.title ?? '-',
      score: attempt.score as number | null,
      status: attempt.status as string,
      total_signals: sigs.length,
      tab_switch_count: tabSwitches,
      window_blur_count: blurs,
      other_signal_count: others,
      first_signal_at: sigs.length > 0 ? sigs[0].created_at : null,
      last_signal_at: sigs.length > 0 ? sigs[sigs.length - 1].created_at : null,
      severity: classifySeverity(tabSwitches, blurs),
      is_reviewed: false, // TODO: add reviewed column to DB
    })
  }

  // Sort by severity (high first), then by total signals
  return results.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    const diff = severityOrder[a.severity] - severityOrder[b.severity]
    if (diff !== 0) return diff
    return b.total_signals - a.total_signals
  })
}

/**
 * Get the total count of suspicious attempts for a quiz (for badge display).
 */
export async function getSuspiciousAttemptCount(quizId: string, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('quiz_cheating_signals')
    .select('attempt_id', { count: 'exact', head: true })
    .eq('quiz_attempts_v2.quiz_id', quizId)
    .eq('quiz_attempts_v2.tenant_id', tenantId)

  if (error) {
    if (import.meta.env.DEV) console.error('Error counting suspicious attempts:', error)
    return 0
  }

  return count ?? 0
}
