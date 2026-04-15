/**
 * Enhanced notifications hook with Realtime subscription and toast feedback
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getRealtimeProvider } from '@/services/realtime'
import { STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import * as notificationApi from '../api/notificationApi'
import type { Notification, NotificationPreferences } from '../types'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: (tenantId: string) => ['notifications', tenantId] as const,
  list: (tenantId: string, userId: string, offset?: number) =>
    ['notifications', tenantId, 'list', userId, offset ?? 0] as const,
  unread: (tenantId: string, userId: string) =>
    ['notifications', tenantId, 'unread', userId] as const,
  preferences: (tenantId: string, userId: string) =>
    ['notifications', tenantId, 'preferences', userId] as const,
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markRead: (id: string) => void
  markAllRead: () => void
  refetch: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const queryKey = notificationKeys.list(tenantId!, user!.id)

  const query = useQuery({
    queryKey,
    queryFn: () => notificationApi.fetchNotifications(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    // WHY BOTH POLLING + REALTIME:
    // Some realtime providers rate-limit WebSocket connections and may drop messages under load.
    // Polling every 60s is the safety net —
    // it guarantees eventual consistency even if a Realtime event is missed.
    // Realtime subscription below gives instant cache updates when events DO arrive,
    // eliminating the 60s lag for the happy path.
    refetchInterval: 60000, // Poll every minute as fallback for missed Realtime events
    // FIXED: Stop polling when tab is in background — reduces unnecessary DB load
    refetchIntervalInBackground: false,
  })

  // ─── Realtime Subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId || !user) return

    // Subscribe to INSERT and UPDATE events on notifications for this user.
    // Updates query cache immediately so the UI reflects new/changed notifications
    // without waiting for the 60s polling interval.
    const channel = getRealtimeProvider()
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new notification to the top of the cache immediately
          queryClient.setQueryData<Notification[]>(queryKey, (old) => {
            if (!old) return [payload.new as Notification]
            // Avoid duplicates in case polling already picked it up
            if (old.some((n) => n.id === (payload.new as Notification).id)) return old
            return [payload.new as Notification, ...old]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Sync read-status changes (e.g. marked read on another device) immediately
          queryClient.setQueryData<Notification[]>(queryKey, (old) =>
            old?.map((n) =>
              n.id === (payload.new as Notification).id ? (payload.new as Notification) : n
            )
          )
        }
      )
      .subscribe()

    return () => {
      void getRealtimeProvider().removeChannel(channel)
    }
  }, [tenantId, user, queryClient, queryKey])

  // UX FIX: Optimistic updates give instant feedback before server confirms.
  // Without this, clicking "mark as read" has a visible delay waiting for refetch.
  const markReadMutation = useMutation({
    // FIXED: Pass userId + tenantId to enforce row-level ownership on UPDATE
    mutationFn: (id: string) => notificationApi.markNotificationRead(id, user!.id, tenantId!),
    onMutate: async (id) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey })
      // Snapshot current data for rollback
      const previous = queryClient.getQueryData<Notification[]>(queryKey)
      // Optimistically mark the notification as read immediately
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      return { previous }
    },
    onError: (err, _id, ctx) => {
      captureError(err, { context: 'useNotifications.markRead' })
      // Roll back to previous state if server call fails
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      // Always sync with server after mutation completes (success or error)
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllNotificationsRead(user!.id, tenantId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Notification[]>(queryKey)
      // Optimistically mark ALL as read
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      captureError(err, { context: 'useNotifications.markAllRead' })
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  // FIXED (E3): Use a separate count query with { count: 'exact', head: true } rather than
  // relying on array.length, which under-reports when the list is paginated (limit=50 default).
  // This ensures the badge count reflects ALL unread notifications, not just the loaded page.
  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unread(tenantId!, user!.id),
    queryFn: () => notificationApi.fetchUnreadCount(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  })

  const notifications = query.data ?? []
  // FIXED: Use server-side count from dedicated query — not array length
  const unreadCount = unreadCountQuery.data ?? notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    refetch: () => query.refetch(),
  }
}

// ─── Preferences Hook ─────────────────────────────────────────────────────────

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null
  isLoading: boolean
  save: (prefs: Partial<NotificationPreferences>) => void
  isSaving: boolean
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: notificationKeys.preferences(tenantId!, user!.id),
    queryFn: () => notificationApi.fetchNotificationPreferences(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
  })

  const mutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      notificationApi.upsertNotificationPreferences({
        ...prefs,
        user_id: user!.id,
        tenant_id: tenantId!,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(tenantId!, user!.id),
      })
    },
    onError: (err) => {
      captureError(err, { context: 'useNotificationPreferences.save' })
    },
  })

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    save: (prefs) => mutation.mutate(prefs),
    isSaving: mutation.isPending,
  }
}
