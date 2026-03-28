import type { Session, User } from '@supabase/supabase-js'
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

import { supabase } from '@/src/services/supabase/client'

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
      // Fetch profile
      let { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, tenant_id')
        .eq('id', userId)
        .single()

      // If profile doesn't exist (406 = no rows from .single()), auto-create via RPC
      if (!profileData && profileErr) {
        if (import.meta.env.DEV)
          console.warn('[Auth] Profile missing for user, calling ensure_profile_exists()...')
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('ensure_profile_exists')
        if (rpcResult && !rpcErr) {
          // RPC returns full profile row as JSON — extract the fields we need
          const p = rpcResult as Record<string, unknown>
          profileData = {
            id: p.id as string,
            email: p.email as string,
            first_name: (p.first_name as string) || '',
            last_name: (p.last_name as string) || '',
            avatar_url: (p.avatar_url as string) || null,
            tenant_id: (p.tenant_id as string) || null,
          }
        } else if (import.meta.env.DEV) {
          console.error('[Auth] ensure_profile_exists() failed:', rpcErr)
        }
      }

      if (profileData) {
        setProfile(profileData)
        setTenantId(profileData.tenant_id)
      }

      // Fetch roles and tenants
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select(
          `
          role,
          tenant_id,
          tenants (
            id,
            name,
            slug,
            is_active
          )
        `
        )
        .eq('user_id', userId)

      if (rolesErr) {
        console.error('Failed to fetch user roles:', rolesErr)
      }

      if (rolesData) {
        const userRoles = rolesData.map(
          (r: {
            role: string
            tenant_id: string
            tenants?:
              | { id: string; name: string; slug: string; is_active: boolean }
              | { id: string; name: string; slug: string; is_active: boolean }[]
          }) => r.role.toLowerCase() as Role
        )
        setRoles(userRoles)

        const loadedMemberships: TenantMembership[] = []
        const tenantsMap: Record<string, Tenant> = {}

        rolesData.forEach(
          (r: {
            role: string
            tenant_id: string
            tenants?:
              | { id: string; name: string; slug: string; is_active: boolean }
              | { id: string; name: string; slug: string; is_active: boolean }[]
          }) => {
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
          }
        )

        setMemberships(loadedMemberships)
        setRawTenants(tenantsMap)

        // Security: Read tenant_id hint from localStorage and validate against memberships
        const cachedTenantId = localStorage.getItem('activeTenantId')
        let initialTenantId = cachedTenantId

        // Validate cached tenant_id against server memberships
        const validMembership = loadedMemberships.find((m) => m.tenant_id === cachedTenantId)

        // If cached tenant_id is not valid (not in memberships), use first membership
        if (!validMembership) {
          if (loadedMemberships.length > 0) {
            initialTenantId = loadedMemberships[0].tenant_id
          } else {
            initialTenantId = profileData?.tenant_id || null
          }
        }

        // Store validated tenant_id in localStorage
        if (initialTenantId) {
          localStorage.setItem('activeTenantId', initialTenantId)
        }

        // Set activeTenant only after validation
        if (initialTenantId && tenantsMap[initialTenantId]) {
          setActiveTenantState(tenantsMap[initialTenantId])
          setTenantId(initialTenantId)
        }
      }
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
      const { data } = await supabase.rpc('accept_invitation', {
        p_token: pendingToken,
      })
      if (data?.success) {
        // Re-fetch user data to pick up the upgraded role
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
      await supabase.rpc('enroll_student', { p_join_code: pendingCode })
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Auth] Failed to enroll with pending join code:', e)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        wasAuthenticatedRef.current = true
        fetchUserData(s.user.id)
          .then(() => processPendingInvite(s!.user.id))
          .then(() => processPendingJoinCode())
          .finally(() => {
            setLoading(false)
          })
      } else {
        setLoadingMemberships(false)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        wasAuthenticatedRef.current = true
        // FIX: Set loadingMemberships=true BEFORE fetch starts.
        // Without this, there is a brief window where loading=false AND
        // memberships=[] — causing WorkspaceSelector to flash
        // "No Workspace Access" before data arrives.
        setLoadingMemberships(true)
        fetchUserData(s.user.id)
          .then(() => processPendingInvite(s!.user.id))
          .then(() => processPendingJoinCode())
          .then(() => {
            setLoading(false)
          })
          .catch(() => {
            setLoading(false)
          })
      } else {
        // Detect session expiry: user was authenticated but session became null
        if (wasAuthenticatedRef.current && _event === 'SIGNED_OUT') {
          setSessionExpired(true)
        }
        wasAuthenticatedRef.current = false
        setProfile(null)
        setTenantId(null)
        setMemberships([])
        setActiveTenantState(null)
        setRawTenants({})
        setRoles([])
        setLoadingMemberships(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  // B6: Proactive JWT refresh — check every 60s, refresh if expiring within 5 min
  useEffect(() => {
    if (!session) return

    const INTERVAL_MS = 60_000
    const REFRESH_THRESHOLD_S = 5 * 60 // 5 minutes in seconds

    const checkAndRefresh = async () => {
      const currentSession = (await supabase.auth.getSession()).data.session
      if (!currentSession) return

      const expiresAt = currentSession.expires_at // unix timestamp in seconds
      if (!expiresAt) return

      const nowS = Math.floor(Date.now() / 1000)
      const remainingS = expiresAt - nowS

      if (remainingS <= REFRESH_THRESHOLD_S) {
        if (import.meta.env.DEV)
          console.info(`[Auth] Token expires in ${remainingS}s, refreshing proactively...`)

        const { error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('[Auth] Proactive token refresh failed:', error)
          // If refresh fails and we had an active session, mark as expired and sign out
          setSessionExpired(true)
          await signOut()
        }
      }
    }

    const interval = setInterval(checkAndRefresh, INTERVAL_MS)
    return () => clearInterval(interval)
    // signOut is a stable callback; session identity change triggers re-subscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const signIn = useCallback(async (email: string, password: string) => {
    setSessionExpired(false)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      signUpTenantId?: string
    ) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            ...(signUpTenantId ? { tenant_id: signUpTenantId } : {}),
          },
        },
      })
      return { error: error as Error | null }
    },
    []
  )

  const signOut = useCallback(async () => {
    // Clear localStorage - only store tenant_id hint, not full objects
    localStorage.removeItem('activeTenantId')
    // Clear user+session eagerly so AuthGuard redirects to /login immediately
    setUser(null)
    setSession(null)
    // Clear state eagerly so UI reacts immediately
    setProfile(null)
    setTenantId(null)
    setMemberships([])
    setActiveTenantState(null)
    setRawTenants({})
    setRoles([])
    // onAuthStateChange will fire after signOut and set loading=false
    try {
      await supabase.auth.signOut()
    } catch (err) {
      // Even if Supabase signOut fails (network error, expired session),
      // we've already cleared local state so the user is effectively logged out.
      if (import.meta.env.DEV) console.error('[Auth] signOut error (state already cleared):', err)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    })
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
