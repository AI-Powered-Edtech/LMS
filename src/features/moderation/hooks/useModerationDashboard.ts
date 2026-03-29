import { useState } from 'react'

import type { ReportStatus } from '../api/moderationService'
import { useModerationReports, useResolveReport } from '../queries/moderationQueries'

/**
 * Custom hook yang menggabungkan query laporan + mutation resolve
 * beserta state filter aktif untuk ModerationDashboard.
 */
export function useModerationDashboard() {
  const { data: reports, isLoading, error, refetch } = useModerationReports()
  const resolveReport = useResolveReport()

  const [activeFilter, setActiveFilter] = useState<ReportStatus | 'all'>('all')

  const filtered =
    reports?.filter((r) => (activeFilter === 'all' ? true : r.status === activeFilter)) ?? []

  return {
    reports: filtered,
    allReports: reports,
    isLoading,
    error,
    refetch,
    activeFilter,
    setActiveFilter,
    resolveReport,
  }
}
