import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { STALE } from "@/utils/queryConstants";
import { captureError } from "@/utils/sentry";

import {
  fetchGradebookEntries,
  fetchGradebookSettings,
  syncGradebook,
  updateGradebookEntry,
  upsertGradebookSettings,
} from "../api/gradebookApi";
import type { GradebookEntry, GradebookSettings } from "../types";

// ── Query keys ───────────────────────────────────────────────────────────────

export const gradebookKeys = {
  all: ["gradebook"] as const,
  entries: (courseId: string) => ["gradebook", "entries", courseId] as const,
  settings: (courseId: string) => ["gradebook", "settings", courseId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Mengambil semua entri gradebook untuk satu kursus.
 */
export function useGradebookEntries(courseId: string) {
  const { tenantId, activeRole } = useAuth();
  const shouldPoll = activeRole === "teacher" || activeRole === "admin";

  return useQuery({
    queryKey: gradebookKeys.entries(courseId),
    queryFn: () => fetchGradebookEntries(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: shouldPoll ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Mengambil pengaturan gradebook untuk satu kursus.
 */
export function useGradebookSettings(courseId: string) {
  const { tenantId, activeRole } = useAuth();
  const shouldPoll = activeRole === "teacher" || activeRole === "admin";

  return useQuery({
    queryKey: gradebookKeys.settings(courseId),
    queryFn: () => fetchGradebookSettings(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: shouldPoll ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Memperbarui score/notes/grade_letter satu entri.
 * Invalidasi otomatis semua entri gradebook kursus bersangkutan.
 */
export function useUpdateGradebookEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      courseId: string;
      updates: Partial<
        Pick<GradebookEntry, "score" | "notes" | "grade_letter">
      >;
    }) => updateGradebookEntry(id, updates),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gradebookKeys.entries(variables.courseId),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useUpdateGradebookEntry" });
    },
  });
}

/**
 * Memanggil sync_gradebook_entries dan menyegarkan semua data gradebook.
 */
export function useSyncGradebook() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => syncGradebook(courseId, tenantId!),
    onSuccess: (_data, courseId) => {
      void queryClient.invalidateQueries({
        queryKey: gradebookKeys.entries(courseId),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useSyncGradebook" });
    },
  });
}

/**
 * Menyimpan (insert atau update) pengaturan gradebook.
 */
export function useUpsertGradebookSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Omit<GradebookSettings, "id">) =>
      upsertGradebookSettings(settings),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: gradebookKeys.settings(data.course_id),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useUpsertGradebookSettings" });
    },
  });
}
