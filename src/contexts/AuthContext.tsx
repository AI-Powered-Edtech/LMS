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

import { authService } from '@/features/auth/api/authService'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/services/supabase/client'
import { addBreadcrumb, captureError, clearSentryUser, setSentryUser } from '@/utils/sentry'

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
      const tenant = rawTenants[id]
      if (tenant) {
        // SECURITY FIX: Reject switching to an inactive tenant.
        // A deactivated tenant should not be accessible even if the user has a membership.
        if (!tenant.is_active) {
          if (import.meta.env.DEV)
            console.warn(`[Auth] Attempted to switch to inactive tenant ${id} — blocked`)
          // Remove the stale hint so next page load doesn't re-attempt the switch
          localStorage.removeItem('activeTenantId')
          return
        }
        addBreadcrumb('Tenant switched', 'auth', { tenantId: id, tenantName: tenant.name })
        setActiveTenantState(tenant)
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
        try {
          await authService.ensureProfileExists()
          // Re-fetch profile after creation
          const { data: retryData } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, avatar_url, tenant_id')
            .eq('id', userId)
            .single()
          if (retryData) profileData = retryData
        } catch (rpcErr) {
          captureError(rpcErr, { context: 'AuthContext.ensureProfileExists' })
          if (import.meta.env.DEV) {
            console.error('[Auth] ensure_profile_exists() failed:', rpcErr)
          }
        }
      }

      if (profileData) {
        setProfile(profileData)
        setTenantId(profileData.tenant_id)
      }

      // Fetch roles and tenants — paginated to prevent blocking on users with many memberships.
      // Most users have 1–3 tenants; platform admins / consultants may have 50+.
      // We load the first 20 immediately so the UI can render, then lazily load the rest.
      const PAGE_SIZE = 20
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
        .range(0, PAGE_SIZE - 1)

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
        // Set Sentry user context so errors are attributed to the correct user/role
        setSentryUser(userId, getPrimaryRole(userRoles))

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

        // If there might be more memberships (user hit the PAGE_SIZE limit), load
        // the remaining pages in the background without blocking the UI.
        if (rolesData.length === PAGE_SIZE) {
          ;(async () => {
            let offset = PAGE_SIZE
            let hasMore = true
            let maxIterations = 20 // Safety: prevent infinite loop
            const extraMemberships: TenantMembership[] = []
            const extraTenantsMap: Record<string, Tenant> = {}

            try {
              while (hasMore && maxIterations-- > 0) {
                const { data: more, error: moreError } = await supabase
                  .from('user_roles')
                  .select(`role, tenant_id, tenants ( id, name, slug, is_active )`)
                  .eq('user_id', userId)
                  .range(offset, offset + PAGE_SIZE - 1)

                if (moreError) {
                  if (import.meta.env.DEV)
                    console.error('[Auth] Background pagination error:', moreError)
                  break
                }

                if (!more || more.length === 0) {
                  hasMore = false
                  break
                }

                more.forEach((r: (typeof rolesData)[number]) => {
                  if (r.tenants) {
                    const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants
                    extraMemberships.push({
                      tenant_id: r.tenant_id,
                      tenant_name: t.name,
                      tenant_logo: null,
                      role: r.role.toLowerCase() as Role,
                    })
                    extraTenantsMap[t.id] = {
                      id: t.id,
                      name: t.name,
                      slug: t.slug,
                      is_active: t.is_active,
                    }
                  }
                })

                hasMore = more.length === PAGE_SIZE
                offset += PAGE_SIZE
              }
            } catch (err) {
              captureError(err, { context: 'AuthContext.fetchMemberships' })
              if (import.meta.env.DEV)
                console.error('[Auth] Background membership pagination failed:', err)
            }

            if (extraMemberships.length > 0) {
              setMemberships((prev) => [...prev, ...extraMemberships])
              setRawTenants((prev) => ({ ...prev, ...extraTenantsMap }))
            }
          })()
        }

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

    // Remove the token optimistically to prevent double-processing on concurrent auth events.
    // If the RPC fails with a transient error (network, not a business logic rejection),
    // we restore it for one silent retry on the next login.
    localStorage.removeItem('pendingInviteToken')

    try {
      const data = await authService.acceptInvitation(pendingToken)
      if (data?.success) {
        addBreadcrumb('Invitation accepted', 'auth')
        // Re-fetch user data to pick up the upgraded role
        fetchLock.current = false // Allow re-fetch
        await fetchUserData(userId)
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to accept invitation:', e)
      captureError(e, { context: 'processPendingInvite' })

      const errorMsg = (e instanceof Error ? e.message : String(e)).toLowerCase()
      // Permanent failures (invalid/expired/used tokens) — give up immediately.
      // Transient failures (network errors, timeouts) — store back for one auto-retry.
      const isPermanentFailure =
        errorMsg.includes('invalid') ||
        errorMsg.includes('expired') ||
        errorMsg.includes('already used') ||
        errorMsg.includes('not found')

      const retryCount = parseInt(localStorage.getItem('pendingInviteRetryCount') ?? '0')
      if (!isPermanentFailure && retryCount < 1) {
        // Restore token for silent retry on next auth event
        localStorage.setItem('pendingInviteToken', pendingToken)
        localStorage.setItem('pendingInviteRetryCount', '1')
        if (import.meta.env.DEV)
          console.warn('[Auth] Transient invite error — will retry on next login')
        return
      }
      localStorage.removeItem('pendingInviteRetryCount')

      useToast.getState().addToast({
        type: 'error',
        message: 'Undangan tidak valid atau sudah kadaluarsa.',
        description: 'Hubungi administrator untuk mendapatkan undangan baru.',
      })
    }
  }

  const processPendingJoinCode = async () => {
    const pendingCode = localStorage.getItem('pendingJoinCode')
    if (!pendingCode) return
    localStorage.removeItem('pendingJoinCode')
    try {
      await authService.enrollStudent(pendingCode)
      // UX FIX: Confirm successful enrollment to user
      useToast.getState().addToast({
        type: 'success',
        message: 'Berhasil bergabung ke kelas!',
      })
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Auth] Failed to enroll with pending join code:', e)
      captureError(e, { context: 'processPendingJoinCode' })
      // UX FIX: Inform user instead of silent failure
      useToast.getState().addToast({
        type: 'error',
        message: 'Kode kelas tidak valid.',
        description: 'Periksa kembali kode dari guru Anda dan coba lagi.',
      })
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    // Wrap fetchUserData with a 12-second timeout. Without this, a Supabase network
    // hang would leave the user on the loading screen indefinitely with no way out.
    const FETCH_TIMEOUT_MS = 12_000
    const withTimeout = (promise: Promise<void>): Promise<void> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('[Auth] fetchUserData timed out after 12s')),
            FETCH_TIMEOUT_MS
          )
        ),
      ])

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          wasAuthenticatedRef.current = true
          addBreadcrumb('Session restored — fetching user data', 'auth', { userId: s.user.id })
          withTimeout(fetchUserData(s.user.id))
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
      .catch((err) => {
        if (import.meta.env.DEV) console.error('[Auth] getSession failed:', err)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        wasAuthenticatedRef.current = true
        addBreadcrumb(`Auth state changed: ${_event}`, 'auth', { userId: s.user.id })
        // FIX: Set loadingMemberships=true BEFORE fetch starts.
        // Without this, there is a brief window where loading=false AND
        // memberships=[] — causing WorkspaceSelector to flash
        // "No Workspace Access" before data arrives.
        setLoadingMemberships(true)
        withTimeout(fetchUserData(s.user.id))
          .then(() => processPendingInvite(s!.user.id))
          .then(() => processPendingJoinCode())
          .then(() => {
            setLoading(false)
          })
          .catch((err) => {
            // Defence-in-depth: fetchUserData has its own finally that resets
            // loadingMemberships, but if processPendingInvite or processPendingJoinCode
            // throws after fetchUserData completes, we ensure the UI is never left
            // in a perpetual loading state.
            if (import.meta.env.DEV) console.error('[Auth] Auth chain failed:', err)
            captureError(err, { context: 'authStateChange.fetchChain', event: _event })
            setLoading(false)
            setLoadingMemberships(false)
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
          captureError(error, { context: 'proactiveTokenRefresh' })
          addBreadcrumb('Proactive token refresh failed — signing out', 'auth', {
            error: error.message,
          })
          // Notify user BEFORE signing out so they understand why they are logged out
          useToast.getState().addToast({
            type: 'error',
            message: 'Sesi Anda telah berakhir',
            description: 'Silakan masuk kembali untuk melanjutkan.',
          })
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
    addBreadcrumb('User signing out', 'auth')
    // Clear Sentry user context so future errors aren't attributed to logged-out user
    clearSentryUser()

    // SECURITY FIX: Clear ALL auth-related localStorage keys on sign-out.
    // Previously only 'activeTenantId' was removed. 'pendingInviteToken' and
    // 'pendingJoinCode' were left behind, allowing the next user on the same
    // browser to inherit a pending invite and be auto-added to a different tenant.
    // All 'ai_tutor_session_*' keys are also cleared to prevent session ID leakage.
    const AUTH_KEYS = [
      'activeTenantId',
      'pendingInviteToken',
      'pendingJoinCode',
      'pendingInviteRetryCount',
    ]
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
    // Remove all dynamically-named AI tutor session keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ai_tutor_session_'))
      .forEach((k) => localStorage.removeItem(k))

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
      captureError(err, { context: 'AuthContext.signOut' })
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
