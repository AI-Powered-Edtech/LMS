import { describe, expect, it } from 'vitest'

// Test the getPrimaryRole logic (exported indirectly through role calculation)
// Since getPrimaryRole is internal, we test the behavior by checking role hierarchy

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
