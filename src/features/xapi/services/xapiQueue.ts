/**
 * XAPI Statement Queue with Offline Support
 *
 * Queues xAPI statements when offline and syncs when connection is restored.
 * Provides retry logic and statement validation.
 */

import { supabase } from '@/services/supabase/client'

import type { XAPIStatement } from '../types'

const QUEUE_KEY = 'xapi_statement_queue'
const MAX_QUEUE_SIZE = 100
const SYNC_INTERVAL_MS = 30000 // 30 seconds

/**
 * XAPI Queue Manager
 */
export class XAPIQueue {
  private queue: Array<XAPIStatement & { queuedAt: number; attempts: number }> = []
  private isSyncing = false
  private syncTimer: number | null = null

  constructor() {
    this.loadFromStorage()
    this.startAutoSync()
    this.setupOnlineListener()
  }

  /**
   * Add statement to queue
   */
  enqueue(statement: XAPIStatement): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest statement if queue is full
      this.queue.shift()
    }

    this.queue.push({
      ...statement,
      queuedAt: Date.now(),
      attempts: 0,
    })

    this.saveToStorage()

    if (import.meta.env.DEV) {
      console.log(`[XAPI Queue] Enqueued statement. Queue size: ${this.queue.length}`)
    }
  }

  /**
   * Get queue size
   */
  get size(): number {
    return this.queue.length
  }

  /**
   * Get all queued statements
   */
  get statements(): Array<XAPIStatement & { queuedAt: number; attempts: number }> {
    return [...this.queue]
  }

  /**
   * Sync queue to server
   */
  async sync(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) return

    // Check if online
    if (!navigator.onLine) {
      if (import.meta.env.DEV) {
        console.log('[XAPI Queue] Offline, skipping sync')
      }
      return
    }

    this.isSyncing = true

    const failedStatements: Array<XAPIStatement & { queuedAt: number; attempts: number }> = []

    for (const statement of this.queue) {
      try {
        // Skip if too many attempts
        if (statement.attempts >= 3) {
          if (import.meta.env.DEV) {
            console.warn('[XAPI Queue] Dropping statement after 3 failed attempts:', statement)
          }
          continue
        }

        await this.sendStatement(statement)

        if (import.meta.env.DEV) {
          console.log('[XAPI Queue] Statement synced successfully')
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[XAPI Queue] Failed to sync statement:', error)
        }

        // Increment attempts and keep in queue
        failedStatements.push({
          ...statement,
          attempts: statement.attempts + 1,
        })
      }
    }

    // Update queue with failed statements
    this.queue = failedStatements
    this.saveToStorage()
    this.isSyncing = false

    if (import.meta.env.DEV && this.queue.length > 0) {
      console.log(`[XAPI Queue] ${this.queue.length} statements still pending`)
    }
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = []
    this.saveToStorage()
  }

  /**
   * Stop auto sync
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    window.removeEventListener('online', this.handleOnline)
  }

  /**
   * Send single statement to server
   */
  private async sendStatement(statement: XAPIStatement): Promise<void> {
    const { error } = await supabase.from('xapi_statements').insert({
      actor: statement.actor,
      verb: statement.verb,
      object: statement.object,
      context: statement.context,
      result: statement.result,
      timestamp: statement.timestamp || new Date().toISOString(),
    })

    if (error) throw error
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[XAPI Queue] Failed to load from storage:', error)
      }
      this.queue = []
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[XAPI Queue] Failed to save to storage:', error)
      }
    }
  }

  /**
   * Start automatic sync
   */
  private startAutoSync(): void {
    this.syncTimer = window.setInterval(() => {
      this.sync().catch(() => {
        // Silently fail
      })
    }, SYNC_INTERVAL_MS)
  }

  /**
   * Setup online event listener
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', this.handleOnline)
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    if (import.meta.env.DEV) {
      console.log('[XAPI Queue] Back online, syncing...')
    }
    this.sync().catch(() => {
      // Silently fail
    })
  }
}

// Singleton instance
let queueInstance: XAPIQueue | null = null

/**
 * Get XAPI Queue singleton
 */
export function getXAPIQueue(): XAPIQueue {
  if (!queueInstance) {
    queueInstance = new XAPIQueue()
  }
  return queueInstance
}

/**
 * Destroy XAPI Queue singleton
 */
export function destroyXAPIQueue(): void {
  if (queueInstance) {
    queueInstance.destroy()
    queueInstance = null
  }
}
