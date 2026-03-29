import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { Role, useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { activeRole, loading } = useAuth()

  if (loading) {
    return <AppLoading />
  }

  // SECURITY FIX: Always use activeRole (per-tenant role) — never fall back to the
  // global `role` field. The global role represents the highest privilege across ALL
  // tenants, so using it as fallback allows cross-tenant privilege escalation:
  // an admin in Tenant A could access admin routes in Tenant B where they are a student.
  const hasAccess = activeRole !== null && allowedRoles.includes(activeRole)

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
