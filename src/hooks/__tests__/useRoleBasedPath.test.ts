import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/src/contexts/AuthContext'

import { useRoleBasedPath } from '../useRoleBasedPath'

vi.mock('@/src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

describe('useRoleBasedPath', () => {
  it('returns teacherPath for role: teacher', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'teacher' } as any)
    const { result } = renderHook(() => useRoleBasedPath())
    const getPath = result.current
    expect(getPath('/teacher', '/admin', '/student')).toBe('/teacher')
  })

  it('returns adminPath for role: admin', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'admin' } as any)
    const { result } = renderHook(() => useRoleBasedPath())
    const getPath = result.current
    expect(getPath('/teacher', '/admin', '/student')).toBe('/admin')
  })

  it('returns studentPath for role: student when provided', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'student' } as any)
    const { result } = renderHook(() => useRoleBasedPath())
    const getPath = result.current
    expect(getPath('/teacher', '/admin', '/student')).toBe('/student')
  })

  it('returns teacherPath for role: student when studentPath is NOT provided', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'student' } as any)
    const { result } = renderHook(() => useRoleBasedPath())
    const getPath = result.current
    expect(getPath('/teacher', '/admin')).toBe('/teacher')
  })

  it('returns teacherPath as fallback for unknown roles', () => {
    vi.mocked(useAuth).mockReturnValue({ role: 'guest' } as any)
    const { result } = renderHook(() => useRoleBasedPath())
    const getPath = result.current
    expect(getPath('/teacher', '/admin', '/student')).toBe('/teacher')
  })
})
