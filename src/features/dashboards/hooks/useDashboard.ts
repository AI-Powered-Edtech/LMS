import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { dashboardService } from '../api/dashboardService'

/**
 * Hook untuk mengambil daftar Dashboard.
 */
function useDashboardData() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardService.getDashboards(),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Dashboard.
 */
function useDashboardMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dashboardService.saveDashboard.bind(dashboardService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  })
}
