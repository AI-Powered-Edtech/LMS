import { useCallback, useEffect, useRef, useState } from "react";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { db } from "@/services/db";
import { logger } from "@/utils/logger";
import {
  type BuilderDraft,
  deleteBuilderDraft,
  getBuilderDraftRecord,
  saveBuilderDraft,
} from "@/utils/offlineStorage";

import type { BuilderState } from "./builderReducer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConflictDialogState {
  isOpen: boolean;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  pendingDraft: BuilderDraft | null;
}

interface OfflineState {
  isOnline: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  hasPendingDraft: boolean;
  saveNow: () => Promise<void>;
  syncToServer: () => Promise<void>;
  conflictDialog: ConflictDialogState | null;
  handleConflictUseLocal: () => Promise<void>;
  handleConflictUseServer: () => void;
  dismissConflictDialog: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuilderOffline(
  courseId: string | null,
  state: BuilderState,
  syncFn?: () => Promise<void>,
): OfflineState {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [conflictDialog, setConflictDialog] =
    useState<ConflictDialogState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lightweight change-detection refs — avoids expensive JSON.stringify on large state trees
  const stateVersionRef = useRef(0);
  const prevTitleRef = useRef("");
  const prevDescriptionRef = useRef("");
  const prevModulesLengthRef = useRef(0);
  const prevActiveBlocksRef = useRef(0);
  // Track the last state version that was scheduled for save so we can detect new changes
  const lastSavedVersionRef = useRef(-1);

  // Auto-save to IndexedDB every 5 seconds if state changed
  useEffect(() => {
    if (!courseId) return;

    // Detect meaningful changes without serialising the full state tree
    const hasChanged =
      state.courseTitle !== prevTitleRef.current ||
      state.courseDescription !== prevDescriptionRef.current ||
      state.modules.length !== prevModulesLengthRef.current ||
      (state.activeLesson?.blocks.length ?? 0) !== prevActiveBlocksRef.current;

    if (!hasChanged) return;

    // Bump version counter and update tracking refs
    stateVersionRef.current += 1;
    prevTitleRef.current = state.courseTitle;
    prevDescriptionRef.current = state.courseDescription ?? "";
    prevModulesLengthRef.current = state.modules.length;
    prevActiveBlocksRef.current = state.activeLesson?.blocks.length ?? 0;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const capturedVersion = stateVersionRef.current;
    saveTimerRef.current = setTimeout(async () => {
      // Skip if a newer change has already superseded this scheduled save
      if (capturedVersion <= lastSavedVersionRef.current) return;
      try {
        await saveBuilderDraft(courseId, state);
        lastSavedVersionRef.current = capturedVersion;
        setLastSavedAt(new Date());
        setIsDirty(!isOnline);
        setHasPendingDraft(!isOnline);
      } catch {
        // IndexedDB save failed — non-critical
      }
    }, 5000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [courseId, state, isOnline]);

  // ---------------------------------------------------------------------------
  // Core sync helper — calls the upstream syncFn, then updates last_synced_at
  // ---------------------------------------------------------------------------
  const syncDraftToServer = useCallback(
    async (draft: BuilderDraft) => {
      if (!courseId) return;
      if (syncFn) {
        await syncFn();
      }
      // Update the stored draft with the current sync timestamp so future
      // conflict checks have a correct baseline.
      await saveBuilderDraft(courseId, draft.state, new Date().toISOString());
      await deleteBuilderDraft(courseId);
      setHasPendingDraft(false);
      setIsDirty(false);
    },
    [courseId, syncFn],
  );

  // ---------------------------------------------------------------------------
  // Reconnect handler — check for server-side conflict before syncing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!wasOffline || !isOnline || !hasPendingDraft || !courseId) return;

    const handleReconnect = async () => {
      try {
        // Read the full draft record (includes last_synced_at)
        const draft = await getBuilderDraftRecord(courseId);
        if (!draft) {
          // No local draft — nothing to sync
          resetWasOffline();
          return;
        }

        // Fetch server's updated_at for this course
        const { data: serverCourse } = await db
          .from<any>("courses")
          .select("updated_at")
          .eq("id", courseId)
          .single();

        const serverUpdatedAt = (serverCourse as { updated_at?: string } | null)
          ?.updated_at as string | undefined;

        // Conflict: server has been updated after our last sync
        if (
          serverUpdatedAt &&
          draft.last_synced_at &&
          new Date(serverUpdatedAt) > new Date(draft.last_synced_at)
        ) {
          setConflictDialog({
            isOpen: true,
            localUpdatedAt: String(draft.savedAt),
            serverUpdatedAt,
            pendingDraft: draft,
          });
          // Do NOT call resetWasOffline() yet — we wait for user's choice
          return;
        }

        // No conflict (or no sync baseline) — auto-sync
        await syncDraftToServer(draft);
        resetWasOffline();
      } catch (e) {
        logger.error("[useBuilderOffline] Reconnect sync failed:", e);
        resetWasOffline();
      }
    };

    void handleReconnect();
  }, [
    wasOffline,
    isOnline,
    hasPendingDraft,
    courseId,
    resetWasOffline,
    syncDraftToServer,
  ]);

  // ---------------------------------------------------------------------------
  // Conflict resolution handlers
  // ---------------------------------------------------------------------------

  /** User chose to push local draft to server */
  const handleConflictUseLocal = useCallback(async () => {
    if (conflictDialog?.pendingDraft) {
      try {
        await syncDraftToServer(conflictDialog.pendingDraft);
      } catch (e) {
        logger.error("[useBuilderOffline] handleConflictUseLocal failed:", e);
      }
    }
    setConflictDialog(null);
    resetWasOffline();
  }, [conflictDialog, syncDraftToServer, resetWasOffline]);

  /** User chose to discard local draft and reload server version */
  const handleConflictUseServer = useCallback(() => {
    if (courseId) {
      // Fire-and-forget draft deletion — errors are non-critical
      deleteBuilderDraft(courseId).catch(() => {});
    }
    setConflictDialog(null);
    setHasPendingDraft(false);
    setIsDirty(false);
    resetWasOffline();
    // Reload page to fetch the latest server version
    window.location.reload();
  }, [courseId, resetWasOffline]);

  /** User dismissed dialog without making a choice */
  const dismissConflictDialog = useCallback(() => {
    setConflictDialog(null);
    resetWasOffline();
  }, [resetWasOffline]);

  // ---------------------------------------------------------------------------
  // Manual save / sync
  // ---------------------------------------------------------------------------

  const saveNow = useCallback(async () => {
    if (!courseId) return;
    await saveBuilderDraft(courseId, state);
    setLastSavedAt(new Date());
  }, [courseId, state]);

  const syncToServer = useCallback(async () => {
    if (!courseId) return;
    const draft = await getBuilderDraftRecord(courseId);
    if (draft) {
      await syncDraftToServer(draft);
    } else {
      // No draft in IndexedDB — just run syncFn without draft metadata update
      if (syncFn) await syncFn();
      setHasPendingDraft(false);
      setIsDirty(false);
    }
  }, [courseId, syncFn, syncDraftToServer]);

  return {
    isOnline,
    isDirty,
    lastSavedAt,
    hasPendingDraft,
    saveNow,
    syncToServer,
    conflictDialog,
    handleConflictUseLocal,
    handleConflictUseServer,
    dismissConflictDialog,
  };
}
