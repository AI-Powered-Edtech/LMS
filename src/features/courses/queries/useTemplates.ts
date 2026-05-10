import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { logDevWarn } from "@/utils/logDevError";

import { ContentTemplate, templateService } from "../api/templateService";
import { courseKeys } from "./courseKeys";

export function useTemplates(type: "course" | "module" | "lesson") {
  const { tenantId } = useAuth();
  return useQuery<ContentTemplate[]>({
    queryKey: ["content-templates", type, tenantId],
    queryFn: () => templateService.fetchTemplates(type, tenantId ?? ""),
    enabled: !!type && !!tenantId,
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: ({
      type,
      title,
      description,
      sourceId,
    }: {
      type: "course" | "module" | "lesson";
      title: string;
      description: string;
      sourceId: string;
      /** Pass tenantId in variables to avoid stale closure capture */
      tenantId?: string;
    }) => templateService.saveTemplate(type, title, description, sourceId),
    onSuccess: (_, variables) => {
      // Use variables.tenantId (fresh at call time) instead of closure tenantId
      const tid = variables.tenantId ?? tenantId;
      void queryClient.invalidateQueries({
        queryKey: ["content-templates", variables.type, tid],
      });
    },
  });
}

export function useImportTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: ({
      templateId,
      targetId,
      order,
      courseId: _courseId,
    }: {
      templateId: string;
      targetId: string;
      order?: number;
      /** Optional courseId to narrow cache invalidation to the specific course */
      courseId?: string;
      /** Pass tenantId in variables to avoid stale closure capture */
      tenantId?: string;
    }) => templateService.importTemplate(templateId, targetId, order),
    onSuccess: (_, variables) => {
      // Use variables.tenantId (fresh at call time); fall back to closure with warning
      const tid = variables.tenantId ?? tenantId;
      if (!variables.tenantId && tenantId) {
        logDevWarn(
          "useImportTemplate",
          "tenantId not passed in variables — using closure value (potential stale closure)",
        );
      }

      if (tid && variables.courseId) {
        // Narrow invalidation: only the specific course's builder cache
        void queryClient.invalidateQueries({
          queryKey: courseKeys.builder(tid, variables.courseId),
        });
        void queryClient.invalidateQueries({
          queryKey: courseKeys.detail(tid, variables.courseId),
        });
      } else if (tid) {
        // Broader fallback if courseId not provided
        void queryClient.invalidateQueries({ queryKey: courseKeys.lists(tid) });
      } else {
        // Ultimate fallback when tenant context is unavailable:
        // invalidate all courses-scope queries without fabricating empty tenantId.
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === "courses",
        });
      }
    },
  });
}
