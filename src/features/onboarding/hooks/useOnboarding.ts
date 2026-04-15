import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { onboardingService } from '../api/onboardingService'

/**
 * Hook untuk mengambil daftar Onboarding.
 */
function useOnboardingData(tenantId: string) {
  return useQuery({
    queryKey: ['onboarding', tenantId],
    queryFn: () => onboardingService.getAll(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Onboarding.
 */
function useOnboardingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: onboardingService.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  })
}
