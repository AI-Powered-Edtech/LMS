import type { Session, User } from '@supabase/supabase-js'
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

export type { Permissions, Role, Tenant }
export { getPermissions, getPrimaryRole }

export interface AuthContextType {
  user: User | null
  session: Session | null
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
  hasRole: (role: Role) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    session,
    user,
    loading: sessionLoading,
    sessionExpired,
    signOut,
    signIn,
    signUp,
    signInWithGoogle,
  } = useSessionManagement()
  const {
    profile,
    roles,
    memberships,
    rawTenants,
    loading: roleLoading,
    loadingMemberships,
  } = useRoleResolution(user)
  const {
    tenantId,
    activeTenant,
    setActiveTenant: setActiveTenantRaw,
  } = useTenantSwitching({ rawTenants })

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
  const hasRole = useCallback((r: Role) => roles.includes(r), [roles])

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
      emailVerified,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
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
      emailVerified,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
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
