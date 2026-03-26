/**
 * Gamification Feature Module
 *
 * This is the public API for the gamification feature.
 * Re-exports types, services, and query hooks.
 */

// Types
export type { LeaderboardEntry, Certificate } from './types'

// Query Hooks
export { useStudentCertificates } from './queries/gamificationQueries'

export { useLeaderboard } from './queries/leaderboardQueries'
