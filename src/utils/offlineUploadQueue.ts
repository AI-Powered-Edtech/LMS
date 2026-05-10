/**
 * Offline Upload Queue
 * Queues file uploads when the user is offline and processes them when back online.
 * Uses the shared IndexedDB connection from offlineStorage.ts to avoid version conflicts.
 */

import { openDB } from "./offlineStorage";

const STORE_NAME = "upload-queue";
const MAX_QUEUE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface QueuedUpload {
  id: string;
  file: Blob;
  fileName: string;
  bucket: string;
  path: string;
  blockId: string;
  courseId: string;
  createdAt: string;
}

export async function queueUpload(upload: QueuedUpload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(upload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingUploads(): Promise<QueuedUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueSize(): Promise<number> {
  const uploads = await getPendingUploads();
  return uploads.reduce((total, u) => total + u.file.size, 0);
}

export async function isQueueFull(): Promise<boolean> {
  const size = await getQueueSize();
  return size >= MAX_QUEUE_SIZE_BYTES;
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
