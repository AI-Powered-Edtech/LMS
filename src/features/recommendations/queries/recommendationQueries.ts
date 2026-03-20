import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationService } from '../api/recommendationService';

export const RECOMMENDATION_KEYS = {
  user: (userId: string) => ['recommendations', userId] as const,
};

export function useRecommendations(userId: string, limit = 5) {
  return useQuery({
    queryKey: RECOMMENDATION_KEYS.user(userId),
    queryFn: () => recommendationService.getRecommendations(userId, limit),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordRecommendationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accepted' | 'dismissed' }) =>
      recommendationService.recordAction(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
