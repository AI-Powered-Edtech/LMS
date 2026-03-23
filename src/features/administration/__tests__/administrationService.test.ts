import { beforeEach, describe, expect, it, vi } from 'vitest'

import { administrationService } from '../api/administrationService'

const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const _mockFrom = vi.fn(() => ({ select: mockSelect }))

const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockUpdateEq = vi.fn()

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      const table = args[0] as string
      if (table === 'tenant_modules') {
        // Distinguish update vs select by call order — getTenantModules uses select, toggle uses update
        return {
          select: mockSelect,
          update: mockUpdate,
        }
      }
      return { select: mockSelect }
    },
  },
}))

describe('administrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTenantModules', () => {
    it('harus mengembalikan array modul dari tenant_modules', async () => {
      const mockData = [
        {
          id: 'tm-1',
          tenant_id: 't1',
          module_id: 'm1',
          is_enabled: true,
          updated_at: '2026-01-01',
          modules: {
            id: 'm1',
            slug: 'gradebook',
            name: 'Buku Nilai',
            description: 'Desc',
            is_core: true,
          },
        },
      ]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const result = await administrationService.getTenantModules()
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('gradebook')
      expect(result[0].isEnabled).toBe(true)
    })

    it('harus throw error saat Supabase error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'RLS violation' } })

      await expect(administrationService.getTenantModules()).rejects.toThrow()
    })
  })

  describe('syncExternalSystem', () => {
    it('harus mengembalikan status not_available', async () => {
      const result = await administrationService.syncExternalSystem()
      expect(result.status).toBe('not_available')
    })
  })
})
