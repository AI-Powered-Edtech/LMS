import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

import { gamificationKeys } from "../queries/gamificationQueries";
import type { BadgeDefinition } from "../types";

/**
 * BadgeUnlockToast — watches student badges query and shows a toast when a new badge is earned.
 * Mount once in a top-level layout (e.g., Dashboard).
 */
export function BadgeUnlockToast() {
  const { user, tenantId } = useAuth();
  const { addToast } = useToast();
  const qc = useQueryClient();
  const prevEarnedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !tenantId) {
      // Reset on logout so next login starts fresh
      initializedRef.current = false;
      prevEarnedRef.current = new Set();
      return;
    }

    const key = gamificationKeys.studentBadges(tenantId, user.id);

    const unsubscribe = qc.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;

      const queryKey = event.query.queryKey;
      if (JSON.stringify(queryKey) !== JSON.stringify(key)) return;

      const badges = event.action.data as BadgeDefinition[] | undefined;
      if (!badges) return;

      const earned = new Set(
        badges.filter((b) => b.is_earned).map((b) => b.badge_id),
      );

      if (!initializedRef.current) {
        prevEarnedRef.current = earned;
        initializedRef.current = true;
        return;
      }

      for (const id of earned) {
        if (!prevEarnedRef.current.has(id)) {
          const badge = badges.find((b) => b.badge_id === id);
          if (badge) {
            addToast({
              message: `${badge.icon_emoji} Badge Diraih: ${badge.name}! +${badge.xp_reward} XP`,
              type: "success",
            });
          }
        }
      }
      prevEarnedRef.current = earned;
    });

    return unsubscribe;
  }, [user?.id, tenantId, qc, addToast]);

  return null;
}
