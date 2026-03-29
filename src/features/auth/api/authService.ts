import { supabase } from '@/src/services/supabase/client'

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
}

export interface CreateTenantParams {
  schoolName: string
  fullName: string
  role: 'teacher' | 'admin'
}

/**
 * Auth Service
 * Wraps Supabase RPC and Edge Function calls for auth-related operations.
 * AuthContext still manages session state and onAuthStateChange directly.
 */
export const authService = {
  /**
   * Ensure a user profile row exists (called after sign-up or missing profile).
   */
  async ensureProfileExists(): Promise<void> {
    const { error } = await supabase.rpc('ensure_profile_exists')
    if (error) throw error
  },

  /**
   * Accept a pending invitation, upgrading the user's role.
   */
  async acceptInvitation(token: string): Promise<{ success: boolean }> {
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
    if (error) throw error
    return (data as { success: boolean }) ?? { success: false }
  },

  /**
   * Enroll the current user in a class via join code.
   */
  async enrollStudent(joinCode: string): Promise<void> {
    const { error } = await supabase.rpc('enroll_student', { p_join_code: joinCode })
    if (error) throw error
  },

  /**
   * Validate an invitation token without accepting it (used at register step 1).
   */
  async validateInvitation(token: string): Promise<InvitationInfo | null> {
    const { data } = await supabase.rpc('validate_invitation', { p_token: token })
    return (data as InvitationInfo) ?? null
  },

  /**
   * Look up a class by join code (public, no auth required).
   */
  async publicLookupClass(joinCode: string): Promise<ClassInfo | null> {
    const { data } = await supabase.rpc('public_lookup_class', { p_join_code: joinCode })
    return (data as ClassInfo) ?? null
  },

  /**
   * Server-side rate limit check via Edge Function.
   * Fails open (returns allowed=true) if the function is unavailable.
   */
  async checkRateLimit(
    action: string,
    key: string,
    maxAttempts: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    try {
      const { data } = await supabase.functions.invoke('check-rate-limit', {
        body: { action, key, maxAttempts, windowMs },
      })
      return (data as RateLimitResult) ?? { allowed: true }
    } catch {
      // Fail open — server check unavailable, rely on client-side check
      return { allowed: true }
    }
  },

  /**
   * Onboard a student by joining a class (used by WorkspaceSelector).
   */
  async onboardStudentJoinClass(params: JoinClassParams): Promise<JoinClassResult> {
    const { data, error } = await supabase.rpc('onboard_student_join_class', {
      p_join_code: params.joinCode,
      p_full_name: params.fullName,
    })
    if (error) throw error
    return (data as JoinClassResult) ?? {}
  },

  /**
   * Create a new school tenant (used by WorkspaceSelector for teacher/admin onboarding).
   */
  async createSchoolTenant(params: CreateTenantParams): Promise<void> {
    const { error } = await supabase.rpc('create_school_tenant', {
      p_school_name: params.schoolName,
      p_full_name: params.fullName,
      p_role: params.role,
    })
    if (error) throw error
  },
}
