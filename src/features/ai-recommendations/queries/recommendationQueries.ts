import { useQuery } from '@tanstack/react-query'

import { STALE } from '@/utils/queryConstants'

import { aiRecommendationService } from '../api/recommendationService'

// Key factory — includes tenantId for multi-tenant cache isolation
const aiRecommendationQueryKeys = {
  byCourse: (tenantId: string, courseId: string) =>
    ['ai-recommendations', tenantId, 'course', courseId] as const,
}

export { aiRecommendationQueryKeys }

/**
 * Fetches AI learning path recommendations for a given course.
 * Automatically disabled when courseId or tenantId are missing.
 * Fails silently — errors are not surfaced to the student.
 */
export function useAiRecommendations(courseId: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: aiRecommendationQueryKeys.byCourse(tenantId ?? '', courseId ?? ''),
    queryFn: () => aiRecommendationService.getRecommendations(courseId!),
    enabled: !!courseId && !!tenantId,
    staleTime: STALE.MODERATE,
    // Do not retry AI calls — one failure is enough; we have a rule-based fallback on the server
    retry: false,
    // Never throw to the error boundary — return undefined on failure
    throwOnError: false,
  })
}
