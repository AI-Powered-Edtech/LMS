import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { struggleService } from '../api/struggleService'

/**
 * Hook untuk mengambil daftar Deteksi Kesulitan.
 */
export function useStruggleData(tenantId: string) {
  return useQuery({
    queryKey: ['struggle', tenantId],
    queryFn: () => struggleService.getStruggleAlerts(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Deteksi Kesulitan.
 */
export function useStruggleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      tenantId: string
      updates: Parameters<typeof struggleService.updateStruggleConfig>[1]
    }) => struggleService.updateStruggleConfig(params.tenantId, params.updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['struggle'] }),
  })
}
