import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '@/src/lib/api'

import { useAuth } from '../../contexts/AuthContext'
import { useTenantQuery } from '../useTenantQuery'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const eqMock = vi.fn()
const selectMock = vi.fn(() => ({ eq: eqMock }))
const insertMock = vi.fn()
const fromMock = vi.fn(() => ({
  select: selectMock,
  insert: insertMock,
}))

vi.mock('@/src/services/api/client', () => {
  return {
    api: {
      from: vi.fn(() => fromMock()),
    },
  }
})

describe('useTenantQuery', () => {
  const mockTenantId = 'tenant-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tenantQuery', () => {
    it('applies tenant filter when tenantId exists', () => {
      // Arrange
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ tenantId: mockTenantId })
      const { result } = renderHook(() => useTenantQuery())

      // Act
      result.current.tenantQuery('courses')

      // Assert
      apiFetch('/api.from')
      expect(selectMock).toHaveBeenCalledWith('id')
      expect(eqMock).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })

    it('does not apply tenant filter when tenantId is null', () => {
      // Arrange
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ tenantId: null })
      const { result } = renderHook(() => useTenantQuery())

      // Act
      result.current.tenantQuery('courses')

      // Assert
      apiFetch('/api.from')
      expect(selectMock).toHaveBeenCalledWith('id')
      expect(eqMock).not.toHaveBeenCalled()
    })
  })

  describe('tenantInsert', () => {
    it('injects tenant_id when tenant exists', async () => {
      // Arrange
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ tenantId: mockTenantId })
      const { result } = renderHook(() => useTenantQuery())
      const dataToInsert = { title: 'Math' }

      // Act
      await result.current.tenantInsert('courses', dataToInsert)

      // Assert
      apiFetch('/api.from')
      expect(insertMock).toHaveBeenCalledWith({
        ...dataToInsert,
        tenant_id: mockTenantId,
      })
    })

    it('does not modify payload when tenantId is null', async () => {
      // Arrange
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ tenantId: null })
      const { result } = renderHook(() => useTenantQuery())
      const dataToInsert = { title: 'Math' }

      // Act
      await result.current.tenantInsert('courses', dataToInsert)

      // Assert
      apiFetch('/api.from')
      expect(insertMock).toHaveBeenCalledWith(dataToInsert)
    })
  })
})
