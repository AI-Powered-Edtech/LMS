import { BookOpen, Clock, Trophy } from 'lucide-react'
import { motion } from 'motion/react'

interface ProgressSummaryProps {
  totalLessons: number
  completedLessons: number
  totalDurationMinutes: number
}

export function ProgressSummary({
  totalLessons,
  completedLessons,
  totalDurationMinutes,
}: ProgressSummaryProps) {
  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const remainingLessons = totalLessons - completedLessons
  const avgPerLesson =
    totalLessons > 0 && totalDurationMinutes > 0 ? totalDurationMinutes / totalLessons : 5
  const remainingMinutes = Math.round(remainingLessons * avgPerLesson)
  const isComplete = percentage === 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-md shadow-slate-200/40 dark:shadow-none p-6"
    >
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Progres Belajar
          </span>
          <span
            className={`text-sm font-bold ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}
          >
            {percentage}%
          </span>
        </div>
        <div
          className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres Belajar"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-blue-400 to-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Pelajaran</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {completedLessons}/{totalLessons}{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">selesai</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Estimasi Sisa</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isComplete ? (
                <span className="text-emerald-600">Selesai!</span>
              ) : (
                <>
                  {remainingMinutes > 60
                    ? `${Math.floor(remainingMinutes / 60)} jam${remainingMinutes % 60 > 0 ? ` ${remainingMinutes % 60} menit` : ''}`
                    : `~${remainingMinutes} menit`}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Status</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isComplete ? 'Tuntas' : percentage > 0 ? 'Dalam Proses' : 'Belum Dimulai'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
