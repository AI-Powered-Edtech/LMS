/**
 * Gamification Query Hooks
 *
 * React Query hooks for gamification data fetching.
 * Each hook owns tenantId from useAuth context.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createQueryKeys } from '@/src/lib/queryKeys'
import { useAuth } from '@/src/contexts/AuthContext'
import { gamificationService } from '../api/gamificationService'
import { cachedQuery, CacheKeys } from '@/src/utils/cache'
import type { LeaderboardSortBy, LeaderboardPeriod } from '../types'

// Create query keys with tenant scoping
const base = createQueryKeys('gamification')
const gamificationKeys = {
  ...base,
  streak: (tenantId: string, userId: string) => [...base.all(tenantId), 'streak', userId] as const,
  badges: (tenantId: string, userId: string) => [...base.all(tenantId), 'badges', userId] as const,
  allBadges: (tenantId: string) => [...base.all(tenantId), 'allBadges'] as const,
  // SP-20
  studentBadges: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'studentBadges', userId] as const,
  certificates: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'certificates', userId] as const,
  badgeDefinitions: (tenantId: string) => [...base.all(tenantId), 'badgeDefinitions'] as const,
  // SP-21
  xpProfile: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'xpProfile', userId] as const,
  leaderboardV2: (tenantId: string, sortBy: string, period: string, courseId?: string) =>
    [...base.all(tenantId), 'leaderboardV2', sortBy, period, courseId ?? 'all'] as const,
}

// ---- SP-20: Achievement hooks ----

/** All badge definitions with earned status for current user */
export function useStudentBadges() {
  const { user, tenantId } = useAuth()
  return useQuery({
    queryKey: gamificationKeys.studentBadges(tenantId!, user!.id),
    queryFn: () =>
      cachedQuery(
        CacheKeys.badges(user!.id),
        () => gamificationService.getStudentBadges(user!.id),
        10
      ),
    enabled: !!tenantId && !!user,
    staleTime: 10 * 60 * 1000,
  })
}

/** Student certificates */
export function useStudentCertificates(userId?: string) {
  const { user, tenantId } = useAuth()
  const targetId = userId ?? user?.id
  return useQuery({
    queryKey: gamificationKeys.certificates(tenantId!, targetId!),
    queryFn: () => gamificationService.getStudentCertificates(targetId!),
    enabled: !!tenantId && !!targetId,
    staleTime: 60_000,
  })
}

/** Badge definitions for teacher management */
export function useBadgeDefinitions() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: gamificationKeys.badgeDefinitions(tenantId!),
    queryFn: () => gamificationService.getBadgeDefinitions(tenantId!),
    enabled: !!tenantId,
  })
}

/** Save (create/update) a badge definition */
export function useSaveBadgeDefinition() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (badge: Parameters<typeof gamificationService.saveBadgeDefinition>[0]) =>
      gamificationService.saveBadgeDefinition(badge),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.badgeDefinitions(tenantId!) })
    },
  })
}

// ---- SP-21: XP & Leaderboard v2 hooks ----

/** Student XP profile */
export function useStudentXPProfile(userId?: string) {
  const { user, tenantId } = useAuth()
  const targetId = userId ?? user?.id
  return useQuery({
    queryKey: gamificationKeys.xpProfile(tenantId!, targetId!),
    queryFn: () =>
      cachedQuery(
        CacheKeys.xpProfile(targetId!),
        () => gamificationService.getStudentXPProfile(targetId!),
        10
      ),
    enabled: !!tenantId && !!targetId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Leaderboard v2 with sort/period/course filtering */
export function useLeaderboardV2(params?: {
  sortBy?: LeaderboardSortBy
  period?: LeaderboardPeriod
  courseId?: string
}) {
  const { tenantId } = useAuth()
  const sortBy = params?.sortBy ?? 'xp'
  const period = params?.period ?? 'all_time'
  return useQuery({
    queryKey: gamificationKeys.leaderboardV2(tenantId!, sortBy, period, params?.courseId),
    queryFn: () =>
      cachedQuery(
        CacheKeys.leaderboard(params?.courseId ?? 'global', period),
        () =>
          gamificationService.getLeaderboardV2({
            courseId: params?.courseId,
            sortBy,
            period,
          }),
        5
      ),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  })
}

// Re-export query keys for external use
export { gamificationKeys }
