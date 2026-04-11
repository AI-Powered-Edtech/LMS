/**
 * Admin Notification hook — fetches and subscribes to admin-specific notifications.
 *
 * Event types: INVITATION_ACCEPTED, MODERATION_REPORT, SYNC_FAILURE, SYSTEM_ALERT, USER_JOINED
 *
 * Uses the shared `notifications` table but filters by admin event types so that
 * admin-targeted notifications are surfaced separately from student/teacher notifications.
 *
 * Real-time: subscribes to Supabase Realtime channel for instant updates
 * Fallback:  refetches every 60 s to handle dropped Realtime events on free tier
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getRealtimeProvider } from '@/services/realtime'
import { db } from '@/services/db'
import { STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import type { AdminNotificationType, Notification } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Notification types that are surfaced in the Admin Notification Center */
export const ADMIN_NOTIFICATION_TYPES: AdminNotificationType[] = [
  'invitation_accepted',
  'moderation_report',
  'sync_failure',
  'system_alert',
  'user_joined',
]

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const adminNotificationKeys = {
  all: (tenantId: string) => ['admin-notifications', tenantId] as const,
  list: (tenantId: string, userId: string) =>
    ['admin-notifications', tenantId, 'list', userId] as const,
}

// ─── API ──────────────────────────────────────────────────────────────────────

const NOTIFICATION_COLUMNS = `
  id,
  tenant_id,
  user_id,
  actor_id,
  type,
  title,
  message,
  is_read,
  created_at,
  link
`

async function fetchAdminNotifications(
  userId: string,
  tenantId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await db
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .in('type', ADMIN_NOTIFICATION_TYPES)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (import.meta.env.DEV) console.error('[useAdminNotifications] fetch error:', error)
    throw error
  }

  return (data ?? []) as Notification[]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAdminNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  isError: boolean
  error: Error | null
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refetch: () => void
}

export function useAdminNotifications(): UseAdminNotificationsReturn {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const queryKey = adminNotificationKeys.list(tenantId!, user!.id)

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: () => fetchAdminNotifications(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
    staleTime: STALE.DYNAMIC,
    // Poll every 60 s as fallback for missed Realtime events (same strategy as useNotifications)
    refetchInterval: 60_000,
  })

  // ─── Realtime Subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId || !user) return

    const channel = getRealtimeProvider()
      .channel(`admin-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification
          // Only inject if it's an admin-type event
          if (!ADMIN_NOTIFICATION_TYPES.includes(incoming.type as AdminNotificationType)) return

          queryClient.setQueryData<Notification[]>(queryKey, (old) => {
            if (!old) return [incoming]
            if (old.some((n) => n.id === incoming.id)) return old
            return [incoming, ...old]
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
          const updated = payload.new as Notification
          queryClient.setQueryData<Notification[]>(queryKey, (old) =>
            old?.map((n) => (n.id === updated.id ? updated : n))
          )
        }
      )
      .subscribe()

    return () => {
      void getRealtimeProvider().removeChannel(channel)
    }
  }, [tenantId, user, queryClient, queryKey])

  // ─── Mark Single Read (optimistic) ──────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Notification[]>(queryKey)
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      return { previous }
    },
    onError: (err, _id, ctx) => {
      captureError(err, { context: 'useAdminNotifications.markAsRead' })
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all(tenantId!) })
    },
  })

  // ─── Mark All Read (optimistic) ─────────────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('tenant_id', tenantId!)
        .in('type', ADMIN_NOTIFICATION_TYPES)
        .eq('is_read', false)
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Notification[]>(queryKey)
      queryClient.setQueryData<Notification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, is_read: true }))
      )
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      captureError(err, { context: 'useAdminNotifications.markAllAsRead' })
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminNotificationKeys.all(tenantId!) })
    },
  })

  // ─── Derived ────────────────────────────────────────────────────────────────
  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    markAsRead: (id) => markReadMutation.mutate(id),
    markAllAsRead: () => markAllReadMutation.mutate(),
    refetch: () => query.refetch(),
  }
}
