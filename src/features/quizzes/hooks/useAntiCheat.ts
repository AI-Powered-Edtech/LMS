// Anti-Cheat Hook - Tab switch detection + cheating signal RPC
// Part of the Quiz Engine Refactor

import { useCallback, useEffect, useState } from 'react'

import * as quizPlayerService from '../api/quizPlayer.service'
import type { AntiCheatEventType } from '../utils/antiCheatLogger'

interface UseAntiCheatOptions {
  attemptId: string | undefined
}

interface UseAntiCheatResult {
  tabWarning: boolean
  dismissWarning: () => void
}

/**
 * Hook for anti-cheat detection
 * Monitors tab visibility changes, window blur, copy/paste, and right-click events.
 * Records cheating signals via quizPlayerService.recordCheatingSignal.
 */
export function useAntiCheat({ attemptId }: UseAntiCheatOptions): UseAntiCheatResult {
  const [tabWarning, setTabWarning] = useState(false)

  const dismissWarning = useCallback(() => {
    setTabWarning(false)
  }, [])

  useEffect(() => {
    if (!attemptId) return

    const record = (type: AntiCheatEventType, extra?: Record<string, unknown>) => {
      quizPlayerService.recordCheatingSignal(attemptId, type, {
        timestamp: new Date().toISOString(),
        ...extra,
      })
    }

    // TAB_SWITCH — document visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarning(true)
        record('TAB_SWITCH')
        // Auto-dismiss after 5s
        setTimeout(() => setTabWarning(false), 5000)
      }
    }

    // WINDOW_BLUR — user switches to another application window
    const handleWindowBlur = () => {
      record('WINDOW_BLUR')
    }

    // COPY_PASTE — copy or paste events on the document
    const handleCopyPaste = (e: ClipboardEvent) => {
      record('COPY_PASTE', { action: e.type })
    }

    // RIGHT_CLICK — context menu opened
    const handleContextMenu = () => {
      record('RIGHT_CLICK')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('paste', handleCopyPaste)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [attemptId])

  return {
    tabWarning,
    dismissWarning,
  }
}
