import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scheduleSync, syncPendingSubmissions } from '../backgroundSync'
import { getPendingSubmissions, markSynced } from '../offlineStorage'
import { supabase } from '@/src/services/supabase/client'

vi.mock('../offlineStorage', () => ({
  getPendingSubmissions: vi.fn(),
  markSynced: vi.fn(),
}))

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
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
    it('returns 0 synced and 0 failed when queue is empty', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([])

      const result = await syncPendingSubmissions()

      expect(result).toEqual({ synced: 0, failed: 0 })
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('ignores unknown or unsupported item types', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: '1',
          type: 'unknown-type' as any,
          payload: {},
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const result = await syncPendingSubmissions()

      expect(result).toEqual({ synced: 0, failed: 0 })
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('processes a successful quiz submission', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: 'item-1',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-1', answers: ['A'], quizId: 'quiz-1' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      const result = await syncPendingSubmissions()

      expect(supabase.from).toHaveBeenCalledWith('quiz_attempts')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: ['A'],
          submitted_late: true,
          completed_at: expect.any(String),
        })
      )
      expect(mockEq).toHaveBeenCalledWith('id', 'attempt-1')
      expect(markSynced).toHaveBeenCalledWith('item-1')

      expect(result).toEqual({ synced: 1, failed: 0 })
    })

    it('increments failed counter on Supabase error', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: 'item-2',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-2', answers: ['B'], quizId: 'quiz-2' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Supabase Error') })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      const result = await syncPendingSubmissions()

      expect(markSynced).not.toHaveBeenCalled()
      expect(result).toEqual({ synced: 0, failed: 1 })
    })

    it('increments failed counter if an exception is thrown during sync', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: 'item-3',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-3', answers: ['C'], quizId: 'quiz-3' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      // Cause an exception when calling .update()
      const mockUpdate = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected exception')
      })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      const result = await syncPendingSubmissions()

      expect(markSynced).not.toHaveBeenCalled()
      expect(result).toEqual({ synced: 0, failed: 1 })
    })

    it('processes multiple items with mixed success and failure', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: 'item-success',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-success', answers: ['A'], quizId: 'q1' },
          createdAt: Date.now(),
          attempts: 0,
        },
        {
          id: 'item-fail',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-fail', answers: ['B'], quizId: 'q2' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const mockEq = vi.fn().mockImplementation((col, val) => {
        if (val === 'attempt-success') return Promise.resolve({ error: null })
        if (val === 'attempt-fail') return Promise.resolve({ error: new Error('Failed') })
        return Promise.resolve({ error: new Error('Unknown') })
      })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      const result = await syncPendingSubmissions()

      expect(markSynced).toHaveBeenCalledTimes(1)
      expect(markSynced).toHaveBeenCalledWith('item-success')
      expect(result).toEqual({ synced: 1, failed: 1 })
    })
  })

  describe('scheduleSync', () => {
    it('schedules syncPendingSubmissions using setTimeout based on attempt delay', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValue([])

      scheduleSync()

      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(1000)

      expect(getPendingSubmissions).toHaveBeenCalled()
    })

    it('retries with exponential backoff if there are failures', async () => {
      // 1st call fails
      vi.mocked(getPendingSubmissions).mockResolvedValueOnce([
        {
          id: 'item-fail',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-1', answers: [], quizId: 'q1' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Network') })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      scheduleSync(0)

      expect(getPendingSubmissions).toHaveBeenCalledTimes(0)

      // Advance by DELAYS[0] = 1000
      await vi.advanceTimersByTimeAsync(1000)

      expect(getPendingSubmissions).toHaveBeenCalledTimes(1)

      // It should have scheduled retry (attempt + 1 = 1, delay = 5000)
      // Next call is empty (no failures)
      vi.mocked(getPendingSubmissions).mockResolvedValueOnce([])

      await vi.advanceTimersByTimeAsync(5000)

      expect(getPendingSubmissions).toHaveBeenCalledTimes(2)
    })

    it('does not retry if all syncs succeeded', async () => {
      vi.mocked(getPendingSubmissions).mockResolvedValueOnce([])

      scheduleSync(0)

      // First sync runs
      await vi.advanceTimersByTimeAsync(1000)

      expect(getPendingSubmissions).toHaveBeenCalledTimes(1)

      // Since failure was 0, it shouldn't schedule another sync
      expect(vi.getTimerCount()).toBe(0)
    })

    it('stops retrying when reaching the max number of delays', async () => {
      // Always fail
      vi.mocked(getPendingSubmissions).mockResolvedValue([
        {
          id: 'item-fail',
          type: 'quiz-submission',
          payload: { attemptId: 'attempt-1', answers: [], quizId: 'q1' },
          createdAt: Date.now(),
          attempts: 0,
        },
      ])

      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Network') })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any)

      // Call scheduleSync with the last attempt index: DELAYS.length - 1 (3 for max delay index)
      // Wait, DELAYS.length - 1 is 3 (max index for DELAYS: [1000, 5000, 30000, 300000])
      scheduleSync(3)

      // Wait 300000ms
      await vi.advanceTimersByTimeAsync(300000)

      // It ran once
      expect(getPendingSubmissions).toHaveBeenCalledTimes(1)

      // But should NOT schedule again
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
