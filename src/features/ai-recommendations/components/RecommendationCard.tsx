import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

import { cn } from '@/utils/cn'

import type { LearningRecommendation } from '../types'

// ── Priority config ──
const PRIORITY_STYLES: Record<LearningRecommendation['priority'], string> = {
  high: 'border-l-4 border-red-400 bg-red-50/40 dark:bg-red-950/20 dark:border-red-500',
  medium:
    'border-l-4 border-yellow-400 bg-yellow-50/40 dark:bg-yellow-950/20 dark:border-yellow-500',
  low: 'border-l-4 border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-500',
}

const PRIORITY_BADGE: Record<
  LearningRecommendation['priority'],
  { label: string; className: string }
> = {
  high: {
    label: 'Prioritas Tinggi',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  medium: {
    label: 'Prioritas Sedang',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  low: {
    label: 'Prioritas Rendah',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
}

// ── Props ──
interface RecommendationCardProps {
  rec: LearningRecommendation
  index: number
  onNavigate: (lessonId: string) => void
}

export function RecommendationCard({ rec, index, onNavigate }: RecommendationCardProps) {
  const badge = PRIORITY_BADGE[rec.priority]
  const priorityStyle = PRIORITY_STYLES[rec.priority]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800/60 p-4 flex items-start gap-3',
        priorityStyle
      )}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Badge */}
        <span
          className={cn(
            'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5',
            badge.className
          )}
        >
          {badge.label}
        </span>

        {/* Title */}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
          {rec.lesson_title}
        </p>

        {/* Reason */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
          {rec.reason}
        </p>

        {/* CTA */}
        <button
          onClick={() => onNavigate(rec.lesson_id)}
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 text-xs font-semibold',
            'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300',
            'transition-colors group'
          )}
          aria-label={`Buka pelajaran: ${rec.lesson_title}`}
        >
          Buka Pelajaran
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  )
}
