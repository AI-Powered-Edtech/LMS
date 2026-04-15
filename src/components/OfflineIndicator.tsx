import { CloudOff, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSyncQueueCount } from '@/hooks/useSyncQueueCount'
import { cn } from '@/utils/cn'

// ---------------------------------------------------------------------------
// Global floating banner — mounted once in App.tsx
// ---------------------------------------------------------------------------

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()
  const isOffline = !isOnline
  const pendingCount = useSyncQueueCount()

  const showBanner = isOffline || pendingCount > 0

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4 pointer-events-none"
        >
          <div className="bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-3 text-sm pointer-events-auto dark:bg-slate-800 dark:border-slate-600">
            <div
              className={cn('p-1.5 rounded-full', isOffline ? 'bg-red-500/20' : 'bg-amber-500/20')}
            >
              {isOffline ? (
                <WifiOff className="w-4 h-4 text-red-400" />
              ) : (
                <CloudOff className="w-4 h-4 text-amber-400" />
              )}
            </div>

            <div>
              {isOffline ? (
                <>
                  <span className="font-bold">Anda sedang offline.</span>
                  <span className="font-medium text-slate-300 hidden sm:inline ml-1">
                    Perubahan akan disimpan saat online.
                  </span>
                </>
              ) : (
                <span className="font-medium text-slate-300">
                  {pendingCount} perubahan menunggu sinkronisasi
                </span>
              )}
            </div>

            {pendingCount > 0 && isOffline && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-xs font-bold text-slate-900">
                {pendingCount}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Inline form-level warning — embed inside any form or card
// ---------------------------------------------------------------------------

interface OfflineInlineWarningProps {
  className?: string
  /** Custom message override */
  message?: string
}

export function OfflineInlineWarning({ className, message }: OfflineInlineWarningProps) {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        'bg-amber-50 text-amber-800 border border-amber-200',
        'dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
        className
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message ?? 'Anda sedang offline. Perubahan akan disimpan saat online.'}</span>
    </div>
  )
}
