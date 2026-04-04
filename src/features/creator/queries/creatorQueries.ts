import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE, GC } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import { creatorService } from '../api/creatorService'
import type { GenerateAIContentResponse } from '../types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

const base = createQueryKeys('ai-creator')

export const creatorKeys = {
  ...base,
  history: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'history', userId] as const,
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mutation to generate AI content from a file.
 * Invalidates history on success.
 */
export function useGenerateAIContent() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => creatorService.generateAIContent(formData),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: creatorKeys.history(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useGenerateAIContent' })
    },
  })
}

/**
 * Query to fetch AI generation history.
 */
export function useAIContentHistory() {
  const { user, tenantId } = useAuth()

  return useQuery({
    queryKey: creatorKeys.history(tenantId!, user!.id),
    queryFn: () => creatorService.fetchHistory(user!.id),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  })
}

/**
 * Mutation to mark content as used.
 */
export function useMarkContentUsed() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => creatorService.markAsUsed(id),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: creatorKeys.history(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useMarkContentUsed' })
    },
  })
}

/**
 * Mutation to update saved questions.
 */
export function useUpdateGenerationQuestions() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, questions }: { id: string; questions: unknown[] }) =>
      creatorService.updateQuestions(id, questions),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: creatorKeys.history(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useUpdateGenerationQuestions' })
    },
  })
}

/**
 * Mutation to delete a generation from history.
 */
export function useDeleteGeneration() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => creatorService.deleteGeneration(id),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: creatorKeys.history(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useDeleteGeneration' })
    },
  })
}

/**
 * Re-export GenerateAIContentResponse for convenience.
 */
export type { GenerateAIContentResponse }
