import { useInfiniteQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/services/db'
import { createQueryKeys } from '@/shared/lib/queryKeys'

export type TeacherActivityEventType =
  | 'LESSON_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'ASSIGNMENT_SUBMITTED'
  | 'CLASS_JOINED'

export interface ActivityEventProfile {
  full_name: string | null
  avatar_url: string | null
}

export interface TeacherActivityEvent {
  id: string
  event_type: TeacherActivityEventType
  user_id: string
  metadata: Record<string, unknown>
  created_at: string
  class_id: string | null
  profiles: ActivityEventProfile | null
}

const activityKeys = createQueryKeys('teacher-activity')

const RELEVANT_EVENT_TYPES: TeacherActivityEventType[] = [
  'LESSON_COMPLETED',
  'QUIZ_COMPLETED',
  'ASSIGNMENT_SUBMITTED',
  'CLASS_JOINED',
]

const PAGE_SIZE = 20

/**
 * Hook untuk mengambil aktivitas terbaru dari siswa di kelas yang diajar guru.
 * Menggunakan cursor-based infinite scroll dengan `created_at` sebagai kursor.
 * Auto-refresh setiap 30 detik.
 */
export function useTeacherActivity() {
  const { user, tenantId } = useAuth()

  return useInfiniteQuery({
    queryKey: [...activityKeys.all(tenantId!), 'feed', user?.id],
    queryFn: async ({ pageParam }) => {
      // Fetch the IDs of classes taught by this teacher
      const { data: classes, error: classesError } = await db
        .from('classes')
        .select('id')
        .eq('teacher_id', user!.id)
        .eq('tenant_id', tenantId!)

      if (classesError) throw classesError

      // If no classes found, return empty array
      if (!classes || classes.length === 0) return []

      const classIds = classes.map((c) => c.id)

      // Fetch paginated activity events using cursor (created_at)
      let query = db
        .from('activity_events')
        .select('id, event_type, user_id, metadata, created_at, class_id')
        .eq('tenant_id', tenantId!)
        .in('class_id', classIds)
        .in('event_type', RELEVANT_EVENT_TYPES)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      // Apply cursor for pages after the first
      if (pageParam) {
        query = query.lt('created_at', pageParam)
      }

      const { data, error } = await query

      if (error) throw error

      const userIds = (data ?? []).map((row) => row.user_id)
      const { data: profiles, error: profileError } =
        userIds.length > 0
          ? await db
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('tenant_id', tenantId!)
              .in('id', userIds)
          : { data: [], error: null }

      if (profileError) throw profileError

      const profileMap = new Map(
        ((profiles ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>).map(
          (profile) => [profile.id, { full_name: profile.full_name, avatar_url: profile.avatar_url }]
        )
      )

      return (data ?? []).map((row) => ({
        ...row,
        profiles: profileMap.get(row.user_id) ?? null,
      })) as TeacherActivityEvent[]
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      // If fewer than PAGE_SIZE items returned, no more pages
      if (lastPage.length < PAGE_SIZE) return undefined
      // Use created_at of the last item as the next cursor
      return lastPage[lastPage.length - 1].created_at
    },
    enabled: !!user && !!tenantId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
