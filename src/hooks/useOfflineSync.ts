// EduSync LMS — useOfflineSync Hook
// Provides offline detection, queue management, and sync controls to components

import { useCallback, useEffect, useRef, useState } from 'react'

import { processSyncQueue, startOfflineSync } from '@/utils/offlineQueue'
import { getPendingCount } from '@/utils/offlineStorage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseOfflineSyncReturn {
  /** Whether the device is currently online */
  isOnline: boolean
  /** Number of operations waiting to sync */
  pendingCount: number
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean
  /** Last sync result summary */
  lastSyncedAt: number | null
  /** Trigger a manual sync */
  sync: () => Promise<void>
  /** Get the current pending count without waiting for poll */
  refreshPendingCount: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for managing offline sync state and operations.
 *
 * Usage:
 * ```tsx
 * const { isOnline, pendingCount, isSyncing, sync } = useOfflineSync()
 *
 * return (
 *   <div>
 *     {isOnline ? 'Online' : 'Offline'}
 *     {pendingCount > 0 && (
 *       <button onClick={sync} disabled={isSyncing}>
 *         Sync {pendingCount} items
 *       </button>
 *     )}
 *   </div>
 * )
 * ```
 */
export function useOfflineSync(options?: {
  /** Poll interval for pending count in ms (default: 5000) */
  pollInterval?: number
  /** Auto-sync when coming online (default: true) */
  autoSync?: boolean
}): UseOfflineSyncReturn {
  const pollInterval = options?.pollInterval ?? 5000
  const autoSync = options?.autoSync ?? true

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const cleanupRef = useRef<(() => void) | null>(null)

  // ---------------------------------------------------------------------------
  // Online/Offline Detection + Auto Sync
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (autoSync) {
        sync()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Start the built-in offline sync listener
    cleanupRef.current = startOfflineSync()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      cleanupRef.current?.()
    }
  }, [autoSync])

  // ---------------------------------------------------------------------------
  // Pending Count Polling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }

    updateCount()
    const interval = setInterval(updateCount, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  // ---------------------------------------------------------------------------
  // Sync Function
  // ---------------------------------------------------------------------------

  const sync = useCallback(async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    try {
      await processSyncQueue()
      setLastSyncedAt(Date.now())
      setPendingCount(await getPendingCount())
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, isOnline])

  // ---------------------------------------------------------------------------
  // Refresh Pending Count
  // ---------------------------------------------------------------------------

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getPendingCount())
  }, [])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    sync,
    refreshPendingCount,
  }
}
