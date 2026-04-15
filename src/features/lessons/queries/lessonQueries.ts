import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/services/db'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import { lessonService } from '../api/lessonService'

const base = createQueryKeys('lessons')

const lessonKeys = {
  ...base,
  enrollments: (userId: string, tenantId: string) =>
    [...base.all(tenantId), 'enrollments', userId] as const,
  completed: (userId: string, tenantId: string, lessonIds: string[]) =>
    [...base.all(tenantId), 'completed', userId, lessonIds] as const,
  scormProgress: (userId: string, scormPackageId: string, tenantId: string) =>
    [...base.all(tenantId), 'scorm-progress', userId, scormPackageId] as const,
}

interface EnrolledCourse {
  id: string
  title: string
  description?: string
  status: string
}

/**
 * Hook untuk mendapatkan daftar kursus yang diikuti siswa.
 */
export function useStudentEnrollments() {
  const { user, tenantId } = useAuth()

  return useQuery({
    queryKey: lessonKeys.enrollments(user?.id ?? '', tenantId ?? ''),
    queryFn: async (): Promise<EnrolledCourse[]> => {
      if (!tenantId || !user?.id) return []

      const { data, error } = await db
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE')

      if (error) throw error

      const courseIds = (data ?? []).map((enrollment: any) => enrollment.course_id)
      if (courseIds.length === 0) return []

      const { data: courses, error: courseError } = await db
        .from('courses')
        .select('id, title, description, status')
        .eq('tenant_id', tenantId)
        .in('id', courseIds)

      if (courseError) throw courseError

      return ((courses ?? []) as EnrolledCourse[]).filter((c) => c.status === 'published')
    },
    enabled: !!tenantId && !!user?.id,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Hook untuk mendapatkan ID pelajaran yang sudah diselesaikan.
 */
export function useCompletedLessonIds(lessonIds: string[]) {
  const { user, tenantId } = useAuth()

  return useQuery({
    queryKey: lessonKeys.completed(user?.id ?? '', tenantId ?? '', lessonIds),
    queryFn: async (): Promise<Set<string>> => {
      if (!user?.id || lessonIds.length === 0) return new Set()
      return lessonService.getCompletedLessonIds(user.id, lessonIds)
    },
    enabled: !!user?.id && !!tenantId && lessonIds.length > 0,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Hook untuk mendapatkan progress SCORM runtime data.
 */
export function useScormProgress(scormPackageId: string) {
  const { user, tenantId } = useAuth()

  return useQuery({
    queryKey: lessonKeys.scormProgress(user?.id ?? '', scormPackageId, tenantId ?? ''),
    queryFn: async () => {
      if (!user?.id || !tenantId || !scormPackageId) return null
      return lessonService.getScormRuntimeData(user.id, scormPackageId, tenantId)
    },
    enabled: !!user?.id && !!tenantId && !!scormPackageId,
    staleTime: STALE.DYNAMIC,
  })
}
