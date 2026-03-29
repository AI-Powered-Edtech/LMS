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

  // Throttled 5-second interval — stable, won't recreate on progress changes
  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(sendUpdate, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, sendUpdate])

  // Handle online and beforeunload events
  useEffect(() => {
    const handleOnline = () => {
      lessonService.processOfflineQueue(tenantId)
    }

    const handleBeforeUnload = () => {
      const { status: s, progressPercentage: pct, lastPosition: pos } = latestRef.current
      if (pct > lastSent.current.percentage || (pos ?? 0) > lastSent.current.position) {
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

  // Flush on unmount or lesson change
  useEffect(() => {
    return () => {
      if (latestRef.current.progressPercentage > lastSent.current.percentage) {
        sendUpdate()
      }
    }
  }, [lessonId, sendUpdate])

  // This is an invisible reporting component
  return null
}
