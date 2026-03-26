import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

<<<<<<< Updated upstream
import { GC, STALE } from '@/src/utils/queryConstants'
=======
import { GC,STALE } from '@/src/utils/queryConstants'
>>>>>>> Stashed changes

import { recommendationService } from '../api/recommendationService'

const RECOMMENDATION_KEYS = {
  user: (userId: string) => ['recommendations', userId] as const,
}

export function useRecommendations(userId: string, limit = 5) {
  return useQuery({
    queryKey: RECOMMENDATION_KEYS.user(userId),
    queryFn: () => recommendationService.getRecommendations(userId, limit),
    enabled: !!userId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  })
}

export function useRecordRecommendationAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accepted' | 'dismissed' }) =>
      recommendationService.recordAction(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}
