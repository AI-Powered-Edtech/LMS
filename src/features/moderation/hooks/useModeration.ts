import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { moderationService } from '../api/moderationService'

/**
 * Hook untuk mengambil daftar Moderasi.
 */
export function useModerationData() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: ['moderation', tenantId],
    queryFn: () => moderationService.fetchReports(tenantId!),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Moderasi.
 */
export function useModerationMutation() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { reportId: string; status: 'approved' | 'rejected' }) =>
      moderationService.resolveReport(params.reportId, params.status, tenantId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
  })
}
