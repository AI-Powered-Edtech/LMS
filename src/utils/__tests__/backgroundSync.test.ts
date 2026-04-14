import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scheduleSync, syncPendingSubmissions } from '../backgroundSync'
import { processSyncQueue } from '../offlineQueue'

vi.mock('../offlineStorage', () => ({
  getPendingSubmissions: vi.fn(),
  markSynced: vi.fn(),
  updateQueueItem: vi.fn(),
}))

vi.mock('../offlineQueue', () => ({
  processSyncQueue: vi.fn(),
}))

vi.mock('@/services/db', () => ({
  db: {
    from: vi.fn(),
  },
}))

describe('backgroundSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('syncPendingSubmissions', () => {
    it('delegates to processSyncQueue', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockResolvedValue({ synced: 2, failed: 1, conflicts: 0, permanent: 0 })

      const result = await syncPendingSubmissions()

      expect(mockProcessSyncQueue).toHaveBeenCalled()
      expect(result).toMatchObject({ synced: 2, failed: 1 })
    })

    it('throws when processSyncQueue rejects', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockRejectedValue(new Error('Network error'))

      await expect(syncPendingSubmissions()).rejects.toThrow('Network error')
    })
  })

  describe('scheduleSync', () => {
    it('schedules syncPendingSubmissions using setTimeout based on attempt delay', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockResolvedValue({ synced: 0, failed: 0, conflicts: 0, permanent: 0 })

      scheduleSync()

      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(1000)

      expect(mockProcessSyncQueue).toHaveBeenCalled()
    })

    it('retries with exponential backoff if there are failures', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockResolvedValueOnce({
        synced: 0,
        failed: 1,
        conflicts: 0,
        permanent: 0,
      })
      mockProcessSyncQueue.mockResolvedValueOnce({
        synced: 0,
        failed: 0,
        conflicts: 0,
        permanent: 0,
      })

      scheduleSync()

      await vi.advanceTimersByTimeAsync(1000)

      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(5000)

      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(2)
    })

    it('does not retry if all syncs succeeded', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockResolvedValue({ synced: 0, failed: 0, conflicts: 0, permanent: 0 })

      scheduleSync()

      await vi.advanceTimersByTimeAsync(1000)

      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(1)

      expect(vi.getTimerCount()).toBe(0)
    })

    it('stops retrying when reaching the max number of delays', async () => {
      const mockProcessSyncQueue = vi.mocked(processSyncQueue)
      mockProcessSyncQueue.mockResolvedValue({ synced: 0, failed: 1, conflicts: 0, permanent: 0 })

      scheduleSync()

      // First attempt: DELAYS[0] = 1000
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(1)

      // Second attempt: DELAYS[1] = 5000
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(2)

      // Third attempt: DELAYS[2] = 30000
      await vi.advanceTimersByTimeAsync(30000)
      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(3)

      // Fourth attempt: DELAYS[3] = 300000
      // After this, should NOT retry since attempt would be 4 which is >= DELAYS.length
      await vi.advanceTimersByTimeAsync(300000)
      expect(mockProcessSyncQueue).toHaveBeenCalledTimes(4)

      // No more timers should be scheduled
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
