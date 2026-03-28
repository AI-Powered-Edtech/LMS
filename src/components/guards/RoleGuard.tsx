import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { Role, useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { activeRole, role, loading } = useAuth()

  if (loading) {
    return <AppLoading />
  }

  // Use activeRole (per-tenant role) if available, otherwise fall back to primary role.
  // Also check primary role so admin users aren't locked out of admin routes
  // when their tenant-level role is different (e.g., teacher in a specific tenant).
  const currentRole = activeRole || role
  const hasAccess = allowedRoles.includes(currentRole) || allowedRoles.includes(role)

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
