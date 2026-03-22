import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dashboardService } from '../api/dashboardService'

const mockRpc = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboards', () => {
    it('harus mengembalikan daftar dashboard via RPC', async () => {
      const mockData = [{ id: 'd1', name: 'Dashboard 1' }]
      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const result = await dashboardService.getDashboards()
      expect(mockRpc).toHaveBeenCalledWith('get_dashboards', { p_include_shared: true })
      expect(result).toEqual(mockData)
    })

    it('harus throw error saat RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

      await expect(dashboardService.getDashboards()).rejects.toThrow()
    })
  })

  describe('deleteDashboard', () => {
    it('harus memanggil RPC delete_dashboard', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await dashboardService.deleteDashboard('d1')
      expect(mockRpc).toHaveBeenCalledWith('delete_dashboard', { p_dashboard_id: 'd1' })
    })

    it('harus throw error saat gagal menghapus', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(dashboardService.deleteDashboard('d1')).rejects.toThrow()
    })
  })
})
