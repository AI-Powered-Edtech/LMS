import { AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'

import type { LessonAnalytics } from '../types'

interface StruggleAlertBannerProps {
  lessonAnalytics: LessonAnalytics[]
}

export function StruggleAlertBanner({ lessonAnalytics }: StruggleAlertBannerProps) {
  // ⚡ Perf: memoize filter/reduce chain — prevents recalculation on every parent re-render
  const { lessonsWithStruggle, totalStruggling, totalHighRisk } = useMemo(() => {
    const filtered = lessonAnalytics.filter((l) => l.struggling_students > 0)
    return {
      lessonsWithStruggle: filtered,
      totalStruggling: filtered.reduce((sum, l) => sum + l.struggling_students, 0),
      totalHighRisk: filtered.reduce((sum, l) => sum + l.high_risk_students, 0),
    }
  }, [lessonAnalytics])

  if (lessonsWithStruggle.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4
                       dark:border-amber-700/50 dark:bg-amber-900/20"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {totalStruggling} siswa mengalami kesulitan
          {totalHighRisk > 0 && (
            <span className="ml-1 text-red-600 dark:text-red-400">
              ({totalHighRisk} risiko tinggi)
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          Terdeteksi di {lessonsWithStruggle.length} pelajaran:{' '}
          {lessonsWithStruggle
            .slice(0, 3)
            .map((l) => l.lesson_title)
            .join(', ')}
          {lessonsWithStruggle.length > 3 && `, +${lessonsWithStruggle.length - 3} lainnya`}
        </p>
      </div>
    </motion.div>
  )
}
