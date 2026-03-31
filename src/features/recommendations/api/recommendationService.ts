import { supabase } from '@/services/supabase/client'

import type { Recommendation } from '../types'

export const recommendationService = {
  async getRecommendations(userId: string, limit = 5): Promise<Recommendation[]> {
    const { data, error } = await supabase.rpc('get_student_recommendations', {
      p_user_id: userId,
      p_limit: limit,
    })
    if (error) throw error
    return (data as Recommendation[]) ?? []
  },

  async recordAction(recommendationId: string, action: 'accepted' | 'dismissed'): Promise<void> {
    const { error } = await supabase.rpc('record_recommendation_action', {
      p_recommendation_id: recommendationId,
      p_action: action,
    })
    if (error) throw error
  },
}
