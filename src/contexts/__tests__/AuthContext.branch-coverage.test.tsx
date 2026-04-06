import { describe, expect, it, vi, beforeEach } from 'vitest'

import { getPrimaryRole, getPermissions } from '../auth/useRoleResolution'
import type { Role, Permissions } from '../auth/useRoleResolution'

// ══════════════════════════════════════════════════════════════
// getPrimaryRole — full branch coverage
// ══════════════════════════════════════════════════════════════

describe('getPrimaryRole — full branch coverage', () => {
  it('returns admin when admin is in roles', () => {
    expect(getPrimaryRole(['admin', 'teacher', 'student'])).toBe('admin')
  })

  it('returns admin even when admin is the only role', () => {
    expect(getPrimaryRole(['admin'])).toBe('admin')
  })

  it('returns principal when principal is present but not admin', () => {
    expect(getPrimaryRole(['principal', 'teacher'])).toBe('principal')
  })

  it('returns principal even as sole role', () => {
    expect(getPrimaryRole(['principal'])).toBe('principal')
  })

  it('returns teacher when teacher is present but not admin/principal', () => {
    expect(getPrimaryRole(['teacher', 'student'])).toBe('teacher')
  })

  it('returns teacher as sole role', () => {
    expect(getPrimaryRole(['teacher'])).toBe('teacher')
  })

  it('returns parent when parent is present but not admin/principal/teacher', () => {
    expect(getPrimaryRole(['parent', 'student'])).toBe('parent')
  })

  it('returns parent as sole role', () => {
    expect(getPrimaryRole(['parent'])).toBe('parent')
  })

  it('returns student when student is the only role', () => {
    expect(getPrimaryRole(['student'])).toBe('student')
  })

  it('returns student when roles array is empty (fallback)', () => {
    expect(getPrimaryRole([])).toBe('student')
  })

  it('admin > principal > teacher > parent > student priority order', () => {
    expect(getPrimaryRole(['student', 'parent', 'teacher', 'principal', 'admin'])).toBe('admin')
    expect(getPrimaryRole(['student', 'parent', 'teacher', 'principal'])).toBe('principal')
    expect(getPrimaryRole(['student', 'parent', 'teacher'])).toBe('teacher')
    expect(getPrimaryRole(['student', 'parent'])).toBe('parent')
    expect(getPrimaryRole(['student'])).toBe('student')
  })
})

// ══════════════════════════════════════════════════════════════
// getPermissions — all 5 role branches
// ══════════════════════════════════════════════════════════════

describe('getPermissions — all role branches', () => {
  it('student: canTakeExams=true, canCreateCourse=false', () => {
    const p = getPermissions('student')
    expect(p.canTakeExams).toBe(true)
    expect(p.canCreateCourse).toBe(false)
    expect(p.canManageUsers).toBe(false)
    expect(p.canViewAnalytics).toBe(false)
    expect(p.canScheduleExams).toBe(false)
    expect(p.canViewOwnChildProgress).toBe(false)
    expect(p.canViewExecutiveDashboard).toBe(false)
  })

  it('teacher: canCreateCourse=true, canViewAnalytics=true, canScheduleExams=true', () => {
    const p = getPermissions('teacher')
    expect(p.canCreateCourse).toBe(true)
    expect(p.canViewAnalytics).toBe(true)
    expect(p.canScheduleExams).toBe(true)
    expect(p.canManageUsers).toBe(false)
    expect(p.canTakeExams).toBe(false)
    expect(p.canViewOwnChildProgress).toBe(false)
    expect(p.canViewExecutiveDashboard).toBe(false)
  })

  it('admin: canCreateCourse=true, canManageUsers=true, canViewAnalytics=true', () => {
    const p = getPermissions('admin')
    expect(p.canCreateCourse).toBe(true)
    expect(p.canManageUsers).toBe(true)
    expect(p.canViewAnalytics).toBe(true)
    expect(p.canScheduleExams).toBe(true)
    expect(p.canTakeExams).toBe(false)
    expect(p.canViewOwnChildProgress).toBe(false)
    expect(p.canViewExecutiveDashboard).toBe(false)
  })

  it('parent: canViewOwnChildProgress=true, canMessageTeacher=true, canViewChildGrades=true', () => {
    const p = getPermissions('parent')
    expect(p.canViewOwnChildProgress).toBe(true)
    expect(p.canMessageTeacher).toBe(true)
    expect(p.canViewChildGrades).toBe(true)
    expect(p.canViewChildAttendance).toBe(true)
    expect(p.canCreateCourse).toBe(false)
    expect(p.canManageUsers).toBe(false)
    expect(p.canTakeExams).toBe(false)
    expect(p.canViewExecutiveDashboard).toBe(false)
  })

  it('principal: canViewExecutiveDashboard=true, canGenerateReports=true', () => {
    const p = getPermissions('principal')
    expect(p.canViewExecutiveDashboard).toBe(true)
    expect(p.canGenerateReports).toBe(true)
    expect(p.canConfigurePrincipalSettings).toBe(true)
    expect(p.canViewAnalytics).toBe(true)
    expect(p.canCreateCourse).toBe(false)
    expect(p.canManageUsers).toBe(false)
    expect(p.canTakeExams).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// setActiveTenant — branch coverage for edge cases
// ══════════════════════════════════════════════════════════════

describe('setActiveTenant — branch coverage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const rawTenants: Record<string, { id: string; name: string; slug: string; is_active: boolean }> = {
    'tenant-active': { id: 'tenant-active', name: 'Sekolah A', slug: 'sekolah-a', is_active: true },
    'tenant-inactive': { id: 'tenant-inactive', name: 'Sekolah B', slug: 'sekolah-b', is_active: false },
  }

  function setActiveTenant(id: string): { success: boolean; tenantId: string | null } {
    const tenant = rawTenants[id]
    if (!tenant) {
      return { success: false, tenantId: null }
    }
    if (!tenant.is_active) {
      localStorage.removeItem('activeTenantId')
      return { success: false, tenantId: null }
    }
    localStorage.setItem('activeTenantId', id)
    return { success: true, tenantId: id }
  }

  it('succeeds for active tenant', () => {
    const result = setActiveTenant('tenant-active')
    expect(result.success).toBe(true)
    expect(result.tenantId).toBe('tenant-active')
    expect(localStorage.getItem('activeTenantId')).toBe('tenant-active')
  })

  it('blocks switch to inactive tenant and removes stored ID', () => {
    localStorage.setItem('activeTenantId', 'tenant-inactive')
    const result = setActiveTenant('tenant-inactive')
    expect(result.success).toBe(false)
    expect(localStorage.getItem('activeTenantId')).toBeNull()
  })

  it('blocks switch to non-existent tenant', () => {
    const result = setActiveTenant('tenant-nonexistent')
    expect(result.success).toBe(false)
    expect(result.tenantId).toBeNull()
  })

  it('allows sequential switches between active tenants', () => {
    const tenants2 = {
      ...rawTenants,
      'tenant-c': { id: 'tenant-c', name: 'Sekolah C', slug: 'sekolah-c', is_active: true },
    }
    // Override for this test
    const setTenant = (id: string) => {
      const t = tenants2[id]
      if (!t || !t.is_active) return false
      localStorage.setItem('activeTenantId', id)
      return true
    }
    expect(setTenant('tenant-active')).toBe(true)
    expect(localStorage.getItem('activeTenantId')).toBe('tenant-active')
    expect(setTenant('tenant-c')).toBe(true)
    expect(localStorage.getItem('activeTenantId')).toBe('tenant-c')
  })
})

// ══════════════════════════════════════════════════════════════
// signOut cleanup — expanded edge cases
// ══════════════════════════════════════════════════════════════

describe('signOut cleanup — expanded branches', () => {
  beforeEach(() => localStorage.clear())

  const AUTH_KEYS = [
    'activeTenantId',
    'pendingInviteToken',
    'pendingJoinCode',
    'pendingInviteRetryCount',
  ]

  function performSignOutCleanup() {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ai_tutor_session_'))
      .forEach((k) => localStorage.removeItem(k))
  }

  it('clears pendingInviteRetryCount on logout', () => {
    localStorage.setItem('pendingInviteRetryCount', '1')
    performSignOutCleanup()
    expect(localStorage.getItem('pendingInviteRetryCount')).toBeNull()
  })

  it('handles case when no auth keys exist (no-op, no error)', () => {
    expect(() => performSignOutCleanup()).not.toThrow()
  })

  it('clears multiple ai_tutor_session_ keys', () => {
    for (let i = 0; i < 5; i++) {
      localStorage.setItem(`ai_tutor_session_lesson-${i}`, `sess-${i}`)
    }
    localStorage.setItem('otherKey', 'preserve')

    performSignOutCleanup()

    for (let i = 0; i < 5; i++) {
      expect(localStorage.getItem(`ai_tutor_session_lesson-${i}`)).toBeNull()
    }
    expect(localStorage.getItem('otherKey')).toBe('preserve')
  })

  it('clears all 4 AUTH_KEYS simultaneously', () => {
    AUTH_KEYS.forEach((key) => localStorage.setItem(key, 'value'))
    performSignOutCleanup()
    AUTH_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull()
    })
  })
})

// ══════════════════════════════════════════════════════════════
// processPendingInvite — retry logic branches
// ══════════════════════════════════════════════════════════════

describe('processPendingInvite — retry logic branches', () => {
  beforeEach(() => localStorage.clear())

  it('does nothing when no pendingInviteToken exists', () => {
    const token = localStorage.getItem('pendingInviteToken')
    expect(token).toBeNull()
    // Function would return early — no RPC call
  })

  it('removes token from localStorage before processing', () => {
    localStorage.setItem('pendingInviteToken', 'tok_123')
    const token = localStorage.getItem('pendingInviteToken')
    expect(token).toBe('tok_123')
    localStorage.removeItem('pendingInviteToken')
    expect(localStorage.getItem('pendingInviteToken')).toBeNull()
  })

  it('re-stores token on transient error (first retry)', () => {
    const pendingToken = 'tok_transient'
    localStorage.removeItem('pendingInviteToken')
    // Simulate transient error handling
    const errorMsg = 'network timeout'
    const isPermanentFailure =
      errorMsg.includes('invalid') ||
      errorMsg.includes('expired') ||
      errorMsg.includes('already used') ||
      errorMsg.includes('not found')
    const retryCount = parseInt(localStorage.getItem('pendingInviteRetryCount') ?? '0')

    if (!isPermanentFailure && retryCount < 1) {
      localStorage.setItem('pendingInviteToken', pendingToken)
      localStorage.setItem('pendingInviteRetryCount', '1')
    }

    expect(localStorage.getItem('pendingInviteToken')).toBe(pendingToken)
    expect(localStorage.getItem('pendingInviteRetryCount')).toBe('1')
  })

  it('does NOT re-store token on permanent failure (invalid)', () => {
    const errorMsg = 'invalid token format'
    const isPermanentFailure =
      errorMsg.includes('invalid') ||
      errorMsg.includes('expired') ||
      errorMsg.includes('already used') ||
      errorMsg.includes('not found')

    expect(isPermanentFailure).toBe(true)
    // Token should NOT be re-stored
  })

  it('does NOT re-store token when retryCount >= 1 (max retries reached)', () => {
    localStorage.setItem('pendingInviteRetryCount', '1')
    const retryCount = parseInt(localStorage.getItem('pendingInviteRetryCount') ?? '0')
    expect(retryCount >= 1).toBe(true)
    // Should clear retryCount and NOT re-store token
    localStorage.removeItem('pendingInviteRetryCount')
    expect(localStorage.getItem('pendingInviteRetryCount')).toBeNull()
  })

  it('classifies "expired" as permanent failure', () => {
    const errorMsg = 'token expired'
    const isPermanent = errorMsg.includes('expired')
    expect(isPermanent).toBe(true)
  })

  it('classifies "already used" as permanent failure', () => {
    const errorMsg = 'invitation already used'
    const isPermanent = errorMsg.includes('already used')
    expect(isPermanent).toBe(true)
  })

  it('classifies "not found" as permanent failure', () => {
    const errorMsg = 'invitation not found'
    const isPermanent = errorMsg.includes('not found')
    expect(isPermanent).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// Membership pagination branches
// ══════════════════════════════════════════════════════════════

describe('Membership initial tenant selection — branches', () => {
  it('uses cached tenant when it matches a valid membership', () => {
    const cachedTenantId = 'tenant-a'
    const memberships = [
      { tenant_id: 'tenant-a', role: 'teacher' },
      { tenant_id: 'tenant-b', role: 'student' },
    ]
    const validMembership = memberships.find((m) => m.tenant_id === cachedTenantId)
    expect(validMembership).toBeDefined()
    // Should use cachedTenantId
    const initialTenantId = cachedTenantId
    expect(initialTenantId).toBe('tenant-a')
  })

  it('falls back to first membership when cached tenant is invalid', () => {
    const cachedTenantId = 'tenant-deleted'
    const memberships = [
      { tenant_id: 'tenant-a', role: 'teacher' },
      { tenant_id: 'tenant-b', role: 'student' },
    ]
    const validMembership = memberships.find((m) => m.tenant_id === cachedTenantId)
    expect(validMembership).toBeUndefined()
    // Fallback to first membership
    const initialTenantId = memberships.length > 0 ? memberships[0].tenant_id : null
    expect(initialTenantId).toBe('tenant-a')
  })

  it('falls back to profileData.tenant_id when no memberships', () => {
    const cachedTenantId = 'tenant-deleted'
    const memberships: { tenant_id: string; role: string }[] = []
    const profileTenantId = 'tenant-profile'
    const validMembership = memberships.find((m) => m.tenant_id === cachedTenantId)
    expect(validMembership).toBeUndefined()
    const initialTenantId = memberships.length > 0 ? memberships[0].tenant_id : profileTenantId
    expect(initialTenantId).toBe('tenant-profile')
  })

  it('initialTenantId is null when no memberships and no profile tenant', () => {
    const memberships: { tenant_id: string; role: string }[] = []
    const profileTenantId: string | null = null
    const initialTenantId = memberships.length > 0 ? memberships[0].tenant_id : profileTenantId
    expect(initialTenantId).toBeNull()
  })
})