import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'
import { useToast } from '@/src/hooks/useToast'
import { captureError } from '@/src/utils/sentry'

import { CourseVersion, versionService } from '../api/versionService'

/**
 * Hook to fetch course version history
 */
export function useCourseVersions(courseId: string) {
  const { tenantId } = useAuth()
  return useQuery<CourseVersion[]>({
    queryKey: ['course-versions', courseId],
    queryFn: () => versionService.fetchCourseVersions(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
  })
}

/**
 * Hook to save a new course version (checkpoint)
 */
export function useSaveVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ courseId, message }: { courseId: string; message: string }) =>
      versionService.saveCourseVersion(courseId, message),
    onSuccess: (_, { courseId }) => {
      // Invalidate the versions list to fetch the newly created version
      queryClient.invalidateQueries({ queryKey: ['course-versions', courseId] })
    },
    onError: (err) => {
      captureError(err, { context: 'useSaveVersion' })
      useToast.getState().addToast({
        type: 'error',
        message: 'Gagal menyimpan versi kursus.',
      })
    },
  })
}

/**
 * Hook to restore a course to a previous version
 */
export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => versionService.restoreCourseVersion(versionId),
    onSuccess: () => {
      // Invalidate the course details and modules since the structure changed
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-modules'] })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
    },
    onError: (err, variables) => {
      captureError(err, { context: 'useRestoreVersion', versionId: variables })
      useToast.getState().addToast({
        type: 'error',
        message: 'Gagal memulihkan versi kursus.',
        description: 'Perubahan tidak diterapkan. Coba lagi atau hubungi admin.',
      })
    },
  })
}
