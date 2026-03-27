// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { ReactNode } from 'react'
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
    return <Navigate to="/workspace-selector" state={%DOPEN% from: location %DCLOSE%} replace />
  }

  return <>{children}</>
}
