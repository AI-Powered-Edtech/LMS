import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, Role } from '../../contexts/AuthContext'
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

  // Use activeRole (per-tenant role) if available, otherwise fall back to primary role
  const currentRole = activeRole || role

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
