import { useMemo } from 'react'

import type { Role } from '@/src/contexts/AuthContext'
import { useAuth } from '@/src/contexts/AuthContext'

export function usePermissions() {
  const { permissions, roles, activeRole } = useAuth()

  // SECURITY FIX: Use tenant-scoped `activeRole` for role checks, NOT the global `roles` array.
  // The global `roles` array contains roles across ALL tenants — using it for access control
  // would allow a user who is admin in Tenant A to be treated as admin in Tenant B.
  // `activeRole` reflects only the user's role in the currently active tenant.
  const isAdmin = activeRole === 'admin'
  const isTeacher = activeRole === 'teacher'
  const isStudent = activeRole === 'student'

  // NOTE: hasAnyRole intentionally checks global `roles` (cross-tenant).
  // This is a coarse check used only for UI hints (e.g. "show teacher-only nav item
  // if user is a teacher anywhere"). For security-critical access control, always
  // use `activeRole` or `isAdmin`/`isTeacher`/`isStudent` above.
  const hasAnyRole = useMemo(
    () => (rolesToCheck: Role[]) => {
      return rolesToCheck.some((role) => roles.includes(role))
    },
    [roles]
  )

  const canAccessFeature = useMemo(
    () => (feature: keyof typeof permissions) => {
      return permissions[feature]
    },
    [permissions]
  )

  return {
    permissions,
    roles,
    activeRole,
    isAdmin,
    isTeacher,
    isStudent,
    hasAnyRole,
    canAccessFeature,
  }
}
