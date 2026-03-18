/**
 * Leaderboard Query Hooks
 * 
 * React Query hooks for leaderboard data fetching with real-time subscription.
 * Each hook owns tenantId from useAuth context.
 * Realtime subscription lifecycle is tied to the hook lifecycle.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@/src/lib/queryKeys';
import { useAuth } from '@/src/contexts/AuthContext';
import { leaderboardService } from '../api/leaderboardService';

// Create query keys with tenant scoping
const base = createQueryKeys('leaderboard');
const leaderboardKeys = {
    ...base,
    byClass: (tenantId: string, classId: string) =>
        [...base.all(tenantId), 'class', classId] as const,
    weekly: (tenantId: string, classId: string) =>
        [...base.all(tenantId), 'weekly', classId] as const,
};

/**
 * Hook to fetch leaderboard data for a specific class.
 * Includes real-time subscription that invalidates the query on updates.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 * 
 * @param classId - Optional class ID. If not provided, query is disabled.
 */
export function useLeaderboard(classId?: string | null) {
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: leaderboardKeys.byClass(tenantId!, classId!),
        queryFn: () => leaderboardService.getLeaderboard(classId!, tenantId!),
        enabled: !!tenantId && !!classId,
    });

    // Realtime subscription — lifecycle tied to hook
    useEffect(() => {
        if (!tenantId || !classId) return;

        const unsubscribe = leaderboardService.subscribeToLeaderboard(
            classId,
            tenantId,
            () => {
                queryClient.invalidateQueries({
                    queryKey: leaderboardKeys.byClass(tenantId, classId),
                });
            }
        );

        return unsubscribe;
    }, [tenantId, classId, queryClient]);

    return query;
}

/**
 * Hook to fetch weekly leaderboard data for a specific class.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 * 
 * @param classId - Optional class ID. If not provided, query is disabled.
 */
export function useWeeklyLeaderboard(classId?: string | null) {
    const { tenantId } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: leaderboardKeys.weekly(tenantId!, classId!),
        queryFn: () => leaderboardService.getWeeklyLeaderboard(classId!, tenantId!),
        enabled: !!tenantId && !!classId,
    });

    // Realtime subscription for weekly leaderboard
    useEffect(() => {
        if (!tenantId || !classId) return;

        const unsubscribe = leaderboardService.subscribeToLeaderboard(
            classId,
            tenantId,
            () => {
                queryClient.invalidateQueries({
                    queryKey: leaderboardKeys.weekly(tenantId, classId),
                });
            }
        );

        return unsubscribe;
    }, [tenantId, classId, queryClient]);

    return query;
}

// Re-export query keys for external use
export { leaderboardKeys };
