// ==========================================================================
// Parent Queries — useChildMonthlyReport
// React Query hook untuk laporan bulanan anak
// ==========================================================================

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import { getAvailableReportMonths, getMonthlyReport } from '../api/reportApi'
import type { AvailableReportMonth, ParentMonthlyReport } from '../types'

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys('parent-report')

export const childReportKeys = {
  monthly: (tenantId: string, studentId: string, year: number, month: number) =>
    [...base.all(tenantId), 'monthly', studentId, year, month] as const,
  availableMonths: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), 'available-months', studentId] as const,
}

// ── Hooks ───────────────────────────────────────────────────────

/**
 * Mendapatkan laporan bulanan untuk anak tertentu.
 */
export function useChildMonthlyReport(studentId: string, year: number, month: number) {
  const { tenantId } = useAuth()

  return useQuery<ParentMonthlyReport>({
    queryKey: childReportKeys.monthly(tenantId ?? '', studentId, year, month),
    queryFn: () => getMonthlyReport(studentId, month, year, tenantId!),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    retry: 1,
    refetchInterval: false,
  })
}

/**
 * Mendapatkan bulan-bulan yang tersedia untuk laporan anak tertentu.
 */
export function useAvailableReportMonths(studentId: string) {
  const { tenantId } = useAuth()

  return useQuery<AvailableReportMonth[]>({
    queryKey: childReportKeys.availableMonths(tenantId ?? '', studentId),
    queryFn: () => getAvailableReportMonths(studentId, tenantId!),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })
}
