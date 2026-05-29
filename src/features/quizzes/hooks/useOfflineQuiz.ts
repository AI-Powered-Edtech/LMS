/**
 * Offline Quiz Synchronization Hook
 *
 * Manages offline quiz taking with automatic sync when connection resumes.
 * Uses existing IndexedDB infrastructure from offlineStorage.ts and offlineQueue.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/utils/logger";
import { processSyncQueue } from "@/utils/offlineQueue";
import type { SyncQueueItem } from "@/utils/offlineStorage";
import { addToSyncQueue, getPendingCount } from "@/utils/offlineStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CachedAnswer {
  questionId: string;
  answer: string | string[] | number;
  timestamp: number;
}

interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
}

interface UseOfflineQuizOptions {
  quizId: string;
  _attemptId?: string;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

interface OfflineQuizState {
  isOnline: boolean;
  cachedAnswers: CachedAnswer[];
  syncStatus: SyncStatus;
  lastSyncAt?: Date;
  isLoading: boolean;
  error?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQuiz(options: UseOfflineQuizOptions) {
  const { quizId, onSyncComplete, onSyncError } = options;

  const [state, setState] = useState<OfflineQuizState>(() => {
    const initialState: OfflineQuizState = {
      isOnline: navigator.onLine,
      cachedAnswers: [] as CachedAnswer[],
      syncStatus: { pending: 0, synced: 0, failed: 0 },
      isLoading: false,
    };
    return initialState;
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // ─── Load Cached Answers ──────────────────────────────────────────────────

  const loadCachedAnswers = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      cachedAnswers: prev.cachedAnswers,
    }));
  }, []);

  // ─── Cache Answer ─────────────────────────────────────────────────────────

  const cacheAnswer = useCallback(
    async (questionId: string, answer: string | string[] | number) => {
      try {
        await addToSyncQueue({
          id: `quiz-${quizId}-${questionId}-${Date.now()}`,
          type: "quiz-submission",
          payload: {
            quizId,
            questionId,
            answer,
          },
          status: "pending",
          createdAt: Date.now(),
        } as Omit<SyncQueueItem, "attempts">);

        setState((prev) => ({
          ...prev,
          cachedAnswers: [
            ...prev.cachedAnswers.filter((a) => a.questionId !== questionId),
            {
              questionId,
              answer: answer as string | string[] | number,
              timestamp: Date.now(),
            },
          ],
        }));

        if (navigator.onLine) {
          void submitPendingAnswers();
        }
      } catch (error) {
        logger.error("[OfflineQuiz] Failed to cache answer:", error);
      }
    },
    [quizId],
  );

  // ─── Submit All Pending Answers ───────────────────────────────────────────

  const submitPendingAnswers = useCallback(async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: undefined,
    }));

    try {
      await processSyncQueue();

      const pending = await getPendingCount();
      setState((prev) => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          pending,
        },
        lastSyncAt: new Date(),
      }));

      await loadCachedAnswers();
      onSyncComplete?.();
    } catch (error) {
      logger.error("[OfflineQuiz] Failed to sync answers:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Sinkronisasi gagal",
      }));
      onSyncError?.(error instanceof Error ? error : new Error("Sync failed"));
    } finally {
      isSyncingRef.current = false;
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [loadCachedAnswers, onSyncComplete, onSyncError]);

  // ─── Online/Offline Detection ─────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: true,
      }));

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        void submitPendingAnswers();
      }, 2000);
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [submitPendingAnswers]);

  useEffect(() => {
    void loadCachedAnswers();
  }, [loadCachedAnswers]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    cacheAnswer,
    submitPendingAnswers,
    reloadCachedAnswers: loadCachedAnswers,
  };
}

