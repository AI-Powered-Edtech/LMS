import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

export function RoleResolver() {
  // SECURITY FIX: Use activeRole (per-tenant role) instead of global `role`.
  // The global `role` is the highest-privilege role across ALL tenants and can
  // cause wrong redirects when a user's tenant membership hasn't loaded yet
  // (roles=[] → getPrimaryRole([]) returns 'student' fallback, causing the admin
  // to land on /app/student → RoleGuard denies → /unauthorized).
  const { activeRole, loading } = useAuth()
  const navigate = useNavigate()
  // SECURITY: Only use activeRole (per-tenant role). Never fall back to global role.
  // Global role is highest privilege across all tenants, which can cause incorrect routing
  // and privilege escalation when user has different roles across multiple tenants.

  useEffect(() => {
    if (!loading) {
      switch (activeRole) {
        case 'admin':
          void navigate('/app/admin', { replace: true })
          break
        case 'principal':
          void navigate('/app/principal', { replace: true })
          break
        case 'teacher':
          void navigate('/app/teacher', { replace: true })
          break
        case 'parent':
          void navigate('/app/parent', { replace: true })
          break
        case 'student':
          void navigate('/app/student', { replace: true })
          break
        default:
          // activeRole is null → no active tenant; TenantGuard upstream should
          // already redirect to /workspace-selector, but guard here as fallback.
          void navigate('/workspace-selector', { replace: true })
      }
    }
  }, [activeRole, loading, navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>
  )
}
