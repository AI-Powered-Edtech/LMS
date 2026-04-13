import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import {
  generateIdempotencyKey,
  queueOperation,
  processSyncQueue,
  scheduleNextSync,
  startOfflineSync,
  type QueueOperationType,
} from '../offlineQueue'
import { db } from '@/services/db'
import { captureError } from '@/utils/sentry'
import {
  addToSyncQueue,
  getPendingSubmissions,
  markSynced,
  updateQueueItem,
} from '../offlineStorage'

// Mock dependencies
vi.mock('@/services/db', () => {
  const updateMock = vi.fn()
  const insertMock = vi.fn()
  const eqMock = vi.fn().mockReturnValue({ update: updateMock, insert: insertMock })
  const fromMock = vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({ eq: eqMock }),
    insert: insertMock,
  })
  const rpcMock = vi.fn()

  return {
    db: {
      from: fromMock,
      rpc: rpcMock,
    }
  }
})

vi.mock('@/utils/sentry', () => ({
  captureError: vi.fn(),
}))

vi.mock('../offlineStorage', () => ({
  addToSyncQueue: vi.fn(),
  getPendingSubmissions: vi.fn(),
  markSynced: vi.fn(),
  updateQueueItem: vi.fn(),
}))

describe('offlineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateIdempotencyKey', () => {
    it('generates a deterministic key from type, entityId, and userId', () => {
      const key = generateIdempotencyKey('quiz-submission', '123', 'user456')
      expect(key).toBe('quiz-submission:123:user456')
    })
  })

  describe('queueOperation', () => {
    it('adds an operation to the sync queue with default options', async () => {
      const payload = { test: 1 }
      await queueOperation('quiz-submission', payload, 'key123')

      expect(addToSyncQueue).toHaveBeenCalledTimes(1)
      const callArgs = vi.mocked(addToSyncQueue).mock.calls[0][0]
      expect(callArgs.type).toBe('quiz-submission')
      expect(callArgs.payload).toMatchObject({
        ...payload,
        idempotencyKey: 'key123',
        maxRetries: 5,
        conflictStrategy: 'client-wins',
      })
      expect(callArgs.id).toBeDefined()
    })

    it('adds an operation to the sync queue with custom options', async () => {
      const payload = { test: 2 }
      await queueOperation('assignment-upload', payload, 'key456', {
        maxRetries: 3,
        conflictStrategy: 'server-wins',
      })

      expect(addToSyncQueue).toHaveBeenCalledTimes(1)
      const callArgs = vi.mocked(addToSyncQueue).mock.calls[0][0]
      expect(callArgs.payload.maxRetries).toBe(3)
      expect(callArgs.payload.conflictStrategy).toBe('server-wins')
    })
  })

  describe('processSyncQueue', () => {
    it('returns empty result when no pending items exist', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([])
      const result = await processSyncQueue()
      expect(result).toEqual({ synced: 0, failed: 0, conflicts: 0, permanent: 0 })
    })

    it('successfully processes a quiz-submission', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('quiz_attempts_v2')
      expect(markSynced).toHaveBeenCalledWith('1')
      expect(result.synced).toBe(1)
    })

    it('successfully processes an assignment-upload', async () => {
      const item = {
        id: '2',
        type: 'assignment-upload' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { submissionId: 's1', fileUrl: 'url' },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('assignment_submissions')
      expect(markSynced).toHaveBeenCalledWith('2')
      expect(result.synced).toBe(1)
    })

    it('successfully processes a grade-update', async () => {
      const item = {
        id: '3',
        type: 'grade-update' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { entryId: 'e1', score: 100 },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('gradebook_entries')
      expect(markSynced).toHaveBeenCalledWith('3')
      expect(result.synced).toBe(1)
    })

    it('successfully processes an attendance-mark', async () => {
      const item = {
        id: '4',
        type: 'attendance-mark' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { recordId: 'r1', status: 'present' },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('attendance_records')
      expect(markSynced).toHaveBeenCalledWith('4')
      expect(result.synced).toBe(1)
    })

    it('successfully processes a message-send', async () => {
      const item = {
        id: '5',
        type: 'message-send' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { senderId: 'u1', recipientId: 'u2', content: 'hello' },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const insertMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn(),
        insert: insertMock,
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('messages')
      expect(insertMock).toHaveBeenCalled()
      expect(markSynced).toHaveBeenCalledWith('5')
      expect(result.synced).toBe(1)
    })

    it('successfully processes a form-submit', async () => {
      const item = {
        id: '6',
        type: 'form-submit' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { tableName: 'custom_form', data: { a: 1 } },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const insertMock = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn(),
        insert: insertMock,
      } as any)

      const result = await processSyncQueue()

      expect(db.from).toHaveBeenCalledWith('custom_form')
      expect(insertMock).toHaveBeenCalledWith({ a: 1 })
      expect(markSynced).toHaveBeenCalledWith('6')
      expect(result.synced).toBe(1)
    })

    it('successfully processes an xapi-statement', async () => {
      const item = {
        id: '7',
        type: 'xapi-statement' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { verb: 'completed', objectType: 'course', objectId: 'c1' },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])
      vi.mocked(db.rpc).mockResolvedValue({ error: null } as any)

      const result = await processSyncQueue()

      expect(db.rpc).toHaveBeenCalledWith('record_xapi_statement', expect.any(Object))
      expect(markSynced).toHaveBeenCalledWith('7')
      expect(result.synced).toBe(1)
    })

    it('handles permanent failures on validation errors', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: { code: '23505' } })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(updateQueueItem).toHaveBeenCalledWith('1', { attempts: 5 })
      expect(captureError).toHaveBeenCalled()
      expect(result.permanent).toBe(1)
    })

    it('handles conflicts on optimistic locking failure', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: { code: 'PGRST116' } })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(result.conflicts).toBe(1)
    })

    it('handles retries on network errors', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockResolvedValue({ error: { code: 'NETWORK_ERROR' } })
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(updateQueueItem).toHaveBeenCalledWith('1', { attempts: 1 })
      expect(result.failed).toBe(1)
    })

    it('skips items that have reached max retries', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 5,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const result = await processSyncQueue()

      expect(db.from).not.toHaveBeenCalled()
      expect(result.synced).toBe(0)
    })

    it('handles unhandled exceptions during processing', async () => {
      const item = {
        id: '1',
        type: 'quiz-submission' as QueueOperationType,
        attempts: 0,
        createdAt: Date.now(),
        payload: { attemptId: 'a1', answers: {} },
      }
      vi.mocked(getPendingSubmissions).mockResolvedValue([item])

      const eqMock = vi.fn().mockRejectedValue(new Error('Unexpected crash'))
      vi.mocked(db.from).mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn(),
      } as any)

      const result = await processSyncQueue()

      expect(captureError).toHaveBeenCalled()
      expect(updateQueueItem).toHaveBeenCalledWith('1', { attempts: 1 })
      expect(result.failed).toBe(1)
    })

    it('returns permanent for unknown operation type', async () => {
        const item = {
          id: '99',
          type: 'unknown-type' as QueueOperationType,
          attempts: 0,
          createdAt: Date.now(),
          payload: { },
        }
        vi.mocked(getPendingSubmissions).mockResolvedValue([item])

        const result = await processSyncQueue()

        expect(updateQueueItem).toHaveBeenCalledWith('99', { attempts: 5 })
        expect(result.permanent).toBe(1)
    })
  })

  describe('scheduleNextSync', () => {
    it('schedules next sync after delay when failedCount > 0', () => {
      const spy = vi.spyOn(global, 'setTimeout')
      scheduleNextSync(1, 0)
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.calls[0][1]).toBeGreaterThanOrEqual(2000)
      spy.mockRestore()
    })

    it('does not schedule when failedCount is 0', () => {
      const spy = vi.spyOn(global, 'setTimeout')
      scheduleNextSync(0, 0)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('startOfflineSync', () => {
    it('adds online and visibilitychange event listeners and returns cleanup function', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const cleanup = startOfflineSync()

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

      addEventListenerSpy.mockRestore()
      documentAddEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
      documentRemoveEventListenerSpy.mockRestore()
    })
  })
})
