import { apiFetch } from '@/src/lib/api'

import type { Recommendation } from '../types'

export const recommendationService = {
  async getRecommendations(userId: string, limit = 5): Promise<Recommendation[]> {
    const { data, error } = await apiFetch('/rpc/get_student_recommendations', { method: 'POST', body: JSON.stringify({
          p_user_id: userId,
          p_limit: limit,
        }) })
    if (error) throw error
    return (data as Recommendation[]) ?? []
  },

  async recordAction(recommendationId: string, action: 'accepted' | 'dismissed'): Promise<void> {
    const { error } = await apiFetch('/rpc/record_recommendation_action', { method: 'POST', body: JSON.stringify({
          p_recommendation_id: recommendationId,
          p_action: action,
        }) })
    if (error) throw error
  },
}
