import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { GC, STALE } from '@/utils/queryConstants'

import { administrationService } from '../api/administrationService'

const base = createQueryKeys('administration')

const adminKeys = {
  ...base,
  modules: (tenantId: string) => [...base.all(tenantId), 'modules'] as const,
  syncHistory: (tenantId: string) => [...base.all(tenantId), 'syncHistory'] as const,
}

/**
 * React Query hook for tenant module configuration.
 * Module config rarely changes — use STATIC stale time.
 */
export function useTenantModules() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: adminKeys.modules(tenantId!),
    queryFn: () => administrationService.getTenantModules(),
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  })
}

/**
 * React Query hook for sync history logs.
 */
export function useSyncHistory() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: adminKeys.syncHistory(tenantId!),
    queryFn: () => administrationService.getSyncHistory(),
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  })
}

/**
 * Mutation hook for toggling a tenant module on/off.
 */
export function useToggleTenantModule() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      administrationService.toggleTenantModule(moduleId, isEnabled),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: adminKeys.modules(tenantId) })
    },
  })
}
