import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import { createQueryKeys } from '@/src/lib/queryKeys';
import { moderationService, Report, ReportReason, ContentType } from '@/src/features/moderation/api/moderationService';

const base = createQueryKeys('moderation');
export const moderationKeys = {
  ...base,
  reports: (tenantId: string) => [...base.all(tenantId), 'reports'] as const,
};

/**
 * Hook to fetch all moderation reports
 */
export function useModerationReports() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: moderationKeys.reports(tenantId!),
    queryFn: () => moderationService.fetchReports(),
    enabled: !!tenantId,
  });
}

/**
 * Hook to get pending reports only (derived from all reports)
 */
export function usePendingReports() {
  const { data: reports = [], ...rest } = useModerationReports();
  return {
    ...rest,
    data: reports.filter(r => r.status === 'pending'),
  };
}

/**
 * Submit report input type
 */
export interface SubmitReportInput {
  contentId: string;
  contentType: ContentType;
  reason: ReportReason;
  description: string;
  contentSnippet?: string;
  contentAuthor?: string;
}

/**
 * Hook to submit a new report
 * Includes toast notifications for success/failure
 */
export function useSubmitReport() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: SubmitReportInput) => {
      if (!user) throw new Error('Not authenticated');
      return moderationService.submitReport(reportData, user.id, 'Anda');
    },
    onSuccess: () => {
      if (!tenantId) return;
      queryClient.invalidateQueries({ queryKey: moderationKeys.reports(tenantId) });
    },
  });
}

/**
 * Resolve report input type
 */
export interface ResolveReportInput {
  reportId: string;
  status: 'approved' | 'rejected';
}

/**
 * Hook to resolve a report (approve or reject)
 * Includes toast notifications for success
 */
export function useResolveReport() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, status }: ResolveReportInput) =>
      moderationService.resolveReport(reportId, status),
    onSuccess: () => {
      if (!tenantId) return;
      queryClient.invalidateQueries({ queryKey: moderationKeys.reports(tenantId) });
    },
  });
}

// Re-export types from moderationService for convenience
export type { Report, ReportStatus, ReportReason, ContentType } from '@/src/features/moderation/api/moderationService';
