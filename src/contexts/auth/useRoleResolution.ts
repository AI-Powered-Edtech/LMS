import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'

import { authService } from '@/features/auth/api/authService'
import { supabase } from '@/services/supabase/client'
import { addBreadcrumb, captureError, setSentryUser } from '@/utils/sentry'

export type Role = 'teacher' | 'student' | 'admin' | 'parent' | 'principal'

export interface Permissions {
  canCreateCourse: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canTakeExams: boolean
  canScheduleExams: boolean
  canViewOwnChildProgress: boolean
  canMessageTeacher: boolean
  canViewChildGrades: boolean
  canViewChildAttendance: boolean
  canViewExecutiveDashboard: boolean
  canGenerateReports: boolean
  canConfigurePrincipalSettings: boolean
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

interface UseRoleResolutionResult {
  profile: Profile | null
  roles: Role[]
  memberships: TenantMembership[]
  rawTenants: Record<string, Tenant>
  loading: boolean
  loadingMemberships: boolean
  fetchUserData: (userId: string) => Promise<void>
  processPendingInvite: (userId: string) => Promise<void>
  processPendingJoinCode: () => Promise<void>
}

const rolePermissions: Record<Role, Permissions> = {
  student: {
    canCreateCourse: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canTakeExams: true,
    canScheduleExams: false,
    canViewOwnChildProgress: false,
    canMessageTeacher: false,
    canViewChildGrades: false,
    canViewChildAttendance: false,
    canViewExecutiveDashboard: false,
    canGenerateReports: false,
    canConfigurePrincipalSettings: false,
  },
  teacher: {
    canCreateCourse: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
    canViewOwnChildProgress: false,
    canMessageTeacher: false,
    canViewChildGrades: false,
    canViewChildAttendance: false,
    canViewExecutiveDashboard: false,
    canGenerateReports: false,
    canConfigurePrincipalSettings: false,
  },
  admin: {
    canCreateCourse: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
    canViewOwnChildProgress: false,
    canMessageTeacher: false,
    canViewChildGrades: false,
    canViewChildAttendance: false,
    canViewExecutiveDashboard: false,
    canGenerateReports: false,
    canConfigurePrincipalSettings: false,
  },
  parent: {
    canCreateCourse: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canTakeExams: false,
    canScheduleExams: false,
    canViewOwnChildProgress: true,
    canMessageTeacher: true,
    canViewChildGrades: true,
    canViewChildAttendance: true,
    canViewExecutiveDashboard: false,
    canGenerateReports: false,
    canConfigurePrincipalSettings: false,
  },
  principal: {
    canCreateCourse: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: false,
    canViewOwnChildProgress: false,
    canMessageTeacher: false,
    canViewChildGrades: false,
    canViewChildAttendance: false,
    canViewExecutiveDashboard: true,
    canGenerateReports: true,
    canConfigurePrincipalSettings: true,
  },
}

export function getPrimaryRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('principal')) return 'principal'
  if (roles.includes('teacher')) return 'teacher'
  if (roles.includes('parent')) return 'parent'
  return 'student'
}

export function getPermissions(role: Role): Permissions {
  return rolePermissions[role]
}

/**
 * Hook untuk resolve role, profile, dan memberships user dari database.
 */
export function useRoleResolution(user: User | null): UseRoleResolutionResult {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  const [rawTenants, setRawTenants] = useState<Record<string, Tenant>>({})
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const fetchLock = useRef(false)

  const processPendingInvite = async (userId: string) => {
    const pendingToken = localStorage.getItem('pendingInviteToken')
    if (!pendingToken) return

    localStorage.removeItem('pendingInviteToken')

    try {
      const data = await authService.acceptInvitation(pendingToken)
      if (data?.success) {
        addBreadcrumb('Invitation accepted', 'auth')
        fetchLock.current = false
        await fetchUserData(userId)
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to accept invitation:', e)
      captureError(e, { context: 'processPendingInvite' })

      const errorMsg = (e instanceof Error ? e.message : String(e)).toLowerCase()
      const isPermanentFailure =
        errorMsg.includes('invalid') ||
        errorMsg.includes('expired') ||
        errorMsg.includes('already used') ||
        errorMsg.includes('not found')

      const retryCount = parseInt(localStorage.getItem('pendingInviteRetryCount') ?? '0')
      if (!isPermanentFailure && retryCount < 1) {
        localStorage.setItem('pendingInviteToken', pendingToken)
        localStorage.setItem('pendingInviteRetryCount', '1')
        if (import.meta.env.DEV)
          console.warn('[Auth] Transient invite error — will retry on next login')
        return
      }
      localStorage.removeItem('pendingInviteRetryCount')

      const { useToast } = await import('@/hooks/useToast')
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
      const { useToast } = await import('@/hooks/useToast')
      useToast.getState().addToast({
        type: 'success',
        message: 'Berhasil bergabung ke kelas!',
      })
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Auth] Failed to enroll with pending join code:', e)
      captureError(e, { context: 'processPendingJoinCode' })
      const { useToast } = await import('@/hooks/useToast')
      useToast.getState().addToast({
        type: 'error',
        message: 'Kode kelas tidak valid.',
        description: 'Periksa kembali kode dari guru Anda dan coba lagi.',
      })
    }
  }

  const fetchUserData = async (userId: string) => {
    if (fetchLock.current) return
    fetchLock.current = true
    try {
      let { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, tenant_id')
        .eq('id', userId)
        .single()

      if (!profileData && profileErr) {
        if (import.meta.env.DEV)
          console.warn('[Auth] Profile missing for user, calling ensure_profile_exists()...')
        try {
          await authService.ensureProfileExists()
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
      }

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
        if (import.meta.env.DEV) {
          console.error('Failed to fetch user roles:', rolesErr)
        }
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

        if (rolesData.length === PAGE_SIZE) {
          ;(async () => {
            let offset = PAGE_SIZE
            let hasMore = true
            let maxIterations = 20
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
      }
    } finally {
      setLoadingMemberships(false)
      fetchLock.current = false
    }
  }

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setRoles([])
      setMemberships([])
      setRawTenants({})
      setLoadingMemberships(false)
      return
    }

    setLoading(true)
    setLoadingMemberships(true)
    addBreadcrumb('Fetching user data', 'auth', { userId: user.id })

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

    withTimeout(fetchUserData(user.id))
      .then(() => processPendingInvite(user!.id))
      .then(() => processPendingJoinCode())
      .finally(() => {
        setLoading(false)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('[Auth] Auth chain failed:', err)
        captureError(err, { context: 'useRoleResolution.fetchChain' })
        setLoading(false)
        setLoadingMemberships(false)
      })
  }, [user])

  return {
    profile,
    roles,
    memberships,
    rawTenants,
    loading,
    loadingMemberships,
    fetchUserData,
    processPendingInvite,
    processPendingJoinCode,
  }
}
