/**
 * Feature Flag Service — service layer for the FeatureFlags admin page.
 * Keeps inline Supabase calls out of page components.
 */
import { supabase } from '@/services/supabase/client'
import { type FeatureFlag, invalidateFlagCache } from '@/utils/featureFlags'

export const featureFlagService = {
  /**
   * Fetch all feature flags for a tenant.
   */
  async fetchFlags(tenantId: string): Promise<FeatureFlag[]> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('flag_name, enabled, tenant_ids, rollout_percentage')
      .eq('tenant_id', tenantId)
      .order('flag_name')

    if (error) throw error
    return (data ?? []) as FeatureFlag[]
  },

  /**
   * Persist changed feature flags for a tenant.
   * Accepts only the dirty flags to minimize writes.
   */
  async saveFlags(
    tenantId: string,
    dirtyFlags: Array<{ flag_name: string; enabled: boolean; rollout_percentage: number }>
  ): Promise<void> {
    for (const flag of dirtyFlags) {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          enabled: flag.enabled,
          rollout_percentage: flag.rollout_percentage,
        })
        .eq('flag_name', flag.flag_name)
        .eq('tenant_id', tenantId)

      if (error) throw error
    }

    invalidateFlagCache()
  },
}
