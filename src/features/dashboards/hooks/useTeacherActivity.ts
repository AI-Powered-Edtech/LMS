import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'
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

async function fetchTeacherActivity(
  teacherId: string,
  tenantId: string
): Promise<TeacherActivityEvent[]> {
  // Fetch the IDs of classes taught by this teacher
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('tenant_id', tenantId)

  if (classesError) throw classesError

  // If no classes found, return empty array
  if (!classes || classes.length === 0) return []

  const classIds = classes.map((c) => c.id)

  // Fetch recent activity events for those classes, joined with student profiles
  const { data, error } = await supabase
    .from('activity_events')
    .select(
      `
      id,
      event_type,
      user_id,
      metadata,
      created_at,
      class_id,
      profiles!activity_events_user_id_fkey (
        full_name,
        avatar_url
      )
    `
    )
    .eq('tenant_id', tenantId)
    .in('class_id', classIds)
    .in('event_type', RELEVANT_EVENT_TYPES)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  // Supabase returns joined profiles as an array; normalise to single object or null
  return (data ?? []).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : (row.profiles ?? null),
  })) as TeacherActivityEvent[]
}

/**
 * Hook untuk mengambil aktivitas terbaru dari siswa di kelas yang diajar guru.
 * Auto-refresh setiap 30 detik.
 */
export function useTeacherActivity() {
  const { user, tenantId } = useAuth()

  return useQuery({
    queryKey: [...activityKeys.all(tenantId!), 'feed', user?.id],
    queryFn: () => fetchTeacherActivity(user!.id, tenantId!),
    enabled: !!user && !!tenantId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
