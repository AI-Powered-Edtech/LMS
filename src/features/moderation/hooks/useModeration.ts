import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { moderationService } from '../api/moderationService'

/**
 * Hook untuk mengambil daftar Moderasi.
 */
function useModerationData() {
  return useQuery({
    queryKey: ['moderation'],
    queryFn: () => moderationService.fetchReports(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Moderasi.
 */
function useModerationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { reportId: string; status: 'approved' | 'rejected' }) =>
      moderationService.resolveReport(params.reportId, params.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
  })
}
