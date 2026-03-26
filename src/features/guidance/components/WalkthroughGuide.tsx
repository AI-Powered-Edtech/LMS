<<<<<<< Updated upstream
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
=======
import { ChevronLeft, ChevronRight,X } from 'lucide-react'
import { AnimatePresence,motion } from 'motion/react'
>>>>>>> Stashed changes
import { useState } from 'react'

import type { ApplicableGuide } from '../types'

interface Props {
  guide: ApplicableGuide
  onDismiss: () => void
  onComplete: () => void
}

// Content is split by \n--- for multi-step walkthroughs, otherwise single step
function parseSteps(content: string): string[] {
  const steps = content
    .split('\n---\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return steps.length > 0 ? steps : [content]
}

export function WalkthroughGuide({ guide, onDismiss, onComplete }: Props) {
  const steps = parseSteps(guide.content)
  const [step, setStep] = useState(0)

  const isLast = step === steps.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-indigo-200 bg-white shadow-lg dark:border-indigo-800/60 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">{guide.title}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {step + 1} / {steps.length}
          </span>
          <button
            onClick={onDismiss}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Step indicator dots */}
      {steps.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-3">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-4 bg-indigo-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="px-5 py-4"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {steps[step]}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Sebelumnya
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {isLast ? 'Selesai' : 'Lanjut'}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </motion.div>
  )
}
