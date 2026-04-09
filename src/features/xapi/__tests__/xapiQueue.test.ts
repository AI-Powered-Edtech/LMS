import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQueueOperation = vi.fn()
const mockProcessSyncQueue = vi.fn()

vi.mock('@/utils/offlineQueue', () => ({
  queueOperation: (...args: unknown[]) => mockQueueOperation(...args),
  processSyncQueue: () => mockProcessSyncQueue(),
}))

vi.mock('@/utils/sentry', () => ({
  captureError: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: 'stmt-uuid', error: null }),
  },
}))

import { xapiQueue } from '../api/xapiQueue'

describe('xapiQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueueOperation.mockResolvedValue('queue-id-123')
    mockProcessSyncQueue.mockResolvedValue({ synced: 1, failed: 0, conflicts: 0, permanent: 0 })
  })

  describe('queueStatement', () => {
    it('menambahkan pernyataan ke offline queue', async () => {
      const result = await xapiQueue.queueStatement(
        'completed',
        'lesson',
        'lesson-456',
        { score: 95 },
        { course_id: 'course-1' },
        'user-123'
      )

      expect(mockQueueOperation).toHaveBeenCalledWith(
        'xapi-statement',
        expect.objectContaining({
          verb: 'completed',
          objectType: 'lesson',
          objectId: 'lesson-456',
          result: { score: 95 },
          context: expect.objectContaining({
            course_id: 'course-1',
            platform: 'edusync',
          }),
          userId: 'user-123',
        }),
        'xapi:completed:lesson:lesson-456:user-123',
        { maxRetries: 3, conflictStrategy: 'client-wins' }
      )
      expect(result).toBe('queue-id-123')
    })

    it('menggunakan platform default "edusync"', async () => {
      await xapiQueue.queueStatement('experienced', 'course', 'course-1', {}, {}, 'user-1')

      expect(mockQueueOperation).toHaveBeenCalledWith(
        'xapi-statement',
        expect.objectContaining({
          context: expect.objectContaining({ platform: 'edusync' }),
        }),
        expect.any(String),
        expect.any(Object)
      )
    })

    it('tidak menimpa platform yang sudah ada', async () => {
      await xapiQueue.queueStatement(
        'completed',
        'quiz',
        'quiz-1',
        {},
        { platform: 'custom-platform' },
        'user-1'
      )

      expect(mockQueueOperation).toHaveBeenCalledWith(
        'xapi-statement',
        expect.objectContaining({
          context: expect.objectContaining({ platform: 'custom-platform' }),
        }),
        expect.any(String),
        expect.any(Object)
      )
    })

    it('mengembalikan null ketika queueOperation gagal', async () => {
      mockQueueOperation.mockRejectedValue(new Error('Queue error'))

      const result = await xapiQueue.queueStatement(
        'completed',
        'lesson',
        'lesson-1',
        {},
        {},
        'user-1'
      )

      expect(result).toBeNull()
    })
  })

  describe('flush', () => {
    it('memproses sync queue dan mengembalikan hasil', async () => {
      mockProcessSyncQueue.mockResolvedValue({
        synced: 3,
        failed: 1,
        conflicts: 0,
        permanent: 0,
      })

      const result = await xapiQueue.flush()

      expect(result).toEqual({ synced: 3, failed: 1 })
    })
  })

  describe('recordStatement (fallback)', () => {
    it('menyediakan akses ke xapiService untuk fire-and-forget', async () => {
      expect(typeof xapiQueue.recordStatement).toBe('function')
    })
  })
})
