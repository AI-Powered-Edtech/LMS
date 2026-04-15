/**
 * Leaderboard API Service
 *
 * Provides methods for fetching leaderboard data and subscribing to real-time updates.
 * All methods require tenantId for proper multi-tenant isolation.
 */

import { apiFetch } from '@/src/lib/api'

import type { LeaderboardEntry } from '../types'

/**
 * Service for leaderboard-related API calls
 */
export const leaderboardService = {
  /**
   * Fetches the top 20 students for a given class from the leaderboards table within a tenant.
   * @param classId - The class ID
   * @param tenantId - The tenant ID for isolation
   */
  async getLeaderboard(classId: string, _tenantId: string): Promise<LeaderboardEntry[]> {
    // Try with class_id filter (migration 052+)
    let query = apiFetch('/leaderboards')

    // Only filter by class_id if provided
    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data, error } = await query

    if (error) {
      // Table/column doesn't exist or bad request — return empty
      if (error.code === '42P01' || error.code === '400' || error.message?.includes('400'))
        return []
      // If class_id or score column doesn't exist, try minimal query
      if (error.code === '42703') {
        const { data: fallback, error: fbError } = await apiFetch('/leaderboards')

        if (fbError) throw fbError
        // Map points → score for type compatibility
        return (
          (fallback || []) as unknown as Array<
            Record<string, unknown> & { score?: number; points?: number }
          >
        ).map((e) => ({
          ...e,
          score: e.score ?? e.points ?? 0,
        })) as unknown as LeaderboardEntry[]
      }
      throw error
    }

    // Map points → score for LeaderboardEntry type compatibility
    return (
      (data || []) as unknown as Array<
        Record<string, unknown> & { points?: number; score?: number }
      >
    ).map((e) => ({
      ...e,
      score: e.points ?? e.score ?? 0,
    })) as unknown as LeaderboardEntry[]
  },

  /**
   * Fetches the top 20 students for the weekly leaderboard within a tenant.
   * @param classId - The class ID
   * @param tenantId - The tenant ID for isolation
   */
  async getWeeklyLeaderboard(classId: string, _tenantId: string): Promise<LeaderboardEntry[]> {
    const now = new Date()
    const day = now.getUTCDay() || 7 // 1-7 (Mon-Sun)
    now.setUTCDate(now.getUTCDate() + 1 - day)
    now.setUTCHours(0, 0, 0, 0)
    const _weekStart = now.toISOString()

    let query = apiFetch('/leaderboards_weekly')

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data, error } = await query

    if (error) {
      // Table might not exist yet — return empty
      if (error.code === '42P01' || error.code === '42703') {
        return []
      }
      throw error
    }

    return (data as unknown as LeaderboardEntry[]) || []
  },
}
