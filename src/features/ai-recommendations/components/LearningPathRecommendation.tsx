import { Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { useAiRecommendations } from '../queries/recommendationQueries'
import { RecommendationCard } from './RecommendationCard'

// ── Skeleton ──
function RecommendationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
        />
      ))}
    </div>
  )
}

// ── Props ──
interface LearningPathRecommendationProps {
  courseId: string
  tenantId: string
  onNavigateToLesson: (lessonId: string) => void
}

/**
 * AI Learning Path Recommendation widget.
 *
 * - Renders non-blocking: loading state shows skeleton cards below the main content.
 * - Error state: fails silently — nothing shown.
 * - Empty state: returns null — nothing shown.
 * - Success: shows up to 3 AI-powered (or rule-based) recommendation cards.
 */
export function LearningPathRecommendation({
  courseId,
  tenantId,
  onNavigateToLesson,
}: LearningPathRecommendationProps) {
  const { data, isLoading, isError } = useAiRecommendations(courseId, tenantId)

  // Fail silently on error
  if (isError) return null

  // Loading: show skeletons (non-blocking — renders below main content)
  if (isLoading) {
    return (
      <section
        aria-label="Memuat rekomendasi belajar"
        className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Memuat rekomendasi...
          </h3>
        </div>
        <RecommendationSkeleton />
      </section>
    )
  }

  const recs = data?.recommendations ?? []

  // Empty: return null — nothing shown
  if (recs.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Rekomendasi jalur belajar"
      className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
            Rekomendasi untuk Kamu
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {data?.generated_by === 'ai' ? 'Dipersonalisasi oleh AI' : 'Berdasarkan progres kamu'}
          </p>
        </div>
      </div>

      {/* Cards */}
      <AnimatePresence>
        <div className="space-y-3">
          {recs.map((rec, idx) => (
            <RecommendationCard
              key={rec.lesson_id}
              rec={rec}
              index={idx}
              onNavigate={onNavigateToLesson}
            />
          ))}
        </div>
      </AnimatePresence>
    </motion.section>
  )
}
