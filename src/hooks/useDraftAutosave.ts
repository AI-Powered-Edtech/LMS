/**
 * useDraftAutosave — Generic draft autosave hook
 *
 * Saves form state to localStorage every N seconds when data changes.
 * Shows "Tersimpan otomatis" feedback to user.
 *
 * Usage:
 *   const { lastSaved, isSaving, clearDraft, loadDraft } = useDraftAutosave({
 *     key: 'course-builder-draft',
 *     data: formValues,
 *     debounceMs: 3000,
 *   })
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseDraftAutosaveOptions<T> {
  /** localStorage key for this draft */
  key: string
  /** Data to autosave */
  data: T
  /** Debounce delay in ms (default: 3000) */
  debounceMs?: number
  /** Called when data changes — use to mark form as dirty */
  onSave?: (data: T) => void
}

interface UseDraftAutosaveReturn<T> {
  /** ISO string of last save time, or null if never saved */
  lastSaved: string | null
  /** True while the debounce timer is pending */
  isSaving: boolean
  /** Clear the draft from localStorage */
  clearDraft: () => void
  /** Load saved draft from localStorage, returns null if none */
  loadDraft: () => T | null
  /** Human-readable save status: "Tersimpan otomatis X detik lalu" */
  saveStatusText: string | null
}

export function useDraftAutosave<T>({
  key,
  data,
  debounceMs = 3000,
  onSave,
}: UseDraftAutosaveOptions<T>): UseDraftAutosaveReturn<T> {
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dataRef = useRef(data)

  // Keep ref current without triggering saves
  dataRef.current = data

  // Update status text every 10 seconds
  useEffect(() => {
    if (!lastSaved) return

    const updateStatus = () => {
      const diffMs = Date.now() - new Date(lastSaved).getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)

      if (diffSec < 10) setSaveStatusText('Baru saja tersimpan')
      else if (diffSec < 60) setSaveStatusText(`Tersimpan ${diffSec} detik lalu`)
      else if (diffMin < 60) setSaveStatusText(`Tersimpan ${diffMin} menit lalu`)
      else setSaveStatusText('Tersimpan lebih dari 1 jam lalu')
    }

    updateStatus()
    statusTimerRef.current = setInterval(updateStatus, 10_000)
    return () => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current)
    }
  }, [lastSaved])

  // Debounced save effect
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsSaving(true)

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ data: dataRef.current, savedAt: new Date().toISOString() })
        )
        const now = new Date().toISOString()
        setLastSaved(now)
        setSaveStatusText('Baru saja tersimpan')
        onSave?.(dataRef.current)
      } catch (err) {
        // localStorage quota exceeded — fail silently (not critical)
        if (import.meta.env.DEV) console.warn('[useDraftAutosave] Save failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs, JSON.stringify(data)])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key)
    setLastSaved(null)
    setSaveStatusText(null)
  }, [key])

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.data ?? null
    } catch {
      return null
    }
  }, [key])

  return { lastSaved, isSaving, clearDraft, loadDraft, saveStatusText }
}
