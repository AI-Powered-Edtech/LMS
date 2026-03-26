import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportService } from '../api/reportService'

/**
 * Hook untuk mengambil daftar Laporan.
 */
export function useReportData() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => reportService.getReports(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Laporan.
 */
export function useReportMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reportService.saveReport.bind(reportService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}
