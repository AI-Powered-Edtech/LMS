import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'

import { courseService } from '../api/courseService'
import { FetchCoursesOptions } from '../types'
import { courseKeys } from './courseKeys'

export function useCourses(filters?: Omit<FetchCoursesOptions, 'tenantId'>) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: courseKeys.list(tenantId!, filters),
    queryFn: () => courseService.fetchCourses({ tenantId: tenantId!, ...filters }),
    enabled: !!tenantId,
  })
}

const PAGE_SIZE = 12

export function useInfiniteCoursesQuery(tenantId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['courses', 'infinite', tenantId, search],
    queryFn: ({ pageParam = 1 }) =>
      courseService.fetchCourses({
        tenantId,
        page: pageParam as number,
        limit: PAGE_SIZE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + (p.data?.length ?? 0), 0)
      return loaded < (lastPage.count ?? 0) ? allPages.length + 1 : undefined
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}
