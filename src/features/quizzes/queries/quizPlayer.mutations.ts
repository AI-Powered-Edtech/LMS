// Quiz Player Mutations - React Query mutations for student quiz flow
// Part of the Quiz Engine Refactor

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import * as quizPlayerService from '../api/quizPlayer.service';
import { QuizKeys } from './queryKeys';
import type { StartQuizAttemptInput, SubmitAnswer } from '../types/quizzes.types';

// ============================================
// Mutation Hooks
// ============================================

/**
 * Start a new quiz attempt
 */
export function useStartQuizAttempt() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartQuizAttemptInput) => quizPlayerService.startQuizAttempt(input),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: QuizKeys.studentAssignments(tenantId) });
      }
    },
  });
}

/**
 * Submit a quiz attempt
 */
export function useSubmitQuizAttempt() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, answers, version }: { attemptId: string; answers: SubmitAnswer[]; version?: number }) =>
      quizPlayerService.submitQuizAttempt(attemptId, answers, version),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: QuizKeys.userAttempts(tenantId) });
        queryClient.invalidateQueries({ queryKey: QuizKeys.studentAssignments(tenantId) });
      }
    },
  });
}

/**
 * Batch save answers (for autosave)
 */
export function useBatchSaveAnswers() {
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: SubmitAnswer[] }) =>
      quizPlayerService.batchSaveAnswers(attemptId, answers),
  });
}

/**
 * Save a single answer (immediate save)
 */
export function useSaveQuizAnswer() {
  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      answer,
    }: {
      attemptId: string;
      questionId: string;
      answer: { selected_option_ids?: string[]; text_answer?: string; selected_option_id?: string };
    }) => quizPlayerService.saveQuizAnswer(attemptId, questionId, answer),
  });
}

/**
 * Record cheating signal
 */
export function useRecordCheatingSignal() {
  return useMutation({
    mutationFn: ({
      attemptId,
      signalType,
      metadata,
    }: {
      attemptId: string;
      signalType: string;
      metadata?: Record<string, unknown>;
    }) => quizPlayerService.recordCheatingSignal(attemptId, signalType, metadata),
  });
}

/**
 * Record heartbeat
 */
export function useRecordHeartbeat() {
  return useMutation({
    mutationFn: (attemptId: string) => quizPlayerService.recordHeartbeat(attemptId),
  });
}
