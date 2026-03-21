import { useState, useEffect } from 'react'
import { WifiOff, Wifi, X } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus'
import { scheduleSync } from '@/src/utils/backgroundSync'

type BannerState = 'offline' | 'syncing' | 'hidden'

export function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus()
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
      scheduleSync(0)
      resetWasOffline()

      const timer = setTimeout(() => {
        setBannerState('hidden')
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline, resetWasOffline])

  const visible = !dismissed && bannerState !== 'hidden'

  if (!visible) return null

  const isOffline = bannerState === 'offline'
  const isSyncing = bannerState === 'syncing'

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
            ? 'Anda sedang offline \u2014 jawaban tersimpan secara lokal'
            : 'Koneksi pulih \u2014 menyinkronkan data\u2026'}
        </span>
      </div>

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
  )
}
