import { useCallback, useEffect, useState } from 'react'

import { getPendingCount } from '@/utils/offlineStorage'

/**
 * Returns the number of items waiting in the offline sync queue.
 * Polls every 5 seconds while offline, once on mount, and re-checks
 * when the browser fires online/offline events.
 *
 * Uses the efficient `getPendingCount()` which leverages IDBObjectStore.count()
 * instead of deserialising all records.
 */
export function useSyncQueueCount(): number {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const total = await getPendingCount()
      setCount(total)
    } catch (err) {
      // IndexedDB unavailable — count stays 0
      if (import.meta.env.DEV) console.warn('[useSyncQueueCount] IndexedDB unavailable:', err)
    }
  }, [])

  useEffect(() => {
    refresh()

    const handleChange = () => {
      refresh()
    }

    window.addEventListener('online', handleChange)
    window.addEventListener('offline', handleChange)

    // Poll every 5s so new items added while offline surface quickly
    const interval = setInterval(refresh, 5000)

    return () => {
      window.removeEventListener('online', handleChange)
      window.removeEventListener('offline', handleChange)
      clearInterval(interval)
    }
  }, [refresh])

  return count
}
