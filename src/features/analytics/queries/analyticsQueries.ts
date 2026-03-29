import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'
import { createQueryKeys } from '@/src/shared/lib/queryKeys'
import { STALE } from '@/src/utils/queryConstants'
import { captureError } from '@/src/utils/sentry'

import { analyticsService } from '../api/analyticsService'
import { AnalyticsError, TeacherAnalyticsData } from '../types'

const base = createQueryKeys('analytics')
const analyticsKeys = {
  ...base,
  teacher: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'teacher', courseId] as const,
  tenantOverview: (tenantId: string) => [...base.all(tenantId), 'overview'] as const,
  activity: (tenantId: string, days: number) => [...base.all(tenantId), 'activity', days] as const,
  engagement: (tenantId: string) => [...base.all(tenantId), 'engagement'] as const,
  // SP-12.3: Dashboard keys
  courseDashboard: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'courseDashboard', courseId] as const,
  lessonDashboard: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'lessonDashboard', courseId] as const,
  studentSignals: (tenantId: string, courseId: string, lessonId?: string) =>
    [...base.all(tenantId), 'studentSignals', courseId, lessonId] as const,
  // SP-14: Funnel keys
  funnelList: (tenantId: string, courseId?: string) =>
    [...base.all(tenantId), 'funnels', courseId] as const,
  funnelResults: (tenantId: string, funnelId: string) =>
    [...base.all(tenantId), 'funnel', funnelId] as const,
  // SP-15: Retention keys
  retentionMatrix: (tenantId: string, courseId: string, weeksBack: number) =>
    [...base.all(tenantId), 'retention', courseId, weeksBack] as const,
  // SP-16: Engagement Scoring keys
  engagementSummary: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'engagementSummary', courseId] as const,
  engagementTrend: (tenantId: string, courseId: string, days: number) =>
    [...base.all(tenantId), 'engagementTrend', courseId, days] as const,
  // SP-17: Learning Path keys
  learningPaths: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'learningPaths', courseId] as const,
  studentPath: (tenantId: string, userId: string, courseId: string) =>
    [...base.all(tenantId), 'studentPath', userId, courseId] as const,
  // SP-19: Prediction keys
  predictions: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'predictions', courseId] as const,
  predictionSummary: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), 'predictionSummary', courseId] as const,
  studentPrediction: (tenantId: string, userId: string, courseId: string) =>
    [...base.all(tenantId), 'prediction', userId, courseId] as const,
}

/**
 * Hook for fetching teacher analytics for a specific course
 */
export function useTeacherAnalytics(courseId?: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: analyticsKeys.teacher(tenantId!, courseId!),
    queryFn: async () => {
      try {
        const result = await analyticsService.getTeacherAnalytics(courseId!, tenantId!)
        return result as TeacherAnalyticsData
      } catch (error) {
        // Re-throw as AnalyticsError for proper error handling in UI
        if (error instanceof AnalyticsError) {
          throw error
        }
        // Wrap unknown errors
        throw new AnalyticsError(
          'Terjadi kesalahan saat memuat analitik. Silakan coba lagi.',
          'UNKNOWN',
          error
        )
      }
    },
    enabled: !!tenantId && !!courseId,
  })
}

/**
 * Hook for fetching tenant-level analytics overview
 */
export function useTenantAnalytics() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: analyticsKeys.tenantOverview(tenantId!),
    queryFn: () => analyticsService.getTenantAnalytics(tenantId!),
    enabled: !!tenantId,
  })
}

/**
 * Hook for refreshing course stats
 */
export function useRefreshCourseStats() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (courseId: string) => {
      try {
        await analyticsService.refreshCourseStats(courseId, tenantId!)
      } catch (error) {
        if (error instanceof AnalyticsError) {
          throw error
        }
        throw new AnalyticsError('Gagal memperbarui data analitik.', 'UNKNOWN', error)
      }
    },
    onSuccess: (_, courseId) => {
      if (tenantId) {
        queryClient.invalidateQueries({
          queryKey: analyticsKeys.teacher(tenantId, courseId),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useRefreshCourseStats' })
    },
  })
}

// SP-12.3: Dashboard hooks

/**
 * Hook for fetching course-level dashboard analytics
 */
export function useCourseDashboard(courseId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.courseDashboard(tenantId!, courseId!),
    queryFn: () => analyticsService.getCourseAnalyticsDashboard(courseId!, tenantId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Hook for fetching per-lesson analytics breakdown
 */
export function useLessonDashboard(courseId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.lessonDashboard(tenantId!, courseId!),
    queryFn: () => analyticsService.getLessonAnalyticsDashboard(courseId!, tenantId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Hook for fetching student struggle signals
 */
export function useStudentSignals(courseId?: string, lessonId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.studentSignals(tenantId!, courseId!, lessonId),
    queryFn: () => analyticsService.getStudentSignalsDashboard(courseId!, tenantId!, lessonId),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

// SP-14: Funnel hooks

export function useFunnelList(courseId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.funnelList(tenantId!, courseId),
    queryFn: () => analyticsService.listFunnelDefinitions(courseId),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

export function useFunnelResults(funnelId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.funnelResults(tenantId!, funnelId!),
    queryFn: () => analyticsService.getFunnelResults(funnelId!),
    enabled: !!tenantId && !!funnelId,
    staleTime: STALE.MODERATE,
  })
}

export function useSaveFunnel() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      name,
      steps,
      courseId,
      funnelId,
    }: {
      name: string
      steps: string[]
      courseId?: string
      funnelId?: string
    }) => analyticsService.saveFunnelDefinition(name, steps, courseId, funnelId),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: base.all(tenantId) })
    },
    onError: (err) => {
      captureError(err, { context: 'useSaveFunnel' })
    },
  })
}

export function useDeleteFunnel() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (funnelId: string) => analyticsService.deleteFunnelDefinition(funnelId),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: base.all(tenantId) })
    },
    onError: (err) => {
      captureError(err, { context: 'useDeleteFunnel' })
    },
  })
}

// SP-15: Retention & Cohort hook

export function useRetentionMatrix(courseId?: string, weeksBack: number = 8) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.retentionMatrix(tenantId!, courseId!, weeksBack),
    queryFn: () => analyticsService.getRetentionMatrix(courseId!, weeksBack),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.STATIC,
  })
}

// SP-16: Engagement Scoring hooks

export function useEngagementSummary(courseId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.engagementSummary(tenantId!, courseId!),
    queryFn: () => analyticsService.getEngagementSummary(courseId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

export function useEngagementTrend(courseId?: string, days: number = 30) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.engagementTrend(tenantId!, courseId!, days),
    queryFn: () => analyticsService.getEngagementTrend(courseId!, days),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

// SP-17: Learning Path hooks

export function useLearningPaths(courseId?: string, minUsers: number = 1) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.learningPaths(tenantId!, courseId!),
    queryFn: () => analyticsService.getLearningPaths(courseId!, minUsers),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.STATIC, // 30 min — computed weekly
  })
}

// SP-19: Prediction hooks

export function useAtRiskStudents(courseId?: string, minRisk: number = 0.3) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.predictions(tenantId!, courseId!),
    queryFn: () => analyticsService.getAtRiskStudents(courseId!, minRisk),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}

export function usePredictionSummary(courseId?: string) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: analyticsKeys.predictionSummary(tenantId!, courseId!),
    queryFn: () => analyticsService.getPredictionSummary(courseId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
  })
}
