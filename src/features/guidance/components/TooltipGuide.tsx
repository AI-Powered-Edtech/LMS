// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { X } from 'lucide-react'
import { motion } from 'motion/react'

import type { ApplicableGuide } from '../types'

interface Props {
  guide: ApplicableGuide
  onDismiss: () => void
}

export function TooltipGuide({ guide, onDismiss }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative inline-block max-w-xs rounded-lg bg-slate-800 px-4 py-3 text-white shadow-lg dark:bg-slate-700"
    >
      {/* Arrow */}
      <span className="absolute -top-2 left-4 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-slate-800 dark:border-b-slate-700" />
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/90 mb-0.5">{guide.title}</p>
          <p className="text-xs text-white/75 leading-relaxed">{guide.content}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Tutup"
          className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
