import { db } from '@/services/db'
import { logger } from '@/utils/logger'

import type { EvaluationResult, PathRule, PathRuleInsert } from '../types'

export const adaptivePathService = {
  /**
   * Fetch all path rules for a course, ordered by priority descending.
   */
  async getPathRules(courseId: string, tenantId: string): Promise<PathRule[]> {
    const { data, error } = await db
      .from('learning_path_rules')
      .select(
        'id, course_id, source_lesson_id, condition_type, condition_value, target_lesson_id, priority, is_active, label, tenant_id, created_by, created_at'
      )
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: false })

    if (error) {
      if (import.meta.env.DEV) logger.error('[adaptivePathService] getPathRules error:', error)
      throw error
    }

    return (data ?? []) as PathRule[]
  },

  /**
   * Create a new path rule. tenant_id and created_by are set server-side.
   */
  async createPathRule(rule: PathRuleInsert, tenantId: string): Promise<PathRule> {
    const {
      data: { user },
    } = await db.auth.getUser()

    const { data, error } = await db
      .from('learning_path_rules')
      .insert({
        course_id: rule.course_id,
        source_lesson_id: rule.source_lesson_id,
        condition_type: rule.condition_type,
        condition_value: rule.condition_value,
        target_lesson_id: rule.target_lesson_id,
        priority: rule.priority,
        is_active: rule.is_active,
        label: rule.label,
        tenant_id: tenantId,
        created_by: user?.id ?? '',
      })
      .select(
        'id, course_id, source_lesson_id, condition_type, condition_value, target_lesson_id, priority, is_active, label, tenant_id, created_by, created_at'
      )
      .single()

    if (error) {
      if (import.meta.env.DEV) logger.error('[adaptivePathService] createPathRule error:', error)
      throw error
    }

    return (data as unknown) as PathRule
  },

  /**
   * Update an existing path rule by ID within the given tenant.
   */
  async updatePathRule(
    ruleId: string,
    data: Partial<PathRule>,
    tenantId: string
  ): Promise<PathRule> {
    // Strip fields that should not be updated directly
    const {
      id: _id,
      tenant_id: _tenantId,
      created_by: _createdBy,
      created_at: _createdAt,
      ...updateData
    } = data

    const { data: updated, error } = await db
      .from('learning_path_rules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .eq('tenant_id', tenantId)
      .select(
        'id, course_id, source_lesson_id, condition_type, condition_value, target_lesson_id, priority, is_active, label, tenant_id, created_by, created_at'
      )
      .single()

    if (error) {
      if (import.meta.env.DEV) logger.error('[adaptivePathService] updatePathRule error:', error)
      throw error
    }

    return updated as PathRule
  },

  /**
   * Delete a path rule by ID within the given tenant.
   */
  async deletePathRule(ruleId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('learning_path_rules')
      .delete()
      .eq('id', ruleId)
      .eq('tenant_id', tenantId)

    if (error) {
      if (import.meta.env.DEV) logger.error('[adaptivePathService] deletePathRule error:', error)
      throw error
    }
  },

  /**
   * Call the evaluate_next_lesson RPC to determine the adaptive next lesson.
   */
  async evaluateNextLesson(
    userId: string,
    courseId: string,
    currentLessonId: string,
    tenantId: string
  ): Promise<EvaluationResult> {
    const { data, error } = await db.rpc('evaluate_next_lesson', {
      p_user_id: userId,
      p_course_id: courseId,
      p_current_lesson_id: currentLessonId,
      p_tenant_id: tenantId,
    })

    if (error) {
      if (import.meta.env.DEV)
        logger.error('[adaptivePathService] evaluateNextLesson error:', error)
      throw error
    }

    const result = data as {
      next_lesson_id?: string | null
      reason?: string | null
      rule_id?: string | null
      is_adaptive?: boolean
    }

    return {
      next_lesson_id: result?.next_lesson_id ?? null,
      reason: result?.reason ?? null,
      rule_id: result?.rule_id ?? null,
      is_adaptive: result?.is_adaptive ?? false,
    }
  },

  /**
   * Mark or unmark a lesson as remedial.
   */
  async setLessonRemedial(lessonId: string, isRemedial: boolean, tenantId: string): Promise<void> {
    const { error } = await db
      .from('lessons')
      .update({ is_remedial: isRemedial })
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)

    if (error) {
      if (import.meta.env.DEV) logger.error('[adaptivePathService] setLessonRemedial error:', error)
      throw error
    }
  },
}
