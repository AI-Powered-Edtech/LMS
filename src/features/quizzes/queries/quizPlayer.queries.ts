// Quiz Player Queries - React Query hooks for student quiz flow
// Part of the Quiz Engine Refactor

import { useQuery } from '@tanstack/react-query';
import * as quizPlayerService from '../api/quizPlayer.service';
import { QuizKeys } from './queryKeys';

// ============================================
// Query Hooks
// ============================================

/**
 * Get all quiz assignments for the current student
 */
export function useStudentQuizAssignments(tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.studentAssignments(tenantId),
    queryFn: () => quizPlayerService.getStudentQuizAssignments(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Get all attempts for the current user
 */
export function useUserAttempts(tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.userAttempts(tenantId),
    queryFn: () => quizPlayerService.getUserAttempts(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Get questions for a specific attempt
 */
export function useAttemptQuestions(attemptId: string | null, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.attemptQuestions(attemptId, tenantId),
    queryFn: () => quizPlayerService.getAttemptQuestions(attemptId!),
    enabled: !!attemptId && !!tenantId,
  });
}

/**
 * Get active attempt for a quiz (for resume functionality)
 */
export function useActiveAttempt(
  quizId: string | null,
  tenantId: string | undefined,
  assignmentId?: string | null
) {
  return useQuery({
    queryKey: QuizKeys.activeAttempt(quizId, tenantId, assignmentId),
    queryFn: () => quizPlayerService.getActiveAttempt(quizId!, tenantId!, assignmentId),
    enabled: !!quizId && !!tenantId,
  });
}
