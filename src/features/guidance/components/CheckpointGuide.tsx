import { CheckCircle, HelpCircle } from 'lucide-react'
import { motion } from 'motion/react'
import type { ApplicableGuide } from '../types'

interface Props {
  guide: ApplicableGuide
  onDismiss: () => void
  onComplete: () => void
}

export function CheckpointGuide({ guide, onDismiss, onComplete }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800/60 dark:bg-violet-900/20"
    >
      <div className="flex items-start gap-3 mb-4">
        <HelpCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
        <div>
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-1">
            {guide.title}
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-400 leading-relaxed">
            {guide.content}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          Ya, sudah paham
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-violet-300 px-4 py-2 text-sm text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/30 transition-colors"
        >
          Belum, lanjut dulu
        </button>
      </div>
    </motion.div>
  )
}
