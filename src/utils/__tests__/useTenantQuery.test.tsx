import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTenantQuery } from '../useTenantQuery'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
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
      ;(useAuth as any).mockReturnValue({ tenantId: mockTenantId })
      const { result } = renderHook(() => useTenantQuery())

      // Act
      result.current.tenantQuery('courses')

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('courses')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqMock).toHaveBeenCalledWith('tenant_id', mockTenantId)
    })

    it('does not apply tenant filter when tenantId is null', () => {
      // Arrange
      ;(useAuth as any).mockReturnValue({ tenantId: null })
      const { result } = renderHook(() => useTenantQuery())

      // Act
      result.current.tenantQuery('courses')

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('courses')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqMock).not.toHaveBeenCalled()
    })
  })

  describe('tenantInsert', () => {
    it('injects tenant_id when tenant exists', async () => {
      // Arrange
      ;(useAuth as any).mockReturnValue({ tenantId: mockTenantId })
      const { result } = renderHook(() => useTenantQuery())
      const dataToInsert = { title: 'Math' }

      // Act
      await result.current.tenantInsert('courses', dataToInsert)

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('courses')
      expect(insertMock).toHaveBeenCalledWith({
        ...dataToInsert,
        tenant_id: mockTenantId,
      })
    })

    it('does not modify payload when tenantId is null', async () => {
      // Arrange
      ;(useAuth as any).mockReturnValue({ tenantId: null })
      const { result } = renderHook(() => useTenantQuery())
      const dataToInsert = { title: 'Math' }

      // Act
      await result.current.tenantInsert('courses', dataToInsert)

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('courses')
      expect(insertMock).toHaveBeenCalledWith(dataToInsert)
    })
  })
})
