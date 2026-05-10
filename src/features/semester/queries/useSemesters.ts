import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { STALE } from "@/utils/queryConstants";
import { captureError } from "@/utils/sentry";

import {
  cloneCourseToSemester,
  closeSemester,
  createSemester,
  fetchSemesterById,
  fetchSemesters,
  promoteStudentsToNextClass,
  updateSemester,
} from "../api/semesterService";
import type { SemesterFormData } from "../types";

export const semesterKeys = {
  all: ["semesters"] as const,
  list: (tenantId: string) => ["semesters", "list", tenantId] as const,
  detail: (id: string) => ["semesters", "detail", id] as const,
  reportCard: (semesterId: string, studentId: string) =>
    ["semesters", "report-card", semesterId, studentId] as const,
};

export function useSemesters() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: semesterKeys.list(tenantId!),
    queryFn: () => fetchSemesters(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
  });
}

export function useSemester(id: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: semesterKeys.detail(id),
    queryFn: () => fetchSemesterById(id, tenantId!),
    enabled: !!id && !!tenantId,
    staleTime: STALE.DYNAMIC,
  });
}

export function useCreateSemester() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: (data: SemesterFormData) => createSemester(data, tenantId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: semesterKeys.list(tenantId!),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useCreateSemester" });
    },
  });
}

export function useUpdateSemester() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SemesterFormData>;
    }) => updateSemester(id, data, tenantId!),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: semesterKeys.detail(id) });
      void queryClient.invalidateQueries({
        queryKey: semesterKeys.list(tenantId!),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useUpdateSemester" });
    },
  });
}

export function useCloseSemester() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: (id: string) => closeSemester(id, tenantId!),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: semesterKeys.detail(id) });
      void queryClient.invalidateQueries({
        queryKey: semesterKeys.list(tenantId!),
      });
    },
    onError: (err) => {
      captureError(err, { context: "useCloseSemester" });
    },
  });
}

export function useCloneCourseToSemester() {
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: ({
      courseId,
      targetSemesterId,
    }: {
      courseId: string;
      targetSemesterId: string;
    }) => cloneCourseToSemester(courseId, targetSemesterId, tenantId!),
    onError: (err) => {
      captureError(err, { context: "useCloneCourseToSemester" });
    },
  });
}

export function usePromoteStudents() {
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: ({
      studentIds,
      newClass,
    }: {
      studentIds: string[];
      newClass: string;
    }) => promoteStudentsToNextClass(studentIds, newClass, tenantId!),
    onError: (err) => {
      captureError(err, { context: "usePromoteStudents" });
    },
  });
}
