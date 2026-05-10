// ==========================================================================
// Parent Queries — useParentChildren
// React Query hook untuk mendapatkan daftar anak orang tua
// ==========================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { STALE } from "@/utils/queryConstants";

import { getMyChildren } from "../api/parentApi";
import type { ChildInfo } from "../types";

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys("parent");

export const parentChildrenKeys = {
  all: (tenantId: string) => [...base.all(tenantId), "children"] as const,
};

// ── Hook ────────────────────────────────────────────────────────

/**
 * Mendapatkan daftar anak yang terhubung dengan orang tua yang sedang login.
 */
export function useParentChildren() {
  const { tenantId } = useAuth();

  return useQuery<ChildInfo[]>({
    queryKey: parentChildrenKeys.all(tenantId ?? ""),
    queryFn: () => getMyChildren(),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  });
}
