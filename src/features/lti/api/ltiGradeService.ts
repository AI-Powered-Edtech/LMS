import { supabase } from '@/services/supabase/client'

/**
 * LTI Grade Passback Service
 * Phase 35C — Sends quiz/assignment scores back to the originating LTI platform.
 *
 * All calls are fire-and-forget. This service NEVER throws — failures are
 * swallowed to ensure LTI passback never blocks the main grading flow.
 */
export const ltiGradeService = {
  /**
   * Trigger a grade passback to the LTI platform for a quiz or assignment.
   * Fire-and-forget: returns immediately, errors are silently suppressed.
   */
  triggerPassback(
    tenantId: string,
    userId: string,
    resourceType: 'quiz' | 'assignment',
    resourceId: string,
    score: number,
    maxScore: number
  ): void {
    // Async IIFE — intentionally NOT awaited
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lti-grade-passback`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            resource_type: resourceType,
            resource_id: resourceId,
            score,
            max_score: maxScore,
          }),
        })
      } catch {
        // Silently suppress — passback must never break the UI
      }
    })()
  },

  /**
   * Fetch recent grade passback audit log entries for a tenant.
   */
  async getPassbackLogs(
    tenantId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string
      resource_type: string
      resource_id: string
      score_sent: number | null
      max_score: number | null
      status: 'pending' | 'success' | 'failed'
      error_message: string | null
      created_at: string
    }>
  > {
    const { data, error } = await supabase
      .from('lti_grade_passback_log')
      .select(
        'id, resource_type, resource_id, score_sent, max_score, status, error_message, created_at'
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as Array<{
      id: string
      resource_type: string
      resource_id: string
      score_sent: number | null
      max_score: number | null
      status: 'pending' | 'success' | 'failed'
      error_message: string | null
      created_at: string
    }>
  },
}
