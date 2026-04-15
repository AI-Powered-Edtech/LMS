import { beforeEach, describe, expect, it, vi } from 'vitest'

import { openDB } from '../offlineStorage'
import {
  clearQueue,
  getPendingUploads,
  getQueueSize,
  isQueueFull,
  type QueuedUpload,
  queueUpload,
  removeFromQueue,
} from '../offlineUploadQueue'

vi.mock('../offlineStorage', () => ({
  openDB: vi.fn(),
}))

describe('offlineUploadQueue', () => {
  const mockUpload: QueuedUpload = {
    id: 'test-id',
    file: new Blob(['test content']),
    fileName: 'test.txt',
    bucket: 'test-bucket',
    path: 'test-path',
    blockId: 'block-1',
    courseId: 'course-1',
    createdAt: new Date().toISOString(),
  }

  // Helper to create mock IDB instance
  function setupMockDB({
    failTx = false,
    failReq = false,
    data = [],
  }: {
    failTx?: boolean
    failReq?: boolean
    data?: unknown[]
  } = {}): { db: unknown; tx: unknown; objectStore: unknown; request: unknown } {
    const request: Record<string, unknown> = {
      result: data,
      error: new Error('Request failed'),
    }

    const objectStore = {
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      getAll: vi.fn(() => request),
    }

    const tx: Record<string, unknown> = {
      objectStore: vi.fn(() => objectStore),
      error: new Error('Transaction failed'),
    }

    // Intercept methods to call oncomplete/onerror asynchronously
    const triggerTx = (): void => {
      setTimeout(() => {
        if (failTx) {
          const onerror = tx.onerror as () => void
          if (onerror) onerror()
        } else {
          const oncomplete = tx.oncomplete as () => void
          if (oncomplete) oncomplete()
        }
      }, 0)
    }
    objectStore.put.mockImplementation(triggerTx)
    objectStore.delete.mockImplementation(triggerTx)
    objectStore.clear.mockImplementation(triggerTx)

    // For getAll, trigger request onsuccess/onerror
    const triggerReq = (): void => {
      setTimeout(() => {
        if (failReq) {
          const onerror = request.onerror as () => void
          if (onerror) onerror()
        } else {
          const onsuccess = request.onsuccess as () => void
          if (onsuccess) onsuccess()
        }
      }, 0)
    }
    objectStore.getAll.mockImplementation(() => {
      triggerReq()
      return request
    })

    const db = {
      transaction: vi.fn(() => tx),
    }

    vi.mocked(openDB).mockResolvedValue(db as unknown as IDBDatabase)

    return { db, tx, objectStore, request }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('queueUpload', () => {
    it('should queue an upload successfully', async () => {
      const { tx, objectStore } = setupMockDB() as {
        tx: { objectStore: ReturnType<typeof vi.fn> }
        objectStore: { put: ReturnType<typeof vi.fn> }
      }

      await queueUpload(mockUpload)

      expect(openDB).toHaveBeenCalled()
      expect(tx.objectStore).toHaveBeenCalledWith('upload-queue')
      expect(objectStore.put).toHaveBeenCalledWith(mockUpload)
    })

    it('should reject if transaction fails', async () => {
      setupMockDB({ failTx: true })

      await expect(queueUpload(mockUpload)).rejects.toThrow('Transaction failed')
    })
  })

  describe('getPendingUploads', () => {
    it('should return all pending uploads', async () => {
      setupMockDB({ data: [mockUpload] })

      const result = await getPendingUploads()

      expect(result).toEqual([mockUpload])
    })

    it('should reject if request fails', async () => {
      setupMockDB({ failReq: true })

      await expect(getPendingUploads()).rejects.toThrow('Request failed')
    })
  })

  describe('removeFromQueue', () => {
    it('should remove an item from the queue', async () => {
      const { objectStore } = setupMockDB() as {
        objectStore: { delete: ReturnType<typeof vi.fn> }
      }

      await removeFromQueue('test-id')

      expect(objectStore.delete).toHaveBeenCalledWith('test-id')
    })

    it('should reject if transaction fails', async () => {
      setupMockDB({ failTx: true })

      await expect(removeFromQueue('test-id')).rejects.toThrow('Transaction failed')
    })
  })

  describe('getQueueSize', () => {
    it('should calculate the correct queue size', async () => {
      const mockUpload2 = { ...mockUpload, file: new Blob(['longer content here']) }
      setupMockDB({ data: [mockUpload, mockUpload2] })

      const size = await getQueueSize()

      const expectedSize = mockUpload.file.size + mockUpload2.file.size
      expect(size).toBe(expectedSize)
    })
  })

  describe('isQueueFull', () => {
    it('should return false if size is under MAX_QUEUE_SIZE_BYTES', async () => {
      setupMockDB({ data: [mockUpload] }) // 12 bytes

      const isFull = await isQueueFull()

      expect(isFull).toBe(false)
    })

    it('should return true if size equals or exceeds MAX_QUEUE_SIZE_BYTES', async () => {
      // Create a blob that simulates 50MB
      const hugeBlob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
      setupMockDB({ data: [{ ...mockUpload, file: hugeBlob }] })

      const isFull = await isQueueFull()

      expect(isFull).toBe(true)
    })
  })

  describe('clearQueue', () => {
    it('should clear all items from the queue', async () => {
      const { objectStore } = setupMockDB() as {
        objectStore: { clear: ReturnType<typeof vi.fn> }
      }

      await clearQueue()

      expect(objectStore.clear).toHaveBeenCalled()
    })

    it('should reject if transaction fails', async () => {
      setupMockDB({ failTx: true })

      await expect(clearQueue()).rejects.toThrow('Transaction failed')
    })
  })
})
