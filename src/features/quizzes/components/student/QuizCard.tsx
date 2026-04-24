import { Loader2, Play, Target, WifiOff } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import type { StudentQuizAssignment } from '@/features/quizzes'
import { formatDateTime } from '@/shared/utils/format-id'
import { cn } from '@/utils/cn'
import { getCachedQuiz } from '@/utils/offlineStorage'

export function QuizCard({
  quiz,
  activeAttempt,
  attemptsCount = 0,
  onStart,
  isStarting,
}: {
  quiz: StudentQuizAssignment
  activeAttempt?: { id: string } | null
  attemptsCount?: number
  onStart: () => void
  isStarting?: boolean
}) {
  const [isCached, setIsCached] = useState(false)

  useEffect(() => {
    getCachedQuiz(quiz.quiz_id)
      .then((cached) => {
        setIsCached(!!cached)
      })
      .catch(() => {
        // IndexedDB unavailable — no badge
      })
  }, [quiz.quiz_id])

  const timeLimitMin = quiz.time_limit_minutes ?? 0
  const maxAttempts = quiz.max_attempts ?? 0
  const isAvailable = attemptsCount < maxAttempts || !maxAttempts
  const availableUntil = quiz.due_at != null ? new Date(quiz.due_at) : null
  const isExpired = availableUntil ? availableUntil < new Date() : false

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/20 flex flex-col h-full overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2 items-center">
            {activeAttempt ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-wider">
                Sedang Berjalan
              </span>
            ) : attemptsCount > 0 && !isAvailable ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wider">
                Selesai
              </span>
            ) : (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 uppercase tracking-wider">
                Tersedia
              </span>
            )}
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              activeAttempt
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : attemptsCount > 0 && !isAvailable
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            )}
          >
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">
          {quiz.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {quiz.class_name}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {quiz.quiz_questions?.length || 0} Soal{' '}
            {timeLimitMin > 0 ? `• ${timeLimitMin} Menit` : ''}
          </span>
          {isCached && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              Tersimpan offline
            </span>
          )}
        </div>

        {availableUntil && (
          <p
            className={cn('text-xs font-bold mb-3', isExpired ? 'text-red-500' : 'text-amber-600')}
          >
            Tenggat: {formatDateTime(availableUntil)}
          </p>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 line-clamp-2 flex-1">
          {quiz.instructions}
        </p>

        {activeAttempt && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-blue-600">Progress Pengerjaan</span>
              <span className="text-xs font-bold text-blue-400">Sedang Berjalan</span>
            </div>
            <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full w-[50%] animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
          {maxAttempts > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-md">
              <span>
                Percobaan: {Math.min(attemptsCount + (activeAttempt ? 0 : 1), maxAttempts)} /{' '}
                {maxAttempts}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onStart}
          disabled={isStarting || (!activeAttempt && !isAvailable)}
          className={cn(
            'w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-50',
            activeAttempt
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm'
              : !isAvailable || isExpired
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-sm dark:from-slate-700 dark:to-slate-800'
          )}
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          {isStarting
            ? activeAttempt
              ? 'Melanjutkan...'
              : 'Memulai...'
            : activeAttempt
              ? 'Lanjutkan Kuis'
              : !isAvailable
                ? 'Selesai'
                : 'Mulai Kuis'}
        </button>
      </div>
    </motion.div>
  )
}
