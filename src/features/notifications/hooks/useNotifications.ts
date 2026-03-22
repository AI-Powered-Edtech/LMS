/**
 * Enhanced notifications hook with Realtime subscription and toast feedback
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/services/supabase/client'
import { useToast } from '@/src/hooks/useToast'
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
  const addToast = useToast((s) => s.addToast)

  const queryKey = notificationKeys.list(tenantId!, user!.id)

  const query = useQuery({
    queryKey,
    queryFn: () => notificationApi.fetchNotifications(user!.id, tenantId!),
    enabled: !!tenantId && !!user,
    staleTime: 5 * 60 * 1000, // 5 min — Realtime subscription keeps data fresh via WebSocket
  })

  // Realtime subscription — lifecycle tied to this hook instance
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!user || !tenantId) return

    const channel = supabase
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
          // Invalidate list and unread count
          queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId) })

          // Show toast for new notification
          const incoming = payload.new as Partial<Notification>
          addToast({
            type: 'info',
            message: incoming.title ?? 'Notifikasi baru',
            description: incoming.body ?? incoming.message ?? undefined,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, tenantId, queryClient, addToast])
  /* eslint-enable react-hooks/exhaustive-deps */

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllNotificationsRead(user!.id, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(tenantId!) })
    },
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

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
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(tenantId!, user!.id),
      })
    },
  })

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    save: (prefs) => mutation.mutate(prefs),
    isSaving: mutation.isPending,
  }
}
