import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { STALE } from '@/utils/queryConstants'

import { generateSemesterReportCard } from '../api/semesterService'
import type { ReportCardData } from '../types'
import { semesterKeys } from './useSemesters'

export function useSemesterReportCard(semesterId: string, studentId: string) {
  const { tenantId } = useAuth()

  return useQuery<ReportCardData>({
    queryKey: semesterKeys.reportCard(semesterId, studentId),
    queryFn: () => generateSemesterReportCard(semesterId, studentId, tenantId!),
    enabled: !!semesterId && !!studentId && !!tenantId,
    staleTime: STALE.DYNAMIC,
  })
}
