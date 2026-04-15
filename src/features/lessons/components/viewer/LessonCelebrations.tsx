import { Award } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { ModuleCompletionModal } from '@/components/LessonViewer'

import type { Lesson } from '../../index'

interface LessonCelebrationsProps {
  showXPReward: boolean
  showCelebration: boolean
  showModuleComplete: boolean
  moduleTitle: string
  isLastLesson: boolean
  nextLesson: Lesson | null
  onSelectLesson: (id: string) => void
  onCelebrationDismiss: () => void
  onModuleContinue: () => void
  onModuleClose: () => void
}

export function LessonCelebrations({
  showXPReward,
  showCelebration,
  showModuleComplete,
  moduleTitle,
  isLastLesson,
  nextLesson,
  onSelectLesson,
  onCelebrationDismiss,
  onModuleContinue,
  onModuleClose,
}: LessonCelebrationsProps) {
  return (
    <>
      {/* XP Reward Animation */}
      <AnimatePresence>
        {showXPReward && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="absolute bottom-8 right-8 z-50 pointer-events-none flex items-center gap-2 bg-yellow-400 text-yellow-900 font-extrabold text-lg px-5 py-3 rounded-2xl shadow-xl"
          >
            +10 XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl text-center max-w-sm pointer-events-auto">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pelajaran Selesai!
              </h2>
              {nextLesson ? (
                <button
                  onClick={() => {
                    onSelectLesson(nextLesson.id)
                    onCelebrationDismiss()
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-lg"
                >
                  Lanjut ke Pelajaran Berikutnya →
                </button>
              ) : isLastLesson ? (
                <p className="text-slate-500 dark:text-slate-400">
                  Semua pelajaran di modul ini telah selesai!
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Progres Anda telah disimpan.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Completion Modal */}
      <AnimatePresence>
        {showModuleComplete && (
          <ModuleCompletionModal
            moduleTitle={moduleTitle}
            hasNextModule={!isLastLesson}
            xpEarned={50}
            onContinue={onModuleContinue}
            onClose={onModuleClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}
