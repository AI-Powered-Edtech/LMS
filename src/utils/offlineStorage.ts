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

// ---------------------------------------------------------------------------
// Quiz cache
// ---------------------------------------------------------------------------

export async function cacheQuiz(quiz: CachedQuiz): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_CACHE, 'readwrite')
  const store = tx.objectStore(STORES.QUIZ_CACHE)
  store.put(quiz)
  await wrapTransaction(tx)
}

export async function getCachedQuiz(quizId: string): Promise<CachedQuiz | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_CACHE, 'readonly')
  const store = tx.objectStore(STORES.QUIZ_CACHE)
  const result = await wrapRequest<CachedQuiz | undefined>(store.get(quizId))
  return result ?? null
}

export async function clearQuizCache(quizId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_CACHE, 'readwrite')
  const store = tx.objectStore(STORES.QUIZ_CACHE)
  store.delete(quizId)
  await wrapTransaction(tx)
}

// ---------------------------------------------------------------------------
// Quiz answers
// ---------------------------------------------------------------------------

export async function saveAnswer(answer: CachedAnswer): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_ANSWERS, 'readwrite')
  const store = tx.objectStore(STORES.QUIZ_ANSWERS)
  store.put(answer)
  await wrapTransaction(tx)
}

export async function getAnswers(quizId: string): Promise<CachedAnswer[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_ANSWERS, 'readonly')
  const store = tx.objectStore(STORES.QUIZ_ANSWERS)
  const index = store.index('quizId')
  const result = await wrapRequest<CachedAnswer[]>(index.getAll(quizId))
  return result
}

// ---------------------------------------------------------------------------
// Sync queue
// ---------------------------------------------------------------------------

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'attempts'>): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  const full: SyncQueueItem = { ...item, attempts: 0 }
  store.put(full)
  await wrapTransaction(tx)
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

export async function getBuilderDraft(courseId: string): Promise<unknown | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readonly')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  const result = await wrapRequest<
    { courseId: string; state: unknown; savedAt: number } | undefined
  >(store.get(courseId))
  return result?.state ?? null
}

export async function deleteBuilderDraft(courseId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readwrite')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  store.delete(courseId)
  await wrapTransaction(tx)
}

export async function getAllDirtyDrafts(): Promise<unknown[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readonly')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  const result = await wrapRequest<{ courseId: string; state: unknown; savedAt: number }[]>(
    store.getAll()
  )
  return result.map((r) => r.state)
}
