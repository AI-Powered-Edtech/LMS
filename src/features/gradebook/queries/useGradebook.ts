import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'
import { STALE } from '@/src/utils/queryConstants'

import {
  fetchGradebookEntries,
  fetchGradebookSettings,
  syncGradebook,
  updateGradebookEntry,
  upsertGradebookSettings,
} from '../api/gradebookApi'
import type { GradebookEntry, GradebookSettings } from '../types'

// ── Query keys ───────────────────────────────────────────────────────────────

export const gradebookKeys = {
  all: ['gradebook'] as const,
  entries: (courseId: string) => ['gradebook', 'entries', courseId] as const,
  settings: (courseId: string) => ['gradebook', 'settings', courseId] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Mengambil semua entri gradebook untuk satu kursus.
 */
export function useGradebookEntries(courseId: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: gradebookKeys.entries(courseId),
    queryFn: () => fetchGradebookEntries(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
    staleTime: STALE.DYNAMIC,
  })
}

/**
 * Mengambil pengaturan gradebook untuk satu kursus.
 */
export function useGradebookSettings(courseId: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: gradebookKeys.settings(courseId),
    queryFn: () => fetchGradebookSettings(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
    staleTime: STALE.DYNAMIC,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Memperbarui score/notes/grade_letter satu entri.
 * Invalidasi otomatis semua entri gradebook kursus bersangkutan.
 */
export function useUpdateGradebookEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      courseId: string
      updates: Partial<Pick<GradebookEntry, 'score' | 'notes' | 'grade_letter'>>
    }) => updateGradebookEntry(id, updates),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: gradebookKeys.entries(variables.courseId),
      })
    },
  })
}

/**
 * Memanggil sync_gradebook_entries dan menyegarkan semua data gradebook.
 */
export function useSyncGradebook() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (courseId: string) => syncGradebook(courseId, tenantId!),
    onSuccess: (_data, courseId) => {
      queryClient.invalidateQueries({ queryKey: gradebookKeys.entries(courseId) })
    },
  })
}

/**
 * Menyimpan (insert atau update) pengaturan gradebook.
 */
export function useUpsertGradebookSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Omit<GradebookSettings, 'id'>) => upsertGradebookSettings(settings),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: gradebookKeys.settings(data.course_id) })
    },
  })
}
