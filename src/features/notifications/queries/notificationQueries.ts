/**
 * Notification React Query hooks
 * Replaces NotificationContext with proper tenant isolation
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/src/contexts/AuthContext'
import { createQueryKeys } from '@/src/lib/queryKeys'
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
 * Main hook for fetching user notifications
 * Replaces NotificationContext usage
 */
export function useNotifications() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: notificationKeys.user(tenantId!, user!.id),
    queryFn: () => notificationService.fetchNotifications(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
  })

  // Realtime subscription — lifecycle tied to hook
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!user || !tenantId) return

    const { unsubscribe } = notificationService.subscribe(user.id, tenantId, () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.user(tenantId, user.id),
      })
    })

    return unsubscribe
  }, [user?.id, tenantId, queryClient])
  /* eslint-enable react-hooks/exhaustive-deps */

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
  })
}

/**
 * Hook for sending a notification
 * Used by Assignments, Creator, Calendar to send notifications to users
 */
export function useSendNotification() {
  const { tenantId } = useAuth()

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
  })
}
