import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { STALE } from "@/utils/queryConstants";

import { interactiveBlockService } from "../api/interactiveBlockService";
import type { InteractionProgress } from "../types";
import { interactiveBlockKeys } from "./interactiveBlockKeys";

// ── Query: fetch block progress ──────────────────────────────────

export function useBlockProgress(
  blockId: string | undefined,
  userId: string | undefined,
  tenantId: string | null,
) {
  return useQuery<InteractionProgress | null>({
    queryKey: interactiveBlockKeys.progress(
      tenantId ?? "",
      blockId ?? "",
      userId ?? "",
    ),
    queryFn: () => {
      if (!blockId || !userId || !tenantId) return null;
      return interactiveBlockService.getProgress(blockId, userId, tenantId);
    },
    enabled: Boolean(blockId && userId && tenantId),
    staleTime: STALE.DYNAMIC,
  });
}

// ── Mutation: save block progress ────────────────────────────────

interface SaveProgressVars {
  blockId: string;
  lessonId: string;
  interactionData: Record<string, unknown>;
  isCompleted: boolean;
  score?: number;
  tenantId: string;
  userId: string;
}

export function useSaveBlockProgress() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SaveProgressVars>({
    mutationFn: ({ blockId, lessonId, interactionData, isCompleted, score }) =>
      interactiveBlockService.saveProgress(
        blockId,
        lessonId,
        interactionData,
        isCompleted,
        score,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: interactiveBlockKeys.progress(
          variables.tenantId,
          variables.blockId,
          variables.userId,
        ),
      });
    },
  });
}
