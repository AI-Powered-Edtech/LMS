import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReplayQueue, getPendingOperations, getQueueStats } from '../ReplayQueue'
import * as offlineStorage from '../offlineStorage'

vi.mock('../offlineStorage', () => ({
  addToSyncQueue: vi.fn(),
  getPendingSubmissions: vi.fn(),
  markSynced: vi.fn()
}))

describe('ReplayQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getPendingOperations', () => {
    it('returns empty array when no pending items', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([])
      const result = await getPendingOperations()
      expect(result).toEqual([])
    })

    it('returns mapped items', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: { a: 1 }, createdAt: 1000, attempts: 0 }
      ])
      const result = await getPendingOperations()
      expect(result).toEqual([
        { id: '1', type: 'test', payload: { a: 1 }, createdAt: 1000, attempts: 0 }
      ])
    })
  })

  describe('getQueueStats', () => {
    it('returns default stats for empty queue', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([])
      const result = await getQueueStats()
      expect(result).toEqual({
        pending: 0,
        failed: 0,
        total: 0,
        oldestItemAt: null
      })
    })

    it('calculates stats correctly', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 2000, attempts: 0 },
        { id: '2', type: 'test', payload: null, createdAt: 1000, attempts: 2 },
        { id: '3', type: 'test', payload: null, createdAt: 3000, attempts: 0 }
      ])
      const result = await getQueueStats()
      expect(result).toEqual({
        pending: 2,
        failed: 1,
        total: 3,
        oldestItemAt: 1000
      })
    })
  })

  describe('ReplayQueue class', () => {
    it('enqueues an item', async () => {
      const queue = new ReplayQueue()
      await queue.enqueue({ id: '1', type: 'test', payload: null, createdAt: 1000 })
      expect(offlineStorage.addToSyncQueue).toHaveBeenCalledWith({
        id: '1', type: 'test', payload: null, createdAt: 1000
      })
    })

    it('returns conflict if already processing', async () => {
      const queue = new ReplayQueue()
      // Lock it manually to simulate running process
      ;(queue as any).processing = true
      const result = await queue.processAll(vi.fn())
      expect(result.conflict).toBe(true)
      expect(result.processed).toBe(0)
    })

    it('processes items successfully', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 0 }
      ])
      const queue = new ReplayQueue({ baseDelayMs: 0 })
      const processor = vi.fn().mockResolvedValue(true)
      const resultPromise = queue.processAll(processor)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(processor).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
      expect(offlineStorage.markSynced).toHaveBeenCalledWith('1')
      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        deadLettered: 0,
        conflict: false
      })
    })

    it('handles processor returning false as a failure', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 0 }
      ])
      const queue = new ReplayQueue({ baseDelayMs: 0 })
      const processor = vi.fn().mockResolvedValue(false)
      const resultPromise = queue.processAll(processor)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(offlineStorage.markSynced).not.toHaveBeenCalled()
      expect(result).toEqual({
        processed: 1,
        succeeded: 0,
        failed: 1,
        deadLettered: 0,
        conflict: false
      })
    })

    it('handles processor throwing an error', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 0 }
      ])
      const queue = new ReplayQueue({ baseDelayMs: 0 })
      const processor = vi.fn().mockRejectedValue(new Error('test err'))
      const resultPromise = queue.processAll(processor)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.failed).toBe(1)
    })

    it('dead-letters an item when max retries exceeded', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 3 }
      ])
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
      const queue = new ReplayQueue({ maxRetries: 3, baseDelayMs: 0 })
      const processor = vi.fn().mockResolvedValue(false)
      const resultPromise = queue.processAll(processor)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(offlineStorage.markSynced).toHaveBeenCalledWith('1')
      expect(consoleErrorMock).toHaveBeenCalled()
      expect(result.deadLettered).toBe(1)
      consoleErrorMock.mockRestore()
    })

    it('dead-letters with non-Error string', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 3 }
      ])
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
      const queue = new ReplayQueue({ maxRetries: 3, baseDelayMs: 0 })
      const processor = vi.fn().mockRejectedValue('string err')
      const resultPromise = queue.processAll(processor)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(offlineStorage.markSynced).toHaveBeenCalledWith('1')
      expect(consoleErrorMock).toHaveBeenCalled()
      expect(result.deadLettered).toBe(1)
      consoleErrorMock.mockRestore()
    })

    it('uses backoff sleep between processing', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
        { id: '1', type: 'test', payload: null, createdAt: 1000, attempts: 0 },
        { id: '2', type: 'test', payload: null, createdAt: 1000, attempts: 1 }
      ])
      const queue = new ReplayQueue({ baseDelayMs: 1000, maxDelayMs: 5000 })
      const processor = vi.fn().mockResolvedValue(true)
      const processPromise = queue.processAll(processor)

      await vi.runOnlyPendingTimersAsync() // First delay: 1000 * 2^0 = 1000ms
      await vi.runOnlyPendingTimersAsync() // Second delay: 1000 * 2^1 = 2000ms
      await vi.runAllTimersAsync()

      const result = await processPromise
      expect(result.processed).toBe(2)
    })
  })
})
