import { db } from '@/services/db'
import { logger } from '@/utils/logger'

import type { ApplicableGuide, LearningGuide } from '../types'

export const guidanceService = {
  async getApplicableGuides(targetType: string, targetId: string): Promise<ApplicableGuide[]> {
    const { data, error } = await db.rpc('get_applicable_guides', {
      p_target_type: targetType,
      p_target_id: targetId,
    })
    if (error) {
      const status = (error as { status?: number }).status
      const code = (error as { code?: string }).code
      // Optional feature — missing RPC, invalid UUID, 403/404 return empty gracefully
      if (
        code === 'PGRST202' ||
        code === '42883' ||
        code === '42P01' ||
        code === '22P02' ||
        status === 403 ||
        status === 404
      )
        return []
      if (import.meta.env.DEV) logger.error('[guidanceService] getApplicableGuides:', error)
      return []
    }
    return (data as ApplicableGuide[]) ?? []
  },

  async recordInteraction(guideId: string, action: string): Promise<void> {
    const { error } = await db.rpc('record_guide_interaction', {
      p_guide_id: guideId,
      p_action: action,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[guidanceService] recordInteraction:', error)
      // Fire-and-forget — don't throw on interaction errors
    }
  },

  async listGuides(targetType?: string, targetId?: string): Promise<LearningGuide[]> {
    const { data, error } = await db.rpc('list_learning_guides', {
      p_target_type: targetType ?? null,
      p_target_id: targetId ?? null,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[guidanceService] listGuides:', error)
      throw error
    }
    return (data as LearningGuide[]) ?? []
  },

  async upsertGuide(
    params: Partial<LearningGuide> & { target_id: string; title: string; content: string }
  ): Promise<string> {
    const { data, error } = await db.rpc('upsert_learning_guide', {
      p_guide_id: params.id ?? null,
      p_title: params.title,
      p_content: params.content,
      p_guide_type: params.guide_type ?? 'banner',
      p_target_type: params.target_type ?? 'lesson',
      p_target_id: params.target_id,
      p_segment: params.segment ?? 'all',
      p_trigger_type: params.trigger_type ?? 'on_enter',
      p_trigger_value: params.trigger_value ?? 0,
      p_priority: params.priority ?? 0,
      p_is_active: params.is_active ?? true,
      p_max_impressions: params.max_impressions ?? null,
      p_starts_at: params.starts_at ?? null,
      p_ends_at: params.ends_at ?? null,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[guidanceService] upsertGuide:', error)
      throw error
    }
    return (data as unknown) as string
  },

  async deleteGuide(guideId: string): Promise<void> {
    const { error } = await db.rpc('delete_learning_guide', {
      p_guide_id: guideId,
    })
    if (error) {
      if (import.meta.env.DEV) logger.error('[guidanceService] deleteGuide:', error)
      throw error
    }
  },
}
