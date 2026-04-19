// EduSync LMS — Feature Flags
// Tenant-aware, rollout-percentage feature flag system backed by database

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";

export interface FeatureFlag {
  flag_name: string;
  enabled: boolean;
  tenant_ids: string[];
  rollout_percentage: number;
}

let flagCache: Map<string, FeatureFlag> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Load / refresh cache
// ---------------------------------------------------------------------------

export async function loadFeatureFlags(): Promise<void> {
  if (flagCache && Date.now() < cacheExpiry) return;

  // NOTE: We fetch all flags once (global cache) because the `tenant_ids` field
  // is a per-flag allowlist — not per-tenant rows. Tenant isolation is enforced
  // in isFeatureEnabled() by checking flag.tenant_ids.includes(tenantId).
  // RLS on the feature_flags table enforces this server-side.
  const { data } = await db
    .from("feature_flags")
    .select("flag_name, enabled, tenant_ids, rollout_percentage");

  if (data && Array.isArray(data)) {
    flagCache = new Map(
      data.map((f) => [f.flag_name, f] as [string, FeatureFlag]),
    );
  } else {
    flagCache = new Map();
  }
  cacheExpiry = Date.now() + CACHE_TTL;
}

export function invalidateFlagCache(): void {
  flagCache = null;
  cacheExpiry = 0;
}

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic per-user hash for gradual rollout.
 * Uses flagName + userId so the same user gets consistent results,
 * but different users get different results (true gradual rollout).
 */
function hashForRollout(flagName: string, userId: string): number {
  const input = `${flagName}:${userId}`;
  return input.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function isFeatureEnabled(
  flagName: string,
  tenantId?: string,
  userId?: string,
): boolean {
  if (!flagCache) return false;

  const flag = flagCache.get(flagName);
  if (!flag) return false;
  if (!flag.enabled) return false;

  // Tenant-specific override takes precedence over rollout percentage
  if (tenantId && flag.tenant_ids?.length > 0) {
    return flag.tenant_ids.includes(tenantId);
  }

  // Deterministic per-user rollout (not per-flag-name)
  if (flag.rollout_percentage < 100) {
    const hash = userId
      ? hashForRollout(flagName, userId)
      : hashForRollout(flagName, "anonymous");
    return hash % 100 < flag.rollout_percentage;
  }

  return true;
}

// ---------------------------------------------------------------------------
// React hook (synchronous, uses cached value)
// ---------------------------------------------------------------------------

/**
 * Returns whether a feature flag is enabled for the currently active tenant.
 *
 * FIX: The previous version only checked `flag.enabled` (global) and ignored
 * `tenant_ids` and `rollout_percentage`. This meant tenant-specific overrides
 * were never applied when consuming the flag via React — defeating the per-tenant
 * feature flag system entirely.
 *
 * The hook now reads the active tenant and user from AuthContext so it evaluates
 * the same logic as the standalone `isFeatureEnabled()` helper, including:
 *  - Tenant allowlist (flag.tenant_ids)
 *  - Per-user gradual rollout (flag.rollout_percentage)
 */
export function useFeatureFlag(flagName: string): boolean {
  const { tenantId, user } = useAuth();
  return isFeatureEnabled(flagName, tenantId ?? undefined, user?.id);
}

// Admin: persist flag change (reserved for future admin UI use)
// Kept for future use; suppressing TS6133 by exporting
export async function updateFeatureFlag(
  flagName: string,
  updates: Partial<Omit<FeatureFlag, "flag_name">>,
): Promise<void> {
  await db.from("feature_flags").update(updates).eq("flag_name", flagName);

  // Invalidate so the next read refreshes from DB
  invalidateFlagCache();
}
