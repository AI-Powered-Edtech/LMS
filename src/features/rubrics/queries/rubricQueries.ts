import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { STALE } from '@/utils/queryConstants'

import { rubricService } from '../api/rubricService'
import type { Rubric, RubricInsert, RubricScore } from '../types'
import { rubricQueryKeys } from './rubricKeys'

/**
 * Fetch a rubric associated with an assignment (with full criteria + levels).
 * Returns null if no rubric has been created for the assignment.
 */
export function useRubricByAssignment(assignmentId: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: rubricQueryKeys.byAssignment(tenantId ?? '', assignmentId ?? ''),
    queryFn: () => rubricService.getRubricByAssignment(assignmentId!, tenantId!),
    enabled: !!assignmentId && !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Fetch all rubric templates for the current tenant.
 */
export function useRubricTemplates(tenantId: string | null) {
  return useQuery({
    queryKey: rubricQueryKeys.templates(tenantId ?? ''),
    queryFn: () => rubricService.getRubricTemplates(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
  })
}

/**
 * Fetch all rubric scores for a specific submission.
 */
export function useRubricScores(submissionId: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: rubricQueryKeys.scores(tenantId ?? '', submissionId ?? ''),
    queryFn: () => rubricService.getRubricScores(submissionId!, tenantId!),
    enabled: !!submissionId && !!tenantId,
    staleTime: STALE.DYNAMIC,
  })
}

/**
 * Mutation to save (create or update) a rubric.
 * Invalidates rubric queries on success.
 */
export function useSaveRubric() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rubric: RubricInsert & { id?: string }) => rubricService.saveRubric(rubric),
    onSuccess: (_data, variables) => {
      // Invalidate all rubric queries — tenantId is embedded in the server-side RLS
      void queryClient.invalidateQueries({ queryKey: ['rubrics'] })
      // Also invalidate the assignment-specific key if we have it
      if (variables.assignment_id) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.includes('assignment') &&
            query.queryKey.includes(variables.assignment_id!),
        })
      }
    },
  })
}

/**
 * Mutation to save rubric scores for a submission.
 * Invalidates rubric score queries on success.
 */
export function useScoreSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ submissionId, scores }: { submissionId: string; scores: RubricScore[] }) =>
      rubricService.scoreSubmission(submissionId, scores),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes('scores') &&
          query.queryKey.includes(variables.submissionId),
      })
    },
  })
}

/**
 * Mutation to delete a rubric. Invalidates all rubric queries on success.
 */
export function useDeleteRubric() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ rubricId, tenantId }: { rubricId: string; tenantId: string }) =>
      rubricService.deleteRubric(rubricId, tenantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rubrics'] })
    },
  })
}

/**
 * Fetch a single rubric by ID (used by template import to load full rubric data).
 */
export function useRubricById(rubricId: string | null) {
  return useQuery<Rubric | null>({
    queryKey: ['rubrics', 'detail', rubricId],
    queryFn: () => rubricService.getRubricById(rubricId!),
    enabled: !!rubricId,
    staleTime: STALE.MODERATE,
  })
}
