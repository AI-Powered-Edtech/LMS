/**
 * Gamification types for EduSync LMS
 * 
 * These types are shared across the gamification feature module,
 * including streak tracking, badges, and leaderboards.
 */

/**
 * Represents a user's learning streak data
 */
export interface UserStreak {
    user_id: string;
    tenant_id: string;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string;
    updated_at: string;
}

/**
 * Represents a badge/achievement that can be earned
 */
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    created_at: string;
}

/**
 * Represents a badge that has been awarded to a user
 */
export interface UserBadge {
    badge_id: string;
    badge: Badge;
    created_at: string;
}

/**
 * Represents a single entry on the leaderboard
 */
export interface LeaderboardEntry {
    rank: number;
    score: number;
    user_id: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
        level: number;
    } | null;
}

/**
 * Mock streak data for development/fallback
 */
export const MOCK_STREAK: UserStreak = {
    user_id: 'demo-user',
    tenant_id: 'demo-tenant',
    current_streak: 5,
    longest_streak: 12,
    last_activity_date: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

/**
 * Mock badges data for development/fallback
 */
export const MOCK_BADGES: UserBadge[] = [
    {
        badge_id: 'b1',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        badge: { id: 'b1', name: 'First Quiz', description: 'Menyelesaikan kuis pertama Anda', icon: '📝', created_at: '' }
    },
    {
        badge_id: 'b2',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        badge: { id: 'b2', name: 'Perfect Score', description: 'Mendapat nilai 100 di kuis', icon: '💯', created_at: '' }
    },
    {
        badge_id: 'b3',
        created_at: new Date().toISOString(),
        badge: { id: 'b3', name: 'LMS Voyager', description: 'Menjelajahi semua modul pembelajaran', icon: '🚀', created_at: '' }
    }
];
