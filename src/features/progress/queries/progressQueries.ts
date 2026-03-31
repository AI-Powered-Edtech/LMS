import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { progressService } from '../api/progressService'
import { studentProgressService } from '../api/studentProgressService'

// FIX: Include tenantId in all query keys to prevent cross-tenant cache bleed.
// Without tenantId, a user switching tenants with the same studentId would
// receive cached data from the previous tenant until the query refetches.
export const progressKeys = {
  all: (tenantId: string, studentId: string) => ['progress', tenantId, studentId] as const,
  detail: (tenantId: string, studentId: string, id: string) =>
    ['progress', tenantId, studentId, id] as const,
  list: (tenantId: string, studentId: string, filters?: Record<string, unknown>) =>
    ['progress', 'list', tenantId, studentId, filters] as const,
  summary: (tenantId: string, userId: string) => ['progress', tenantId, userId, 'summary'] as const,
  achievements: (tenantId: string, userId: string) =>
    ['progress', tenantId, userId, 'achievements'] as const,
  modules: (tenantId: string) => ['progress', tenantId, 'modules'] as const,
}

/**
 * Query hook untuk daftar Kemajuan siswa.
 */
export function useProgressList(studentId: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: progressKeys.all(tenantId ?? '', studentId),
    queryFn: () => progressService.getStudentProgress(studentId, tenantId!),
    enabled: !!studentId && !!tenantId,
  })
}

/**
 * Query hook untuk ringkasan progres siswa: XP, modul, dan lesson progress.
 */
export function useStudentProgressSummary(userId: string) {
  const { tenantId } = useAuth()

  const xpQuery = useQuery({
    queryKey: [...progressKeys.summary(tenantId ?? '', userId), 'xp'],
    queryFn: () => studentProgressService.fetchXP(userId, tenantId!),
    enabled: !!userId && !!tenantId,
  })

  const modulesQuery = useQuery({
    queryKey: progressKeys.modules(tenantId ?? ''),
    queryFn: () => studentProgressService.fetchModules(tenantId!, userId),
    enabled: !!tenantId,
  })

  const lessonProgressQuery = useQuery({
    queryKey: [...progressKeys.summary(tenantId ?? '', userId), 'lessons'],
    queryFn: () => studentProgressService.fetchLessonProgress(userId, tenantId!),
    enabled: !!userId && !!tenantId,
  })

  const isLoading = xpQuery.isLoading || modulesQuery.isLoading || lessonProgressQuery.isLoading
  const isError = xpQuery.isError || modulesQuery.isError || lessonProgressQuery.isError
  const error = xpQuery.error ?? modulesQuery.error ?? lessonProgressQuery.error

  const lessonProgressData = lessonProgressQuery.data ?? {}
  const completedCount = Object.values(lessonProgressData).filter(
    (lp) => lp.status === 'completed'
  ).length

  return {
    xp: xpQuery.data ?? 0,
    modules: modulesQuery.data ?? [],
    lessonProgress: lessonProgressData,
    completedCount,
    isLoading,
    isError,
    error,
  }
}

/**
 * Query hook untuk daftar pencapaian/badge siswa.
 */
export function useStudentAchievements(userId: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: progressKeys.achievements(tenantId ?? '', userId),
    queryFn: () => studentProgressService.fetchAchievements(userId, tenantId!),
    enabled: !!userId && !!tenantId,
  })
}
