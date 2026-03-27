// EduSync LMS — Background Sync
// Processes the offline sync queue when connectivity is restored

import { getPendingSubmissions, markSynced } from './offlineStorage'
import { supabase } from '@/src/services/supabase/client'

// Exponential back-off delays: 1 s → 5 s → 30 s → 5 min
const DELAYS = [1000, 5000, 30000, 300000] as const

interface QuizSubmissionPayload {
  attemptId: string
  answers: unknown[]
  quizId: string
}

export interface SyncResult {
  synced: number
  failed: number
}

export async function syncPendingSubmissions(): Promise<SyncResult> {
  const pending = await getPendingSubmissions()
  let synced = 0
  let failed = 0

  for (const item of pending) {
    try {
      if (item.type === 'quiz-submission') {
        const payload = item.payload as QuizSubmissionPayload

        const { error } = await supabase
          .from('quiz_attempts')
          .update({
            answers: payload.answers,
            completed_at: new Date().toISOString(),
            submitted_late: true,
          })
          .eq('id', payload.attemptId)

        if (!error) {
          await markSynced(item.id)
          synced++
        } else {
          failed++
        }
      }
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

export function scheduleSync(attempt: number = 0): void {
  const delay = DELAYS[Math.min(attempt, DELAYS.length - 1)]

  setTimeout(async () => {
    const result = await syncPendingSubmissions()
    if (result.failed > 0 && attempt < DELAYS.length - 1) {
      scheduleSync(attempt + 1)
    }
  }, delay)
}
