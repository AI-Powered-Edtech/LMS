import { type Dispatch, useCallback } from "react";

import { useToast } from "@/hooks/useToast";
import { DomainLesson } from "@/shared/types/lessonTypes";
import { logger } from "@/utils/logger";
import { captureError } from "@/utils/sentry";

import { builderBlockService } from "./api/blockService";
import { builderLessonService } from "./api/lessonService";
import type { BuilderAction, BuilderState } from "./builderReducer";

export function useLessonActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState["savingStatus"]) => void,
) {
  const addToast = useToast((s) => s.addToast);

  const addLesson = useCallback(
    async (moduleId: string, type: string, title: string) => {
      if (!tenantId) return;
      try {
        const lesson = await builderLessonService.createLesson(
          moduleId,
          type,
          title,
          tenantId,
        );
        dispatch({ type: "ADD_LESSON", moduleId, lesson });
      } catch (err: unknown) {
        if (import.meta.env.DEV) logger.error("Failed to add lesson:", err);
        addToast({
          type: "error",
          message:
            "Gagal menambah materi: " +
            (err instanceof Error ? err.message : "Kesalahan tidak diketahui"),
        });
      }
    },
    [tenantId, dispatch, addToast],
  );

  const updateLesson = useCallback(
    async (lessonId: string, data: Partial<DomainLesson>) => {
      if (!tenantId) return;
      // Find previous lesson data for rollback
      const prevLesson = state.modules
        .flatMap((m) => m.lessons)
        .find((l) => l.id === lessonId);

      dispatch({ type: "UPDATE_LESSON", lessonId, data });
      setSavingStatus("saving");
      try {
        await builderLessonService.updateLesson(lessonId, tenantId, data);
        setSavingStatus("saved");
      } catch (err: unknown) {
        // Rollback to previous state
        if (prevLesson) {
          dispatch({ type: "UPDATE_LESSON", lessonId, data: prevLesson });
        }
        setSavingStatus("error");
        addToast({
          type: "error",
          message:
            "Gagal menyimpan perubahan: " +
            (err instanceof Error ? err.message : "Kesalahan tidak diketahui"),
        });
      }
    },
    [state.modules, tenantId, dispatch, setSavingStatus, addToast],
  );

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return;

      // Save current modules for rollback
      const previousModules = state.modules;

      dispatch({ type: "DELETE_LESSON", lessonId });
      try {
        await builderLessonService.deleteLesson(lessonId, tenantId);
      } catch (err: unknown) {
        // Rollback: restore modules to pre-delete state
        dispatch({ type: "SET_MODULES", modules: previousModules });
        if (import.meta.env.DEV) logger.error("Failed to delete lesson:", err);
        addToast({
          type: "error",
          message:
            "Gagal menghapus materi: " +
            (err instanceof Error ? err.message : "Kesalahan tidak diketahui"),
        });
      }
    },
    [state.modules, tenantId, dispatch, addToast],
  );

  const reorderLessons = useCallback(
    async (lessonIds: string[]) => {
      const previousModules = state.modules;
      // Bolt: Use Set for O(1) membership check instead of O(n) array includes
      const lessonIdsSet = new Set(lessonIds);

      const updatedModules = state.modules.map((m) => {
        const isTargetModule = m.lessons.some((l) => lessonIdsSet.has(l.id));
        if (!isTargetModule) return m;

        // Bolt: Use Map for O(1) lookup instead of O(n) find()
        const lessonMap = new Map(m.lessons.map((l) => [l.id, l]));

        const newLessons = lessonIds
          .map((id) => lessonMap.get(id))
          .filter(Boolean)
          .map((l, idx) => ({ ...l!, orderIndex: idx }));

        return { ...m, lessons: newLessons as DomainLesson[] };
      });

      dispatch({ type: "SET_MODULES", modules: updatedModules });

      const targetMod = state.modules.find((m) =>
        m.lessons.some((l) => lessonIdsSet.has(l.id)),
      );
      if (targetMod && tenantId) {
        try {
          await builderLessonService.reorderLessons(
            targetMod.id,
            lessonIds,
            tenantId,
          );
        } catch (error: unknown) {
          if (import.meta.env.DEV)
            logger.error("Failed to reorder lessons", error);
          dispatch({ type: "SET_MODULES", modules: previousModules });
          addToast({
            type: "error",
            message:
              "Gagal mengubah urutan materi: " +
              (error instanceof Error
                ? error.message
                : "Kesalahan tidak diketahui"),
          });
        }
      }
    },
    [state.modules, tenantId, dispatch, addToast],
  );

  const selectLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return;
      dispatch({ type: "LOAD_BLOCKS_START", lessonId });
      try {
        const blocks = await builderBlockService.fetchLessonBlocks(
          lessonId,
          tenantId,
        );
        dispatch({ type: "LOAD_BLOCKS_SUCCESS", lessonId, blocks });
      } catch (err) {
        if (import.meta.env.DEV) logger.error("Failed to load blocks:", err);
        captureError(err, {
          context: "useLessonActions.selectLesson",
          lessonId,
        });
        dispatch({
          type: "LOAD_BLOCKS_ERROR",
          error:
            err instanceof Error
              ? err.message
              : "Gagal memuat konten pelajaran",
        });
        addToast({
          type: "error",
          message: "Gagal memuat konten pelajaran. Coba lagi.",
        });
      }
    },
    [tenantId, dispatch, addToast],
  );

  const closeLesson = useCallback(() => {
    dispatch({ type: "CLOSE_LESSON" });
  }, [dispatch]);

  return {
    addLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    selectLesson,
    closeLesson,
  };
}
