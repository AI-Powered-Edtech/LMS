import { useQuery } from '@tanstack/react-query'
import { onboardingService } from '../api/onboardingService'

export const onboardingKeys = {
  all: (tenantId: string) => ['onboarding', tenantId] as const,
  detail: (tenantId: string, id: string) => ['onboarding', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['onboarding', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Onboarding.
 */
export function useOnboardingList(tenantId: string) {
  return useQuery({
    queryKey: onboardingKeys.all(tenantId),
    queryFn: () => onboardingService.getAll(tenantId),
    enabled: !!tenantId,
  })
}
