import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guidanceService } from '../api/guidanceService'

/**
 * Hook untuk mengambil daftar Panduan.
 */
export function useGuidanceData() {
  return useQuery({
    queryKey: ['guidance'],
    queryFn: () => guidanceService.listGuides(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Panduan.
 */
export function useGuidanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: guidanceService.upsertGuide.bind(guidanceService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guidance'] }),
  })
}
