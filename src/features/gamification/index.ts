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
    LeaderboardEntry,
    BadgeDefinition,
    BadgeRarity,
    BadgeType,
    Certificate,
    XPSourceType,
    XPTransaction,
    StudentXPProfile,
    LeaderboardV2Entry,
    LeaderboardSortBy,
    LeaderboardPeriod,
} from './types';

export {
    MOCK_STREAK,
    MOCK_BADGES,
    RARITY_CONFIG,
    LEVEL_THRESHOLDS,
} from './types';

// API Services
export { gamificationService } from './api/gamificationService';
export { leaderboardService } from './api/leaderboardService';

// Query Hooks
export {
    useUserStreak,
    useUserBadges,
    useAllBadges,
    useStudentBadges,
    useStudentCertificates,
    useBadgeDefinitions,
    useSaveBadgeDefinition,
    useIssueCertificate,
    useStudentXPProfile,
    useLeaderboardV2,
    gamificationKeys,
} from './queries/gamificationQueries';

export {
    useLeaderboard,
    useWeeklyLeaderboard,
    leaderboardKeys,
} from './queries/leaderboardQueries';

// Components
export { BadgeManager } from './components/BadgeManager';
export { BadgeShowcase } from './components/BadgeShowcase';
export { BadgeUnlockToast } from './components/BadgeUnlockToast';
export { CertificateViewer } from './components/CertificateViewer';
export { LeaderboardV2 } from './components/LeaderboardV2';
export { LevelBadge } from './components/LevelBadge';
export { LevelUpToast } from './components/LevelUpToast';
export { StreakCounter } from './components/StreakCounter';
export { XPProgressBar } from './components/XPProgressBar';
