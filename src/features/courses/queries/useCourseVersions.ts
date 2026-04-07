import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { captureError } from '@/utils/sentry'

import { CourseVersion, versionService } from '../api/versionService'
import { courseKeys } from './courseKeys'

/**
 * Hook to fetch course version history.
 * Uses courseKeys.versions() for tenant-scoped cache isolation.
 */
export function useCourseVersions(courseId: string) {
  const { tenantId } = useAuth()
  return useQuery<CourseVersion[]>({
    queryKey: courseKeys.versions(tenantId!, courseId),
    queryFn: () => versionService.fetchCourseVersions(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
  })
}

/**
 * Hook to save a new course version (checkpoint).
 */
export function useSaveVersion() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: ({ courseId, message }: { courseId: string; message: string }) =>
      versionService.saveCourseVersion(courseId, message),
    onSuccess: (_, { courseId }) => {
      // Tenant-scoped invalidation via courseKeys.versions
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: courseKeys.versions(tenantId, courseId) })
      }
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
 * Hook to restore a course to a previous version.
 * Narrow invalidation: only the affected course's builder/detail keys,
 * not a broad ['courses'] blast that refetches all tenants' data.
 */
export function useRestoreVersion() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    // courseId tidak dipakai di mutationFn body, tapi diperlukan di onSuccess via variables
    mutationFn: ({ versionId }: { versionId: string; courseId: string }) =>
      versionService.restoreCourseVersion(versionId),
    onSuccess: (_, { courseId }) => {
      if (tenantId) {
        // Invalidate only the specific course's builder and detail cache
        queryClient.invalidateQueries({ queryKey: courseKeys.builder(tenantId, courseId) })
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(tenantId, courseId) })
        queryClient.invalidateQueries({ queryKey: courseKeys.versions(tenantId, courseId) })
      } else {
        // Safe fallback when tenant context is unavailable:
        // invalidate all courses-scope queries without using empty tenantId key.
        queryClient.invalidateQueries({
          predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'courses',
        })
      }
    },
    onError: (err, variables) => {
      captureError(err, { context: 'useRestoreVersion', versionId: variables.versionId })
      useToast.getState().addToast({
        type: 'error',
        message: 'Gagal memulihkan versi kursus.',
        description: 'Perubahan tidak diterapkan. Coba lagi atau hubungi admin.',
      })
    },
  })
}
