/**
 * Offline Upload Queue
 * Queues file uploads when the user is offline and processes them when back online.
 * Uses the shared IndexedDB connection from offlineStorage.ts to avoid version conflicts.
 */

import { openDB } from './offlineStorage'

const STORE_NAME = 'upload-queue'

export interface QueuedUpload {
  id: string
  file: Blob
  fileName: string
  bucket: string
  path: string
  blockId: string
  courseId: string
  createdAt: string
}

export async function getPendingUploads(): Promise<QueuedUpload[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getQueueSize(): Promise<number> {
  const uploads = await getPendingUploads()
  return uploads.reduce((total, u) => total + u.file.size, 0)
}
