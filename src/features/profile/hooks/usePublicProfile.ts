import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type PublicProfileData,
  publicProfileService,
} from "@/features/profile/api/publicProfileService";
import { captureError } from "@/utils/sentry";

// ── Query key factory ──────────────────────────────────────────────────────────
const profileKeys = {
  all: ["public-profile"] as const,
  byId: (userId: string) => [...profileKeys.all, "id", userId] as const,
  byUsername: (username: string) =>
    [...profileKeys.all, "username", username] as const,
};

// ── Fetch by user ID (owner view — always loads own data) ─────────────────────
export function usePublicProfileById(userId: string | undefined) {
  return useQuery<PublicProfileData | null>({
    queryKey: profileKeys.byId(userId ?? ""),
    queryFn: () => publicProfileService.getPublicProfile(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── Resolve username → userId ─────────────────────────────────────────────────
export function useProfileIdByUsername(username: string | undefined) {
  return useQuery<{ id: string } | null>({
    queryKey: profileKeys.byUsername(username ?? ""),
    queryFn: () => publicProfileService.getProfileByUsername(username!),
    enabled: !!username,
    staleTime: 60_000,
  });
}

// ── Update privacy toggle ─────────────────────────────────────────────────────
export function useUpdateProfilePrivacy(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPublic: boolean) =>
      publicProfileService.updatePrivacy(isPublic),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: profileKeys.byId(userId) });
    },
    onError: (err) => {
      captureError(err, { context: "useUpdateProfilePrivacy" });
    },
  });
}
