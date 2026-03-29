import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/services/supabase/client'
import { GC, STALE } from '@/src/utils/queryConstants'

import { discussionService } from '../api/discussionService'

export const discussionKeys = {
  all: (tenantId: string) => ['discussions', tenantId] as const,
  detail: (tenantId: string, id: string) => ['discussions', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['discussions', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Diskusi dengan Realtime updates.
 *
 * Menggunakan dua strategi untuk memastikan data selalu fresh:
 * 1. Supabase Realtime channel — instant invalidation saat ada INSERT/UPDATE/DELETE
 * 2. refetchInterval 30 detik — fallback polling jika WebSocket terputus
 */
export function useDiscussionList() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  // Subscribe to INSERT, UPDATE, DELETE events on the discussions table
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`discussions:tenant:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'discussions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate and refetch — we do a full refetch rather than manual
          // optimistic merge because the query includes a join on author profile
          // which the realtime payload does not contain.
          queryClient.invalidateQueries({ queryKey: discussionKeys.all(tenantId) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return useQuery({
    queryKey: discussionKeys.all(tenantId!),
    queryFn: () => discussionService.fetchDiscussions({ tenantId: tenantId! }),
    enabled: !!tenantId,
    // staleTime=0: always consider data stale so realtime invalidation triggers refetch
    staleTime: STALE.REALTIME,
    gcTime: GC.SHORT,
    // 30-second polling as fallback if Supabase Realtime channel disconnects
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}
