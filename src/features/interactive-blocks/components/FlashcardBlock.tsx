import { CheckCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

import { useInteractiveProgress } from '../hooks/useInteractiveProgress'
import type { FlashcardData } from '../types'
import { scoreFlashcard } from '../utils/interactiveScoring'

interface FlashcardBlockProps {
  data: FlashcardData
  blockId: string
  lessonId: string
}

export function FlashcardBlock({ data, blockId, lessonId }: FlashcardBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(blockId, lessonId)
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set())

  const cards = useMemo(() => {
    if (!data?.cards) return []
    if (data.shuffleOnLoad) {
      return [...data.cards].sort(() => Math.random() - 0.5)
    }
    return [...data.cards].sort((a, b) => a.order - b.order)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.cards?.length, data?.shuffleOnLoad])

  // Restore progress from DB
  useEffect(() => {
    if (progress?.interaction_data?.flippedIds) {
      const saved = progress.interaction_data.flippedIds as string[]
      setFlippedIds(new Set(saved))
    }
  }, [progress])

  const handleFlip = (cardId: string) => {
    if (isCompleted) return
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }

      const { score, flippedCount, totalCount } = scoreFlashcard(data, next)

      if (flippedCount === totalCount && totalCount > 0) {
        markComplete({ flippedIds: Array.from(next) }, score)
      }

      return next
    })
  }

  const { flippedCount, totalCount } = scoreFlashcard(data, flippedIds)

  if (!cards.length) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
        Belum ada kartu yang ditambahkan.
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          {flippedCount} dari {totalCount} kartu telah dibalik
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            Selesai
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalCount > 0 ? (flippedCount / totalCount) * 100 : 0}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const flipped = isCompleted || flippedIds.has(card.id)
          return (
            <div
              key={card.id}
              className="relative cursor-pointer"
              style={{ perspective: '1000px', height: '160px' }}
              onClick={() => handleFlip(card.id)}
              role="button"
              aria-label={`Kartu: ${card.front}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleFlip(card.id)}
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center p-4 text-center shadow-sm"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {card.front}
                  </p>
                  <span className="absolute bottom-2 right-3 text-xs text-slate-400 dark:text-slate-500">
                    Klik untuk balik
                  </span>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center p-4 text-center shadow-sm"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {isCompleted && (
                    <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-emerald-500" />
                  )}
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    {card.back}
                  </p>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Selamat! Kamu sudah membalik semua kartu.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
