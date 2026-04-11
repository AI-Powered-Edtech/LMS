import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const mockRpc = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { xapiService } from '../api/xapiService'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('xapiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordStatement', () => {
    it('mengirim pernyataan xAPI dan mengembalikan UUID', async () => {
      mockRpc.mockResolvedValue({
        data: 'statement-uuid-123',
        error: null,
      })

      const result = await xapiService.recordStatement(
        'completed',
        'lesson',
        'lesson-456',
        { score: 95, success: true, completion: true },
        { course_id: 'course-1', tenant_id: 'tenant-1' }
      )

      expect(mockRpc).toHaveBeenCalledWith('record_xapi_statement', {
        p_verb: 'completed',
        p_object_type: 'lesson',
        p_object_id: 'lesson-456',
        p_result: { score: 95, success: true, completion: true },
        p_context: expect.objectContaining({
          course_id: 'course-1',
          tenant_id: 'tenant-1',
          platform: 'edusync',
        }),
      })
      expect(result).toBe('statement-uuid-123')
    })

    it('menggunakan platform default "edusync" ketika context tidak menyertakan platform', async () => {
      mockRpc.mockResolvedValue({
        data: 'stmt-uuid',
        error: null,
      })

      await xapiService.recordStatement('experienced', 'course', 'course-1', {}, {})

      expect(mockRpc).toHaveBeenCalledWith(
        'record_xapi_statement',
        expect.objectContaining({
          p_context: expect.objectContaining({ platform: 'edusync' }),
        })
      )
    })

    it('tidak menimpa platform yang sudah ada di context', async () => {
      mockRpc.mockResolvedValue({
        data: 'stmt-uuid',
        error: null,
      })

      await xapiService.recordStatement(
        'experienced',
        'course',
        'course-1',
        {},
        { platform: 'custom-platform' }
      )

      expect(mockRpc).toHaveBeenCalledWith(
        'record_xapi_statement',
        expect.objectContaining({
          p_context: expect.objectContaining({ platform: 'custom-platform' }),
        })
      )
    })

    it('mengembalikan null ketika RPC error (fire-and-forget)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC not found' },
      })

      const result = await xapiService.recordStatement('completed', 'quiz', 'quiz-1', {})

      expect(result).toBeNull()
    })

    it('mengembalikan null ketika terjadi exception (fire-and-forget)', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const result = await xapiService.recordStatement('completed', 'quiz', 'quiz-1', {})

      expect(result).toBeNull()
    })

    it('mengembalikan null ketika data adalah null', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await xapiService.recordStatement('attempted', 'assignment', 'assign-1', {})

      expect(result).toBeNull()
    })

    it('mendukung semua jenis verb xAPI', async () => {
      mockRpc.mockResolvedValue({ data: 'uuid', error: null })

      const verbs: Array<import('../types').XAPIVerb> = [
        'experienced',
        'completed',
        'attempted',
        'scored',
        'passed',
        'failed',
        'launched',
        'submitted',
      ]

      for (const verb of verbs) {
        await xapiService.recordStatement(verb, 'lesson', 'lesson-1', {})
        expect(mockRpc).toHaveBeenCalledWith(
          'record_xapi_statement',
          expect.objectContaining({ p_verb: verb })
        )
      }
    })

    it('mendukung semua jenis object type', async () => {
      mockRpc.mockResolvedValue({ data: 'uuid', error: null })

      const objectTypes: Array<import('../types').XAPIObjectType> = [
        'lesson',
        'quiz',
        'assignment',
        'course',
        'block',
      ]

      for (const objectType of objectTypes) {
        await xapiService.recordStatement('completed', objectType, 'obj-1', {})
        expect(mockRpc).toHaveBeenCalledWith(
          'record_xapi_statement',
          expect.objectContaining({ p_object_type: objectType })
        )
      }
    })
  })
})
