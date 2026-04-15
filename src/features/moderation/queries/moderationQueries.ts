import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import {
  ContentType,
  moderationService,
  ReportReason,
} from '@/features/moderation/api/moderationService'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { captureError } from '@/utils/sentry'

const base = createQueryKeys('moderation')
const moderationKeys = {
  ...base,
  reports: (tenantId: string) => [...base.all(tenantId), 'reports'] as const,
}

/**
 * Hook to fetch all moderation reports
 */
export function useModerationReports() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: moderationKeys.reports(tenantId!),
    queryFn: () => moderationService.fetchReports(tenantId!),
    enabled: !!tenantId,
  })
}

/**
 * Submit report input type
 */
interface SubmitReportInput {
  contentId: string
  contentType: ContentType
  reason: ReportReason
  description: string
  contentSnippet?: string
  contentAuthor?: string
}

/**
 * Hook to submit a new report
 * Includes toast notifications for success/failure
 */
export function useSubmitReport() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportData: SubmitReportInput) => {
      if (!user) throw new Error('Not authenticated')
      return moderationService.submitReport(reportData, user.id, 'Anda')
    },
    onSuccess: () => {
      if (!tenantId) return
      void queryClient.invalidateQueries({ queryKey: moderationKeys.reports(tenantId) })
    },
    onError: (err) => {
      captureError(err, { context: 'useSubmitReport' })
    },
  })
}

/**
 * Resolve report input type
 */
interface ResolveReportInput {
  reportId: string
  status: 'approved' | 'rejected'
}

/**
 * Hook to resolve a report (approve or reject)
 * Includes toast notifications for success
 */
export function useResolveReport() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, status }: ResolveReportInput) =>
      moderationService.resolveReport(reportId, status, tenantId!),
    onSuccess: () => {
      if (!tenantId) return
      void queryClient.invalidateQueries({ queryKey: moderationKeys.reports(tenantId) })
    },
    onError: (err) => {
      captureError(err, { context: 'useResolveReport' })
    },
  })
}

// Re-export types from moderationService for convenience
export type { ContentType, ReportReason } from '@/features/moderation/api/moderationService'
