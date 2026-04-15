import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onboardingService } from '../api/onboardingService'

const { mockEq, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockFrom = vi.fn(() => ({
    select: mockSelect.mockReturnValue({
      eq: mockEq,
    }),
  }))
  return { mockEq, mockFrom }
})

vi.mock('@/services/db', () => ({
  db: {
    from: mockFrom,
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  },
}))

describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('harus query data dengan tenant_id filter', async () => {
      const mockData = [{ id: '1', tenant_id: 't1' }]
      mockEq.mockResolvedValue({ data: mockData, error: null })

      const result = await onboardingService.getAll('t1')
      expect(mockFrom).toHaveBeenCalledWith('onboarding_progress')
      expect(result).toEqual(mockData)
    })

    it('harus mengembalikan array kosong saat DB error', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      })

      const result = await onboardingService.getAll('t1')
      expect(result).toEqual([])
    })
  })
})
