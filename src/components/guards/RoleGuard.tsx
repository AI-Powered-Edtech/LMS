import { type ReactNode, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import { type Role, useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { activeRole, loading } = useAuth()

  // SECURITY FIX: Always use activeRole (per-tenant role) — never fall back to the
  // global `role` field. The global role represents the highest privilege across ALL
  // tenants, so using it as fallback allows cross-tenant privilege escalation:
  // an admin in Tenant A could access admin routes in Tenant B where they are a student.
  const hasAccess = !loading && activeRole !== null && allowedRoles.includes(activeRole)

  // WCAG SC 2.4.3 — Focus Order: When access is denied and the user is redirected
  // to /unauthorized, move keyboard focus to the main landmark so screen reader
  // users hear the page title instead of being left on a stale focus target.
  useEffect(() => {
    if (!loading && !hasAccess) {
      const main = document.getElementById('main-content')
      if (main) {
        main.focus()
      }
    }
  }, [loading, hasAccess])

  if (loading) {
    return <AppLoading />
  }

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
