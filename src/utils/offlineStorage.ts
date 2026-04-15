// EduSync LMS — Offline Storage (IndexedDB)
// Wraps native IndexedDB for offline quiz caching and sync queue

const DB_NAME = 'edusync-offline'
const DB_VERSION = 2

const STORES = {
  QUIZ_CACHE: 'quiz-cache',
  QUIZ_ANSWERS: 'quiz-answers',
  SYNC_QUEUE: 'sync-queue',
  BUILDER_DRAFTS: 'builder-drafts',
  UPLOAD_QUEUE: 'upload-queue',
} as const

export interface CachedQuiz {
  quizId: string
  questions: unknown[]
  options: unknown[]
  cachedAt: number
}

export interface CachedAnswer {
  id: string
  quizId: string
  questionId: string
  selectedOption: string | null
  answeredAt: number
}

export interface SyncQueueItem {
  id: string
  type: 'quiz-submission'
  payload: unknown
  createdAt: number
  attempts: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function wrapTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// ---------------------------------------------------------------------------
// openDB — singleton connection
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.QUIZ_CACHE)) {
        db.createObjectStore(STORES.QUIZ_CACHE, { keyPath: 'quizId' })
      }

      if (!db.objectStoreNames.contains(STORES.QUIZ_ANSWERS)) {
        const answersStore = db.createObjectStore(STORES.QUIZ_ANSWERS, { keyPath: 'id' })
        answersStore.createIndex('quizId', 'quizId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.BUILDER_DRAFTS)) {
        db.createObjectStore(STORES.BUILDER_DRAFTS, { keyPath: 'courseId' })
      }

      if (!db.objectStoreNames.contains(STORES.UPLOAD_QUEUE)) {
        db.createObjectStore(STORES.UPLOAD_QUEUE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
    request.onblocked = () => {
      dbPromise = null
      reject(new Error('IndexedDB upgrade blocked — close other tabs'))
    }
  })

  return dbPromise
}

export async function getPendingSubmissions(): Promise<SyncQueueItem[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  const result = await wrapRequest<SyncQueueItem[]>(store.getAll())
  return result
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  store.delete(id)
  await wrapTransaction(tx)
}

// ---------------------------------------------------------------------------
// Builder drafts
// ---------------------------------------------------------------------------

export async function saveBuilderDraft(courseId: string, state: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readwrite')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  store.put({ courseId, state, savedAt: Date.now() })
  await wrapTransaction(tx)
}

export async function deleteBuilderDraft(courseId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readwrite')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  store.delete(courseId)
  await wrapTransaction(tx)
}

// ---------------------------------------------------------------------------
// Pending count — efficient IndexedDB count() across all queues
// ---------------------------------------------------------------------------

/**
 * Returns the total number of items waiting to be synced across the
 * sync-queue and upload-queue stores.  Uses IDBObjectStore.count()
 * which is O(1) in most IndexedDB implementations, avoiding the need
 * to deserialise every record.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB()
    const tx = db.transaction([STORES.SYNC_QUEUE, STORES.UPLOAD_QUEUE], 'readonly')
    const [syncCount, uploadCount] = await Promise.all([
      wrapRequest<number>(tx.objectStore(STORES.SYNC_QUEUE).count()),
      wrapRequest<number>(tx.objectStore(STORES.UPLOAD_QUEUE).count()),
    ])
    return syncCount + uploadCount
  } catch {
    // IndexedDB unavailable or transaction failed — treat as zero pending
    return 0
  }
}
