import { AlertTriangle, RotateCcw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'

import { useRecommendations, useRecordRecommendationAction } from '../queries/recommendationQueries'

interface ReviewPromptProps {
  score: number
  lessonId: string
  quizId?: string
}

export function ReviewPrompt({ score, lessonId, quizId: _quizId }: ReviewPromptProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentModuleId = searchParams.get('moduleId')
  const [dismissed, setDismissed] = useState(false)
  const { data: recommendations } = useRecommendations(user?.id ?? '', 10)
  const { mutate: recordAction } = useRecordRecommendationAction()

  // Only show if score < 60
  if (score >= 60 || dismissed) return null

  const reviewRec = recommendations?.find(
    (r) => r.recommendation_type === 'review_quiz' && r.target_id === lessonId
  )

  const handleReview = () => {
    if (reviewRec) {
      recordAction({ id: reviewRec.id, action: 'accepted' })
    }
    const courseTarget = reviewRec?.course_id ?? ''
    const params = currentModuleId
      ? `moduleId=${currentModuleId}&lessonId=${lessonId}`
      : `lessonId=${lessonId}`
    void navigate(`/courses/${courseTarget}?${params}`)
  }

  const handleDismiss = () => {
    if (reviewRec) {
      recordAction({ id: reviewRec.id, action: 'dismissed' })
    }
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Skor kamu {score}% — belum mencapai standar
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Kamu belum kuat di topik ini, mau review dulu?
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleReview}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Review Materi
              </button>
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Lanjut Saja
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
