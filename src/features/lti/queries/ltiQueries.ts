import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { GC, STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import { ltiService } from '../api/ltiService'
import type { CreateLtiPlatformParams, UpdateLtiPlatformParams } from '../types'

const ltiKeys = createQueryKeys('lti')

// ── List all platforms ─────────────────────────────────────────
export function useLtiPlatforms() {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: ltiKeys.lists(tenantId!),
    queryFn: () => ltiService.fetchPlatforms(tenantId!),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  })
}

// ── Single platform detail ─────────────────────────────────────
export function useLtiPlatform(id: string | null) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: ltiKeys.detail(tenantId!, id!),
    queryFn: () => ltiService.fetchPlatform(id!, tenantId!),
    enabled: !!tenantId && !!id,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  })
}

// ── Create platform mutation ───────────────────────────────────
export function useCreateLtiPlatform() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (params: CreateLtiPlatformParams) => ltiService.createPlatform(params),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: ltiKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useCreateLtiPlatform' }),
  })
}

// ── Update platform mutation ───────────────────────────────────
export function useUpdateLtiPlatform() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (params: UpdateLtiPlatformParams) => ltiService.updatePlatform(params, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: ltiKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useUpdateLtiPlatform' }),
  })
}

// ── Delete platform mutation ───────────────────────────────────
export function useDeleteLtiPlatform() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (id: string) => ltiService.deletePlatform(id, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: ltiKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useDeleteLtiPlatform' }),
  })
}

// ── Toggle active status mutation ──────────────────────────────
export function useToggleLtiPlatform() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      ltiService.togglePlatform(id, isActive, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: ltiKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useToggleLtiPlatform' }),
  })
}
