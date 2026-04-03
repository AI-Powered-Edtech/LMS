import { supabase } from '@/services/supabase/client'

import type { InteractionProgress } from '../types'

export const interactiveBlockService = {
  /**
   * Save or update interactive block progress via RPC.
   * Uses save_interactive_progress which handles upsert + tenant isolation server-side.
   */
  async saveProgress(
    blockId: string,
    lessonId: string,
    interactionData: Record<string, unknown>,
    isCompleted: boolean,
    score?: number
  ): Promise<void> {
    const { error } = await supabase.rpc('save_interactive_progress', {
      p_block_id: blockId,
      p_lesson_id: lessonId,
      p_interaction_data: interactionData,
      p_is_completed: isCompleted,
      p_score: score ?? null,
    })

    if (error) throw new Error(error.message)
  },

  /**
   * Fetch progress for a specific block + user combination.
   * Tenant isolation is enforced by RLS on interactive_block_progress.
   */
  async getProgress(
    blockId: string,
    userId: string,
    tenantId: string
  ): Promise<InteractionProgress | null> {
    const { data, error } = await supabase
      .from('interactive_block_progress')
      .select('interaction_data, is_completed, score, attempts')
      .eq('block_id', blockId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()

    if (error) {
      if (import.meta.env.DEV) console.error('[interactiveBlockService] getProgress error:', error)
      return null
    }

    if (!data) return null

    return {
      is_completed: data.is_completed ?? false,
      score: data.score ?? null,
      interaction_data: (data.interaction_data as Record<string, unknown>) ?? {},
      attempts: data.attempts ?? 0,
    }
  },
}
