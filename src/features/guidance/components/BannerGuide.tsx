// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { X } from 'lucide-react'
import { motion } from 'motion/react'

import type { ApplicableGuide } from '../types'

interface Props {
  guide: ApplicableGuide
  onDismiss: () => void
}

export function BannerGuide({ guide, onDismiss }: Props) {
  return (
    <motion.div
      initial={%DOPEN% opacity: 0, y: -8 %DCLOSE%}
      animate={%DOPEN% opacity: 1, y: 0 %DCLOSE%}
      exit={%DOPEN% opacity: 0, y: -8 %DCLOSE%}
      transition={%DOPEN% duration: 0.25 %DCLOSE%}
      className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/60 dark:bg-blue-900/20"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">{guide.title}</p>
        <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed whitespace-pre-wrap">
          {guide.content}
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Tutup panduan"
        className="flex-shrink-0 rounded p-1 text-blue-500 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-800/40 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
