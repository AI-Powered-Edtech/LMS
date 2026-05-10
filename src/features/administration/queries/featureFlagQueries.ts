import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { STALE } from "@/utils/queryConstants";

import {
  administrationService,
  type TenantModuleConfig,
} from "../api/administrationService";
import { featureFlagService } from "../api/featureFlagService";

const base = createQueryKeys("administration");

const adminKeys = {
  ...base,
  modules: (tenantId: string) => [...base.all(tenantId), "modules"] as const,
  featureFlags: (tenantId: string) =>
    [...base.all(tenantId), "feature-flags"] as const,
};

/**
 * React Query hook for tenant module configuration.
 */
export function useTenantModules() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: adminKeys.modules(tenantId!),
    queryFn: async (): Promise<TenantModuleConfig[]> => {
      const data = await administrationService.getTenantModules();
      return data.length > 0 ? data : administrationService.getDefaultModules();
    },
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
  });
}

/**
 * React Query hook for feature flags.
 */
export function useFeatureFlags() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: adminKeys.featureFlags(tenantId!),
    queryFn: () => featureFlagService.fetchFlags(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  });
}

/**
 * Mutation hook for saving feature flags.
 */
export function useSaveFeatureFlags() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      dirtyFlags: Array<{
        flag_name: string;
        enabled: boolean;
        rollout_percentage: number;
      }>,
    ) => {
      if (!tenantId) throw new Error("Tenant ID tidak tersedia");
      return featureFlagService.saveFlags(tenantId, dirtyFlags);
    },
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: adminKeys.featureFlags(tenantId),
        });
      }
    },
  });
}

/**
 * Mutation hook for toggling a tenant module.
 */
export function useToggleTenantModule() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      isEnabled,
    }: {
      moduleId: string;
      isEnabled: boolean;
    }) => administrationService.toggleTenantModule(moduleId, isEnabled),
    onSuccess: () => {
      if (tenantId)
        void queryClient.invalidateQueries({
          queryKey: adminKeys.modules(tenantId),
        });
    },
  });
}
