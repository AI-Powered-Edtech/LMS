// Anti-Cheat Hook - Tab switch detection + cheating signal RPC
// Part of the Quiz Engine Refactor

import { useCallback, useEffect, useState } from 'react'

import * as quizPlayerService from '../api/quizPlayer.service'

interface UseAntiCheatOptions {
  attemptId: string | undefined
}

interface UseAntiCheatResult {
  tabWarning: boolean
  dismissWarning: () => void
}

/**
 * Hook for anti-cheat detection
 * Monitors tab visibility changes and records cheating signals
 */
export function useAntiCheat({ attemptId }: UseAntiCheatOptions): UseAntiCheatResult {
  const [tabWarning, setTabWarning] = useState(false)

  const dismissWarning = useCallback(() => {
    setTabWarning(false)
  }, [])

  useEffect(() => {
    if (!attemptId) return

    const handler = () => {
      if (document.hidden) {
        setTabWarning(true)
        // Record cheating signal
        quizPlayerService.recordCheatingSignal(attemptId, 'TAB_SWITCH', {
          timestamp: new Date().toISOString(),
        })
        // Auto-dismiss after 5s
        setTimeout(() => setTabWarning(false), 5000)
      }
    }

    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [attemptId])

  return {
    tabWarning,
    dismissWarning,
  }
}
