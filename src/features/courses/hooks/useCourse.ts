import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { logDevWarn } from '@/utils/logDevError'
import { captureError } from '@/utils/sentry'

import { courseService } from '../api/courseService'
import { courseKeys } from '../queries/courseKeys'

/**
 * Hook để mengambil daftar Kursus.
 * @deprecated Gunakan `useCourses()` dari `queries/courseQueries.ts` — hook ini
 * dipertahankan untuk kompatibilitas backward namun sudah dimigrasikan ke courseKeys.
 */
export function useCourseData(tenantId: string) {
  return useQuery({
    queryKey: courseKeys.list(tenantId),
    queryFn: () => courseService.fetchCourses({ tenantId }),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Kursus.
 * Invalidasi menggunakan courseKeys.lists() agar tenant-scoped.
 */
export function useCourseMutation() {
  const qc = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: courseService.createCourse.bind(courseService),
    onSuccess: () => {
      // Tenant-scoped invalidation — mencegah blast ke tenant lain di cache
      if (tenantId) {
        qc.invalidateQueries({ queryKey: courseKeys.lists(tenantId) })
        qc.invalidateQueries({ queryKey: courseKeys.infinite(tenantId) })
      } else {
        // tenantId not yet available — skip invalidation rather than blast all caches
        logDevWarn(
          'useCourseMutation',
          'tenantId missing at mutation success — cache not invalidated'
        )
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useCourseMutation' })
    },
  })
}
