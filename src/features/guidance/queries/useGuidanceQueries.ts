import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { GC, STALE } from "@/utils/queryConstants";
import { captureError } from "@/utils/sentry";

import { guidanceService } from "../api/guidanceService";
import { DEFAULT_GUIDES } from "../data/defaultGuides";
import type { ApplicableGuide, LearningGuide } from "../types";

const base = createQueryKeys("guidance");

const guidanceKeys = {
  ...base,
  applicable: (tenantId: string, targetType: string, targetId: string) =>
    [...base.all(tenantId), "applicable", targetType, targetId] as const,
  list: (tenantId: string, targetType?: string, targetId?: string) =>
    [...base.all(tenantId), "list", targetType, targetId] as const,
};

export function useApplicableGuides(targetType?: string, targetId?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: guidanceKeys.applicable(tenantId!, targetType!, targetId!),
    queryFn: async (): Promise<ApplicableGuide[]> => {
      const dbGuides = await guidanceService.getApplicableGuides(
        targetType!,
        targetId!,
      );
      if (dbGuides.length > 0) return dbGuides;
      // Fallback: filter DEFAULT_GUIDES by targetType and map to ApplicableGuide shape
      return DEFAULT_GUIDES.filter(
        (g) => !targetType || g.target_type === targetType,
      ).map((g, idx) => ({
        id: `default-${idx}`,
        title: g.title,
        content: g.content,
        guide_type: g.guide_type,
        trigger_type: g.trigger_type,
        trigger_value: g.trigger_value,
        priority: g.priority,
        impression_count: 0,
      }));
    },
    enabled: !!tenantId && !!targetType && !!targetId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  });
}

export function useGuideList(targetType?: string, targetId?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: guidanceKeys.list(tenantId!, targetType, targetId),
    queryFn: () => guidanceService.listGuides(targetType, targetId),
    enabled: !!tenantId,
    staleTime: STALE.STATIC,
    gcTime: GC.LONG,
  });
}

export function useUpsertGuide() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      params: Partial<LearningGuide> & {
        target_id: string;
        title: string;
        content: string;
      },
    ) => guidanceService.upsertGuide(params),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: base.all(tenantId) });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useUpsertGuide" });
    },
  });
}

export function useDeleteGuide() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guideId: string) => guidanceService.deleteGuide(guideId),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: base.all(tenantId) });
      }
    },
    onError: (err) => {
      captureError(err, { context: "useDeleteGuide" });
    },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useRecordInteraction() {
  return useMutation({
    mutationFn: ({ guideId, action }: { guideId: string; action: string }) => {
      // Skip default guides (fake IDs like "default-0") — they have no DB row
      if (!UUID_RE.test(guideId)) return Promise.resolve();
      return guidanceService.recordInteraction(guideId, action);
    },
    onError: (err) => {
      captureError(err, { context: "useRecordInteraction" });
    },
  });
}
