import { useCallback, useEffect, useRef } from 'react'

import { lessonService } from '@/features/lessons'

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

  // FIX 2: tenantIdRef always holds the latest tenantId so handleOnline is never
  // bound to a stale (e.g. null) value captured at effect registration time.
  const tenantIdRef = useRef(tenantId)
  tenantIdRef.current = tenantId

  // C7 fix: Reset lastSent when lesson changes to prevent stale high-water mark
  // blocking progress reports for the new lesson
  useEffect(() => {
    lastSent.current = { percentage: 0, position: 0 }
  }, [lessonId])

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

    // FIX 1: Only skip if we've already sent at least once AND there's no new progress.
    // Without this guard, the very first send (pct=0, pos=0) would be blocked because
    // 0 <= 0 && 0 <= 0 evaluates to true against the initial lastSent values.
    const hasEverSent = lastSent.current.percentage > 0 || lastSent.current.position > 0
    if (
      hasEverSent &&
      pct <= lastSent.current.percentage &&
      (pos ?? 0) <= lastSent.current.position
    ) {
      return
    }

    try {
      await lessonService.queueProgressUpdate(lessonId, tenantIdRef.current, s, pct, pos)
      lastSent.current = { percentage: pct, position: pos ?? 0 }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ProgressReporter] Failed to sync:', err)
    }
  }, [lessonId]) // Stable deps only — no interval churn; tenantId read from ref

  // FIX 3: Capture interval ID in a local const so rapid unmount/remount cycles
  // cannot have the first mount's cleanup accidentally clear the second mount's interval.
  // Previously, both cleanups shared the same ref, so whichever ran last would
  // clear whatever ID the ref currently held.
  useEffect(() => {
    const id = setInterval(() => {
      if (enabledRef.current) sendUpdate()
    }, 5000)
    intervalRef.current = id

    return () => {
      clearInterval(id) // use captured id, not ref
      intervalRef.current = null
    }
  }, [sendUpdate]) // only recreate if sendUpdate changes (stable deps: lessonId, tenantId)

  // Handle online and beforeunload events
  useEffect(() => {
    // FIX 2: Read tenantId from ref so this handler always uses the current value,
    // even if the effect was registered when tenantId was still null.
    const handleOnline = () => {
      if (tenantIdRef.current) lessonService.processOfflineQueue(tenantIdRef.current)
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
  }, [lessonId]) // FIX 2: removed tenantId — handleOnline now reads from tenantIdRef

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
          tenantIdRef.current,
          latestRef.current.status,
          latestRef.current.progressPercentage,
          latestRef.current.lastPosition
        )
      }
    }
  }, [lessonId]) // re-register when lesson changes so we capture the right ID; tenantId read from ref

  // This is an invisible reporting component
  return null
}
