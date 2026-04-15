import {
  consumePostAuthRedirect,
  isAuthSurfacePath,
  sanitizeRedirectTarget,
} from '@/features/auth/utils/authFlow'
import { getApiClient } from '@/services/api'
import { type AuthBootstrap as ProviderAuthBootstrap, getAuthProvider } from '@/services/auth'
import { logDevError } from '@/utils/logDevError'
import { addBreadcrumb, captureError } from '@/utils/sentry'

export interface InvitationInfo {
  email: string
  role: string
  tenant_name: string
  tenant_id: string
  valid: boolean
  error?: string
}

export interface ClassInfo {
  class_id: string
  class_name: string
  teacher_name: string
  tenant_id: string
  tenant_name: string
  found: boolean
  error?: string
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

export interface JoinClassParams {
  joinCode: string
  fullName: string
}

export interface JoinClassResult {
  class_name?: string
  school_name?: string
  tenant_id?: string
}

export interface CreateTenantParams {
  schoolName: string
  fullName: string
  role: 'teacher' | 'admin'
}

export interface AuthBootstrapProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  tenant_id: string | null
}

export interface AuthBootstrapMembership {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  tenant_logo: string | null
  role: 'teacher' | 'student' | 'admin' | 'parent' | 'principal'
  status: 'active' | 'inactive' | 'suspended'
  is_active: boolean
  joined_at: string | null
}

export interface AuthBootstrap extends ProviderAuthBootstrap {}

function extractAuthCode(input: string): string {
  try {
    const parsed = new URL(input, window.location.origin)
    const code = parsed.searchParams.get('code')
    if (code) return code
  } catch {
    // Fall back to treating input as a raw code.
  }

  return input
}

/**
 * Auth Service
 * Wraps RPC and API calls for auth-related operations.
 * AuthContext still manages session state and onAuthStateChange directly.
 */
export const authService = {
  /**
   * Ensure a user profile row exists (called after sign-up or missing profile).
   */
  async ensureProfileExists(): Promise<void> {
    const { error } = await getApiClient().rpc('ensure_profile_exists')
    if (error) throw error
  },

  async exchangeOAuthCode(urlOrCode: string) {
    addBreadcrumb('OAuth code exchange started', 'auth')
    const authCode = extractAuthCode(urlOrCode)
    const { data, error } = await getAuthProvider().exchangeCodeForSession(authCode)
    if (error) throw error
    addBreadcrumb('OAuth code exchange succeeded', 'auth')
    return data
  },

  async getAuthBootstrap(): Promise<AuthBootstrap> {
    addBreadcrumb('Auth bootstrap request started', 'auth')
    const { data, error } = await getAuthProvider().getAuthBootstrap()
    if (error) throw error

    const bootstrap = (data ?? {}) as Partial<AuthBootstrap>
    const normalized = {
      profile: (bootstrap.profile as AuthBootstrapProfile | null | undefined) ?? null,
      memberships: (bootstrap.memberships as AuthBootstrapMembership[] | undefined) ?? [],
      default_tenant_id: bootstrap.default_tenant_id ?? null,
      requires_email_verification: bootstrap.requires_email_verification ?? false,
    }
    addBreadcrumb('Auth bootstrap loaded', 'auth', {
      memberships: normalized.memberships.length,
      defaultTenantId: normalized.default_tenant_id,
      requiresEmailVerification: normalized.requires_email_verification,
    })
    return normalized
  },

  resolvePostAuthDestination(bootstrap: AuthBootstrap, fallbackPath?: string | null): string {
    let destination = '/app'

    if (bootstrap.requires_email_verification) {
      destination = '/verify-email'
    } else {
      const activeMemberships = bootstrap.memberships.filter(
        (membership) => membership.status === 'active' && membership.is_active
      )

      if (activeMemberships.length === 0) {
        destination =
          bootstrap.memberships.length > 0
            ? '/auth/error?reason=no-active-workspace'
            : '/workspace-selector'
      } else {
        const storedRedirect = consumePostAuthRedirect()
        const preferredRedirect = sanitizeRedirectTarget(fallbackPath ?? storedRedirect)
        const isInvalidFallback =
          !preferredRedirect ||
          preferredRedirect === '/login' ||
          preferredRedirect === '/verify-email'

        if (!isInvalidFallback && !isAuthSurfacePath(preferredRedirect)) {
          destination = preferredRedirect
        } else if (activeMemberships.length > 1) {
          destination = '/workspace-selector'
        }
      }
    }

    addBreadcrumb('Post-auth destination resolved', 'auth', {
      destination,
      memberships: bootstrap.memberships.length,
      activeMemberships: bootstrap.memberships.filter(
        (membership) => membership.status === 'active' && membership.is_active
      ).length,
    })

    return destination
  },

  /**
   * Accept a pending invitation, upgrading the user's role.
   */
  async acceptInvitation(token: string): Promise<{ success: boolean }> {
    const { data, error } = await getApiClient().rpc('accept_invitation', { p_token: token })
    if (error) throw error
    return (data as { success: boolean }) ?? { success: false }
  },

  async enrollStudent(joinCode: string): Promise<void> {
    const { error } = await getApiClient().rpc('enroll_student', { p_join_code: joinCode })
    if (error) throw error
  },

  async validateInvitation(token: string): Promise<InvitationInfo | null> {
    const { data } = await getApiClient().rpc('validate_invitation', { p_token: token })
    return (data as InvitationInfo) ?? null
  },

  async publicLookupClass(joinCode: string): Promise<ClassInfo | null> {
    const { data } = await getApiClient().rpc('public_lookup_class', { p_join_code: joinCode })
    return (data as ClassInfo) ?? null
  },

  /**
   * Server-side rate limit check via Edge Function.
   *
   * Fail behavior (defense-in-depth tiered):
   * - HTTP error from Edge Function (4xx/5xx): fail-CLOSED — block the request.
   *   The Edge Function itself returns allowed:false on 503 (fail-closed by design),
   *   so FunctionsHttpError = server intentionally blocking → respect it.
   * - Network unreachable (ECONNREFUSED, DNS failure, timeout): fail-semi-open — allow
   *   but capture to Sentry so ops can investigate infrastructure issues.
   *
   * Client-side rate limiting (rateLimiter.ts) always runs first and is the
   * primary defense regardless of Edge Function availability.
   */
  async checkRateLimit(
    action: string,
    _key: string,
    _maxAttempts: number,
    _windowMs: number
  ): Promise<RateLimitResult> {
    // check-rate-limit adalah internal service — tidak ada VIL endpoint publik.
    // Gunakan VIL API internal rate limit endpoint jika tersedia.
    try {
      const { readVilSession } = await import('@/services/auth/vilSession')
      const token = readVilSession()?.access_token
      const apiUrl = import.meta.env.VITE_API_URL ?? ''

      const response = await fetch(`${apiUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      // TODO: Phase 6 — Saat VIL mengimplementasi /api/v1/rate-limit, ganti endpoint ini.
      // Sementara, fail-semi-open: jika health check OK, izinkan request.
      if (!response.ok) {
        logDevError('auth', 'Rate limit health check failed - fail-closed:', response.status)
        return { allowed: false, retryAfterMs: 5000 }
      }

      // Gunakan client-side rate limiting sebagai primary defense
      return { allowed: true }
    } catch (err) {
      // Network/infrastructure failure — fail-semi-open.
      logDevError('auth', 'Rate limit unreachable (network error) - fail-semi-open:', err)
      captureError(err, { context: 'checkRateLimit', action, level: 'warning' })
      return { allowed: true }
    }
  },

  /**
   * Onboard a student by joining a class (used by WorkspaceSelector).
   */
  async onboardStudentJoinClass(params: JoinClassParams): Promise<JoinClassResult> {
    const { data, error } = await getApiClient().rpc('onboard_student_join_class', {
      p_join_code: params.joinCode,
      p_full_name: params.fullName,
    })
    if (error) throw error
    return (data as JoinClassResult) ?? {}
  },

  async createSchoolTenant(params: CreateTenantParams): Promise<string> {
    const { data, error } = await getApiClient().rpc('create_school_tenant', {
      p_school_name: params.schoolName,
      p_full_name: params.fullName,
      p_role: params.role,
    })
    if (error) throw error
    return data as string
  },
}
