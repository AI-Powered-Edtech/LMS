import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/utils/cn'

import type { SaveStatus } from './types'

interface SaveStatusToastProps {
  status: SaveStatus
}

export function SaveStatusToast({ status }: SaveStatusToastProps) {
  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-md text-sm font-medium',
            status === 'saving'
              ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              : status === 'saved'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          )}
        >
          {status === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan draf...
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-4 h-4" /> Draf tersimpan
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-4 h-4" /> Gagal menyimpan. Periksa koneksi.
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
