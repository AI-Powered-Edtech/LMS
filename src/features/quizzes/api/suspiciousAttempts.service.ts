/**
 * suspiciousAttempts.service.ts — Anti-cheat review service for teachers
 *
 * Fetches cheating signals grouped by attempt, with student info.
 * Teachers can mark attempts as reviewed or override scores.
 */

import { db } from '@/services/db'
import { validateArray } from '@/shared/lib/validate'
import { CheatingSignalRowSchema } from '@/shared/schemas'

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
  const { data: attempts, error: attemptError } = await db
    .from('quiz_attempts_v2')
    .select('id, student_id, quiz_id, score, status, is_reviewed')
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)

  if (attemptError) {
    if (import.meta.env.DEV) console.error('Error fetching quiz attempts:', attemptError)
    throw attemptError
  }

  const attemptRows = (attempts ?? []) as Array<{
    id: string
    student_id: string
    quiz_id: string
    score: number | null
    status: string
    is_reviewed: boolean | null
  }>
  const attemptIds = attemptRows.map((attempt) => attempt.id)
  if (attemptIds.length === 0) return []

  const { data: signals, error: signalError } = await db
    .from('quiz_cheating_signals')
    .select('id, attempt_id, signal_type, metadata, created_at')
    .in('attempt_id', attemptIds)
    .order('created_at', { ascending: true })

  if (signalError) {
    if (import.meta.env.DEV) console.error('Error fetching cheating signals:', signalError)
    throw signalError
  }
  validateArray(CheatingSignalRowSchema, signals || [], 'suspiciousAttempts.getSuspiciousAttempts')

  if (!signals || signals.length === 0) return []

  const studentIds = attemptRows.map((attempt) => attempt.student_id)
  const [{ data: profiles }, { data: quizzes }] = await Promise.all([
    studentIds.length > 0
      ? db
          .from('profiles')
          .select('id, full_name')
          .eq('tenant_id', tenantId)
          .in('id', studentIds)
      : Promise.resolve({ data: [], error: null }),
    db.from('quizzes').select('id, title').eq('tenant_id', tenantId).eq('id', quizId),
  ])

  // Group signals by attempt_id
  const attemptMap = new Map<
    string,
    {
      signals: CheatingSignal[]
      attempt: {
        id: string
        student_id: string
        quiz_id: string
        score: number | null
        status: string
        is_reviewed: boolean | null
      }
    }
  >()

  const attemptById = new Map(attemptRows.map((attempt) => [attempt.id, attempt]))
  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  )
  const quizTitle =
    ((quizzes ?? []) as Array<{ id: string; title: string | null }>)[0]?.title ?? '-'

  for (const row of signals) {
    const attemptId = row.attempt_id
    const attempt = attemptById.get(attemptId)
    if (!attempt) continue

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
    // PERFORMANCE: Combine multiple array traversals into a single pass to reduce O(N) operations.
    let tabSwitches = 0
    let blurs = 0
    for (const s of sigs) {
      if (s.signal_type === 'TAB_SWITCH') tabSwitches++
      else if (s.signal_type === 'WINDOW_BLUR') blurs++
    }
    const others = sigs.length - tabSwitches - blurs

    results.push({
      attempt_id: attemptId,
      student_id: attempt.student_id,
      student_name: profileMap.get(attempt.student_id) ?? 'Siswa',
      quiz_title: quizTitle,
      score: attempt.score,
      status: attempt.status,
      total_signals: sigs.length,
      tab_switch_count: tabSwitches,
      window_blur_count: blurs,
      other_signal_count: others,
      first_signal_at: sigs.length > 0 ? sigs[0].created_at : null,
      last_signal_at: sigs.length > 0 ? sigs[sigs.length - 1].created_at : null,
      severity: classifySeverity(tabSwitches, blurs),
      is_reviewed: attempt.is_reviewed ?? false,
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
 *
 * Uses a 2-query approach because PostgREST cross-table column filters
 * (.eq('related_table.column', value)) only work with an !inner join in the
 * select string — they do NOT work on head-only count queries.  We therefore
 * first resolve the attempt IDs that belong to the quiz, then count signals.
 */
export async function getSuspiciousAttemptCount(quizId: string, tenantId: string): Promise<number> {
  // Step 1: resolve attempt IDs for this quiz + tenant
  const { data: attempts, error: attemptsError } = await db
    .from('quiz_attempts_v2')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)

  if (attemptsError) {
    if (import.meta.env.DEV) console.error('Error fetching attempts for count:', attemptsError)
    return 0
  }

  const attemptIds = attempts?.map((a) => a.id) ?? []
  if (attemptIds.length === 0) return 0

  // Step 2: count cheating signals for those attempts
  const { count, error } = await db
    .from('quiz_cheating_signals')
    .select('attempt_id', { count: 'exact', head: true })
    .in('attempt_id', attemptIds)

  if (error) {
    if (import.meta.env.DEV) console.error('Error counting suspicious attempts:', error)
    return 0
  }

  return count ?? 0
}
