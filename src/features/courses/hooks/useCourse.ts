import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseService } from '../api/courseService'

/**
 * Hook untuk mengambil daftar Kursus.
 */
export function useCourseData(tenantId: string) {
  return useQuery({
    queryKey: ['courses', tenantId],
    queryFn: () => courseService.fetchCourses({ tenantId }),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Kursus.
 */
export function useCourseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseService.createCourse.bind(courseService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}
