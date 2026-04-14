import { processSyncQueue, type SyncResult } from './offlineQueue'

const DELAYS = [1000, 5000, 30000, 300000] as const

export interface BackgroundSyncStatus {
  isSyncing: boolean
  lastSyncedAt: number | null
  lastResult: SyncResult | null
}

const listeners = new Set<(status: BackgroundSyncStatus) => void>()

let status: BackgroundSyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  lastResult: null,
}

function publishStatus(next: BackgroundSyncStatus): void {
  status = next
  listeners.forEach((listener) => listener(status))
}

export function getBackgroundSyncStatus(): BackgroundSyncStatus {
  return status
}

export function subscribeBackgroundSyncStatus(
  listener: (status: BackgroundSyncStatus) => void
): () => void {
  listeners.add(listener)
  listener(status)

  return () => {
    listeners.delete(listener)
  }
}

export async function syncPendingSubmissions(): Promise<SyncResult> {
  publishStatus({
    ...status,
    isSyncing: true,
  })

  const result = await processSyncQueue()

  publishStatus({
    isSyncing: false,
    lastSyncedAt: Date.now(),
    lastResult: result,
  })

  return result
}

export function scheduleSync(attempt: number = 0): void {
  const delay = DELAYS[Math.min(attempt, DELAYS.length - 1)]

  window.setTimeout(() => {
    void (async (): Promise<void> => {
      const result = await syncPendingSubmissions()

      if (result.failed > 0 && attempt < DELAYS.length - 1) {
        scheduleSync(attempt + 1)
      }
    })()
  }, delay)
}
