import { Loader2, Check, AlertCircle, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/src/utils/cn'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

interface AutosaveIndicatorProps {
  status: SaveStatus
}

const CONFIG = {
  saving: {
    wrapper: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Menyimpan...',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  saved: {
    wrapper: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    label: 'Tersimpan',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  error: {
    wrapper: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    label: 'Gagal menyimpan',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  offline: {
    wrapper: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    label: 'Offline — jawaban tersimpan lokal',
    icon: <WifiOff className="w-3.5 h-3.5" />,
  },
} satisfies Record<
  Exclude<SaveStatus, 'idle'>,
  { wrapper: string; label: string; icon: React.ReactNode }
>

export function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  const config = status !== 'idle' ? CONFIG[status] : null

  return (
    <AnimatePresence mode="wait">
      {config && (
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
            status === 'saving' && 'border-blue-200 dark:border-blue-700',
            status === 'saved' && 'border-green-200 dark:border-green-700',
            status === 'error' && 'border-red-200 dark:border-red-700',
            status === 'offline' && 'border-amber-200 dark:border-amber-700',
            config.wrapper
          )}
        >
          {config.icon}
          <span>{config.label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
