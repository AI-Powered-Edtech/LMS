import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { moderationService } from '../api/moderationService'

/**
 * Hook untuk mengambil daftar Moderasi.
 */
export function useModerationData() {
  return useQuery({
    queryKey: ['moderation'],
    queryFn: () => moderationService.fetchReports(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Moderasi.
 */
export function useModerationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { reportId: string; status: 'approved' | 'rejected' }) =>
      moderationService.resolveReport(params.reportId, params.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
  })
}
