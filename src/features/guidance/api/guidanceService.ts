import { supabase } from '@/src/lib/supabase'
import type { ApplicableGuide, LearningGuide } from '../types'

export const guidanceService = {
  async getApplicableGuides(targetType: string, targetId: string): Promise<ApplicableGuide[]> {
    const { data, error } = await supabase.rpc('get_applicable_guides', {
      p_target_type: targetType,
      p_target_id: targetId,
    })
    if (error) {
      // PGRST202 = function not found, 22P02 = invalid UUID input — return empty gracefully
      if (error.code === 'PGRST202' || error.code === '42883' || error.code === '22P02') return []
      if (import.meta.env.DEV) console.error('[guidanceService] getApplicableGuides:', error)
      throw error
    }
    return (data as ApplicableGuide[]) ?? []
  },

  async recordInteraction(guideId: string, action: string): Promise<void> {
    const { error } = await supabase.rpc('record_guide_interaction', {
      p_guide_id: guideId,
      p_action: action,
    })
    if (error) {
      if (import.meta.env.DEV) console.error('[guidanceService] recordInteraction:', error)
      // Fire-and-forget — don't throw on interaction errors
    }
  },

  async listGuides(targetType?: string, targetId?: string): Promise<LearningGuide[]> {
    const { data, error } = await supabase.rpc('list_learning_guides', {
      p_target_type: targetType ?? null,
      p_target_id: targetId ?? null,
    })
    if (error) {
      if (import.meta.env.DEV) console.error('[guidanceService] listGuides:', error)
      throw error
    }
    return (data as LearningGuide[]) ?? []
  },

  async upsertGuide(
    params: Partial<LearningGuide> & { target_id: string; title: string; content: string }
  ): Promise<string> {
    const { data, error } = await supabase.rpc('upsert_learning_guide', {
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
      if (import.meta.env.DEV) console.error('[guidanceService] upsertGuide:', error)
      throw error
    }
    return data as string
  },

  async deleteGuide(guideId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_learning_guide', {
      p_guide_id: guideId,
    })
    if (error) {
      if (import.meta.env.DEV) console.error('[guidanceService] deleteGuide:', error)
      throw error
    }
  },
}
