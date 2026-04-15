// Canonical UI primitive. Use this instead of custom implementations.
// Network status banner with sync state, dismiss handling, and background sync integration.
// Canonical UI primitive. Use this instead of custom implementations.
// Network status banner with sync state, dismiss handling, and background sync integration.
import { Wifi, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSyncQueueCount } from '@/hooks/useSyncQueueCount'
import {
  getBackgroundSyncStatus,
  scheduleSync,
  subscribeBackgroundSyncStatus,
} from '@/utils/backgroundSync'
import { cn } from '@/utils/cn'

type BannerState = 'offline' | 'syncing' | 'hidden'

export function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus()
  const syncCount = useSyncQueueCount()
  const [syncStatus, setSyncStatus] = useState(getBackgroundSyncStatus())
  const [dismissed, setDismissed] = useState(false)
  const [bannerState, setBannerState] = useState<BannerState>('hidden')

  // Transition logic
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false)
      setBannerState('offline')
    }
  }, [isOnline])

  useEffect(() => {
    if (isOnline && wasOffline) {
      setBannerState('syncing')
      scheduleSync()
      resetWasOffline()
    }
  }, [isOnline, wasOffline, resetWasOffline])

  useEffect(() => {
    return subscribeBackgroundSyncStatus((next) => {
      setSyncStatus(next)
      if (next.isSyncing && isOnline) {
        setBannerState('syncing')
      }
    })
  }, [isOnline])

  useEffect(() => {
    if (!isOnline || syncStatus.isSyncing || !syncStatus.lastSyncedAt) return

    const timer = window.setTimeout(() => {
      setBannerState('hidden')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [isOnline, syncStatus.isSyncing, syncStatus.lastSyncedAt])

  const visible = !dismissed && bannerState !== 'hidden'

  if (!visible) return null

  const isOffline = bannerState === 'offline'
  const isSyncing = bannerState === 'syncing'
  const hasConflicts = (syncStatus.lastResult?.conflicts ?? 0) > 0
  const hasFailures = (syncStatus.lastResult?.failed ?? 0) > 0

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 inset-x-0 z-[60] flex items-center justify-between gap-3',
        'px-4 py-2.5 text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
        isOffline &&
          'bg-amber-50 text-amber-900 border-b border-amber-200 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800',
        isSyncing &&
          'bg-emerald-50 text-emerald-900 border-b border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800'
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Wifi className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}

        <span>
          {isOffline
            ? 'Anda sedang offline. Data yang didukung akan disimpan lokal sampai koneksi kembali.'
            : syncStatus.isSyncing
              ? syncCount > 0
                ? `Menyinkronkan ${syncCount} item…`
                : 'Koneksi pulih. Menyinkronkan data…'
              : hasConflicts
                ? `Sinkronisasi selesai dengan ${syncStatus.lastResult?.conflicts ?? 0} konflik.`
                : hasFailures
                  ? `Sinkronisasi selesai dengan ${syncStatus.lastResult?.failed ?? 0} item tertunda.`
                  : syncStatus.lastSyncedAt
                    ? `Sinkronisasi selesai ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`
                    : 'Koneksi pulih. Menyinkronkan data…'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isOffline && (hasConflicts || hasFailures) && (
          <button
            type="button"
            onClick={() => scheduleSync()}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
              'bg-white/70 hover:bg-white text-slate-700',
              'dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:text-slate-200'
            )}
          >
            Coba Lagi
          </button>
        )}

        {isOffline && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup notifikasi"
            className={cn(
              'p-1 rounded-md shrink-0 transition-colors outline-none',
              'text-amber-600 hover:text-amber-800 hover:bg-amber-100',
              'dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/40',
              'focus-visible:ring-2 focus-visible:ring-amber-500'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
