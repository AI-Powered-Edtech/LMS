import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type PublicProfileData,
  publicProfileService,
} from '@/src/features/profile/api/publicProfileService'

// ── Query key factory ──────────────────────────────────────────────────────────
const profileKeys = {
  all: ['public-profile'] as const,
  byId: (userId: string) => [...profileKeys.all, 'id', userId] as const,
  byUsername: (username: string) => [...profileKeys.all, 'username', username] as const,
}

// ── Fetch by user ID (owner view — always loads own data) ─────────────────────
function usePublicProfileById(userId: string | undefined) {
  return useQuery<PublicProfileData | null>({
    queryKey: profileKeys.byId(userId ?? ''),
    queryFn: () => publicProfileService.getPublicProfile(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

// ── Resolve username → userId ─────────────────────────────────────────────────
function useProfileIdByUsername(username: string | undefined) {
  return useQuery<{ id: string } | null>({
    queryKey: profileKeys.byUsername(username ?? ''),
    queryFn: () => publicProfileService.getProfileByUsername(username!),
    enabled: !!username,
    staleTime: 60_000,
  })
}

// ── Update privacy toggle ─────────────────────────────────────────────────────
function useUpdateProfilePrivacy(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isPublic: boolean) => publicProfileService.updatePrivacy(isPublic),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.byId(userId) })
    },
  })
}
