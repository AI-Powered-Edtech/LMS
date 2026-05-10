import { useCallback, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { captureError } from "@/utils/sentry";

import { lessonService } from "../api/lessonService";
import type { Lesson } from "../types";

/**
 * Hook yang mengelola offline sync queue secara terpisah dari UI state.
 *
 * Sebelumnya, semua queue operations ada di dalam useLessonViewerState yang
 * berjalan di critical render path. Hook ini memisahkan queue management
 * agar tidak memblok first meaningful paint lesson viewer.
 *
 * Usage:
 *   const sync = useOfflineSync({ lesson, moduleId })
 *   sync.handleProgressUpdate(...)
 *   sync.handleCompletionMet(...)
 */
interface UseOfflineSyncParams {
  lesson: Lesson | null;
  moduleId: string | null;
  onSyncComplete?: () => void;
}

export function useOfflineSync({
  lesson,
  moduleId,
  onSyncComplete,
}: UseOfflineSyncParams) {
  const { user, tenantId } = useAuth();
  const { addToast } = useToast();
  const lastVideoUpdateRef = useRef(0);

  /**
   * Antri update progress ke offline queue.
   * Menggunakan requestIdleCallback (atau setTimeout fallback) agar
   * tidak memblok render cycle utama.
   */
  const queueUpdate = useCallback((updateFn: () => Promise<void>) => {
    const schedule =
      globalThis.requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 50));
    schedule(async () => {
      try {
        await updateFn();
      } catch (err) {
        captureError(err, { tags: { feature: "offline-sync-queue" } });
      }
    });
  }, []);

  /**
   * Update resume anchor (posisi terakhir di lesson).
   */
  const handleResumeAnchorUpdate = useCallback(
    (anchor: {
      lastBlockId: string;
      lastBlockIndex: number;
      lastBlockOffset: number;
    }) => {
      if (!lesson || !user || !moduleId || !tenantId) return;
      queueUpdate(async () => {
        await lessonService.queueProgressUpdate(
          lesson.id,
          tenantId,
          "in_progress",
          0,
          undefined,
          {
            lastBlockId: anchor.lastBlockId,
            lastBlockIndex: anchor.lastBlockIndex,
            lastBlockOffset: anchor.lastBlockOffset,
          },
        );
      });
    },
    [lesson, moduleId, tenantId, user, queueUpdate],
  );

  /**
   * Update posisi video (throttled 10 detik).
   */
  const handleVideoTimeUpdate = useCallback(
    async (blockId: string, seconds: number) => {
      if (!lesson || !user || !moduleId || !tenantId) return;

      const now = Date.now();
      if (now - lastVideoUpdateRef.current < 10_000) return;
      lastVideoUpdateRef.current = now;

      queueUpdate(async () => {
        await lessonService.queueProgressUpdate(
          lesson.id,
          tenantId,
          "in_progress",
          0,
          undefined,
          {
            lastBlockId: blockId,
            lastVideoPosition: seconds,
          },
        );
      });
    },
    [lesson, moduleId, tenantId, user, queueUpdate],
  );

  /**
   * Tandai lesson selesai.
   */
  const handleCompletionMet = useCallback(async () => {
    if (!lesson || !tenantId) return;
    try {
      await lessonService.completeLesson(lesson.id, tenantId);
      onSyncComplete?.();
    } catch (err) {
      captureError(err, { tags: { feature: "offline-sync-complete" } });
      addToast({
        type: "error",
        message: "Gagal menyimpan progress. Akan dicoba ulang saat online.",
      });
    }
  }, [lesson, tenantId, onSyncComplete, addToast]);

  /**
   * Update progress (dipanggil saat siswa navigasi antar block/lesson).
   */
  const handleProgressUpdate = useCallback(
    (percentage: number, position?: number) => {
      if (!lesson || !user || !moduleId || !tenantId) return;
      queueUpdate(async () => {
        await lessonService.queueProgressUpdate(
          lesson.id,
          tenantId,
          "in_progress",
          percentage,
          position,
        );
      });
    },
    [lesson, moduleId, tenantId, user, queueUpdate],
  );

  return {
    handleProgressUpdate,
    handleResumeAnchorUpdate,
    handleVideoTimeUpdate,
    handleCompletionMet,
  };
}
