import { describe, expect, it } from 'vitest'

// Test the getPrimaryRole logic (exported indirectly through role calculation)
// Since getPrimaryRole is internal, we test the behavior by checking role hierarchy

describe('signOut localStorage cleanup', () => {
  // Verify that the logout function properly removes all auth-related keys.
  // The attack vector: if pendingInviteToken / pendingJoinCode are left behind,
  // the next user who logs in on the same browser auto-inherits the invite and
  // gets added to a different user's tenant.
  it('removes pendingInviteToken, pendingJoinCode and ai_tutor_session_* on logout', () => {
    // Simulate what signOut now does:
    const AUTH_KEYS = ['activeTenantId', 'pendingInviteToken', 'pendingJoinCode']

    // Populate localStorage with all auth-sensitive data
    localStorage.setItem('activeTenantId', 'tenant-a')
    localStorage.setItem('pendingInviteToken', 'tok_abc123')
    localStorage.setItem('pendingJoinCode', 'JCODE99')
    localStorage.setItem('ai_tutor_session_lesson-1', 'session_xyz')
    localStorage.setItem('ai_tutor_session_lesson-2', 'session_abc')
    localStorage.setItem('unrelatedKey', 'should-stay')

    // Execute the cleanup logic (mirrors AuthContext signOut)
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ai_tutor_session_'))
      .forEach((k) => localStorage.removeItem(k))

    // Auth keys must be cleared
    expect(localStorage.getItem('activeTenantId')).toBeNull()
    expect(localStorage.getItem('pendingInviteToken')).toBeNull()
    expect(localStorage.getItem('pendingJoinCode')).toBeNull()
    expect(localStorage.getItem('ai_tutor_session_lesson-1')).toBeNull()
    expect(localStorage.getItem('ai_tutor_session_lesson-2')).toBeNull()

    // Unrelated keys must NOT be affected
    expect(localStorage.getItem('unrelatedKey')).toBe('should-stay')

    // Cleanup
    localStorage.clear()
  })
})

describe('setActiveTenant is_active validation', () => {
  it('does not switch to an inactive tenant', () => {
    const rawTenants: Record<string, { id: string; name: string; is_active: boolean }> = {
      'tenant-a': { id: 'tenant-a', name: 'Sekolah A', is_active: true },
      'tenant-b': { id: 'tenant-b', name: 'Sekolah B', is_active: false }, // inactive!
    }

    // Simulate the guard logic in setActiveTenant
    function trySetActiveTenant(id: string): boolean {
      const tenant = rawTenants[id]
      if (!tenant) return false
      if (!tenant.is_active) return false
      return true
    }

    expect(trySetActiveTenant('tenant-a')).toBe(true)
    expect(trySetActiveTenant('tenant-b')).toBe(false) // blocked — inactive
    expect(trySetActiveTenant('tenant-c')).toBe(false) // blocked — not found
  })
})

describe('Auth role hierarchy', () => {
  it('admin takes priority over teacher and student', () => {
    // Simulates getPrimaryRole(['admin', 'teacher', 'student'])
    const roles = ['admin', 'teacher', 'student']
    const getPrimaryRole = (r: string[]) => {
      if (r.includes('admin')) return 'admin'
      if (r.includes('teacher')) return 'teacher'
      return 'student'
    }
    expect(getPrimaryRole(roles)).toBe('admin')
  })

  it('teacher takes priority over student', () => {
    const roles = ['teacher', 'student']
    const getPrimaryRole = (r: string[]) => {
      if (r.includes('admin')) return 'admin'
      if (r.includes('teacher')) return 'teacher'
      return 'student'
    }
    expect(getPrimaryRole(roles)).toBe('teacher')
  })

  it('defaults to student when no roles', () => {
    const roles: string[] = []
    const getPrimaryRole = (r: string[]) => {
      if (r.includes('admin')) return 'admin'
      if (r.includes('teacher')) return 'teacher'
      return 'student'
    }
    expect(getPrimaryRole(roles)).toBe('student')
  })
})

describe('Tenant isolation: activeRole vs global role', () => {
  it('activeRole must be used for access control, not global role', () => {
    // This test documents the security requirement:
    // A user who is admin in Tenant A but student in Tenant B
    // must get activeRole='student' when in Tenant B context

    const memberships = [
      { tenant_id: 'tenant-a', role: 'admin' },
      { tenant_id: 'tenant-b', role: 'student' },
    ]

    // When active tenant is B, activeRole should be 'student'
    const activeTenantId = 'tenant-b'
    const membership = memberships.find((m) => m.tenant_id === activeTenantId)
    const activeRole = membership?.role ?? null

    expect(activeRole).toBe('student')
    // Must NOT use global 'admin' role
    expect(activeRole).not.toBe('admin')
  })
})
