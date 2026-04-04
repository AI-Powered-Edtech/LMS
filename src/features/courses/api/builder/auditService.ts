import { supabase } from '@/services/supabase/client'
import { logDevError, logDevWarn } from '@/utils/logDevError'

// ============================================================
// Types
// ============================================================

export type CourseActionType =
  | 'publish'
  | 'unpublish'
  | 'submit_review'
  | 'approve'
  | 'restore_version'
  | 'add_collaborator'
  | 'remove_collaborator'
  | 'archive'

export interface CourseActionLog {
  id: string
  tenant_id: string
  course_id: string
  user_id: string
  action_type: CourseActionType
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================
// Service
// ============================================================

export const auditService = {
  /**
   * Append an entry to the course_action_logs audit trail.
   * Fire-and-forget — failures are logged but do NOT block the triggering action.
   */
  async logCourseAction(
    courseId: string,
    actionType: CourseActionType,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await supabase.from('course_action_logs').insert({
      course_id: courseId,
      action_type: actionType,
      metadata,
      // tenant_id is set automatically by trigger auto_set_tenant_id_from_course
      // user_id is inferred from auth.uid() enforced by RLS policy
      user_id: (await supabase.auth.getUser()).data.user?.id ?? '',
    })

    if (error) {
      // Non-fatal — audit logging must never block the primary action
      logDevWarn(
        'auditService',
        `Failed to log action "${actionType}" for course ${courseId}:`,
        error.message
      )
    }
  },

  /**
   * Fetch recent action logs for a specific course.
   * Used by the activity feed in the Release Panel.
   */
  async fetchCourseActivityFeed(
    courseId: string,
    tenantId: string,
    limit = 20
  ): Promise<CourseActionLog[]> {
    const { data, error } = await supabase
      .from('course_action_logs')
      .select('id, tenant_id, course_id, user_id, action_type, metadata, created_at')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logDevError('auditService', 'Error fetching course activity feed:', error)
      throw error
    }

    return (data ?? []) as CourseActionLog[]
  },

  /**
   * Check if the current user has builder access for a course.
   * Calls the server-authoritative RPC rpc_check_builder_access.
   * Returns false if auth is missing or on any error.
   */
  async checkBuilderAccess(courseId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('rpc_check_builder_access', {
      p_course_id: courseId,
    })

    if (error) {
      logDevWarn(
        'auditService',
        `Builder access check failed for course ${courseId}:`,
        error.message
      )
      return false
    }

    return data === true
  },
}
