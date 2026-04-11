import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getRealtimeProvider } from '@/services/realtime'
import { db } from '@/services/db'
import { GC, STALE } from '@/utils/queryConstants'

import { discussionService } from '../api/discussionService'

export const discussionKeys = {
  all: (tenantId: string) => ['discussions', tenantId] as const,
  detail: (tenantId: string, id: string) => ['discussions', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['discussions', 'list', tenantId, filters] as const,
  participation: (
    tenantId: string,
    courseId: string,
    classId?: string,
    dateFrom?: string,
    dateTo?: string
  ) => ['discussions', 'participation', tenantId, courseId, classId, dateFrom, dateTo] as const,
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

    const channel = getRealtimeProvider()
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
          void queryClient.invalidateQueries({ queryKey: discussionKeys.all(tenantId) })
        }
      )
      .subscribe()

    return () => {
      void getRealtimeProvider().removeChannel(channel)
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

/**
 * Query hook untuk dashboard partisipasi forum di satu kursus.
 * Menggunakan RPC get_forum_participation untuk mengambil data agregat.
 */
export function useForumParticipationStats(
  courseId: string,
  options?: {
    enabled?: boolean
    classId?: string
    dateFrom?: string
    dateTo?: string
  }
) {
  const { tenantId, activeRole } = useAuth()
  const shouldPoll = activeRole === 'teacher' || activeRole === 'admin'

  return useQuery({
    queryKey: discussionKeys.participation(
      tenantId!,
      courseId,
      options?.classId,
      options?.dateFrom,
      options?.dateTo
    ),
    queryFn: async (): Promise<ForumParticipationDashboard> => {
      const { data, error } = await db.rpc('get_forum_participation', {
        p_course_id: courseId,
        p_tenant_id: tenantId!,
        p_class_id: options?.classId || null,
        p_date_from: options?.dateFrom || null,
        p_date_to: options?.dateTo || null,
      })

      if (error) {
        // Graceful fallback if RPC doesn't exist yet
        if (import.meta.env.DEV) {
          console.warn(
            'get_forum_participation RPC not available, returning empty dashboard:',
            error.message
          )
        }
        return {
          participants: [],
          timeline: [],
          summary: {
            total_posts: 0,
            total_comments: 0,
            total_participants: 0,
            average_participation_rate: 0,
          },
        }
      }

      return (
        (data as ForumParticipationDashboard) || {
          participants: [],
          timeline: [],
          summary: {
            total_posts: 0,
            total_comments: 0,
            total_participants: 0,
            average_participation_rate: 0,
          },
        }
      )
    },
    enabled: !!tenantId && !!courseId && (options?.enabled ?? true),
    staleTime: STALE.DYNAMIC,
    refetchInterval: shouldPoll ? 30_000 : false,
    refetchIntervalInBackground: false,
  })
}

// Types for forum participation data
export interface ForumParticipationRow {
  student_id: string
  student_name: string
  total_posts: number
  total_comments: number
  last_activity: string | null
  participation_rate: number
}

export interface ForumParticipationDashboard {
  participants: ForumParticipationRow[]
  timeline: Array<{
    date: string
    posts: number
    comments: number
    total_activity: number
  }>
  summary: {
    total_posts: number
    total_comments: number
    total_participants: number
    average_participation_rate: number
  }
}
