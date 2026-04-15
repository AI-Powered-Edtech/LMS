import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reportService } from '../api/reportService'

const mockRpc = vi.fn()

vi.mock('@/src/services/api/client', () => ({
  api: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReports', () => {
    it('harus memanggil RPC get_scheduled_reports dan mengembalikan data', async () => {
      const mockData = [{ id: 'r1', name: 'Report 1' }]
      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const result = await reportService.getReports()
      expect(mockRpc).toHaveBeenCalledWith('get_scheduled_reports')
      expect(result).toEqual(mockData)
    })

    it('harus throw error saat RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })

      await expect(reportService.getReports()).rejects.toThrow()
    })
  })

  describe('deleteReport', () => {
    it('harus memanggil RPC delete_scheduled_report', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await reportService.deleteReport('r1')
      expect(mockRpc).toHaveBeenCalledWith('delete_scheduled_report', { p_report_id: 'r1' })
    })

    it('harus throw error saat gagal menghapus', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(reportService.deleteReport('r1')).rejects.toThrow()
    })
  })
})
