export interface User {
  id: string
  email?: string
  user_metadata?: Record<string, any>
  email_confirmed_at?: string
}

export interface Session {
  access_token: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  user: User
}

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { apiFetch } from '@/src/lib/api'

export type Role = 'teacher' | 'student' | 'admin'

export interface Permissions {
  canCreateCourse: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canTakeExams: boolean
  canScheduleExams: boolean
}

const rolePermissions: Record<Role, Permissions> = {
  student: {
    canCreateCourse: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canTakeExams: true,
    canScheduleExams: false,
  },
  teacher: {
    canCreateCourse: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
  },
  admin: {
    canCreateCourse: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
  },
}

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
}

interface TenantMembership {
  tenant_id: string
  tenant_name: string
  tenant_logo: string | null
  role: Role
  last_workspace_id?: string
}

interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  tenant_id: string | null
}

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  tenantId: string | null
  memberships: TenantMembership[]
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => void
  activeRole: Role | null // role for the active tenant
  roles: Role[]
  role: Role // primary role (highest privilege)
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

function getPrimaryRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('teacher')) return 'teacher'
  return 'student'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  // Security: Don't eagerly restore activeTenant from localStorage.
  // localStorage stores only tenant_id as a hint - must be validated against server data.
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null)
  const [rawTenants, setRawTenants] = useState<Record<string, Tenant>>({})
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  // Add a specific loading state for memberships to prevent hydration UI flashes
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  // Track whether user was previously authenticated (to detect session expiry vs fresh load)
  const wasAuthenticatedRef = useRef(false)
  const fetchLock = useRef(false)

  // Pre-resolve tenant id hint from local storage (will be validated after auth)
  useEffect(() => {
    const savedTenantId = localStorage.getItem('activeTenantId')
    if (savedTenantId) {
      setTenantId(savedTenantId)
    }
  }, [])

  const setActiveTenant = useCallback(
    (id: string) => {
      // Security: Store only tenant_id in localStorage, not the full tenant object.
      // This is treated as a hint only - must be validated against server memberships.
      localStorage.setItem('activeTenantId', id)
      if (rawTenants[id]) {
        setActiveTenantState(rawTenants[id])
        setTenantId(id)
      } else {
        if (import.meta.env.DEV)
          console.warn(`Tenant with id ${id} not found in rawTenants - will validate on next auth`)
      }
    },
    [rawTenants]
  )

  // Get the role for the active tenant
  const activeRole = React.useMemo(() => {
    if (!activeTenant) return null
    const membership = memberships.find((m) => m.tenant_id === activeTenant.id)
    return membership?.role || null
  }, [activeTenant, memberships])

  const fetchUserData = async (userId: string) => {
    if (fetchLock.current) return
    fetchLock.current = true
    try {
      const data = await apiFetch(`/users/${userId}/data`)

      const profileData = data.profile || {
        id: userId,
        email: '',
        first_name: '',
        last_name: '',
        avatar_url: null,
        tenant_id: null,
      }

      setProfile(profileData)
      setTenantId(profileData.tenant_id)

      const rolesData = data.roles || []
      const userRoles = rolesData.map((r: any) => r.role.toLowerCase() as Role)
      setRoles(userRoles)

      const loadedMemberships: TenantMembership[] = []
      const tenantsMap: Record<string, Tenant> = {}

      rolesData.forEach((r: any) => {
        if (r.tenants) {
          const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants
          loadedMemberships.push({
            tenant_id: r.tenant_id,
            tenant_name: t.name,
            tenant_logo: null,
            role: r.role.toLowerCase() as Role,
          })
          tenantsMap[t.id] = {
            id: t.id,
            name: t.name,
            slug: t.slug,
            is_active: t.is_active,
          }
        }
      })

      setMemberships(loadedMemberships)
      setRawTenants(tenantsMap)

      const cachedTenantId = localStorage.getItem('activeTenantId')
      let initialTenantId = cachedTenantId

      const validMembership = loadedMemberships.find((m) => m.tenant_id === cachedTenantId)

      if (!validMembership) {
        if (loadedMemberships.length > 0) {
          initialTenantId = loadedMemberships[0].tenant_id
        } else {
          initialTenantId = profileData?.tenant_id || null
        }
      }

      if (initialTenantId) {
        localStorage.setItem('activeTenantId', initialTenantId)
      }

      if (initialTenantId && tenantsMap[initialTenantId]) {
        setActiveTenantState(tenantsMap[initialTenantId])
        setTenantId(initialTenantId)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    } finally {
      setLoadingMemberships(false)
      fetchLock.current = false
    }
  }

  // Process pending invite token after session is established.
  // When a user registers via invite link, Login.tsx stores the token in localStorage.
  // After email verification + login, we call accept_invitation to upgrade the role
  // from default STUDENT to the invited role (TEACHER/ADMIN) and mark the invitation accepted.
  const processPendingInvite = async (userId: string) => {
    const pendingToken = localStorage.getItem('pendingInviteToken')
    if (!pendingToken) return

    localStorage.removeItem('pendingInviteToken')
    try {
      const data = await apiFetch('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: pendingToken }),
      })
      if (data?.success) {
        fetchLock.current = false // Allow re-fetch
        await fetchUserData(userId)
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to accept invitation:', e)
    }
  }

  const processPendingJoinCode = async () => {
    const pendingCode = localStorage.getItem('pendingJoinCode')
    if (!pendingCode) return
    localStorage.removeItem('pendingJoinCode')
    try {
      await apiFetch('/students/enroll', {
        method: 'POST',
        body: JSON.stringify({ join_code: pendingCode }),
      })
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Auth] Failed to enroll with pending join code:', e)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await apiFetch('/v1/auth/me')
        if (data && data.user) {
          setSession({ access_token: localStorage.getItem('token') || '', user: data.user })
          setUser(data.user)
          wasAuthenticatedRef.current = true
          await fetchUserData(data.user.id)
          await processPendingInvite(data.user.id)
          await processPendingJoinCode()
        } else {
          setLoadingMemberships(false)
        }
      } catch {
        setLoadingMemberships(false)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  // B6: Proactive JWT refresh — not needed for local REST or can be implemented later
  useEffect(() => {
    // Implement token refresh logic here if needed
  }, [session?.access_token])

  const signIn = useCallback(async (email: string, password: string) => {
    setSessionExpired(false)
    try {
      const data = await apiFetch('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.token) {
        localStorage.setItem('token', data.token)
        setSession({ access_token: data.token, user: data.user })
        setUser(data.user)
        wasAuthenticatedRef.current = true
        setLoadingMemberships(true)
        await fetchUserData(data.user.id)
        await processPendingInvite(data.user.id)
        await processPendingJoinCode()
        setLoading(false)
      }
      return { error: null }
    } catch (err: any) {
      return { error: new Error(err.message) }
    }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      signUpTenantId?: string
    ) => {
      try {
        const data = await apiFetch('/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            tenant_id: signUpTenantId,
          }),
        })
        if (data.token) {
          localStorage.setItem('token', data.token)
          setSession({ access_token: data.token, user: data.user })
          setUser(data.user)
        }
        return { error: null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    },
    []
  )

  const signOut = useCallback(async () => {
    localStorage.removeItem('activeTenantId')
    localStorage.removeItem('token')
    setUser(null)
    setSession(null)
    setProfile(null)
    setTenantId(null)
    setMemberships([])
    setActiveTenantState(null)
    setRawTenants({})
    setRoles([])
    try {
      await apiFetch('/v1/auth/logout', { method: 'POST' })
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Auth] signOut error:', err)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    window.location.href = '/api/v1/auth/google'
  }, [])

  const hasRole = useCallback((r: Role) => roles.includes(r), [roles])

  const role = getPrimaryRole(roles)
  const permissions = rolePermissions[role]
  const emailVerified = !!user?.email_confirmed_at

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
      loading: loading || loadingMemberships,
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
      loading,
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
