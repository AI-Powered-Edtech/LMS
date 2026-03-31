import { useCallback, useEffect, useRef } from 'react'

import { lessonService } from '@/src/features/lessons'

interface ProgressReporterProps {
  lessonId: string
  tenantId: string
  status: 'started' | 'in_progress' | 'completed'
  progressPercentage: number
  lastPosition?: number
  enabled: boolean
}

/**
 * ProgressReporter — Invisible component that throttles progress updates to Supabase.
 * Sends updates every 5 seconds using the monotonic RPC function.
 */
export function ProgressReporter({
  lessonId,
  tenantId,
  status,
  progressPercentage,
  lastPosition,
  enabled,
}: ProgressReporterProps) {
  const lastSent = useRef({ percentage: 0, position: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Store latest prop values in refs for stable callbacks (FL-1 fix)
  // This eliminates interval churn caused by sendUpdate dependency changes
  const latestRef = useRef({ status, progressPercentage, lastPosition })
  latestRef.current = { status, progressPercentage, lastPosition }

  // C-9 fix: track enabled in a ref so the stable interval can check it
  // without needing to be recreated when enabled changes
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const sendUpdate = useCallback(async () => {
    const { status: s, progressPercentage: pct, lastPosition: pos } = latestRef.current

    // Only send if there's meaningful change
    if (pct <= lastSent.current.percentage && (pos ?? 0) <= lastSent.current.position) {
      return
    }

    try {
      await lessonService.queueProgressUpdate(lessonId, tenantId, s, pct, pos)
      lastSent.current = { percentage: pct, position: pos ?? 0 }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ProgressReporter] Failed to sync:', err)
    }
  }, [lessonId, tenantId]) // Stable deps only — no interval churn

  // C-9: Stable interval — only recreated if sendUpdate changes (stable deps: lessonId, tenantId).
  // Uses enabledRef to gate sends without resetting the 5-second timer on every status change.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (enabledRef.current) sendUpdate()
    }, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sendUpdate]) // only recreate if sendUpdate changes (stable deps: lessonId, tenantId)

  // Handle online and beforeunload events
  useEffect(() => {
    const handleOnline = () => {
      lessonService.processOfflineQueue(tenantId)
    }

    // C-6: beforeunload async ops are abandoned by the browser.
    // Primary fix: write to sessionStorage synchronously — lessonService.processOfflineQueue
    // will pick this up on the next page load.
    // Secondary: also attempt the async path (may complete if unload is slow enough).
    const handleBeforeUnload = () => {
      const { status: s, progressPercentage: pct, lastPosition: pos } = latestRef.current
      if (pct > lastSent.current.percentage || (pos ?? 0) > lastSent.current.position) {
        // Use sessionStorage for reliable synchronous delivery during page unload
        try {
          sessionStorage.setItem(
            `progress_beacon_${lessonId}`,
            JSON.stringify({
              lessonId,
              tenantId,
              status: s,
              percentage: pct,
              position: pos,
              timestamp: Date.now(),
            })
          )
        } catch {
          // sessionStorage write failed (private mode, quota exceeded) — ignore
        }
        // Also attempt the async path (may or may not complete)
        lessonService.queueProgressUpdate(lessonId, tenantId, s, pct, pos)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tenantId, lessonId])

  // H-10: Flush on unmount or lesson change.
  // Capture lessonId at effect registration time so the cleanup uses the OLD lessonId,
  // not the new one that triggered the re-registration.
  useEffect(() => {
    const capturedLessonId = lessonId // capture current lesson at effect registration
    return () => {
      if (latestRef.current.progressPercentage > lastSent.current.percentage) {
        // Use captured lessonId (from when the effect was set up), not the current one
        lessonService.queueProgressUpdate(
          capturedLessonId,
          tenantId,
          latestRef.current.status,
          latestRef.current.progressPercentage,
          latestRef.current.lastPosition
        )
      }
    }
  }, [lessonId, tenantId]) // re-register when lesson changes so we capture the right ID

  // This is an invisible reporting component
  return null
}
