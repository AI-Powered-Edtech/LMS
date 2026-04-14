import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

export function TenantGuard({ children }: { children: ReactNode }) {
  const { activeTenant, loading, workspaceStatus, authError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AppLoading />
  }

  if (!activeTenant && workspaceStatus === 'error') {
    const message = authError
      ? `?reason=workspace_bootstrap_failed&message=${encodeURIComponent(authError)}`
      : ''
    return <Navigate to={`/auth/error${message}`} replace />
  }

  if (!activeTenant) {
    return <Navigate to="/workspace-selector" state={{ from: location }} replace />
  }

  return <>{children}</>
}
