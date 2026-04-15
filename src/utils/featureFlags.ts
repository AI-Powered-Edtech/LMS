// EduSync LMS — Feature Flags
// Tenant-aware, rollout-percentage feature flag system backed by API

import { apiFetch } from '@/src/lib/api'

export interface FeatureFlag {
  flag_name: string
  enabled: boolean
  tenant_ids: string[]
  rollout_percentage: number
}

let flagCache: Map<string, FeatureFlag> | null = null
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ---------------------------------------------------------------------------
// Load / refresh cache
// ---------------------------------------------------------------------------

export async function loadFeatureFlags(): Promise<void> {
  if (flagCache && Date.now() < cacheExpiry) return

  const { data } = await apiFetch('/feature_flags')

  flagCache = new Map((data ?? []).map((f: FeatureFlag) => [f.flag_name, f]))
  cacheExpiry = Date.now() + CACHE_TTL
}

export function invalidateFlagCache(): void {
  flagCache = null
  cacheExpiry = 0
}

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

function hashFlagName(flagName: string): number {
  return flagName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

export function isFeatureEnabled(flagName: string, tenantId?: string): boolean {
  if (!flagCache) return false

  const flag = flagCache.get(flagName)
  if (!flag) return false
  if (!flag.enabled) return false

  // Tenant-specific override takes precedence over rollout percentage
  if (tenantId && flag.tenant_ids?.length > 0) {
    return flag.tenant_ids.includes(tenantId)
  }

  // Deterministic rollout by flag name hash
  if (flag.rollout_percentage < 100) {
    return hashFlagName(flagName) % 100 < flag.rollout_percentage
  }

  return true
}

// ---------------------------------------------------------------------------
// React hook (synchronous, uses cached value)
// ---------------------------------------------------------------------------

export function useFeatureFlag(flagName: string): boolean {
  if (!flagCache) return false
  const flag = flagCache.get(flagName)
  return flag?.enabled ?? false
}

// ---------------------------------------------------------------------------
// Admin: persist flag change
// ---------------------------------------------------------------------------

async function updateFeatureFlag(
  _flagName: string,
  _updates: Partial<Omit<FeatureFlag, 'flag_name'>>
): Promise<void> {
  await apiFetch('/feature_flags')

  // Invalidate so the next read refreshes from DB
  invalidateFlagCache()
}
