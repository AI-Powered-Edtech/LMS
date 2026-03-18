/**
 * Gamification Feature Module
 * 
 * This is the public API for the gamification feature.
 * Re-exports types, services, and query hooks.
 */

// Types
export type {
    UserStreak,
    Badge,
    UserBadge,
    LeaderboardEntry
} from './types';

export {
    MOCK_STREAK,
    MOCK_BADGES
} from './types';

// API Services
export { gamificationService } from './api/gamificationService';
export { leaderboardService } from './api/leaderboardService';

// Query Hooks
export {
    useUserStreak,
    useUserBadges,
    useAllBadges,
    gamificationKeys
} from './queries/gamificationQueries';

export {
    useLeaderboard,
    useWeeklyLeaderboard,
    leaderboardKeys
} from './queries/leaderboardQueries';
