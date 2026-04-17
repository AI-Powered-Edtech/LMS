import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Mock the internal session / role composition hooks
vi.mock('@/contexts/auth', () => ({
  useSessionManagement: () => ({
    user: { id: 'usr_123', email: 'test@example.com' },
    session: { access_token: 'foo', refresh_token: 'bar', user: { id: 'usr_123' } },
    loading: false,
    authStatus: 'authenticated',
    authError: null,
    sessionExpired: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
    clearAuthError: vi.fn()
  }),
  useRoleResolution: () => ({
    profile: { id: 'usr_123', first_name: 'Test' },
    roles: ['student'],
    memberships: [],
    rawTenants: {},
    defaultTenantId: null,
    bootstrapReady: true,
    error: null,
    loading: false,
    loadingMemberships: false,
    fetchUserData: vi.fn()
  }),
  useTenantSwitching: () => ({
    tenantId: 'tenant_123',
    activeTenant: null,
    setActiveTenant: vi.fn()
  }),
  getPrimaryRole: () => 'student',
  getPermissions: () => ({ canEdit: false })
}))

describe('AuthContext', () => {
  it('provides auth context via useAuth', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeDefined()
    expect(result.current.user?.email).toBe('test@example.com')
    expect(result.current.user?.id).toBe('usr_123')
    expect(result.current.role).toBe('student')
    expect(result.current.loading).toBe(false)
  })

  it('throws error when useAuth is used outside provider', () => {
    // suppress console error for this specific test
    const consoleError = console.error
    console.error = vi.fn()
    
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    
    console.error = consoleError
  })
})
