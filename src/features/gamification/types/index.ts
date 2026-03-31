/**
 * Gamification types for EduSync LMS
 *
 * These types are shared across the gamification feature module,
 * including streak tracking, badges, leaderboards, XP, and achievements.
 */

/**
 * Represents a user's learning streak data
 */
export interface UserStreak {
  user_id: string
  tenant_id: string
  current_streak: number
  longest_streak: number
  last_activity_date: string
  updated_at: string
}

/**
 * Represents a badge/achievement that can be earned (v1 compat)
 */
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  created_at: string
}

/**
 * Represents a badge that has been awarded to a user (v1 compat)
 */
export interface UserBadge {
  badge_id: string
  badge: Badge
  earned_at: string
}

/**
 * Represents a single entry on the leaderboard
 */
export interface LeaderboardEntry {
  rank: number
  score: number
  user_id: string
  profiles?: {
    full_name: string
    avatar_url: string | null
    level: number
  } | null
}

// ============================================================
// SP-20: Achievement System types
// ============================================================

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeType = 'completion' | 'streak' | 'mastery' | 'speed' | 'social'

/** Badge definition from get_student_badges RPC */
export interface BadgeDefinition {
  badge_id: string
  name: string
  description: string
  icon_emoji: string
  badge_type: BadgeType
  xp_reward: number
  rarity: BadgeRarity
  criteria: Record<string, unknown>
  is_earned: boolean
  earned_at: string | null
}

/** Certificate from get_student_certificates RPC */
export interface Certificate {
  id: string
  course_id: string
  course_title: string
  certificate_number: string
  issued_at: string
  template_config: Record<string, unknown>
}

// ============================================================
// SP-21: Streaks, XP & Leaderboard v2 types
// ============================================================

export type XPSourceType =
  | 'lesson_complete'
  | 'quiz_score'
  | 'streak_bonus'
  | 'badge_earned'
  | 'assignment_submit'

export interface XPTransaction {
  xp_amount: number
  source_type: XPSourceType
  source_id: string | null
  created_at: string
}

/** Student XP profile from get_student_xp_profile RPC */
export interface StudentXPProfile {
  total_xp: number
  level: number
  xp_current_level: number
  xp_next_level: number
  streak_current: number
  streak_longest: number
  last_active: string | null
  recent_xp: XPTransaction[]
}

/** Leaderboard v2 entry from get_leaderboard_v2 RPC */
export interface LeaderboardV2Entry {
  rank: number
  user_id: string
  student_name: string
  avatar_url: string | null
  value: number
  level: number
  streak: number
}

export type LeaderboardSortBy = 'xp' | 'streak'
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time'

/** Rarity display config */
export const RARITY_CONFIG: Record<BadgeRarity, { border: string; bg: string; label: string }> = {
  common: {
    border: 'border-slate-300 dark:border-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-800',
    label: 'Umum',
  },
  rare: {
    border: 'border-blue-400 dark:border-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    label: 'Langka',
  },
  epic: {
    border: 'border-purple-400 dark:border-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    label: 'Epik',
  },
  legendary: {
    border: 'border-yellow-400 dark:border-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    label: 'Legendaris',
  },
}
