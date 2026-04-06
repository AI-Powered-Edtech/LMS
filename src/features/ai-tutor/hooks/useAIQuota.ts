/**
 * AI Quota Management Hook
 *
 * Tracks AI usage across all AI features and provides quota indicators
 */

import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/services/supabase/client'

export interface AIQuotaInfo {
  /** Current usage count */
  currentUsage: number
  /** Maximum allowed usage */
  maxUsage: number
  /** Remaining quota */
  remaining: number
  /** Usage percentage (0-100) */
  usagePercent: number
  /** Whether quota is exhausted */
  isExhausted: boolean
  /** Whether approaching limit (>80%) */
  isApproachingLimit: boolean
  /** Reset timestamp */
  resetsAt: Date | null
}

/**
 * Hook to track AI quota usage
 *
 * @param tenantId - The tenant ID to track quota for
 * @returns Quota information and refresh function
 */
export function useAIQuota(tenantId: string | undefined): {
  quota: AIQuotaInfo | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [quota, setQuota] = useState<AIQuotaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchQuota = useCallback(async () => {
    if (!tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      // Try to fetch from ai_usage table if it exists
      const { data, error: dbError } = await supabase
        .from('ai_usage')
        .select('current_usage, max_usage, resets_at')
        .eq('tenant_id', tenantId)
        .single()

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = not found, which is OK
        throw dbError
      }

      if (data) {
        const currentUsage = data.current_usage ?? 0
        const maxUsage = data.max_usage ?? 100
        const remaining = Math.max(0, maxUsage - currentUsage)
        const usagePercent = (currentUsage / maxUsage) * 100

        setQuota({
          currentUsage,
          maxUsage,
          remaining,
          usagePercent: Math.min(100, usagePercent),
          isExhausted: remaining === 0,
          isApproachingLimit: usagePercent > 80,
          resetsAt: data.resets_at ? new Date(data.resets_at) : null,
        })
      } else {
        // Default quota if table doesn't exist or no data
        setQuota({
          currentUsage: 0,
          maxUsage: 100,
          remaining: 100,
          usagePercent: 0,
          isExhausted: false,
          isApproachingLimit: false,
          resetsAt: null,
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Gagal memuat kuota AI')
      setError(error)

      if (import.meta.env.DEV) {
        console.warn('[AI Quota] Failed to fetch quota, using defaults:', error)
      }

      // Fallback to defaults
      setQuota({
        currentUsage: 0,
        maxUsage: 100,
        remaining: 100,
        usagePercent: 0,
        isExhausted: false,
        isApproachingLimit: false,
        resetsAt: null,
      })
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchQuota()
  }, [fetchQuota])

  return {
    quota,
    isLoading,
    error,
    refresh: fetchQuota,
  }
}

/**
 * Hook to increment AI usage counter after successful AI call
 */
export function useIncrementAIUsage(): (tenantId: string) => Promise<void> {
  return useCallback(async (tenantId: string) => {
    try {
      // Try to increment usage in database
      await supabase.rpc('increment_ai_usage', { p_tenant_id: tenantId })
    } catch (err) {
      // Silently fail - usage tracking is non-critical
      if (import.meta.env.DEV) {
        console.warn('[AI Quota] Failed to increment usage:', err)
      }
    }
  }, [])
}
