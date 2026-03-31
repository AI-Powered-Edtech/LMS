/**
 * Leaderboard Query Hooks
 *
 * React Query hooks for leaderboard data fetching with real-time subscription.
 * Each hook owns tenantId from useAuth context.
 * Realtime subscription lifecycle is tied to the hook lifecycle.
 */

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'

import { leaderboardService } from '../api/leaderboardService'

// Create query keys with tenant scoping
const base = createQueryKeys('leaderboard')
const leaderboardKeys = {
  ...base,
  byClass: (tenantId: string, classId: string) =>
    [...base.all(tenantId), 'class', classId] as const,
  weekly: (tenantId: string, classId: string) =>
    [...base.all(tenantId), 'weekly', classId] as const,
}

/**
 * Hook to fetch leaderboard data for a specific class.
 * Includes real-time subscription that invalidates the query on updates.
 * Hook owns tenantId from useAuth - NOT passed as parameter.
 *
 * @param classId - Optional class ID. If not provided, query is disabled.
 */
export function useLeaderboard(classId?: string | null) {
  const { tenantId } = useAuth()

  const query = useQuery({
    queryKey: leaderboardKeys.byClass(tenantId!, classId!),
    queryFn: () => leaderboardService.getLeaderboard(classId!, tenantId!),
    enabled: !!tenantId && !!classId,
    refetchInterval: 60000, // Poll every 60s instead of holding a WebSocket connection
  })

  return query
}

// leaderboardKeys used internally
