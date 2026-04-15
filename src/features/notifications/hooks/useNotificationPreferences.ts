/**
 * useNotificationPreferences — localStorage-based notification channel preferences.
 *
 * Stores per-type, per-channel (in-app / email / push) preferences.
 * Persists with key `edusync_notification_prefs` so settings survive page reloads.
 *
 * Separate from the backend-backed `NotificationPreferences` table which controls
 * broader flags (email_enabled, push_enabled). This hook provides fine-grained
 * per-type control that lives client-side.
 */

import { useCallback, useState } from 'react'

import { logger } from '@/utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationChannel = 'inApp' | 'email' | 'push'

export type NotificationPrefType =
  | 'assignment_due'
  | 'quiz_result'
  | 'grade_posted'
  | 'message_received'
  | 'announcement'
  | 'system_alert'

export type ChannelPrefs = {
  inApp: boolean
  email: boolean
  push: boolean
}

export type NotificationPrefsMap = Record<NotificationPrefType, ChannelPrefs>

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'edusync_notification_prefs'

export const DEFAULT_PREFS: NotificationPrefsMap = {
  assignment_due: { inApp: true, email: true, push: true },
  quiz_result: { inApp: true, email: false, push: true },
  grade_posted: { inApp: true, email: true, push: true },
  message_received: { inApp: true, email: false, push: true },
  announcement: { inApp: true, email: false, push: false },
  system_alert: { inApp: true, email: true, push: true },
}

/** Human-readable Bahasa Indonesia labels for each preference type */
export const PREF_TYPE_LABELS: Record<NotificationPrefType, string> = {
  assignment_due: 'Batas Waktu Tugas',
  quiz_result: 'Hasil Kuis',
  grade_posted: 'Nilai Diposting',
  message_received: 'Pesan Masuk',
  announcement: 'Pengumuman Sekolah',
  system_alert: 'Peringatan Sistem',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): NotificationPrefsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<NotificationPrefsMap>
    // Merge with defaults so new keys added later are populated
    return {
      ...DEFAULT_PREFS,
      ...parsed,
    } as NotificationPrefsMap
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function saveToStorage(prefs: NotificationPrefsMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    if (import.meta.env.DEV) {
      logger.warn('[useNotificationPreferences] localStorage write failed')
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseNotificationPreferencesLocalReturn {
  preferences: NotificationPrefsMap
  /** Get a single preference value for a given type + channel */
  getPreference: (type: NotificationPrefType, channel: NotificationChannel) => boolean
  /** Update a single preference cell */
  updatePreference: (
    type: NotificationPrefType,
    channel: NotificationChannel,
    enabled: boolean
  ) => void
  /** Get entire preferences map */
  getPreferences: () => NotificationPrefsMap
  /** Reset all preferences to factory defaults */
  resetToDefaults: () => void
}

export function useNotificationPreferencesLocal(): UseNotificationPreferencesLocalReturn {
  const [preferences, setPreferences] = useState<NotificationPrefsMap>(() => loadFromStorage())

  const getPreferences = useCallback((): NotificationPrefsMap => {
    return loadFromStorage()
  }, [])

  const getPreference = useCallback(
    (type: NotificationPrefType, channel: NotificationChannel): boolean => {
      return preferences[type]?.[channel] ?? DEFAULT_PREFS[type][channel]
    },
    [preferences]
  )

  const updatePreference = useCallback(
    (type: NotificationPrefType, channel: NotificationChannel, enabled: boolean): void => {
      setPreferences((prev) => {
        const next: NotificationPrefsMap = {
          ...prev,
          [type]: {
            ...prev[type],
            [channel]: enabled,
          },
        }
        saveToStorage(next)
        return next
      })
    },
    []
  )

  const resetToDefaults = useCallback((): void => {
    const defaults = { ...DEFAULT_PREFS }
    saveToStorage(defaults)
    setPreferences(defaults)
  }, [])

  return {
    preferences,
    getPreference,
    updatePreference,
    getPreferences,
    resetToDefaults,
  }
}
