import { useState, useEffect } from 'react'
import { X, RefreshCw, BookOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { useMyLessonStatus } from '../queries/useStruggleQueries'

interface Props {
  lessonId: string
}

function dismissKey(lessonId: string) {
  return `struggle_dismissed_${lessonId}`
}

export function StruggleHelpPrompt({ lessonId }: Props) {
  const { data: status, isLoading } = useMyLessonStatus(lessonId)
  const [dismissed, setDismissed] = useState(false)

  // On mount, check sessionStorage for this lesson's dismiss flag
  useEffect(() => {
    if (sessionStorage.getItem(dismissKey(lessonId)) === '1') {
      setDismissed(true)
    } else {
      setDismissed(false)
    }
  }, [lessonId])

  function dismiss() {
    sessionStorage.setItem(dismissKey(lessonId), '1')
    setDismissed(true)
  }

  // Do not render while loading or once dismissed
  if (isLoading || dismissed) return null

  // Do not render when severity is low, data missing, or feature disabled
  if (!status || status.severity === 'low' || !status.prompt_enabled) return null

  const isMedium = status.severity === 'medium'

  if (isMedium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 sm:mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700"
      >
        <span className="text-lg shrink-0" aria-hidden="true">
          💡
        </span>
        <p className="flex-1 text-sm text-amber-800 dark:text-amber-300 leading-snug">
          <span className="font-semibold">Tips belajar:</span> Kalau merasa pelajaran ini sulit,
          coba baca ulang bagian yang belum dipahami atau tonton video lebih pelan.
        </p>
        <button
          aria-label="Tutup tips"
          onClick={dismiss}
          className="shrink-0 p-1 rounded-lg text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    )
  }

  // High severity
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 sm:mx-6 mt-4 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700"
    >
      <div className="flex items-start gap-3 flex-1">
        <span className="text-lg shrink-0" aria-hidden="true">
          🤝
        </span>
        <div>
          <p className="font-semibold text-sm text-red-800 dark:text-red-300">Butuh bantuan?</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-0.5 leading-snug">
            Banyak siswa merasa pelajaran ini challenging. Coba langkah-langkah ini:
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <button
          onClick={dismiss}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tonton ulang
        </button>
        <button
          onClick={dismiss}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Baca ulang
        </button>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Tutup
        </button>
      </div>
    </motion.div>
  )
}
