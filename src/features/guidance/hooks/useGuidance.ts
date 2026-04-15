import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { guidanceService } from '../api/guidanceService'

/**
 * Hook untuk mengambil daftar Panduan.
 */
function useGuidanceData() {
  return useQuery({
    queryKey: ['guidance'],
    queryFn: () => guidanceService.listGuides(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Panduan.
 */
function useGuidanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: guidanceService.upsertGuide.bind(guidanceService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guidance'] }),
  })
}
