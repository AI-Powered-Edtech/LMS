/**
 * ReplayQueue — Resilient retry queue for failed operations.
 *
 * Wraps the low-level IndexedDB sync queue (offlineStorage) with
 * configurable retry policies: max attempts, exponential back-off,
 * and dead-letter logging via Sentry.
 *
 * Usage:
 *   const queue = new ReplayQueue({ maxRetries: 3, baseDelayMs: 1000 })
 *   queue.enqueue({ id, type: 'quiz-submission', payload, createdAt: Date.now() })
 *   queue.processAll()  // processes pending items with back-off
 */

import type { SyncQueueItem } from './offlineStorage'
import { addToSyncQueue, getPendingSubmissions, markSynced } from './offlineStorage'

// ── Public types ────────────────────────────────────────────────────────────

export interface ReplayQueueItem {
  id: string
  type: string
  payload: unknown
  createdAt: number
  attempts: number
  lastAttemptAt?: number
  error?: string
  status?: string
  metadata?: unknown
}

export interface ReplayQueueStats {
  pending: number
  failed: number
  total: number
  oldestItemAt: number | null
  conflict?: boolean
  completed?: number
  syncing?: boolean
}

export interface ReplayQueueOptions {
  /** Maximum retry attempts per item (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential back-off (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number
}

export interface ReplayResult {
  processed: number
  succeeded: number
  failed: number
  deadLettered: number
  conflict: boolean
}

type ItemProcessor = (item: SyncQueueItem) => Promise<boolean>

// ── Helper functions ────────────────────────────────────────────────────────

/**
 * Returns all pending operations in the replay queue, mapped to ReplayQueueItem.
 */
export async function getPendingOperations(): Promise<ReplayQueueItem[]> {
  const items = await getPendingSubmissions()
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    payload: item.payload,
    createdAt: item.createdAt,
    attempts: item.attempts,
  }))
}

/**
 * Returns statistics about the current replay queue.
 */
export async function getQueueStats(): Promise<ReplayQueueStats> {
  const items = await getPendingSubmissions()
  const failed = items.filter((i) => i.attempts > 0).length
  const pending = items.length - failed
  const oldest = items.reduce<number | null>(
    (min, i) => (min === null || i.createdAt < min ? i.createdAt : min),
    null
  )
  return {
    pending,
    failed,
    total: items.length,
    oldestItemAt: oldest,
  }
}

// ── ReplayQueue class ───────────────────────────────────────────────────────

export class ReplayQueue {
  private readonly maxRetries: number
  private readonly baseDelayMs: number
  private readonly maxDelayMs: number
  private processing = false

  constructor(options: ReplayQueueOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3
    this.baseDelayMs = options.baseDelayMs ?? 1000
    this.maxDelayMs = options.maxDelayMs ?? 30_000
  }

  /**
   * Enqueue a new item into the sync queue.
   */
  async enqueue(item: Omit<SyncQueueItem, 'attempts'>): Promise<void> {
    await addToSyncQueue(item)
  }

  /**
   * Process all pending items with the given processor function.
   * Returns a summary of results.
   */
  async processAll(processor: ItemProcessor): Promise<ReplayResult> {
    if (this.processing) {
      return { processed: 0, succeeded: 0, failed: 0, deadLettered: 0, conflict: true }
    }

    this.processing = true
    const result: ReplayResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLettered: 0,
      conflict: false,
    }

    try {
      const pending = await getPendingSubmissions()

      for (const item of pending) {
        result.processed++

        try {
          const success = await processor(item)

          if (success) {
            await markSynced(item.id)
            result.succeeded++
          } else {
            await this.handleFailure(item, new Error('Processor returned false'), result)
          }
        } catch (err) {
          await this.handleFailure(item, err, result)
        }

        // Back-off between items to avoid hammering the server
        const delay = Math.min(this.baseDelayMs * Math.pow(2, item.attempts), this.maxDelayMs)
        await this.sleep(delay)
      }
    } finally {
      this.processing = false
    }

    return result
  }

  private async handleFailure(
    item: SyncQueueItem,
    error: unknown,
    result: ReplayResult
  ): Promise<void> {
    const attempts = (item.attempts ?? 0) + 1

    if (attempts >= this.maxRetries) {
      // Dead letter — remove from queue and report
      await markSynced(item.id)
      console.error('[ReplayQueue] Dead-lettered item', {
        itemId: item.id,
        type: item.type,
        attempts,
        error: error instanceof Error ? error.message : String(error),
      })
      result.deadLettered++
    } else {
      result.failed++
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
