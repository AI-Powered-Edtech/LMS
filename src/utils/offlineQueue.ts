// EduSync LMS — Offline Queue with Retry & Conflict Resolution
// Builds on top of existing offlineStorage.ts IndexedDB infrastructure

import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

import {
  addToSyncQueue,
  getPendingSubmissions,
  markSynced,
  type SyncQueueItem,
  updateQueueItem,
} from './offlineStorage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueueOperationType =
  | 'quiz-submission'
  | 'assignment-upload'
  | 'grade-update'
  | 'attendance-mark'
  | 'message-send'
  | 'form-submit'
  | 'xapi-statement'

export interface QueuePayload extends Record<string, unknown> {
  idempotencyKey?: string
  maxRetries?: number
  conflictStrategy?: 'client-wins' | 'server-wins' | 'manual'
  nextRetryAt?: number | null
  lastError?: string | null
}

export interface QueuedOperation {
  id: string
  type: QueueOperationType
  payload: QueuePayload
  /** Idempotency key to prevent duplicate processing */
  idempotencyKey: string
  createdAt: number
  attempts: number
  maxRetries: number
  /** Exponential backoff delay in ms for next retry */
  nextRetryAt: number | null
  /** Last error message */
  lastError: string | null
  /** Conflict resolution strategy if server data differs */
  conflictStrategy: 'client-wins' | 'server-wins' | 'manual' | null
}

export interface SyncResult {
  synced: number
  failed: number
  conflicts: number
  permanent: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 2000
const MAX_BACKOFF_MS = 300000 // 5 minutes

// ---------------------------------------------------------------------------
// Queue Management
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic idempotency key from operation type + entity identifiers.
 * Prevents duplicate operations when the same action is queued multiple times.
 */
export function generateIdempotencyKey(
  type: QueueOperationType,
  entityId: string,
  userId: string
): string {
  return `${type}:${entityId}:${userId}`
}

/**
 * Add an operation to the offline sync queue.
 * If an operation with the same idempotency key already exists, it is updated
 * rather than duplicated.
 */
export async function queueOperation(
  type: QueueOperationType,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  options?: {
    maxRetries?: number
    conflictStrategy?: 'client-wins' | 'server-wins' | 'manual'
  }
): Promise<string> {
  const id = crypto.randomUUID()
  const item: Omit<SyncQueueItem, 'attempts'> = {
    id,
    type,
    payload: {
      ...payload,
      idempotencyKey,
      maxRetries: options?.maxRetries ?? MAX_RETRIES,
      conflictStrategy: options?.conflictStrategy ?? 'client-wins',
      nextRetryAt: null,
      lastError: null,
    },
    createdAt: Date.now(),
  }

  await addToSyncQueue(item)
  return id
}

/**
 * Calculate exponential backoff delay with jitter.
 * Delay = min(base * 2^attempt + random_jitter, max)
 */
function calculateBackoff(attempt: number): number {
  const base = BASE_BACKOFF_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(base + jitter, MAX_BACKOFF_MS)
}

// ---------------------------------------------------------------------------
// Sync Processing
// ---------------------------------------------------------------------------

/**
 * Process a single queued operation against the Supabase API.
 * Returns true if the operation was successfully synced.
 */
async function processOperation(
  item: SyncQueueItem
): Promise<'success' | 'retry' | 'conflict' | 'permanent'> {
  const payload = item.payload as QueuePayload

  const maxRetries = payload.maxRetries ?? MAX_RETRIES
  const attempts = item.attempts

  if (attempts >= maxRetries) {
    return 'permanent'
  }

  try {
    let result: { error: unknown } | null = null

    switch (item.type) {
      case 'quiz-submission': {
        const { error } = await supabase
          .from('quiz_attempts_v2')
          .update({
            answers: payload.answers,
            completed_at: new Date().toISOString(),
            submitted_late: payload.submitted_late ?? true,
          })
          .eq('id', payload.attemptId)
        result = { error }
        break
      }

      case 'assignment-upload': {
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            file_url: payload.fileUrl,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', payload.submissionId)
        result = { error }
        break
      }

      case 'grade-update': {
        const { error } = await supabase
          .from('gradebook_entries')
          .update({
            score: payload.score,
            feedback: payload.feedback,
            graded_at: new Date().toISOString(),
          })
          .eq('id', payload.entryId)
        result = { error }
        break
      }

      case 'attendance-mark': {
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status: payload.status,
            marked_at: new Date().toISOString(),
          })
          .eq('id', payload.recordId)
        result = { error }
        break
      }

      case 'message-send': {
        const { error } = await supabase.from('messages').insert({
          sender_id: payload.senderId,
          recipient_id: payload.recipientId,
          content: payload.content,
          sent_at: new Date().toISOString(),
        })
        result = { error }
        break
      }

      case 'form-submit': {
        const { error } = await supabase
          .from(payload.tableName as string)
          .insert(payload.data as never)
        result = { error }
        break
      }

      case 'xapi-statement': {
        const { error } = await supabase.rpc('record_xapi_statement', {
          p_verb: payload.verb,
          p_object_type: payload.objectType,
          p_object_id: payload.objectId,
          p_result: payload.result as Record<string, unknown>,
          p_context: payload.context as Record<string, unknown>,
        })
        result = { error }
        break
      }

      default:
        return 'permanent'
    }

    if (result?.error) {
      const err = result.error as { code?: string; message?: string }

      // Check for conflict (optimistic locking failure)
      if (err.code === 'PGRST116' || err.message?.includes('conflict')) {
        return 'conflict'
      }

      // Network errors should retry
      if (err.code === 'NETWORK_ERROR' || !err.code) {
        return 'retry'
      }

      // Validation errors are permanent
      if (err.code === '23505' || err.code === '23503' || err.code === '23502') {
        return 'permanent'
      }

      return 'retry'
    }

    return 'success'
  } catch (err) {
    captureError(err as Error, {
      context: 'offlineQueue.processOperation',
      operationType: item.type,
      attempts,
    })
    return 'retry'
  }
}

/**
 * Process all pending operations in the sync queue.
 * Returns a summary of results.
 */
export async function processSyncQueue(): Promise<SyncResult> {
  const pending = await getPendingSubmissions()
  const result: SyncResult = { synced: 0, failed: 0, conflicts: 0, permanent: 0 }

  for (const item of pending) {
    // Skip items already at max retries (quarantined)
    const payload = item.payload as QueuePayload
    const maxRetries = payload?.maxRetries ?? MAX_RETRIES
    if (item.attempts >= maxRetries) continue

    const outcome = await processOperation(item)

    switch (outcome) {
      case 'success':
        await markSynced(item.id)
        result.synced++
        break

      case 'conflict':
        result.conflicts++
        // Update item with conflict flag for UI to handle
        break

      case 'retry':
        result.failed++
        // Increment attempts for exponential backoff tracking
        await updateQueueItem(item.id, { attempts: item.attempts + 1 })
        break

      case 'permanent':
        // Do NOT delete (markSynced) quarantined items, just mark them as failed
        await updateQueueItem(item.id, { attempts: maxRetries })
        result.permanent++
        captureError(new Error(`Queue operation permanently failed (quarantined): ${item.type}`), {
          context: 'offlineQueue',
          itemId: item.id,
          attempts: item.attempts + 1,
        })
        break
    }
  }

  return result
}

/**
 * Schedule the next sync cycle with exponential backoff.
 * Called after a sync attempt that had failures.
 */
export function scheduleNextSync(failedCount: number, attempt: number): void {
  if (failedCount === 0) return

  const delay = calculateBackoff(attempt)
  setTimeout(async () => {
    const result = await processSyncQueue()
    if (result.failed > 0) {
      scheduleNextSync(result.failed, attempt + 1)
    }
  }, delay)
}

/**
 * Start the offline sync listener.
 * Automatically processes the queue when the user comes back online.
 */
export function startOfflineSync(): () => void {
  const handleOnline = async (): Promise<void> => {
    const result = await processSyncQueue()
    if (result.failed > 0) {
      scheduleNextSync(result.failed, 0)
    }
  }

  window.addEventListener('online', handleOnline)

  // Also try to sync on visibility change (user returns to tab)
  const handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void processSyncQueue()
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}
