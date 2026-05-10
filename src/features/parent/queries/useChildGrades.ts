// ==========================================================================
// Parent Queries — useChildGrades
// React Query hook untuk nilai anak
// ==========================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { STALE } from "@/utils/queryConstants";

import { getChildGrades } from "../api/parentApi";
import type { ChildGradeSummary } from "../types";

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys("parent-grades");

export const childGradesKeys = {
  all: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), "grades", studentId] as const,
};

// ── Hook ────────────────────────────────────────────────────────

/**
 * Mendapatkan nilai terbaru untuk anak tertentu.
 */
export function useChildGrades(studentId: string) {
  const { tenantId } = useAuth();

  return useQuery<ChildGradeSummary[]>({
    queryKey: childGradesKeys.all(tenantId ?? "", studentId),
    queryFn: () => getChildGrades(studentId),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: false,
  });
}
