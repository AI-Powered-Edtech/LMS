import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GC, STALE } from '@/src/utils/queryConstants'
import { captureError } from '@/src/utils/sentry'

import { lessonService } from '../api/lessonService'

/**
 * Hook untuk mengambil daftar Pelajaran.
 */
export function useLessonData(moduleId: string, userId: string, tenantId: string) {
  return useQuery({
    queryKey: ['lessons', moduleId, userId, tenantId],
    queryFn: () => lessonService.fetchModuleLessons(moduleId, userId, tenantId),
    enabled: !!moduleId && !!userId && !!tenantId,
    staleTime: STALE.MODERATE, // 5 min — lesson structure changes rarely
    gcTime: GC.LONG, // 30 min — keep in cache for navigation
  })
}

/**
 * Hook untuk mengupdate progress pelajaran.
 */
export function useLessonMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      lessonId: string
      tenantId: string
      status: 'started' | 'in_progress' | 'completed'
      progressPercentage: number
    }) =>
      lessonService.updateProgress(
        params.lessonId,
        params.tenantId,
        params.status,
        params.progressPercentage
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
    onError: (err) => {
      captureError(err, { context: 'useLessonMutation.updateProgress' })
      // Silent — progress update failure should not interrupt student's lesson flow
      if (import.meta.env.DEV) console.warn('[useLesson] Progress update failed:', err)
    },
  })
}
