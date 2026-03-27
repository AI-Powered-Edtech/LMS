// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { Download, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { usePWAInstall } from '@/src/hooks/usePWAInstall'
import { cn } from '@/src/utils/cn'

export function InstallPrompt() {
  const { canInstall, promptInstall, isDismissed, dismiss } = usePWAInstall()

  const visible = canInstall && !isDismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="banner"
          aria-label="Pasang aplikasi"
          initial={%DOPEN% y: 100, opacity: 0 %DCLOSE%}
          animate={%DOPEN% y: 0, opacity: 1 %DCLOSE%}
          exit={%DOPEN% y: 100, opacity: 0 %DCLOSE%}
          transition={%DOPEN% type: 'spring', stiffness: 300, damping: 30 %DCLOSE%}
          className={cn(
            'fixed bottom-4 inset-x-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm',
            'flex items-center gap-3 rounded-xl p-4 shadow-lg',
            'bg-white border border-gray-200',
            'dark:bg-gray-800 dark:border-gray-700'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
              'bg-blue-50 text-blue-600',
              'dark:bg-blue-900/40 dark:text-blue-400'
            )}
          >
            <Download className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-semibold leading-tight',
                'text-gray-900 dark:text-gray-100'
              )}
            >
              Pasang EduSync di perangkat Anda
            </p>
            <p className={cn('text-xs mt-0.5', 'text-gray-500 dark:text-gray-400')}>
              Akses lebih cepat tanpa membuka browser
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void promptInstall()}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700',
                'dark:bg-blue-500 dark:hover:bg-blue-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-offset-gray-800'
              )}
            >
              Pasang
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup"
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
