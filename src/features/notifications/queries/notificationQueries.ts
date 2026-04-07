/**
 * Notification React Query hooks
 * Replaces NotificationContext with proper tenant isolation.
 * Uses polling (60s) instead of WebSocket to reduce Supabase Free Tier load.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import * as notificationService from '../api/notificationService'

// Create tenant-scoped query keys
const base = createQueryKeys('notifications')
const notificationKeys = {
  ...base,
  user: (tenantId: string, userId: string) => [...base.all(tenantId), 'user', userId] as const,
  unreadCount: (tenantId: string, userId: string) =>
    [...base.all(tenantId), 'unread', userId] as const,
}

/**
 * Main hook for fetching user notifications.
 * Polls every 60s instead of holding a WebSocket connection.
 */
export function useNotifications() {
  const { user, tenantId } = useAuth()

  const query = useQuery({
    queryKey: notificationKeys.user(tenantId!, user!.id),
    queryFn: () => notificationService.fetchNotifications(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    refetchInterval: 60000, // Poll every minute instead of WebSocket
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    loading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

/**
 * Hook for marking a single notification as read
 */
export function useMarkAsRead() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id, tenantId!),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.user(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useMarkAsRead' })
    },
  })
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllAsRead() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(user!.id, tenantId!),
    onSuccess: () => {
      if (tenantId && user) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.user(tenantId, user.id),
        })
      }
    },
    onError: (err) => {
      captureError(err, { context: 'useMarkAllAsRead' })
    },
  })
}

/**
 * Hook for sending a notification
 * Used by Assignments, Creator, Calendar to send notifications to users
 *
 * Errors are captured silently via Sentry — notification delivery is best-effort.
 * A user-visible toast is shown only for unexpected failures (RPC missing, network down).
 */
export function useSendNotification() {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)

  return useMutation({
    mutationFn: ({
      userId,
      title,
      message,
      type,
    }: {
      userId: string
      title: string
      message: string
      type?: string
    }) => notificationService.sendNotification(userId, title, message, type, tenantId!),
    onError: (err) => {
      captureError(err, { context: 'useSendNotification' })
      // Show a non-blocking toast so the user knows the notification may not have been sent
      const isRpcMissing =
        err instanceof Error && err.message.includes('create_notification belum tersedia')
      if (isRpcMissing) {
        addToast({
          type: 'warning',
          message: 'Gagal mengirim notifikasi — fungsi database belum tersedia.',
          description: 'Laporkan ke administrator sistem.',
        })
      }
    },
  })
}
