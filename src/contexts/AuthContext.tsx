import React, { createContext, ReactNode, useCallback, useContext, useMemo } from 'react'

import {
  getPermissions,
  getPrimaryRole,
  type Permissions,
  type Role,
  type Tenant,
  useRoleResolution,
  useSessionManagement,
  useTenantSwitching,
} from './auth'

interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: AuthUser
}

export type { Permissions, Role, Tenant }
export { getPermissions, getPrimaryRole }

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  profile: ReturnType<typeof useRoleResolution>['profile']
  tenantId: string | null
  memberships: ReturnType<typeof useRoleResolution>['memberships']
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => void
  activeRole: Role | null
  roles: Role[]
  role: Role
  permissions: Permissions
  loading: boolean
  authStatus: ReturnType<typeof useSessionManagement>['authStatus']
  authError: string | null
  workspaceStatus:
    | 'idle'
    | 'loading'
    | 'needs_onboarding'
    | 'needs_selection'
    | 'resolved'
    | 'error'
  bootstrapReady: boolean
  emailVerified: boolean
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantId?: string
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  clearAuthError: () => void
  refreshAuthBootstrap: () => Promise<void>
  hasRole: (role: Role) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    session,
    user,
    loading: sessionLoading,
    authStatus,
    authError,
    sessionExpired,
    signOut,
    signIn,
    signUp,
    signInWithGoogle,
    clearAuthError,
  } = useSessionManagement()
  const {
    profile,
    roles,
    memberships,
    rawTenants,
    defaultTenantId,
    bootstrapReady,
    error: bootstrapError,
    loading: roleLoading,
    loadingMemberships,
    fetchUserData,
  } = useRoleResolution(user)
  const {
    tenantId,
    activeTenant,
    setActiveTenant: setActiveTenantRaw,
  } = useTenantSwitching({ rawTenants, defaultTenantId })

  const setActiveTenant = useCallback(
    (id: string) => {
      setActiveTenantRaw(id)
    },
    [setActiveTenantRaw]
  )

  const activeRole = React.useMemo(() => {
    if (!activeTenant) return null
    const membership = memberships.find((m) => m.tenant_id === activeTenant.id)
    return membership?.role || null
  }, [activeTenant, memberships])

  const role = useMemo(() => getPrimaryRole(roles), [roles])
  const permissions = useMemo(() => getPermissions(role), [role])
  const emailVerified = !!user?.email_confirmed_at
  console.log('USER:', user, 'emailVerified:', emailVerified)

  const hasRole = useCallback((r: Role) => roles.includes(r), [roles])
  const refreshAuthBootstrap = useCallback(async () => {
    if (!user) return
    await fetchUserData(user.id)
  }, [fetchUserData, user])
  const resolvedAuthError = authError ?? bootstrapError
  const workspaceStatus = useMemo<AuthContextType['workspaceStatus']>(() => {
    if (!user) return 'idle'
    if (sessionLoading || roleLoading || loadingMemberships) return 'loading'

    const activeMemberships = memberships.filter((membership) => {
      const tenant = rawTenants[membership.tenant_id]
      return membership.status === 'active' && tenant?.is_active
    })

    if (activeTenant) return 'resolved'
    if (resolvedAuthError) return 'error'
    if (memberships.length > 0 && activeMemberships.length === 0) return 'error'
    if (activeMemberships.length === 0) return 'needs_onboarding'
    return activeMemberships.length > 1 ? 'needs_selection' : 'resolved'
  }, [
    activeTenant,
    loadingMemberships,
    memberships,
    rawTenants,
    resolvedAuthError,
    roleLoading,
    sessionLoading,
    user,
  ])

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      tenantId,
      memberships,
      activeTenant,
      setActiveTenant,
      activeRole,
      roles,
      role,
      permissions,
      loading: sessionLoading || roleLoading || loadingMemberships,
      authStatus,
      authError: resolvedAuthError,
      workspaceStatus,
      bootstrapReady,
      emailVerified,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      clearAuthError,
      refreshAuthBootstrap,
      hasRole,
    }),
    [
      user,
      session,
      profile,
      tenantId,
      memberships,
      activeTenant,
      setActiveTenant,
      activeRole,
      roles,
      role,
      permissions,
      sessionLoading,
      roleLoading,
      loadingMemberships,
      authStatus,
      resolvedAuthError,
      workspaceStatus,
      bootstrapReady,
      emailVerified,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      clearAuthError,
      refreshAuthBootstrap,
      hasRole,
    ]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
