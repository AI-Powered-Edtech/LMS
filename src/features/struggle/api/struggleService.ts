import { db } from '@/services/db'
import { logger } from '@/utils/logger'

import type { LessonStatus, StruggleAlert, StruggleConfig } from '../types'

export const struggleService = {
  /**
   * Fetch struggle detection configuration for the active tenant.
   * RLS enforces tenant isolation server-side; tenantId is passed for
   * defense-in-depth cache keying only.
   */
  async getStruggleConfig(_tenantId: string): Promise<StruggleConfig | null> {
    const { data, error } = await db.rpc('get_struggle_config')
    if (error) {
      if (import.meta.env.DEV) logger.error('[struggleService] getStruggleConfig:', error)
      throw error
    }
    return (data as StruggleConfig) ?? null
  },

  /**
   * Persist updated struggle detection thresholds.
   */
  async updateStruggleConfig(_tenantId: string, updates: Partial<StruggleConfig>): Promise<void> {
    const { error } = await db.rpc('update_struggle_config', {
      p_threshold_medium: updates.threshold_medium,
      p_threshold_high: updates.threshold_high,
      p_notification_enabled: updates.notification_enabled,
      p_student_prompt_enabled: updates.student_prompt_enabled,
      p_cooldown_hours: updates.cooldown_hours,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[struggleService] updateStruggleConfig:', error)
      throw error
    }
  },

  /**
   * Fetch struggle alerts for the teacher's tenant.
   */
  async getStruggleAlerts(
    _tenantId: string,
    options?: {
      unreadOnly?: boolean
      courseId?: string
      limit?: number
    }
  ): Promise<StruggleAlert[]> {
    const { data, error } = await db.rpc('get_struggle_alerts', {
      p_unread_only: options?.unreadOnly ?? false,
      p_course_id: options?.courseId ?? null,
      p_limit: options?.limit ?? 50,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[struggleService] getStruggleAlerts:', error)
      throw error
    }
    return (data as StruggleAlert[]) ?? []
  },

  /**
   * Mark a list of alerts as read.
   */
  async markAlertsRead(_tenantId: string, alertIds: string[]): Promise<void> {
    if (alertIds.length === 0) return
    const { error } = await db.rpc('mark_alerts_read', {
      p_alert_ids: alertIds,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[struggleService] markAlertsRead:', error)
      throw error
    }
  },

  /**
   * Fetch the current student's struggle status for a specific lesson.
   */
  async getMyLessonStatus(_tenantId: string, lessonId: string): Promise<LessonStatus | null> {
    const { data, error } = await db.rpc('get_my_lesson_status', {
      p_lesson_id: lessonId,
    })
    if (error) {
      const status = (error as { status?: number }).status
      const code = (error as { code?: string }).code
      // Optional feature — swallow missing RPC / forbidden silently
      if (status === 403 || status === 404 || code === '42P01' || code === '42883') return null
      if (import.meta.env.DEV) logger.error('[struggleService] getMyLessonStatus:', error)
      return null
    }
    return (data as LessonStatus) ?? null
  },
}
