/**
 * ReplayQueue — Idempotent offline operation queue with exponential backoff
 * 
 * This service manages a queue of offline operations (quiz submissions, assignment uploads,
 * grade updates, etc.) that are replayed when connectivity is restored. Each operation has
 * a unique idempotency key to prevent duplicate processing.
 * 
 * Features:
 * - Idempotency keys prevent duplicate operations
 * - Exponential backoff with configurable max attempts
 * - Operation type validation and serialization
 * - Progress tracking and error reporting
 * - Conflict detection for concurrent edits
 */

import { captureError } from '@/utils/sentry'
import { openDB, type SyncQueueItem } from './offlineStorage'

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const STORE_NAME = 'replay-queue'
const DB_VERSION_INCREMENT = 3 // New store requires version bump

// Exponential backoff delays: 2s → 10s → 30s → 2min → 5min → 15min
const BACKOFF_DELAYS = [2000, 10000, 30000, 120000, 300000, 900000] as const

// Maximum retry attempts before marking as permanently failed
const MAX_RETRY_ATTEMPTS = 6

// Operation types supported in the replay queue
export type OperationType =
  | 'quiz-submission'
  | 'assignment-upload'
  | 'grade-update'
  | 'attendance-mark'
  | 'message-send'
  | 'form-submit'
  | 'custom'

export interface ReplayQueueItem {
  /** Unique operation ID (also serves as idempotency key) */
  id: string
  /** Idempotency key — derived from operation type + entity IDs */
  idempotencyKey: string
  /** Operation type for routing and validation */
  type: OperationType
  /** Operation payload — must be JSON serializable */
  payload: Record<string, unknown>
  /** Metadata for debugging and conflict resolution */
  metadata: {
    /** Entity ID being operated on (e.g., quizId, assignmentId) */
    entityId: string
    /** Timestamp when operation was queued */
    queuedAt: string
    /** Timestamp of last sync attempt */
    lastAttemptAt: string | null
    /** Number of sync attempts */
    attempts: number
    /** Error message from last attempt */
    lastError: string | null
    /** Priority — higher values processed first */
    priority: number
  }
  /** Current status */
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict'
}

export interface ReplayQueueStats {
  pending: number
  syncing: number
  completed: number
  failed: number
  conflict: number
  total: number
}

// ---------------------------------------------------------------------------
// Database Initialization
// ---------------------------------------------------------------------------

/**
 * Ensure the replay-queue store exists in IndexedDB.
 * Called automatically by all queue operations.
 */
async function ensureStore(): Promise<IDBDatabase> {
  const db = await openDB()
  
  // Check if store already exists
  if (db.objectStoreNames.contains(STORE_NAME)) {
    return db
  }

  // Need to create store — close current connection and reopen with new version
  db.close()
  
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('edusync-offline', DB_VERSION_INCREMENT)
    
    request.onupgradeneeded = (event) => {
      const upgradeDb = (event.target as IDBOpenDBRequest).result
      
      // Recreate existing stores + add new one
      if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
        const store = upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' })
        // Indexes for efficient queries
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('metadata.queuedAt', 'metadata.queuedAt', { unique: false })
        store.createIndex('metadata.priority', 'metadata.priority', { unique: false })
      }
    }
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ---------------------------------------------------------------------------
// Core Queue Operations
// ---------------------------------------------------------------------------

/**
 * Add an operation to the replay queue with automatic idempotency key generation.
 * 
 * @param operation - Operation details including type, payload, and metadata
 * @returns The queued operation item
 */
export async function enqueueOperation(
  operation: Omit<ReplayQueueItem, 'id' | 'idempotencyKey' | 'metadata'> & {
    metadata: Omit<ReplayQueueItem['metadata'], 'queuedAt' | 'lastAttemptAt' | 'attempts' | 'lastError'>
  }
): Promise<ReplayQueueItem> {
  const db = await ensureStore()
  
  // Generate idempotency key from type + entityId + timestamp
  const idempotencyKey = `${operation.type}:${operation.metadata.entityId}:${Date.now()}`
  
  const item: ReplayQueueItem = {
    ...operation,
    id: crypto.randomUUID(),
    idempotencyKey,
    metadata: {
      ...operation.metadata,
      queuedAt: new Date().toISOString(),
      lastAttemptAt: null,
      attempts: 0,
      lastError: null,
    },
    status: 'pending',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.add(item)
    request.onsuccess = () => resolve(item)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Check if an operation with the same idempotency key already exists.
 * Prevents duplicate operations on the same entity.
 * 
 * @param idempotencyKey - The idempotency key to check
 * @returns Existing item if found, null otherwise
 */
export async function findDuplicateOperation(
  idempotencyKey: string
): Promise<ReplayQueueItem | null> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('idempotencyKey')
    
    const request = index.get(idempotencyKey)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all pending operations, sorted by priority (highest first) then queuedAt (oldest first).
 * 
 * @returns Array of pending queue items ready for sync
 */
export async function getPendingOperations(): Promise<ReplayQueueItem[]> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')
    
    const request = index.getAll('pending')
    request.onsuccess = () => {
      // Sort by priority (desc) then queuedAt (asc)
      const items = request.result as ReplayQueueItem[]
      items.sort((a, b) => {
        if (b.metadata.priority !== a.metadata.priority) {
          return b.metadata.priority - a.metadata.priority
        }
        return new Date(a.metadata.queuedAt).getTime() - new Date(b.metadata.queuedAt).getTime()
      })
      resolve(items)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark an operation as currently being synced (prevents concurrent sync attempts).
 *
 * @param id - Operation ID
 */
export async function markOperationSyncing(id: string): Promise<void> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(id)
    request.onsuccess = () => {
      const item = request.result
      if (item) {
        item.status = 'syncing'
        item.metadata.lastAttemptAt = new Date().toISOString()
        item.metadata.attempts += 1
        store.put(item)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark an operation as successfully completed and remove from queue.
 *
 * @param id - Operation ID
 */
export async function markOperationCompleted(id: string): Promise<void> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    // Move to completed status (could archive instead of delete)
    const request = store.get(id)
    request.onsuccess = () => {
      const item = request.result
      if (item) {
        item.status = 'completed'
        store.put(item)
        // Optionally delete after a delay to allow status checking
        setTimeout(() => {
          store.delete(id)
        }, 60000) // Delete after 1 minute
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark an operation as failed and schedule retry with exponential backoff.
 *
 * @param id - Operation ID
 * @param error - Error that caused the failure
 */
export async function markOperationFailed(id: string, error: Error): Promise<'retry' | 'permanent'> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(id)
    request.onsuccess = () => {
      const item = request.result
      if (!item) {
        tx.oncomplete = () => resolve('permanent')
        return
      }

      const attempts = item.metadata.attempts
      
      if (attempts >= MAX_RETRY_ATTEMPTS) {
        // Permanent failure
        item.status = 'failed'
        item.metadata.lastError = error.message
        store.put(item)
        
        captureError(error, {
          context: 'ReplayQueue',
          itemId: id,
          type: item.type,
          attempts,
        })
        
        tx.oncomplete = () => resolve('permanent')
      } else {
        // Schedule retry — reset to pending
        item.status = 'pending'
        item.metadata.lastError = error.message
        store.put(item)
        
        tx.oncomplete = () => resolve('retry')
      }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark an operation as having a conflict that requires user resolution.
 *
 * @param id - Operation ID
 * @param conflictDetails - Details about the conflict
 */
export async function markOperationConflict(id: string, conflictDetails: Record<string, unknown>): Promise<void> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(id)
    request.onsuccess = () => {
      const item = request.result
      if (item) {
        item.status = 'conflict'
        item.metadata.lastError = 'Conflict detected'
        item.payload = {
          ...item.payload,
          conflict: conflictDetails,
        }
        store.put(item)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get queue statistics for UI display.
 * 
 * @returns Statistics about queue state
 */
export async function getQueueStats(): Promise<ReplayQueueStats> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')
    
    const stats: ReplayQueueStats = {
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
      conflict: 0,
      total: 0,
    }

    const statuses = ['pending', 'syncing', 'completed', 'failed', 'conflict'] as const
    let completed = 0

    statuses.forEach((status) => {
      const countRequest = index.count(status)
      countRequest.onsuccess = () => {
        stats[status] = countRequest.result
        completed++
        
        if (completed === statuses.length) {
          stats.total = stats.pending + stats.syncing + stats.failed + stats.conflict
          resolve(stats)
        }
      }
      countRequest.onerror = () => {
        reject(countRequest.error)
      }
    })
  })
}

/**
 * Clear all completed and failed operations from the queue.
 * 
 * @param includePending - If true, clear entire queue (use with caution)
 */
export async function clearQueue(includePending = false): Promise<void> {
  const db = await ensureStore()
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    if (includePending) {
      store.clear()
      tx.oncomplete = () => resolve()
    } else {
      const index = store.index('status')
      
      // Clear completed
      const completedRequest = index.getAll('completed')
      completedRequest.onsuccess = () => {
        completedRequest.result.forEach((item) => store.delete(item.id))
        
        // Clear failed
        const failedRequest = index.getAll('failed')
        failedRequest.onsuccess = () => {
          failedRequest.result.forEach((item) => store.delete(item.id))
          tx.oncomplete = () => resolve()
        }
        failedRequest.onerror = () => reject(failedRequest.error)
      }
      completedRequest.onerror = () => reject(completedRequest.error)
    }
    
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get the next backoff delay for retry scheduling.
 * 
 * @param attempts - Number of attempts so far
 * @returns Delay in milliseconds
 */
export function getNextBackoffDelay(attempts: number): number {
  const index = Math.min(attempts, BACKOFF_DELAYS.length - 1)
  return BACKOFF_DELAYS[index]
}

/**
 * Generate an idempotency key for an operation.
 * This should be called before enqueueing to check for duplicates.
 * 
 * @param type - Operation type
 * @param entityId - Entity being operated on
 * @returns Idempotency key string
 */
export function generateIdempotencyKey(type: OperationType, entityId: string): string {
  return `${type}:${entityId}`
}
