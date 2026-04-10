// ==========================================================================
// Sprint D: Granular Parent Notification System
//
// Provides real-time, category-based notifications for parents.
// Categories: academic, attendance, behavioral, administrative
//
// Integrates with existing notification infrastructure but adds
// parent-specific filtering, grouping by child, and digest preferences.
// ==========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getRealtimeProvider, type AppRealtimeChannel } from '@/services/realtime'
import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

// ── Types ─────────────────────────────────────────────────────────────────

export type NotificationCategory = 'academic' | 'attendance' | 'behavioral' | 'administrative'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ParentNotification {
  id: string
  child_id: string
  child_name: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  /** ISO timestamp */
  created_at: string
  read: boolean
  /** Optional deep-link to related page (e.g., assignment, grade entry) */
  action_url?: string
  /** Metadata for rendering (e.g., subject name, score) */
  metadata?: Record<string, unknown>
}

export interface NotificationPreferences {
  academic: boolean
  attendance: boolean
  behavioral: boolean
  administrative: boolean
  /** Digest mode: 'realtime' | 'daily' | 'weekly' */
  digest_mode: 'realtime' | 'daily' | 'weekly'
  /** Quiet hours (no push notifications) */
  quiet_start?: string // HH:mm
  quiet_end?: string // HH:mm
}

export interface UseParentNotificationsResult {
  notifications: ParentNotification[]
  unreadCount: number
  /** Grouped by child */
  byChild: Record<string, ParentNotification[]>
  /** Grouped by category */
  byCategory: Record<NotificationCategory, ParentNotification[]>
  isLoading: boolean
  error: string | null
  preferences: NotificationPreferences
  /** Mark one or more notifications as read */
  markAsRead: (ids: string[]) => Promise<void>
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>
  /** Update notification preferences */
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>
  /** Refresh notifications */
  refresh: () => Promise<void>
}

// ── Default Preferences ──────────────────────────────────────────────────

const DEFAULT_PREFERENCES: NotificationPreferences = {
  academic: true,
  attendance: true,
  behavioral: true,
  administrative: true,
  digest_mode: 'realtime',
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useParentNotifications(): UseParentNotificationsResult {
  const { user, tenantId } = useAuth()
  const [notifications, setNotifications] = useState<ParentNotification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<AppRealtimeChannel | null>(null)

  // ── Fetch notifications ────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !tenantId) return
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('parent_notifications')
        .select('*')
        .eq('parent_id', user.id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      setNotifications((data as ParentNotification[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat notifikasi'
      setError(message)
      captureError(err, { context: 'useParentNotifications.fetch' })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, tenantId])

  // ── Fetch preferences ──────────────────────────────────────────────

  const fetchPreferences = useCallback(async () => {
    if (!user?.id || !tenantId) return

    try {
      const { data } = await supabase
        .from('parent_notification_preferences')
        .select('*')
        .eq('parent_id', user.id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (data) {
        setPreferences({
          academic: data.academic ?? true,
          attendance: data.attendance ?? true,
          behavioral: data.behavioral ?? true,
          administrative: data.administrative ?? true,
          digest_mode: data.digest_mode ?? 'realtime',
          quiet_start: data.quiet_start ?? undefined,
          quiet_end: data.quiet_end ?? undefined,
        })
      }
    } catch (err) {
      captureError(err, { context: 'useParentNotifications.fetchPreferences' })
    }
  }, [user?.id, tenantId])

  // ── Real-time subscription ─────────────────────────────────────────

  useEffect(() => {
    if (!user?.id || !tenantId) return

    fetchNotifications()
    fetchPreferences()

    // Subscribe to new notifications via Supabase Realtime
    const channel = getRealtimeProvider()
      .channel(`parent-notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_notifications',
          filter: `parent_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as ParentNotification
          // Only add if category is enabled in preferences
          setPreferences((currentPrefs) => {
            if (currentPrefs[newNotif.category]) {
              setNotifications((prev) => [newNotif, ...prev])
            }
            return currentPrefs
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void getRealtimeProvider().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, tenantId, fetchNotifications, fetchPreferences])

  // ── Mark as read ───────────────────────────────────────────────────

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return

    try {
      await supabase.from('parent_notifications').update({ read: true }).in('id', ids)

      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
    } catch (err) {
      captureError(err, { context: 'useParentNotifications.markAsRead' })
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !tenantId) return

    try {
      await supabase
        .from('parent_notifications')
        .update({ read: true })
        .eq('parent_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      captureError(err, { context: 'useParentNotifications.markAllAsRead' })
    }
  }, [user?.id, tenantId])

  // ── Update preferences ─────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!user?.id || !tenantId) return

      const updated = { ...preferences, ...prefs }
      setPreferences(updated)

      try {
        await supabase.from('parent_notification_preferences').upsert({
          parent_id: user.id,
          tenant_id: tenantId,
          ...updated,
        })
      } catch (err) {
        captureError(err, { context: 'useParentNotifications.updatePreferences' })
        // Revert optimistic update
        setPreferences(preferences)
      }
    },
    [user?.id, tenantId, preferences]
  )

  // ── Computed values ────────────────────────────────────────────────

  const filteredNotifications = useMemo(
    () => notifications.filter((n) => preferences[n.category]),
    [notifications, preferences]
  )

  const unreadCount = useMemo(
    () => filteredNotifications.filter((n) => !n.read).length,
    [filteredNotifications]
  )

  const byChild = useMemo(() => {
    const grouped: Record<string, ParentNotification[]> = {}
    for (const n of filteredNotifications) {
      if (!grouped[n.child_id]) grouped[n.child_id] = []
      grouped[n.child_id].push(n)
    }
    return grouped
  }, [filteredNotifications])

  const byCategory = useMemo(() => {
    const grouped: Record<NotificationCategory, ParentNotification[]> = {
      academic: [],
      attendance: [],
      behavioral: [],
      administrative: [],
    }
    for (const n of filteredNotifications) {
      grouped[n.category].push(n)
    }
    return grouped
  }, [filteredNotifications])

  return {
    notifications: filteredNotifications,
    unreadCount,
    byChild,
    byCategory,
    isLoading,
    error,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refresh: fetchNotifications,
  }
}
