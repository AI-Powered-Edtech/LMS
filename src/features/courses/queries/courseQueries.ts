import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { STALE } from "@/utils/queryConstants";

import { courseService } from "../api/courseService";
import { Course, FetchCoursesOptions } from "../types";
import { courseKeys } from "./courseKeys";

export function useCourses(
  filters?: Omit<FetchCoursesOptions, "tenantId">,
): UseQueryResult<{ courses: Course[]; count: number }> {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: courseKeys.list(tenantId!, filters),
    queryFn: () =>
      courseService.fetchCourses({ tenantId: tenantId!, ...filters }),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  });
}

const PAGE_SIZE = 12;

/**
 * Infinite-scrolling course list for CourseBrowser.
 * Uses courseKeys.infinite() for consistent cache invalidation.
 * tenantId is read from useAuth() internally for a consistent API.
 */
export function useInfiniteCoursesQuery(
  search?: string,
): UseInfiniteQueryResult<InfiniteData<{ courses: Course[]; count: number }>> {
  const { tenantId } = useAuth();

  return useInfiniteQuery({
    queryKey: courseKeys.infinite(tenantId ?? "", search),
    queryFn: ({ pageParam }) =>
      courseService.fetchCourses({
        tenantId: tenantId!,
        page: pageParam as number,
        limit: PAGE_SIZE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.courses.length, 0);
      return loaded < (lastPage.count ?? 0) ? allPages.length + 1 : undefined;
    },
    staleTime: STALE.MODERATE,
    enabled: !!tenantId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000),
  });
}
