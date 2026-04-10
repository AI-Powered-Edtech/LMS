import { useCallback, useEffect, useRef, useState } from 'react'

import { authService } from '@/features/auth/api/authService'
import { addBreadcrumb, captureError, setSentryUser } from '@/utils/sentry'

interface AuthUser {
  id: string
  email?: string
}

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
  status: 'active' | 'inactive' | 'suspended'
  is_active: boolean
  tenant_slug: string
  joined_at: string | null
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
  defaultTenantId: string | null
  bootstrapReady: boolean
  error: string | null
  loading: boolean
  loadingMemberships: boolean
  fetchUserData: (userId: string) => Promise<void>
  processPendingInvite: (userId: string) => Promise<void>
  processPendingJoinCode: (userId: string) => Promise<void>
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
export function useRoleResolution(user: AuthUser | null): UseRoleResolutionResult {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  const [rawTenants, setRawTenants] = useState<Record<string, Tenant>>({})
  const [roles, setRoles] = useState<Role[]>([])
  const [defaultTenantId, setDefaultTenantId] = useState<string | null>(null)
  const [bootstrapReady, setBootstrapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const fetchLock = useRef(false)

  const fetchUserData = useCallback(async (userId: string) => {
    if (fetchLock.current) return
    fetchLock.current = true
    setError(null)
    try {
      const bootstrap = await authService.getAuthBootstrap()

      if (bootstrap.profile) {
        setProfile(bootstrap.profile)
      } else {
        setProfile(null)
      }

      const loadedMemberships: TenantMembership[] = bootstrap.memberships.map((membership) => ({
        tenant_id: membership.tenant_id,
        tenant_name: membership.tenant_name,
        tenant_logo: membership.tenant_logo,
        tenant_slug: membership.tenant_slug,
        role: membership.role,
        status: membership.status,
        is_active: membership.is_active,
        joined_at: membership.joined_at,
      }))

      const tenantsMap: Record<string, Tenant> = {}
      loadedMemberships.forEach((membership) => {
        tenantsMap[membership.tenant_id] = {
          id: membership.tenant_id,
          name: membership.tenant_name,
          slug: membership.tenant_slug,
          is_active: membership.is_active,
        }
      })

      const activeRoles = Array.from(
        new Set(
          loadedMemberships
            .filter((membership) => membership.status === 'active' && membership.is_active)
            .map((membership) => membership.role)
        )
      )

      setMemberships(loadedMemberships)
      setRawTenants(tenantsMap)
      setRoles(activeRoles)
      setDefaultTenantId(bootstrap.default_tenant_id)
      setBootstrapReady(true)
      addBreadcrumb('Workspace memberships resolved', 'auth', {
        memberships: loadedMemberships.length,
        activeRoles: activeRoles.join(','),
        defaultTenantId: bootstrap.default_tenant_id,
      })

      if (activeRoles.length > 0) {
        setSentryUser(userId, getPrimaryRole(activeRoles))
      }

      const cachedTenantId = localStorage.getItem('activeTenantId')
      const hasValidCachedTenant =
        !!cachedTenantId &&
        loadedMemberships.some(
          (membership) =>
            membership.tenant_id === cachedTenantId &&
            membership.status === 'active' &&
            membership.is_active
        )

      if (!hasValidCachedTenant) {
        if (bootstrap.default_tenant_id) {
          localStorage.setItem('activeTenantId', bootstrap.default_tenant_id)
        } else {
          localStorage.removeItem('activeTenantId')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat akses ruang kerja.'
      setError(message)
      setBootstrapReady(true)
      captureError(err, { context: 'useRoleResolution.fetchUserData', userId })
      throw err
    } finally {
      setLoadingMemberships(false)
      fetchLock.current = false
    }
  }, [])

  const processPendingInvite = useCallback(
    async (userId: string) => {
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
    },
    [fetchUserData]
  )

  const processPendingJoinCode = useCallback(async (userId: string) => {
    const pendingCode = localStorage.getItem('pendingJoinCode')
    if (!pendingCode) return
    localStorage.removeItem('pendingJoinCode')
    try {
      await authService.enrollStudent(pendingCode)
      fetchLock.current = false
      await fetchUserData(userId)
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
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setRoles([])
      setMemberships([])
      setRawTenants({})
      setDefaultTenantId(null)
      setBootstrapReady(false)
      setError(null)
      setLoading(false)
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
      .then(() => processPendingJoinCode(user!.id))
      .finally(() => {
        setLoading(false)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('[Auth] Auth chain failed:', err)
        captureError(err, { context: 'useRoleResolution.fetchChain' })
        setLoading(false)
        setLoadingMemberships(false)
      })
  }, [fetchUserData, processPendingInvite, processPendingJoinCode, user])

  return {
    profile,
    roles,
    memberships,
    rawTenants,
    defaultTenantId,
    bootstrapReady,
    error,
    loading,
    loadingMemberships,
    fetchUserData,
    processPendingInvite,
    processPendingJoinCode,
  }
}
