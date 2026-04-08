import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/hooks/useToast'
import { STALE } from '@/utils/queryConstants'

import { adaptivePathService } from '../api/adaptivePathService'
import type { PathRule, PathRuleInsert } from '../types'
import { adaptivePathQueryKeys } from './adaptivePathKeys'

// ── usePathRules ─────────────────────────────────────────────

export function usePathRules(
  courseId: string | null | undefined,
  tenantId: string | null | undefined
) {
  return useQuery({
    queryKey: adaptivePathQueryKeys.byCourse(tenantId ?? '', courseId ?? ''),
    queryFn: () => adaptivePathService.getPathRules(courseId!, tenantId!),
    enabled: Boolean(courseId) && Boolean(tenantId),
    staleTime: STALE.MODERATE,
  })
}

// ── useCreatePathRule ─────────────────────────────────────────

export function useCreatePathRule() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ rule, tenantId }: { rule: PathRuleInsert; tenantId: string }) =>
      adaptivePathService.createPathRule(rule, tenantId),
    onSuccess: (created, { tenantId }) => {
      void queryClient.invalidateQueries({
        queryKey: adaptivePathQueryKeys.byCourse(tenantId, created.course_id),
      })
      addToast({ type: 'success', message: 'Aturan jalur berhasil dibuat.' })
    },
    onError: () => {
      addToast({ type: 'error', message: 'Gagal membuat aturan jalur. Silakan coba lagi.' })
    },
  })
}

// ── useUpdatePathRule ─────────────────────────────────────────

export function useUpdatePathRule() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({
      ruleId,
      data,
      tenantId,
    }: {
      ruleId: string
      data: Partial<PathRule>
      tenantId: string
    }) => adaptivePathService.updatePathRule(ruleId, data, tenantId),
    onSuccess: (updated, { tenantId }) => {
      void queryClient.invalidateQueries({
        queryKey: adaptivePathQueryKeys.byCourse(tenantId, updated.course_id),
      })
      addToast({ type: 'success', message: 'Aturan jalur berhasil diperbarui.' })
    },
    onError: () => {
      addToast({ type: 'error', message: 'Gagal memperbarui aturan jalur. Silakan coba lagi.' })
    },
  })
}

// ── useDeletePathRule ─────────────────────────────────────────

export function useDeletePathRule() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({
      ruleId,
      tenantId,
      courseId: _courseId,
    }: {
      ruleId: string
      tenantId: string
      courseId: string
    }) => adaptivePathService.deletePathRule(ruleId, tenantId),
    onSuccess: (_, { tenantId, courseId }) => {
      void queryClient.invalidateQueries({
        queryKey: adaptivePathQueryKeys.byCourse(tenantId, courseId),
      })
      addToast({ type: 'success', message: 'Aturan jalur berhasil dihapus.' })
    },
    onError: () => {
      addToast({ type: 'error', message: 'Gagal menghapus aturan jalur. Silakan coba lagi.' })
    },
  })
}

// ── useEvaluateNextLesson ─────────────────────────────────────

export function useEvaluateNextLesson(
  userId: string | null | undefined,
  courseId: string | null | undefined,
  lessonId: string | null | undefined,
  tenantId: string | null | undefined
) {
  return useQuery({
    queryKey: adaptivePathQueryKeys.evaluation(
      tenantId ?? '',
      userId ?? '',
      courseId ?? '',
      lessonId ?? ''
    ),
    queryFn: () => adaptivePathService.evaluateNextLesson(userId!, courseId!, lessonId!, tenantId!),
    enabled: Boolean(userId) && Boolean(courseId) && Boolean(lessonId) && Boolean(tenantId),
    staleTime: STALE.DYNAMIC,
  })
}
