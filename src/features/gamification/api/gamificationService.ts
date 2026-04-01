/**
 * Gamification API Service
 *
 * Provides methods for fetching user streaks, badges, achievements, XP, and certificates.
 * All methods require tenantId for proper multi-tenant isolation.
 */

import { supabase } from '@/src/services/supabase/client'

import type {
  Badge,
  BadgeDefinition,
  Certificate,
  LeaderboardPeriod,
  LeaderboardSortBy,
  LeaderboardV2Entry,
  StudentXPProfile,
  UserBadge,
  UserStreak,
} from '../types'

/**
 * Service for gamification-related API calls
 */
export const gamificationService = {
  /**
   * Fetches the current streak for the authenticated user.
   */
  async getUserStreak(userId: string, tenantId: string): Promise<UserStreak | null> {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('user_id, tenant_id, current_streak, longest_streak, last_activity_date, updated_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01' || error.code === '42703') return null
      throw error
    }

    return data
  },

  /**
   * Fetches the badges earned by the authenticated user (v1 compat).
   */
  async getUserBadges(userId: string, tenantId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select(
        `
                badge_id,
                earned_at,
                badge:badges (*)
            `
      )
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('earned_at', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.code === '42703') return []
      throw error
    }

    return data as unknown as UserBadge[]
  },

  /**
   * Fetches all available badges (v1 compat).
   */
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('badges')
      .select(
        'id, name, description, icon, xp_reward, condition_type, condition_threshold, tenant_id, created_at'
      )
      .order('name')
      .limit(100)

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching badges:', error)
      throw error
    }

    return data
  },

  // ============================================================
  // SP-20: Achievement System
  // ============================================================

  /** Get all badge definitions with earned status for a student */
  async getStudentBadges(userId: string): Promise<BadgeDefinition[]> {
    const { data, error } = await supabase.rpc('get_student_badges', {
      p_user_id: userId,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }
    return (data ?? []) as BadgeDefinition[]
  },

  /** Get student certificates */
  async getStudentCertificates(userId: string): Promise<Certificate[]> {
    const { data, error } = await supabase.rpc('get_student_certificates', {
      p_user_id: userId,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }
    return (data ?? []) as Certificate[]
  },

  /** Teacher issues a certificate */
  async issueCertificate(userId: string, courseId: string) {
    const { data, error } = await supabase.rpc('issue_certificate', {
      p_user_id: userId,
      p_course_id: courseId,
    })
    if (error) throw error
    return (data as unknown as unknown[])?.[0] ?? data
  },

  /** Create/update a badge definition (teacher) */
  async saveBadgeDefinition(badge: {
    id?: string
    name: string
    description: string
    icon_emoji: string
    badge_type: string
    criteria: Record<string, unknown>
    xp_reward: number
    rarity: string
    is_active: boolean
    tenant_id: string
  }) {
    if (badge.id) {
      const { data, error } = await supabase
        .from('badge_definitions')
        .update({
          name: badge.name,
          description: badge.description,
          icon_emoji: badge.icon_emoji,
          badge_type: badge.badge_type,
          criteria: badge.criteria,
          xp_reward: badge.xp_reward,
          rarity: badge.rarity,
          is_active: badge.is_active,
        })
        .eq('id', badge.id)
        .select(
          'id, tenant_id, name, description, icon_emoji, badge_type, criteria, xp_reward, rarity, is_active, created_at'
        )
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('badge_definitions')
        .insert({
          tenant_id: badge.tenant_id,
          name: badge.name,
          description: badge.description,
          icon_emoji: badge.icon_emoji,
          badge_type: badge.badge_type,
          criteria: badge.criteria,
          xp_reward: badge.xp_reward,
          rarity: badge.rarity,
          is_active: badge.is_active,
        })
        .select(
          'id, tenant_id, name, description, icon_emoji, badge_type, criteria, xp_reward, rarity, is_active, created_at'
        )
        .single()
      if (error) throw error
      return data
    }
  },

  /** Get all badge definitions for teacher management */
  async getBadgeDefinitions(tenantId: string) {
    const { data, error } = await supabase
      .from('badge_definitions')
      .select(
        'id, tenant_id, name, description, icon_emoji, badge_type, criteria, xp_reward, rarity, is_active, created_at'
      )
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  // ============================================================
  // SP-21: XP & Leaderboard v2
  // ============================================================

  /** Get student XP profile */
  async getStudentXPProfile(userId: string): Promise<StudentXPProfile | null> {
    const { data, error } = await supabase.rpc('get_student_xp_profile', {
      p_user_id: userId,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return null
      throw error
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    return {
      ...row,
      recent_xp: (() => {
        try {
          return typeof row.recent_xp === 'string'
            ? JSON.parse(row.recent_xp)
            : (row.recent_xp ?? [])
        } catch {
          return []
        }
      })(),
    } as StudentXPProfile
  },

  /** Get leaderboard v2 */
  async getLeaderboardV2(params: {
    courseId?: string
    sortBy?: LeaderboardSortBy
    period?: LeaderboardPeriod
    limit?: number
  }): Promise<LeaderboardV2Entry[]> {
    const { data, error } = await supabase.rpc('get_leaderboard_v2', {
      p_course_id: params.courseId ?? null,
      p_sort_by: params.sortBy ?? 'xp',
      p_period: params.period ?? 'all_time',
      p_limit: params.limit ?? 50,
    })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw error
    }
    return (data ?? []) as LeaderboardV2Entry[]
  },
}
