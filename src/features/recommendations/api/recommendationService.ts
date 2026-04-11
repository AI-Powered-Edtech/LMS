import { db } from '@/services/db'
import { logDevError } from '@/utils/logDevError'

import type { Recommendation } from '../types'

export const recommendationService = {
  async getRecommendations(userId: string, limit = 5): Promise<Recommendation[]> {
    // FIXED: Graceful degradation — return empty array instead of throwing on RPC failure
    try {
      const { data, error } = await db.rpc('get_student_recommendations', {
        p_user_id: userId,
        p_limit: limit,
      })
      if (error) {
        logDevError('recommendations', 'RPC failed:', error)
        return [] // graceful fallback — show empty feed instead of crashing
      }
      return (data as Recommendation[]) ?? []
    } catch (err) {
      logDevError('recommendations', 'Network error:', err)
      return []
    }
  },

  async recordAction(recommendationId: string, action: 'accepted' | 'dismissed'): Promise<void> {
    // FIXED: Graceful degradation — log error but don't throw on action recording failure
    try {
      const { error } = await db.rpc('record_recommendation_action', {
        p_recommendation_id: recommendationId,
        p_action: action,
      })
      if (error) {
        logDevError('recommendations', 'recordAction RPC failed:', error)
      }
    } catch (err) {
      logDevError('recommendations', 'recordAction network error:', err)
    }
  },
}
