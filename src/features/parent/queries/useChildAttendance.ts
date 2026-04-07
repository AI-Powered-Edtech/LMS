// ==========================================================================
// Parent Queries — useChildAttendance
// React Query hook untuk data kehadiran bulanan anak
// ==========================================================================

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import { getMonthlyAttendance } from '../api/parentApi'
import type { AttendanceDay } from '../types'

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys('parent-attendance')

export const childAttendanceKeys = {
  monthly: (tenantId: string, studentId: string, year: number, month: number) =>
    [...base.all(tenantId), 'monthly', studentId, year, month] as const,
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Mendapatkan data kehadiran bulanan untuk anak tertentu.
 */
export function useChildAttendance(studentId: string, year: number, month: number) {
  const { tenantId } = useAuth()

  return useQuery<AttendanceDay[]>({
    queryKey: childAttendanceKeys.monthly(tenantId ?? '', studentId, year, month),
    queryFn: () => getMonthlyAttendance(studentId, year, month),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: false,
  })
}
