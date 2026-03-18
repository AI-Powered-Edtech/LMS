/**
 * Gamification Query Hooks
 * 
 * React Query hooks for gamification data fetching.
 * Each hook owns tenantId from useAuth context.
 */

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/src/lib/queryKeys';
import { useAuth } from '@/src/contexts/AuthContext';
import { gamificationService } from '../api/gamificationService';

// Create query keys with tenant scoping
const base = createQueryKeys('gamification');
const gamificationKeys = {
    ...base,
    streak: (tenantId: string, userId: string) =>
        [...base.all(tenantId), 'streak', userId] as const,
    badges: (tenantId: string, userId: string) =>
        [...base.all(tenantId), 'badges', userId] as const,
    allBadges: (tenantId: string) =>
        [...base.all(tenantId), 'allBadges'] as const,
};

/**
 * Hook to fetch the current user's streak data.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 */
export function useUserStreak() {
    const { user, tenantId } = useAuth();
    
    return useQuery({
        queryKey: gamificationKeys.streak(tenantId!, user!.id),
        queryFn: () => gamificationService.getUserStreak(user!.id, tenantId!),
        enabled: !!tenantId && !!user,
    });
}

/**
 * Hook to fetch the current user's earned badges.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 */
export function useUserBadges() {
    const { user, tenantId } = useAuth();
    
    return useQuery({
        queryKey: gamificationKeys.badges(tenantId!, user!.id),
        queryFn: () => gamificationService.getUserBadges(user!.id, tenantId!),
        enabled: !!tenantId && !!user,
    });
}

/**
 * Hook to fetch all available badges (global data).
 * Cache is still tenant-scoped for consistency.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 */
export function useAllBadges() {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: gamificationKeys.allBadges(tenantId!),
        queryFn: () => gamificationService.getAllBadges(),
        enabled: !!tenantId,
    });
}

// Re-export query keys for external use
export { gamificationKeys };
