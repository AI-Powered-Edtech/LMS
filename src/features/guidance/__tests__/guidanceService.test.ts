import { beforeEach, describe, expect, it, vi } from 'vitest'

import { guidanceService } from '../api/guidanceService'

const mockRpc = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('guidanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listGuides', () => {
    it('harus memanggil RPC list_learning_guides dan mengembalikan data', async () => {
      const mockData = [{ id: 'g1', title: 'Guide 1' }]
      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const result = await guidanceService.listGuides('lesson', 'l1')
      expect(mockRpc).toHaveBeenCalledWith('list_learning_guides', {
        p_target_type: 'lesson',
        p_target_id: 'l1',
      })
      expect(result).toEqual(mockData)
    })

    it('harus throw error saat RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

      await expect(guidanceService.listGuides()).rejects.toThrow()
    })
  })

  describe('getApplicableGuides', () => {
    it('harus mengembalikan array kosong saat fungsi tidak ditemukan (PGRST202)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'fn not found', code: 'PGRST202' },
      })

      const result = await guidanceService.getApplicableGuides('lesson', 'l1')
      expect(result).toEqual([])
    })

    it('harus throw error saat error bukan PGRST202', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Some other error', code: '42501' },
      })

      await expect(guidanceService.getApplicableGuides('lesson', 'l1')).rejects.toThrow()
    })
  })
})
