/**
 * Gamification XP Service
 * 
 * Provides idempotent XP awarding, XP history, and leaderboard with race condition prevention.
 */

import { supabase } from '@/services/supabase/client'

import type { XPTransaction, LeaderboardEntry } from '../types'

/**
 * Service for gamification XP API calls
 */
export const gamificationXPService = {
  /**
   * Award XP with idempotency guarantee
   */
  async awardXPIdempotent(input: {
    user_id: string
    tenant_id: string
    xp_amount: number
    xp_type: string
    reference_id?: string
    reference_type?: string
    idempotency_key?: string
    description?: string
  }) {
    const { data, error } = await supabase.rpc('award_xp_idempotent', {
      p_user_id: input.user_id,
      p_tenant_id: input.tenant_id,
      p_xp_amount: input.xp_amount,
      p_xp_type: input.xp_type,
      p_reference_id: input.reference_id ?? null,
      p_reference_type: input.reference_type ?? null,
      p_idempotency_key: input.idempotency_key ?? null,
      p_description: input.description ?? null,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      success: boolean
      new_total_xp: number
      new_rank: number
      message: string
    }
  },

  /**
   * Get user XP history
   */
  async getUserXPHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<XPTransaction[]> {
    const { data, error } = await supabase.rpc('get_user_xp_history', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }

    return (data ?? []) as XPTransaction[]
  },

  /**
   * Update leaderboard with optimistic locking
   */
  async updateLeaderboardXP(
    userId: string,
    tenantId: string,
    xpChange: number,
    version: number
  ) {
    const { data, error } = await supabase.rpc('update_leaderboard_xp', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_xp_change: xpChange,
      p_version: version,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    return row as {
      success: boolean
      new_rank: number
      new_xp: number
      message: string
    }
  },

  /**
   * Get leaderboard with version info
   */
  async getLeaderboardWithVersion(params: {
    tenant_id: string
    course_id?: string
    limit?: number
  }): Promise<(LeaderboardEntry & { version: number })[]> {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('tenant_id', params.tenant_id)
      .order('points', { ascending: false })
      .limit(params.limit ?? 50)

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }

    return (data ?? []) as unknown as (LeaderboardEntry & { version: number })[]
  },

  /**
   * Get XP analytics from materialized view
   */
  async getXPAnalytics(tenantId: string, days: number = 30) {
    const { data, error } = await supabase
      .from('mv_xp_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('xp_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('xp_date', { ascending: false })

    if (error) throw error
    return data ?? []
  },
}
