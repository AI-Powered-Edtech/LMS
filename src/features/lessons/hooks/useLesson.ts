import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { lessonService } from '../api/lessonService'

/**
 * Hook untuk mengambil daftar Pelajaran.
 */
function useLessonData(moduleId: string, userId: string, tenantId: string) {
  return useQuery({
    queryKey: ['lessons', moduleId, userId, tenantId],
    queryFn: () => lessonService.fetchModuleLessons(moduleId, userId, tenantId),
    enabled: !!moduleId && !!userId && !!tenantId,
  })
}

/**
 * Hook untuk mengupdate progress pelajaran.
 */
function useLessonMutation() {
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
  })
}
