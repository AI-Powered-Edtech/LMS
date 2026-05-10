/**
 * Feature Flag Service — service layer for the FeatureFlags admin page.
 * Keeps inline DB calls out of page components.
 */
import { db } from "@/services/db";
import { type FeatureFlag, invalidateFlagCache } from "@/utils/featureFlags";
import { logger } from "@/utils/logger";

export const featureFlagService = {
  /**
   * Fetch all feature flags for a tenant.
   */
  async fetchFlags(tenantId: string): Promise<FeatureFlag[]> {
    // feature_flags.tenant_ids is an array; use @> (contains) to filter by tenant
    const { data, error } = await db
      .from("feature_flags")
      .select("flag_name, enabled, tenant_ids, rollout_percentage")
      .contains("tenant_ids", [tenantId])
      .order("flag_name");

    if (error) {
      // If no flags exist for this tenant, return empty array gracefully
      if (import.meta.env.DEV)
        logger.warn("[featureFlagService] fetchFlags:", error.message);
      return [];
    }
    return (data ?? []) as FeatureFlag[];
  },

  /**
   * Persist changed feature flags for a tenant.
   * Accepts only the dirty flags to minimize writes.
   */
  async saveFlags(
    tenantId: string,
    dirtyFlags: Array<{
      flag_name: string;
      enabled: boolean;
      rollout_percentage: number;
    }>,
  ): Promise<void> {
    for (const flag of dirtyFlags) {
      const { error } = await db
        .from("feature_flags")
        .update({
          enabled: flag.enabled,
          rollout_percentage: flag.rollout_percentage,
        })
        .eq("flag_name", flag.flag_name)
        .contains("tenant_ids", [tenantId]);

      if (error) throw error;
    }

    invalidateFlagCache();
  },
};
