import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePermissions } from '../usePermissions'

// Mock useAuth — the hook lives in AuthContext, not a local useAuth.ts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/contexts/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

const basePermissions = {
  canCreateCourse: false,
  canManageUsers: false,
  canViewAnalytics: false,
  canTakeExams: true,
  canScheduleExams: false,
}

describe('usePermissions', () => {
  describe('isAdmin / isTeacher / isStudent — tenant-scoped (activeRole)', () => {
    it('SECURITY: isAdmin reflects activeRole, NOT global roles array', () => {
      // User is admin globally but student in current tenant
      mockUseAuth.mockReturnValue({
        permissions: basePermissions,
        roles: ['admin', 'student'], // global — admin somewhere
        activeRole: 'student', // current tenant role
      } as any)

      const { result } = renderHook(() => usePermissions())

      // isAdmin must be false because activeRole is 'student'
      expect(result.current.isAdmin).toBe(false)
      // isStudent must be true because activeRole is 'student'
      expect(result.current.isStudent).toBe(true)
    })

    it('SECURITY: isTeacher reflects activeRole, NOT global roles array', () => {
      mockUseAuth.mockReturnValue({
        permissions: { ...basePermissions, canCreateCourse: true },
        roles: ['admin', 'teacher'], // global — admin somewhere
        activeRole: 'teacher', // current tenant role
      } as any)

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isTeacher).toBe(true)
      expect(result.current.isAdmin).toBe(false)
    })

    it('all role flags are false when activeRole is null (no active tenant)', () => {
      mockUseAuth.mockReturnValue({
        permissions: basePermissions,
        roles: ['admin'],
        activeRole: null,
      } as any)

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })

    it('isAdmin true only when activeRole is exactly admin', () => {
      mockUseAuth.mockReturnValue({
        permissions: { ...basePermissions, canManageUsers: true },
        roles: ['admin'],
        activeRole: 'admin',
      } as any)

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isTeacher).toBe(false)
      expect(result.current.isStudent).toBe(false)
    })
  })

  describe('hasAnyRole — intentional global check', () => {
    it('hasAnyRole checks global roles (cross-tenant by design)', () => {
      mockUseAuth.mockReturnValue({
        permissions: basePermissions,
        roles: ['admin', 'teacher'],
        activeRole: 'student', // current tenant student
      } as any)

      const { result } = renderHook(() => usePermissions())

      // hasAnyRole is a global check — finds admin in global roles
      expect(result.current.hasAnyRole(['admin'])).toBe(true)
      // isAdmin is a tenant-scoped check — student in current tenant
      expect(result.current.isAdmin).toBe(false)
    })
  })
})
