/**
 * Push notification subscription hook
 *
 * Manages the Web Push subscription lifecycle:
 * - Permission check
 * - Subscribe / unsubscribe via PushManager
 * - Persist subscription to notification_preferences.push_subscription
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { logDevError, logDevWarn } from '@/utils/logDevError'

import * as notificationApi from '../api/notificationApi'

// ── Types ─────────────────────────────────────────────────────────────────────

type PushPermission = NotificationPermission | 'unsupported'

export interface UsePushSubscriptionReturn {
  /** Whether the Push API is available in this browser */
  isSupported: boolean
  /** Current permission: 'default' | 'granted' | 'denied' | 'unsupported' */
  permission: PushPermission
  /** Whether the user has an active push subscription stored */
  isSubscribed: boolean
  /** Request permission + create subscription + persist to Supabase */
  subscribe: () => Promise<void>
  /** Remove push subscription from browser + clear from Supabase */
  unsubscribe: () => Promise<void>
  /** True while subscribe/unsubscribe is in progress */
  isLoading: boolean
  /** Last error from subscribe/unsubscribe, if any */
  error: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a base64 VAPID public key to Uint8Array (applicationServerKey format)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Serialize a PushSubscription to a plain JSON-safe object
 */
function serializeSubscription(sub: PushSubscription): {
  endpoint: string
  keys: { p256dh: string; auth: string }
} {
  const json = sub.toJSON()
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushSubscription(): UsePushSubscriptionReturn {
  const { user, tenantId } = useAuth()

  const isSupported = useMemo(
    () => typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator,
    []
  )

  const [permission, setPermission] = useState<PushPermission>(() => {
    if (!isSupported) return 'unsupported'
    return Notification.permission
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Sync permission & subscription state on mount ─────────────────────────

  useEffect(() => {
    if (!isSupported) return

    // Keep permission in sync (e.g. user changed it in browser settings)
    setPermission(Notification.permission)

    // Check if there is an existing push subscription in the service worker
    let cancelled = false

    async function checkExisting() {
      try {
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (!cancelled) {
          setIsSubscribed(existing !== null)
        }
      } catch {
        // Service worker not ready or push not available
        if (!cancelled) {
          setIsSubscribed(false)
        }
      }
    }

    checkExisting()

    return () => {
      cancelled = true
    }
  }, [isSupported])

  // ── Subscribe ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications tidak didukung di browser ini')
      return
    }

    if (!user || !tenantId) {
      setError('Pengguna belum masuk')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Request notification permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Izin notifikasi ditolak oleh browser'
            : 'Izin notifikasi belum diberikan'
        )
        return
      }

      // 2. Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // 3. Get VAPID public key
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidKey) {
        logDevWarn('push', 'VITE_VAPID_PUBLIC_KEY belum dikonfigurasi')
        setError('Konfigurasi push notification belum lengkap')
        return
      }

      // 4. Subscribe via PushManager
      const applicationServerKey = urlBase64ToUint8Array(vapidKey)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // 5. Persist subscription to Supabase notification_preferences
      const serialized = serializeSubscription(subscription)
      await notificationApi.upsertNotificationPreferences({
        user_id: user.id,
        tenant_id: tenantId,
        push_enabled: true,
        push_subscription: serialized as unknown as null, // JSON column
      })

      setIsSubscribed(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengaktifkan push notification'
      logDevError('push', 'subscribe error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user, tenantId])

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  const unsubscribe = useCallback(async () => {
    if (!user || !tenantId) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. Unsubscribe from PushManager
      if (isSupported) {
        try {
          const registration = await navigator.serviceWorker.ready
          const existing = await registration.pushManager.getSubscription()
          if (existing) {
            await existing.unsubscribe()
          }
        } catch {
          // PushManager may not be available; still clear server-side
        }
      }

      // 2. Clear subscription from Supabase
      await notificationApi.upsertNotificationPreferences({
        user_id: user.id,
        tenant_id: tenantId,
        push_enabled: false,
        push_subscription: null,
      })

      setIsSubscribed(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menonaktifkan push notification'
      logDevError('push', 'unsubscribe error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user, tenantId])

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading,
    error,
  }
}
