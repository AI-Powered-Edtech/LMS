import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../api/dashboardService';

export const DASHBOARD_KEYS = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboards', id] as const,
};

export function useDashboards() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.all,
    queryFn: () => dashboardService.getDashboards(),
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.detail(id),
    queryFn: () => dashboardService.getDashboard(id),
    enabled: !!id,
  });
}

export function useSaveDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboardService.saveDashboard,
    onSuccess: () => qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboardService.deleteDashboard,
    onSuccess: () => qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all }),
  });
}
