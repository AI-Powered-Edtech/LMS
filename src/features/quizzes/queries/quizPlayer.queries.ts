// Quiz Player Queries - React Query hooks for student quiz flow
// Part of the Quiz Engine Refactor

import { useQuery } from '@tanstack/react-query'

import { GC, STALE } from '@/src/utils/queryConstants'

import * as quizPlayerService from '../api/quizPlayer.service'
import { QuizKeys } from './queryKeys'

// ============================================
// Query Hooks
// ============================================

/**
 * Get all quiz assignments for the current student
 */
export function useStudentQuizAssignments(tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.studentAssignments(tenantId ?? ''),
    queryFn: () => quizPlayerService.getStudentQuizAssignments(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  })
}

/**
 * Get all attempts for the current user
 */
export function useUserAttempts(tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.userAttempts(tenantId ?? ''),
    queryFn: () => quizPlayerService.getUserAttempts(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  })
}
