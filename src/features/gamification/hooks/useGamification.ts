import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamificationService } from '../api/gamificationService'

/**
 * Hook untuk mengambil daftar Gamifikasi.
 */
export function useGamificationData(userId: string, tenantId: string) {
  return useQuery({
    queryKey: ['gamification', userId, tenantId],
    queryFn: () => gamificationService.getUserBadges(userId, tenantId),
    enabled: !!userId && !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Gamifikasi.
 */
export function useGamificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; tenantId: string }) =>
      gamificationService.getUserStreak(params.userId, params.tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gamification'] }),
  })
}
