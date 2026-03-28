import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GC, STALE } from '@/src/utils/queryConstants'

import { reportService } from '../api/reportService'

const REPORT_KEYS = {
  all: ['scheduled_reports'] as const,
}

export function useReports() {
  return useQuery({
    queryKey: REPORT_KEYS.all,
    queryFn: () => reportService.getReports(),
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  })
}

export function useSaveReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reportService.saveReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORT_KEYS.all }),
  })
}

export function useDeleteReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reportService.deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORT_KEYS.all }),
  })
}

export function useGenerateReportData() {
  return useMutation({
    mutationFn: reportService.generateReportData,
  })
}
