import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getPendingOperations,
  getQueueStats,
  ReplayQueue,
} from '../ReplayQueue'
import * as offlineStorage from '../offlineStorage'

// Mock the offlineStorage module
vi.mock('../offlineStorage', () => ({
  addToSyncQueue: vi.fn(),
  getPendingSubmissions: vi.fn(),
  markSynced: vi.fn(),
}))

describe('ReplayQueue Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([])
  })

  describe('getPendingOperations', () => {
    it('maps pending submissions to ReplayQueueItem correctly', async () => {
      const mockItems = [
        { id: '1', type: 'test', payload: { data: 1 }, createdAt: 1000, attempts: 0 },
        { id: '2', type: 'test2', payload: null, createdAt: 2000, attempts: 1 },
      ]
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue(mockItems)

      const result = await getPendingOperations()

      expect(result).toEqual([
        { id: '1', type: 'test', payload: { data: 1 }, createdAt: 1000, attempts: 0 },
        { id: '2', type: 'test2', payload: null, createdAt: 2000, attempts: 1 },
      ])
      expect(offlineStorage.getPendingSubmissions).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQueueStats', () => {
    it('calculates pending, failed, total, and oldest item correctly', async () => {
      const mockItems = [
        { id: '1', type: 'test', payload: {}, createdAt: 1000, attempts: 0 },
        { id: '2', type: 'test', payload: {}, createdAt: 500, attempts: 2 }, // failed (attempts > 0)
        { id: '3', type: 'test', payload: {}, createdAt: 2000, attempts: 0 },
      ]
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue(mockItems)

      const stats = await getQueueStats()

      expect(stats).toEqual({
        pending: 2, // items with 0 attempts
        failed: 1,  // items with >0 attempts
        total: 3,
        oldestItemAt: 500,
      })
    })

    it('handles empty queue correctly', async () => {
      vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([])

      const stats = await getQueueStats()

      expect(stats).toEqual({
        pending: 0,
        failed: 0,
        total: 0,
        oldestItemAt: null,
      })
    })
  })

  describe('ReplayQueue', () => {
    let originalConsoleError: typeof console.error

    beforeEach(() => {
      originalConsoleError = console.error
      console.error = vi.fn()
      // Use fake timers to skip through sleep delays
      vi.useFakeTimers()
    })

    afterEach(() => {
      console.error = originalConsoleError
      vi.useRealTimers()
    })

    it('initializes with default options', () => {
      const queue = new ReplayQueue()
      expect(queue).toBeDefined()
      // We test internal defaults implicitly via behavior below
    })

    it('enqueue calls addToSyncQueue', async () => {
      const queue = new ReplayQueue()
      const item = { id: '1', type: 'test', payload: {}, createdAt: 1000 }

      await queue.enqueue(item)

      expect(offlineStorage.addToSyncQueue).toHaveBeenCalledWith(item)
    })

    describe('processAll', () => {
      it('returns conflict if already processing', async () => {
        const queue = new ReplayQueue()
        vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([
          { id: '1', type: 'test', payload: {}, createdAt: 1000, attempts: 0 }
        ])

        // Mock processor to never resolve until we advance timers or manually resolve it,
        // to keep the queue in "processing" state
        let resolveProcessor!: (value: boolean) => void
        const processorPromise = new Promise<boolean>((resolve) => {
          resolveProcessor = resolve
        })
        const processor = vi.fn().mockReturnValue(processorPromise)

        // Start first processAll
        const processPromise = queue.processAll(processor)

        // While first one is processing, start another one
        const conflictResult = await queue.processAll(processor)

        expect(conflictResult).toEqual({
          processed: 0, succeeded: 0, failed: 0, deadLettered: 0, conflict: true
        })

        // Clean up: let the first one finish
        resolveProcessor(true)
        // Need to run timers for sleep to resolve
        await vi.runAllTimersAsync()
        await processPromise
      })

      it('processes successfully and calls markSynced', async () => {
        const queue = new ReplayQueue({ baseDelayMs: 10 })
        const mockItem = { id: '1', type: 'test', payload: {}, createdAt: 1000, attempts: 0 }
        vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([mockItem])

        const processor = vi.fn().mockResolvedValue(true)

        const processPromise = queue.processAll(processor)
        await vi.runAllTimersAsync()
        const result = await processPromise

        expect(processor).toHaveBeenCalledWith(mockItem)
        expect(offlineStorage.markSynced).toHaveBeenCalledWith('1')
        expect(result).toEqual({
          processed: 1, succeeded: 1, failed: 0, deadLettered: 0, conflict: false
        })
      })

      it('handles processor returning false', async () => {
        const queue = new ReplayQueue({ baseDelayMs: 10 })
        const mockItem = { id: '2', type: 'test', payload: {}, createdAt: 1000, attempts: 0 }
        vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([mockItem])

        const processor = vi.fn().mockResolvedValue(false)

        const processPromise = queue.processAll(processor)
        await vi.runAllTimersAsync()
        const result = await processPromise

        expect(processor).toHaveBeenCalledWith(mockItem)
        expect(offlineStorage.markSynced).not.toHaveBeenCalled()
        expect(result).toEqual({
          processed: 1, succeeded: 0, failed: 1, deadLettered: 0, conflict: false
        })
      })

      it('handles processor throwing error', async () => {
        const queue = new ReplayQueue({ baseDelayMs: 10 })
        const mockItem = { id: '3', type: 'test', payload: {}, createdAt: 1000, attempts: 1 }
        vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([mockItem])

        const error = new Error('Network fail')
        const processor = vi.fn().mockRejectedValue(error)

        const processPromise = queue.processAll(processor)
        await vi.runAllTimersAsync()
        const result = await processPromise

        expect(processor).toHaveBeenCalledWith(mockItem)
        expect(offlineStorage.markSynced).not.toHaveBeenCalled()
        expect(result).toEqual({
          processed: 1, succeeded: 0, failed: 1, deadLettered: 0, conflict: false
        })
      })

      it('dead-letters items exceeding max retries and calls markSynced and console.error', async () => {
        const queue = new ReplayQueue({ maxRetries: 3, baseDelayMs: 10 })
        // Attempting for the 3rd time (attempts is currently 2, meaning it's about to be 3)
        const mockItem = { id: '4', type: 'test', payload: {}, createdAt: 1000, attempts: 2 }
        vi.mocked(offlineStorage.getPendingSubmissions).mockResolvedValue([mockItem])

        const processor = vi.fn().mockResolvedValue(false) // Will cause failure

        const processPromise = queue.processAll(processor)
        await vi.runAllTimersAsync()
        const result = await processPromise

        expect(processor).toHaveBeenCalledWith(mockItem)
        // Dead-lettering calls markSynced to remove it from the queue
        expect(offlineStorage.markSynced).toHaveBeenCalledWith('4')
        expect(console.error).toHaveBeenCalled()

        expect(result).toEqual({
          processed: 1, succeeded: 0, failed: 0, deadLettered: 1, conflict: false
        })
      })
    })
  })
})
