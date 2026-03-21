import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

export function TenantGuard({ children }: { children: ReactNode }) {
  const { activeTenant, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AppLoading />
  }

  if (!activeTenant) {
    return <Navigate to="/workspace-selector" state={{ from: location }} replace />
  }

  return <>{children}</>
}
