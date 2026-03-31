// EduSync LMS — Background Sync
// Processes the offline sync queue when connectivity is restored

import { useToast } from '@/hooks/useToast'
import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

import { getPendingSubmissions, markSynced } from './offlineStorage'

// Exponential back-off delays: 1 s → 5 s → 30 s → 5 min
const DELAYS = [1000, 5000, 30000, 300000] as const

// Maximum sync attempts per item before giving up and deleting
const MAX_ATTEMPTS = 3

interface QuizSubmissionPayload {
  attemptId: string
  answers: unknown[]
  quizId: string
}

export interface SyncResult {
  synced: number
  failed: number
  permanent: number
}

export async function syncPendingSubmissions(): Promise<SyncResult> {
  const pending = await getPendingSubmissions()
  let synced = 0
  let failed = 0
  let permanent = 0

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
          // Increment attempt count
          const attempts = (item.attempts ?? 0) + 1
          if (attempts >= MAX_ATTEMPTS) {
            // Permanent failure — delete item (markSynced removes from queue), report to Sentry
            await markSynced(item.id)
            captureError(new Error(`Background sync permanent failure: ${error.message}`), {
              context: 'backgroundSync',
              itemId: item.id,
              type: item.type,
              attemptId: payload.attemptId,
              attempts,
            })
            // Notify user that their offline submission was lost
            useToast.getState().addToast({
              type: 'error',
              message: 'Gagal menyinkronkan jawaban offline.',
              description:
                'Jawaban tidak dapat terkirim setelah beberapa percobaan. Hubungi admin.',
            })
            permanent++
          } else {
            // Update attempt count for retry
            await updateItemAttempts(item.id, attempts)
            failed++
          }
        }
      }
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        await markSynced(item.id)
        captureError(err, {
          context: 'backgroundSync',
          itemId: item.id,
          attempts,
        })
        permanent++
      } else {
        await updateItemAttempts(item.id, attempts)
        failed++
      }
    }
  }

  return { synced, failed, permanent }
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

// ─── Helper (noop if offlineStorage doesn't support it yet) ──────────────────

async function updateItemAttempts(_id: string, _attempts: number): Promise<void> {
  // TODO: implement in offlineStorage.ts when needed
}
