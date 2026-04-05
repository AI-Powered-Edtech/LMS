import { BookOpen, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { useCreatorBridgeStore } from '../store/creatorBridge.store'

interface AIImportBannerProps {
  /** Called when user clicks "Tambahkan" — passes pending quiz data */
  onImport: (data: import('../store/creatorBridge.store').PendingQuizData) => void
}

export function AIImportBanner({ onImport }: AIImportBannerProps) {
  const pendingQuiz = useCreatorBridgeStore((s) => s.pendingQuiz)
  const clearPendingQuiz = useCreatorBridgeStore((s) => s.clearPendingQuiz)

  return (
    <AnimatePresence>
      {pendingQuiz && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-auto px-4"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl shadow-blue-900/30 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">
                {pendingQuiz.questionCount} soal AI siap ditambahkan
              </p>
              <p className="text-xs text-blue-100 truncate">
                {pendingQuiz.title} · {pendingQuiz.bloomLevel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onImport(pendingQuiz)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Tambahkan
            </button>
            <button
              type="button"
              onClick={clearPendingQuiz}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
