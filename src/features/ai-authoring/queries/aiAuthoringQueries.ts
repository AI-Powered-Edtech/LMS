import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { GC, STALE } from "@/utils/queryConstants";
import { captureError } from "@/utils/sentry";

import { aiAuthoringService } from "../api/aiAuthoringService";
import type {
  AIAuthoringQuestion,
  GenerateFromFileResponse,
  GenerateFromLessonConfig,
} from "../types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

const base = createQueryKeys("ai-authoring");

export const aiAuthoringKeys = {
  ...base,
  history: (tenantId: string, userId: string) =>
    [...base.all(tenantId), "history", userId] as const,
};

// ─── File-based Generation ────────────────────────────────────────────────────

/**
 * Mutation to generate AI content (quiz / reading / writing) from an uploaded
 * file. Invalidates history on success so the new entry appears immediately.
 */
export function useGenerateFromFile() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<GenerateFromFileResponse, Error, FormData>({
    mutationFn: (formData: FormData) =>
      aiAuthoringService.generateFromFile(formData),
    onSuccess: () => {
      if (tenantId && user) {
        void queryClient.invalidateQueries({
          queryKey: aiAuthoringKeys.history(tenantId, user.id),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useGenerateFromFile" });
    },
  });
}

// ─── Lesson-based Generation ─────────────────────────────────────────────────

/**
 * Mutation to generate quiz questions from an existing lesson's content.
 * Previously managed with manual useState in AIQuizGeneratorPanel; now lifted
 * to React Query for consistency and automatic history invalidation.
 */
export function useGenerateFromLesson() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: GenerateFromLessonConfig) =>
      aiAuthoringService.generateFromLesson(config),
    onSuccess: () => {
      if (tenantId && user) {
        void queryClient.invalidateQueries({
          queryKey: aiAuthoringKeys.history(tenantId, user.id),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useGenerateFromLesson" });
    },
  });
}

// ─── History Query ────────────────────────────────────────────────────────────

/**
 * Query to fetch the current user's AI generation history (last 20 entries).
 * Refreshes every 30 s (DYNAMIC) and stays cached for 10 min (NORMAL).
 */
export function useAIContentHistory() {
  const { user, tenantId } = useAuth();

  return useQuery({
    queryKey: aiAuthoringKeys.history(tenantId!, user!.id),
    queryFn: () => aiAuthoringService.fetchHistory(user!.id),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.NORMAL,
  });
}

// ─── History Mutations ────────────────────────────────────────────────────────

/**
 * Mutation to mark a generation as used (stamps used_at).
 */
export function useMarkContentUsed() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAuthoringService.markAsUsed(id),
    onSuccess: () => {
      if (tenantId && user) {
        void queryClient.invalidateQueries({
          queryKey: aiAuthoringKeys.history(tenantId, user.id),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useMarkContentUsed" });
    },
  });
}

/**
 * Mutation to persist edited questions back to the saved generation row.
 */
export function useUpdateGenerationQuestions() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      questions,
    }: {
      id: string;
      questions: AIAuthoringQuestion[];
    }) => aiAuthoringService.updateQuestions(id, questions),
    onSuccess: () => {
      if (tenantId && user) {
        void queryClient.invalidateQueries({
          queryKey: aiAuthoringKeys.history(tenantId, user.id),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useUpdateGenerationQuestions" });
    },
  });
}

/**
 * Mutation to permanently delete a generation from history.
 */
export function useDeleteGeneration() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAuthoringService.deleteGeneration(id),
    onSuccess: () => {
      if (tenantId && user) {
        void queryClient.invalidateQueries({
          queryKey: aiAuthoringKeys.history(tenantId, user.id),
        });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useDeleteGeneration" });
    },
  });
}
