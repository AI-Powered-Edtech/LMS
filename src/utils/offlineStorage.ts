// EduSync LMS — Offline Storage (IndexedDB)
// Wraps native IndexedDB for offline quiz caching and sync queue

import { logger } from '@/utils/logger'

import { decryptData, encryptData } from './cryptoStorage'

const DB_NAME = 'edusync-offline'
const DB_VERSION = 2

const STORES = {
  QUIZ_CACHE: 'quiz-cache',
  QUIZ_ANSWERS: 'quiz-answers',
  SYNC_QUEUE: 'sync-queue',
  BUILDER_DRAFTS: 'builder-drafts',
  UPLOAD_QUEUE: 'upload-queue',
} as const

export interface CachedQuizQuestion {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  order: number
}

export interface CachedQuizOption {
  id: string
  questionId: string
  text: string
  order: number
}

export interface CachedQuiz {
  quizId: string
  questions: CachedQuizQuestion[]
  options: CachedQuizOption[]
  cachedAt: number
  /** Schema version — increment when structure changes to detect stale caches */
  version: number
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
  type: string
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

/** @internal Reserved for future use */
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

/** @internal Reserved for future use */
export async function saveAnswer(answer: CachedAnswer): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_ANSWERS, 'readwrite')
  const store = tx.objectStore(STORES.QUIZ_ANSWERS)
  store.put(answer)
  await wrapTransaction(tx)
}

/** @internal Reserved for future use */
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

export async function updateQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  const item = await wrapRequest<SyncQueueItem | undefined>(store.get(id))
  if (item) {
    store.put({ ...item, ...updates })
  }
  await wrapTransaction(tx)
}

// ---------------------------------------------------------------------------
// Builder drafts
// ---------------------------------------------------------------------------

export interface BuilderDraft {
  courseId: string
  state: unknown
  savedAt: number
  /** ISO timestamp string saat draft terakhir kali berhasil disinkronkan ke server */
  last_synced_at: string | null
}

export async function saveBuilderDraft(
  courseId: string,
  state: unknown,
  lastSyncedAt?: string | null
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readwrite')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)

  // Preserve existing last_synced_at if not explicitly overridden
  const existing = await wrapRequest<BuilderDraft | undefined>(store.get(courseId))
  const draft: BuilderDraft = {
    courseId,
    state,
    savedAt: Date.now(),
    last_synced_at: lastSyncedAt !== undefined ? lastSyncedAt : (existing?.last_synced_at ?? null),
  }
  store.put(draft)
  await wrapTransaction(tx)
}

export async function getBuilderDraft(courseId: string): Promise<unknown | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readonly')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  const result = await wrapRequest<BuilderDraft | undefined>(store.get(courseId))
  return result?.state ?? null
}

export async function getBuilderDraftRecord(courseId: string): Promise<BuilderDraft | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readonly')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  const result = await wrapRequest<BuilderDraft | undefined>(store.get(courseId))
  return result ?? null
}

export async function deleteBuilderDraft(courseId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readwrite')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  store.delete(courseId)
  await wrapTransaction(tx)
}

/** @internal Reserved for future use */
export async function getAllDirtyDrafts(): Promise<unknown[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.BUILDER_DRAFTS, 'readonly')
  const store = tx.objectStore(STORES.BUILDER_DRAFTS)
  const result = await wrapRequest<{ courseId: string; state: unknown; savedAt: number }[]>(
    store.getAll()
  )
  return result.map((r) => r.state)
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

// ---------------------------------------------------------------------------
// Encrypted quiz answers — data sensitif dienkripsi sebelum disimpan
// ---------------------------------------------------------------------------

/**
 * Menyimpan jawaban kuis ke IndexedDB dengan payload yang dienkripsi menggunakan AES-GCM.
 * Field `selectedOption` dan data jawaban dienkripsi sebelum disimpan.
 *
 * @param answer - Objek jawaban kuis yang akan disimpan
 * @param userId - ID pengguna untuk derivasi kunci enkripsi
 */
/** @internal Reserved for future use */
export async function cacheAnswerEncrypted(answer: CachedAnswer, userId: string): Promise<void> {
  const encryptedPayload = await encryptData(answer, userId)
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_ANSWERS, 'readwrite')
  const store = tx.objectStore(STORES.QUIZ_ANSWERS)
  // Simpan record dengan payload terenkripsi; id dan quizId tetap plaintext untuk indexing
  store.put({
    id: answer.id,
    quizId: answer.quizId,
    payload: encryptedPayload,
    encrypted: true,
  })
  await wrapTransaction(tx)
}

/**
 * Mengambil semua jawaban kuis dari IndexedDB dan mendekripsi payload.
 * Hanya memproses record yang memiliki flag `encrypted: true`.
 *
 * @param quizId - ID kuis yang jawabannya ingin diambil
 * @param userId - ID pengguna untuk derivasi kunci dekripsi
 * @returns Array jawaban kuis yang sudah didekripsi
 */
/** @internal Reserved for future use */
export async function getAnswersEncrypted(quizId: string, userId: string): Promise<CachedAnswer[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.QUIZ_ANSWERS, 'readonly')
  const store = tx.objectStore(STORES.QUIZ_ANSWERS)
  const index = store.index('quizId')
  const records = await wrapRequest<
    Array<{ id: string; quizId: string; payload: string; encrypted: boolean }>
  >(index.getAll(quizId))

  const results: CachedAnswer[] = []
  for (const record of records) {
    if (record.encrypted && record.payload) {
      try {
        const answer = await decryptData<CachedAnswer>(record.payload, userId)
        results.push(answer)
      } catch (err) {
        // Abaikan record yang gagal didekripsi (kunci berbeda atau data korup)
        if (import.meta.env.DEV)
          logger.warn(
            '[offlineStorage] Decryption failed for record — key mismatch or corruption:',
            err
          )
      }
    }
  }
  return results
}
