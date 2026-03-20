import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import { createQueryKeys } from '@/src/lib/queryKeys';
import { struggleService } from '../api/struggleService';
import type { StruggleConfig } from '../types';

// ----------------------------------------------------------------
// Query key factory
// ----------------------------------------------------------------
const base = createQueryKeys('struggle');

export const struggleKeys = {
  ...base,
  config: (tenantId: string) => [...base.all(tenantId), 'config'] as const,
  alerts: (tenantId: string, opts?: object) =>
    [...base.all(tenantId), 'alerts', opts ?? {}] as const,
  lessonStatus: (tenantId: string, lessonId: string) =>
    [...base.all(tenantId), 'lessonStatus', lessonId] as const,
};

// ----------------------------------------------------------------
// useStruggleConfig
// ----------------------------------------------------------------
export function useStruggleConfig() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: struggleKeys.config(tenantId!),
    queryFn: () => struggleService.getStruggleConfig(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ----------------------------------------------------------------
// useUpdateStruggleConfig
// ----------------------------------------------------------------
export function useUpdateStruggleConfig() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<StruggleConfig>) =>
      struggleService.updateStruggleConfig(tenantId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: struggleKeys.config(tenantId!),
      });
    },
  });
}

// ----------------------------------------------------------------
// useStruggleAlerts
// ----------------------------------------------------------------
export function useStruggleAlerts(options?: {
  unreadOnly?: boolean;
  courseId?: string;
  limit?: number;
}) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: struggleKeys.alerts(tenantId!, options),
    queryFn: () => struggleService.getStruggleAlerts(tenantId!, options),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // poll every 30s for fresh alerts
  });
}

// ----------------------------------------------------------------
// useUnreadAlertCount — derived from alerts with unreadOnly: true
// ----------------------------------------------------------------
export function useUnreadAlertCount(): number {
  const { data } = useStruggleAlerts({ unreadOnly: true });
  return data?.length ?? 0;
}

// ----------------------------------------------------------------
// useMarkAlertsRead
// ----------------------------------------------------------------
export function useMarkAlertsRead() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertIds: string[]) =>
      struggleService.markAlertsRead(tenantId!, alertIds),
    onSuccess: () => {
      // Invalidate all alert queries so both unread-only and full lists refresh
      queryClient.invalidateQueries({
        queryKey: base.all(tenantId!),
      });
    },
  });
}

// ----------------------------------------------------------------
// useMyLessonStatus
// ----------------------------------------------------------------
export function useMyLessonStatus(lessonId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: struggleKeys.lessonStatus(tenantId!, lessonId ?? ''),
    queryFn: () => struggleService.getMyLessonStatus(tenantId!, lessonId!),
    enabled: !!tenantId && !!lessonId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
