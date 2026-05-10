/**
 * useNavBadges — jumlah badge untuk BottomNav.
 *
 * Mengambil:
 * - pendingAssignments: jumlah tugas yang diterbitkan dan belum disubmit oleh
 *   pengguna saat ini (student). Hanya relevan untuk role student.
 * - unreadNotifications: jumlah notifikasi belum dibaca.
 *
 * Kedua query di-cache selama 2 menit (BADGE staleTime).
 */

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { assignmentService } from "@/features/assignments/api/assignmentService";
import { db } from "@/services/db";
import { logger } from "@/utils/logger";

const BADGE_STALE = 2 * 60 * 1000; // 2 menit

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const navBadgeKeys = {
  pendingAssignments: (userId: string, tenantId: string) =>
    ["nav-badges", "pending-assignments", tenantId, userId] as const,
  unreadNotifications: (userId: string, tenantId: string) =>
    ["nav-badges", "unread-notifications", tenantId, userId] as const,
};

// ─── Return Type ─────────────────────────────────────────────────────────────

export interface NavBadges {
  pendingAssignments: number;
  unreadNotifications: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNavBadges(): NavBadges {
  const { user, tenantId, role } = useAuth();

  const isStudent = role === "student";
  const enabled = !!user && !!tenantId;

  // ── Tugas yang belum disubmit (student only) ──────────────────────────────
  // Ambil jumlah assignments yang published dan tidak punya submission SUBMITTED
  // dari student ini. LEFT JOIN untuk menemukan yang belum punya submission sama sekali
  // atau masih DRAFT.
  const { data: pendingAssignments = 0 } = useQuery({
    queryKey: navBadgeKeys.pendingAssignments(user?.id ?? "", tenantId ?? ""),
    queryFn: () =>
      assignmentService.getPendingAssignmentCount(tenantId!, user!.id),
    enabled: enabled && isStudent,
    staleTime: BADGE_STALE,
  });

  // ── Notifikasi belum dibaca ───────────────────────────────────────────────
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: navBadgeKeys.unreadNotifications(user?.id ?? "", tenantId ?? ""),
    queryFn: async () => {
      const { data, error } = await db.rpc("get_unread_notification_count", {
        p_user_id: user!.id,
      });

      if (error) {
        if (import.meta.env.DEV)
          logger.error("[useNavBadges] unreadNotifications error:", error);
        return 0;
      }

      return (data as number) ?? 0;
    },
    enabled,
    staleTime: BADGE_STALE,
  });

  return {
    pendingAssignments: isStudent ? pendingAssignments : 0,
    unreadNotifications,
  };
}
