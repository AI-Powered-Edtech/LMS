import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { STALE } from '@/utils/queryConstants'

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

/**
 * Infinite-scrolling course list for CourseBrowser.
 * Uses courseKeys.infinite() for consistent cache invalidation.
 */
export function useInfiniteCoursesQuery(tenantId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: courseKeys.infinite(tenantId, search),
    queryFn: ({ pageParam = 1 }) =>
      courseService.fetchCourses({
        tenantId,
        page: pageParam as number,
        limit: PAGE_SIZE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.courses.length, 0)
      return loaded < (lastPage.count ?? 0) ? allPages.length + 1 : undefined
    },
    staleTime: STALE.MODERATE,
    enabled: !!tenantId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000),
  })
}
