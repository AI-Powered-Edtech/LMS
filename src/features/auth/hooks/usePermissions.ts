import { useMemo } from 'react'

import { useAuth } from './useAuth'

export function usePermissions() {
  const { permissions, roles, activeRole } = useAuth()

  const [roles])

  const hasAnyRole = useMemo(
    () => (rolesToCheck: string[]) => {
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
