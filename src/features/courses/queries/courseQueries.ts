import { useQuery } from '@tanstack/react-query'
import { courseService } from '../api/courseService'
import { courseKeys } from './courseKeys'
import { useAuth } from '../../../contexts/AuthContext'
import { FetchCoursesOptions } from '../types'

export function useCourses(filters?: Omit<FetchCoursesOptions, 'tenantId'>) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: courseKeys.list(tenantId!, filters),
    queryFn: () => courseService.fetchCourses({ tenantId: tenantId!, ...filters }),
    enabled: !!tenantId,
  })
}
