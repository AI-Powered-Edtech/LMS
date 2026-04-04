// ==========================================================================
// useExecutiveData — React Query hooks for Principal Executive Dashboard
// ==========================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import {
  getBaselineMetrics,
  getExecutiveOverviewCached,
  getMonthlyTrend,
  getPrincipalSettings,
  getROIMetrics,
  saveBaselineMetrics,
} from '../api/executiveApi'
import {
  closeSurvey,
  createSurvey,
  deleteSurvey,
  getSurveyResults,
  getSurveys,
  publishSurvey,
  updateSurvey,
} from '../api/surveyApi'
import type { CreateSurveyInput, SchoolBaselineMetrics } from '../types'

// ── Query Keys ─────────────────────────────────────────────────

const base = createQueryKeys('principal')

export const principalKeys = {
  ...base,
  overview: (tenantId: string) => [...base.all(tenantId), 'overview'] as const,
  monthlyTrend: (tenantId: string, months: number) =>
    [...base.all(tenantId), 'monthlyTrend', months] as const,
  settings: (tenantId: string) => [...base.all(tenantId), 'settings'] as const,
  roi: (tenantId: string) => [...base.all(tenantId), 'roi'] as const,
  baseline: (tenantId: string) => [...base.all(tenantId), 'baseline'] as const,
  surveys: (tenantId: string) => [...base.all(tenantId), 'surveys'] as const,
  surveyResults: (tenantId: string, surveyId: string) =>
    [...base.all(tenantId), 'surveyResults', surveyId] as const,
}

// ── Hooks ──────────────────────────────────────────────────────

export function useExecutiveOverview() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: principalKeys.overview(tenantId ?? ''),
    // Uses the cached MV path (get_principal_overview_cached) with automatic
    // fallback to the real-time RPC when the MV is unavailable.
    queryFn: () => getExecutiveOverviewCached(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

export function useMonthlyTrend(months: number = 6) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: principalKeys.monthlyTrend(tenantId ?? '', months),
    queryFn: () => getMonthlyTrend(tenantId!, months),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

export function usePrincipalSettings() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: principalKeys.settings(tenantId ?? ''),
    queryFn: () => getPrincipalSettings(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
  })
}

export function useROIMetrics() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: principalKeys.roi(tenantId ?? ''),
    queryFn: () => getROIMetrics(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

// ── Baseline Metrics Hook ──────────────────────────────────────

export function useBaselineMetrics() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: principalKeys.baseline(tenantId ?? ''),
    queryFn: () => getBaselineMetrics(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
  })

  const saveMutation = useMutation({
    mutationFn: (
      data: Omit<SchoolBaselineMetrics, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
    ) => saveBaselineMetrics(tenantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.baseline(tenantId ?? '') })
    },
  })

  return {
    ...query,
    saveBaseline: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  }
}

// ── Survey Hooks ───────────────────────────────────────────────

export function useSurveys() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: principalKeys.surveys(tenantId ?? ''),
    queryFn: getSurveys,
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateSurveyInput) => createSurvey(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.surveys(tenantId ?? '') })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateSurveyInput> }) =>
      updateSurvey(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.surveys(tenantId ?? '') })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.surveys(tenantId ?? '') })
    },
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.surveys(tenantId ?? '') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.surveys(tenantId ?? '') })
    },
  })

  return {
    surveys: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createSurvey: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSurvey: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    publishSurvey: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    closeSurvey: closeMutation.mutateAsync,
    isClosing: closeMutation.isPending,
    deleteSurvey: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}

export function useSurveyResults(surveyId: string | null) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: principalKeys.surveyResults(tenantId ?? '', surveyId ?? ''),
    queryFn: () => getSurveyResults(surveyId!),
    enabled: !!tenantId && !!surveyId,
    staleTime: STALE.DYNAMIC,
  })
}

// ── Combined Hook ──────────────────────────────────────────────

export function useExecutiveData() {
  const overviewQuery = useExecutiveOverview()
  const monthlyTrendQuery = useMonthlyTrend(6)
  const roiMetricsQuery = useROIMetrics()
  const settingsQuery = usePrincipalSettings()

  const isLoading =
    overviewQuery.isLoading ||
    monthlyTrendQuery.isLoading ||
    roiMetricsQuery.isLoading ||
    settingsQuery.isLoading

  const error =
    overviewQuery.error || monthlyTrendQuery.error || roiMetricsQuery.error || settingsQuery.error

  return {
    overview: overviewQuery.data,
    monthlyTrend: monthlyTrendQuery.data ?? [],
    roiMetrics: roiMetricsQuery.data,
    settings: settingsQuery.data,
    isLoading,
    error,
    refetchAll: () => {
      overviewQuery.refetch()
      monthlyTrendQuery.refetch()
      roiMetricsQuery.refetch()
      settingsQuery.refetch()
    },
  }
}
