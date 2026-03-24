import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CourseVersion, versionService } from '../api/versionService'

/**
 * Hook to fetch course version history
 */
export function useCourseVersions(courseId: string) {
  return useQuery<CourseVersion[]>({
    queryKey: ['course-versions', courseId],
    queryFn: () => versionService.fetchCourseVersions(courseId),
    enabled: !!courseId,
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
  })
}
