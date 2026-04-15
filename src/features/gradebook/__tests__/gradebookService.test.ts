import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchGradebookSettings, syncGradebook } from '../api/gradebookApi'

const { mockRpc, mockFrom, mockMaybeSingle } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
  const mockSelect = vi.fn(() => ({ eq: mockEq1 }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  const mockRpc = vi.fn()
  return { mockRpc, mockFrom, mockMaybeSingle }
})

vi.mock('@/src/services/api/client', () => ({
  api: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

describe('gradebookApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncGradebook', () => {
    it('harus memanggil RPC sync_gradebook_entries dan mengembalikan jumlah baris', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null })

      const result = await syncGradebook('course-1', 'tenant-1')
      expect(mockRpc).toHaveBeenCalledWith('sync_gradebook_entries', {
        p_course_id: 'course-1',
        p_tenant_id: 'tenant-1',
      })
      expect(result).toBe(5)
    })

    it('harus throw error saat RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Sync failed' } })

      await expect(syncGradebook('course-1', 'tenant-1')).rejects.toThrow()
    })
  })

  describe('fetchGradebookSettings', () => {
    it('harus mengembalikan settings atau null', async () => {
      const mockData = { id: 's1', tenant_id: 't1', course_id: 'c1', grading_scale: 'A-F' }
      mockMaybeSingle.mockResolvedValue({ data: mockData, error: null })

      const result = await fetchGradebookSettings('c1', 't1')
      expect(result).toEqual(mockData)
    })

    it('harus throw error saat query gagal', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Query failed' } })

      await expect(fetchGradebookSettings('c1', 't1')).rejects.toThrow()
    })
  })
})
