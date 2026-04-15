import { useMemo } from 'react'

import { Role, useAuth } from '@/src/contexts/AuthContext'

function usePermissions() {
  const { permissions, roles, activeRole } = useAuth()

  const isAdmin = roles.includes('admin')
  const isTeacher = roles.includes('teacher')
  const isStudent = roles.includes('student')

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
