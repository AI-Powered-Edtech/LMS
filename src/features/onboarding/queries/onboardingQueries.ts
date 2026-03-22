import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/src/services/supabase/client'
import { createQueryKeys } from '@/src/lib/queryKeys'
import { STALE, GC } from '@/src/utils/queryConstants'
import type { OnboardingProgress } from '../types'

const base = createQueryKeys('onboarding')

const onboardingKeys = {
  ...base,
  progress: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'progress', userId] as const,
}

/**
 * React Query hook for onboarding progress.
 * Onboarding steps don't change after completion — use STATIC stale time.
 */
export function useOnboardingProgress(tenantId: string, userId: string) {
  return useQuery({
    queryKey: onboardingKeys.progress(tenantId, userId),
    queryFn: async (): Promise<OnboardingProgress | null> => {
      const { data } = await supabase
        .from('onboarding_progress')
        .select('id, tenant_id, user_id, steps_completed, completed_at')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle()
      return data as OnboardingProgress | null
    },
    enabled: !!tenantId && !!userId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  })
}

/**
 * Mutation hook for updating onboarding step completion.
 */
export function useUpdateOnboardingProgress(tenantId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      progressId,
      stepsCompleted,
    }: {
      progressId: string
      stepsCompleted: Record<string, boolean>
    }): Promise<OnboardingProgress> => {
      const allDone = Object.values(stepsCompleted).every(Boolean)
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update({
          steps_completed: stepsCompleted,
          completed_at: allDone ? new Date().toISOString() : null,
        })
        .eq('id', progressId)
        .select()
        .single()
      if (error) throw error
      return data as OnboardingProgress
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.progress(tenantId, userId),
      })
    },
  })
}
