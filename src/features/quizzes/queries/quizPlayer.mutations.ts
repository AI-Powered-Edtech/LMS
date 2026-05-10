// Quiz Player Mutations - React Query mutations for student quiz flow
// Part of the Quiz Engine Refactor

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { captureError } from "@/utils/sentry";

import * as quizPlayerService from "../api/quizPlayer.service";
import type {
  QuizAttempt,
  StartQuizAttemptInput,
  SubmitAnswer,
} from "../types/quizzes.types";
import { QuizKeys } from "./queryKeys";

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
    mutationFn: (input: StartQuizAttemptInput) =>
      quizPlayerService.startQuizAttempt(input),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: QuizKeys.studentAssignments(tenantId),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useStartQuizAttempt" });
      useToast.getState().addToast({
        type: "error",
        message: "Gagal memulai kuis. Silakan coba lagi.",
      });
    },
  });
}

/**
 * Submit a quiz attempt
 *
 * Optimistic update: immediately marks the attempt as SUBMITTED in the
 * userAttempts cache so the UI can transition without waiting for the server.
 * Rolls back to IN_PROGRESS and shows an error toast if the server call fails.
 */
export function useSubmitQuizAttempt() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
      version,
    }: {
      attemptId: string;
      answers: SubmitAnswer[];
      version?: number;
    }) => quizPlayerService.submitQuizAttempt(attemptId, answers, version),
    onMutate: async ({ attemptId }) => {
      if (!tenantId) return;

      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: QuizKeys.userAttempts(tenantId),
      });

      // Snapshot current attempts list for rollback
      const previousAttempts = queryClient.getQueryData<QuizAttempt[]>(
        QuizKeys.userAttempts(tenantId),
      );

      // Optimistically mark the attempt as SUBMITTED in the cache
      queryClient.setQueryData<QuizAttempt[]>(
        QuizKeys.userAttempts(tenantId),
        (old) => {
          if (!old) return old;
          return old.map((attempt) =>
            attempt.id === attemptId
              ? {
                  ...attempt,
                  status: "SUBMITTED",
                  submitted_at: new Date().toISOString(),
                }
              : attempt,
          );
        },
      );

      return { previousAttempts };
    },
    onError: (err, variables, context) => {
      captureError(err, {
        context: "useSubmitQuizAttempt",
        attemptId: variables.attemptId,
      });

      // Roll back the optimistic update on error
      if (tenantId && context?.previousAttempts !== undefined) {
        queryClient.setQueryData(
          QuizKeys.userAttempts(tenantId),
          context.previousAttempts,
        );
      }

      useToast.getState().addToast({
        type: "error",
        message: "Gagal menyimpan. Perubahan dikembalikan.",
        description:
          "Gagal mengirim jawaban kuis. Periksa koneksi internet Anda dan coba kirim ulang.",
      });
    },
    onSettled: () => {
      // Always sync with server after mutation completes (success or error)
      if (tenantId) {
        void queryClient.invalidateQueries({
          queryKey: QuizKeys.userAttempts(tenantId),
        });
        void queryClient.invalidateQueries({
          queryKey: QuizKeys.studentAssignments(tenantId),
        });
      }
    },
  });
}
