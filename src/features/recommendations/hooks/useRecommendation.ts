import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { recommendationService } from '../api/recommendationService'

/**
 * Hook untuk mengambil daftar Rekomendasi.
 */
function useRecommendationData(userId: string) {
  return useQuery({
    queryKey: ['recommendations', userId],
    queryFn: () => recommendationService.getRecommendations(userId),
    enabled: !!userId,
  })
}

/**
 * Hook untuk membuat/mengupdate Rekomendasi.
 */
function useRecommendationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { recommendationId: string; action: 'dismissed' | 'accepted' }) =>
      recommendationService.recordAction(params.recommendationId, params.action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  })
}
