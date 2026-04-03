/**
 * QuestCompleteModal — celebration modal shown when a quest is completed.
 * Uses canvas-confetti for the celebration effect.
 * Auto-closes after 4 seconds. Phase 36A: Learning Quests System
 */

import confetti from 'canvas-confetti'
import { X, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

import { cn } from '@/utils/cn'

import type { Quest } from '../types'
import { QUEST_TYPE_COLORS, QUEST_TYPE_LABELS } from '../types'

interface QuestCompleteModalProps {
  quest: Quest
  onClose: () => void
}

function fireConfetti() {
  const count = 200
  const defaults = { origin: { y: 0.7 } }

  function fire(particleRatio: number, opts: confetti.Options) {
    void confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55, colors: ['#a855f7', '#7c3aed'] })
  fire(0.2, { spread: 60, colors: ['#f59e0b', '#fbbf24'] })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#10b981', '#34d399'] })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#3b82f6'] })
  fire(0.1, { spread: 120, startVelocity: 45, colors: ['#ef4444'] })
}

export function QuestCompleteModal({ quest, onClose }: QuestCompleteModalProps) {
  const colors = QUEST_TYPE_COLORS[quest.quest_type]

  // Fire confetti + auto-close
  useEffect(() => {
    fireConfetti()
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Misi Selesai"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Quest icon */}
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.15, 1] }}
            transition={{ duration: 0.5, times: [0, 0.7, 1] }}
            className={cn(
              'mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full text-5xl',
              colors.bg,
              colors.darkBg
            )}
            aria-hidden="true"
          >
            {quest.icon}
          </motion.div>

          {/* Heading */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          >
            🎉 Misi Selesai!
          </motion.p>

          {/* Type chip */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={cn(
              'mb-4 inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide',
              colors.bg,
              colors.text,
              colors.darkBg,
              colors.darkText
            )}
          >
            {QUEST_TYPE_LABELS[quest.quest_type]}
          </motion.span>

          {/* Quest title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-5 text-lg font-semibold text-slate-700 dark:text-slate-200"
          >
            {quest.title}
          </motion.h2>

          {/* XP badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-5 py-2.5 text-xl font-extrabold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          >
            <Zap className="h-6 w-6" aria-hidden="true" />+{quest.xp_reward} XP
          </motion.div>

          {/* Auto-close hint */}
          <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
            Menutup otomatis dalam beberapa detik...
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
