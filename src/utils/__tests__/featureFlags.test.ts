import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase before importing featureFlags
vi.mock('@/src/services/supabase/client', () => {
  const mockSelect = vi.fn()
  const mockFrom = vi.fn((_table?: string) => ({ select: mockSelect }))
  const mockEq = vi.fn(() => ({ eq: mockEq }))

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'feature_flags') {
          return { select: mockSelect, update: () => ({ eq: mockEq }) }
        }
        return mockFrom(table)
      },
    },
    __mockSelect: mockSelect,
    __mockEq: mockEq,
  }
})

import {
  loadFeatureFlags,
  isFeatureEnabled,
  useFeatureFlag,
  invalidateFlagCache,
} from '../featureFlags'
import type { FeatureFlag } from '../featureFlags'

// Access mock helpers
const supabaseMock = await import('@/src/services/supabase/client')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect: ReturnType<typeof vi.fn> = (supabaseMock as any).__mockSelect

async function seedFlags(flags: FeatureFlag[]) {
  invalidateFlagCache()
  mockSelect.mockResolvedValueOnce({ data: flags, error: null })
  await loadFeatureFlags()
}

describe('featureFlags', () => {
  beforeEach(() => {
    invalidateFlagCache()
    vi.clearAllMocks()
  })

  describe('isFeatureEnabled', () => {
    it('returns false when cache is not loaded', () => {
      expect(isFeatureEnabled('any_flag')).toBe(false)
    })

    it('returns false when flag does not exist in cache', async () => {
      await seedFlags([])
      expect(isFeatureEnabled('nonexistent')).toBe(false)
    })

    it('returns false when flag.enabled is false', async () => {
      await seedFlags([
        { flag_name: 'my_flag', enabled: false, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(isFeatureEnabled('my_flag')).toBe(false)
    })

    it('returns true when flag is enabled with 100% rollout', async () => {
      await seedFlags([
        { flag_name: 'my_flag', enabled: true, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(isFeatureEnabled('my_flag')).toBe(true)
    })

    it('returns true when tenantId is in tenant_ids whitelist', async () => {
      await seedFlags([
        {
          flag_name: 'beta',
          enabled: true,
          tenant_ids: ['tenant-A', 'tenant-B'],
          rollout_percentage: 0,
        },
      ])
      expect(isFeatureEnabled('beta', 'tenant-A')).toBe(true)
    })

    it('returns false when tenantId is NOT in tenant_ids whitelist', async () => {
      await seedFlags([
        {
          flag_name: 'beta',
          enabled: true,
          tenant_ids: ['tenant-A'],
          rollout_percentage: 100,
        },
      ])
      expect(isFeatureEnabled('beta', 'tenant-X')).toBe(false)
    })

    it('uses deterministic rollout hash when no tenant_ids', async () => {
      await seedFlags([
        { flag_name: 'my_flag', enabled: true, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(isFeatureEnabled('my_flag')).toBe(true)

      invalidateFlagCache()
      mockSelect.mockResolvedValueOnce({
        data: [{ flag_name: 'my_flag', enabled: true, tenant_ids: [], rollout_percentage: 0 }],
        error: null,
      })
      await loadFeatureFlags()
      // 0% rollout → hash % 100 (any value) is never < 0
      expect(isFeatureEnabled('my_flag')).toBe(false)
    })
  })

  describe('useFeatureFlag', () => {
    it('returns false when cache is empty', () => {
      expect(useFeatureFlag('offline_quiz')).toBe(false)
    })

    it('returns false for unknown flag', async () => {
      await seedFlags([
        { flag_name: 'other', enabled: true, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(useFeatureFlag('offline_quiz')).toBe(false)
    })

    it('returns true when flag.enabled is true', async () => {
      await seedFlags([
        { flag_name: 'offline_quiz', enabled: true, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(useFeatureFlag('offline_quiz')).toBe(true)
    })

    it('returns false when flag.enabled is false', async () => {
      await seedFlags([
        { flag_name: 'offline_quiz', enabled: false, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(useFeatureFlag('offline_quiz')).toBe(false)
    })
  })

  describe('invalidateFlagCache', () => {
    it('clears loaded cache', async () => {
      await seedFlags([
        { flag_name: 'my_flag', enabled: true, tenant_ids: [], rollout_percentage: 100 },
      ])
      expect(useFeatureFlag('my_flag')).toBe(true)

      invalidateFlagCache()
      expect(useFeatureFlag('my_flag')).toBe(false)
    })
  })

  describe('loadFeatureFlags', () => {
    it('does not re-fetch within TTL', async () => {
      await seedFlags([{ flag_name: 'f', enabled: true, tenant_ids: [], rollout_percentage: 100 }])
      // Second call should NOT trigger another select (cache still warm)
      await loadFeatureFlags()
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })
  })
})
