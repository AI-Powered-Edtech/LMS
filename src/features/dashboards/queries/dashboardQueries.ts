import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { captureError } from '@/src/utils/sentry'

import { dashboardService } from '../api/dashboardService'

const DASHBOARD_KEYS = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboards', id] as const,
}

export function useDashboards() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.all,
    queryFn: () => dashboardService.getDashboards(),
  })
}

export function useSaveDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dashboardService.saveDashboard,
    onSuccess: () => qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all }),
    onError: (err) => {
      captureError(err, { context: 'useSaveDashboard' })
    },
  })
}

export function useDeleteDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dashboardService.deleteDashboard,
    onSuccess: () => qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all }),
    onError: (err) => {
      captureError(err, { context: 'useDeleteDashboard' })
    },
  })
}
