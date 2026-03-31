/**
 * Gamification Feature Module
 *
 * This is the public API for the gamification feature.
 * Re-exports types, services, and query hooks.
 */

// Types
export type { Certificate, LeaderboardEntry, XPEventType } from './types'
export { XP_AMOUNTS, XP_DAILY_CAPS } from './types'

// Query Hooks
export { useStudentCertificates } from './queries/gamificationQueries'
export { useLeaderboard } from './queries/leaderboardQueries'

// Sesi 1: XP Award Hook
export { useAwardXP } from './hooks/useGamification'
