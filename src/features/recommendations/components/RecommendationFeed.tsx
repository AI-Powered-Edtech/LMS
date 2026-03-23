import { Lightbulb, Loader2, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/src/utils/cn'

import { useRecommendations, useRecordRecommendationAction } from '../queries/recommendationQueries'
import type { Recommendation, RecommendationType } from '../types'

const TYPE_ICONS: Record<RecommendationType, string> = {
  next_lesson: '📖',
  review_quiz: '🔄',
  practice_weak_topic: '💪',
  take_break: '☕',
  continue_course: '🎯',
}

const TYPE_LABELS: Record<RecommendationType, string> = {
  next_lesson: 'Lanjut Belajar',
  review_quiz: 'Review Kuis',
  practice_weak_topic: 'Latihan Lagi',
  take_break: 'Istirahat Dulu',
  continue_course: 'Lanjut Kursus',
}

const TYPE_ACCENTS: Record<RecommendationType, string> = {
  next_lesson: 'border-l-4 border-blue-500 bg-blue-50/30 dark:bg-blue-950/20',
  review_quiz: 'border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-950/20',
  practice_weak_topic: 'border-l-4 border-orange-500 bg-orange-50/30 dark:bg-orange-950/20',
  take_break: 'border-l-4 border-purple-500 bg-purple-50/30 dark:bg-purple-950/20',
  continue_course: 'border-l-4 border-green-500 bg-green-50/30 dark:bg-green-950/20',
}

const CONFIDENCE_BADGE = (conf: number): string => {
  if (conf >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (conf >= 0.6) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

interface RecommendationCardProps {
  rec: Recommendation
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

function RecommendationCard({ rec, onAccept, onDismiss }: RecommendationCardProps) {
  const navigate = useNavigate()

  const handleAccept = () => {
    onAccept(rec.id)
    if (rec.course_id) {
      navigate(`/courses/${rec.course_id}`)
    }
  }

  const label = TYPE_LABELS[rec.recommendation_type]
  const cardLabel = `${label}: ${rec.reason}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      role="article"
      aria-label={cardLabel}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4',
        TYPE_ACCENTS[rec.recommendation_type]
      )}
    >
      <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">
        {TYPE_ICONS[rec.recommendation_type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{label}</span>
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              CONFIDENCE_BADGE(rec.confidence)
            )}
          >
            {Math.round(rec.confidence * 100)}% cocok
          </span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">{rec.reason}</p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleAccept}
            aria-label={`Mulai: ${cardLabel}`}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Mulai
          </button>
          <button
            onClick={() => onDismiss(rec.id)}
            aria-label={`Nanti: ${cardLabel}`}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Nanti
          </button>
        </div>
      </div>
    </motion.div>
  )
}

interface RecommendationFeedProps {
  userId: string
}

export function RecommendationFeed({ userId }: RecommendationFeedProps) {
  const { data: recommendations, isLoading } = useRecommendations(userId)
  const { mutate: recordAction } = useRecordRecommendationAction()

  const handleAccept = (id: string) => {
    recordAction({ id, action: 'accepted' })
  }

  const handleDismiss = (id: string) => {
    recordAction({ id, action: 'dismissed' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const list = recommendations ?? []

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        Direkomendasikan untuk kamu
      </h2>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <Lightbulb className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Tidak ada rekomendasi saat ini. Terus belajar!
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
            Terus belajar untuk mendapat saran yang lebih personal!
          </p>
        </div>
      ) : (
        <AnimatePresence>
          {list.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
