import { CheckCircle, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { useInteractiveProgress } from '../hooks/useInteractiveProgress'
import type { HotspotData, HotspotRegion } from '../types'

interface HotspotBlockProps {
  data: HotspotData
  blockId: string
  lessonId: string
}

export function HotspotBlock({ data, blockId, lessonId }: HotspotBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(blockId, lessonId)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [activeRegion, setActiveRegion] = useState<HotspotRegion | null>(null)

  useEffect(() => {
    if (progress?.interaction_data?.revealedIds) {
      setRevealedIds(new Set(progress.interaction_data.revealedIds as string[]))
    }
  }, [progress])

  const handleReveal = (region: HotspotRegion) => {
    if (data.revealMode === 'click') {
      setActiveRegion((prev) => (prev?.id === region.id ? null : region))
    }
    setRevealedIds((prev) => {
      const next = new Set(prev)
      next.add(region.id)

      if (next.size === (data.regions?.length ?? 0) && !isCompleted) {
        markComplete({ revealedIds: Array.from(next) }, 100)
      }

      return next
    })
  }

  const handleHover = (region: HotspotRegion | null) => {
    if (data.revealMode !== 'hover') return
    setActiveRegion(region)
    if (region) {
      setRevealedIds((prev) => {
        const next = new Set(prev)
        next.add(region.id)
        if (next.size === (data.regions?.length ?? 0) && !isCompleted) {
          markComplete({ revealedIds: Array.from(next) }, 100)
        }
        return next
      })
    }
  }

  const totalRegions = data?.regions?.length ?? 0
  const revealedCount = revealedIds.size

  if (!data?.imageUrl) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
        URL gambar belum diatur.
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          {revealedCount} dari {totalRegions} poin informasi ditemukan
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            Selesai
          </span>
        )}
      </div>

      {/* Image container */}
      <div className="relative inline-block w-full select-none rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <img src={data.imageUrl} alt="Hotspot" className="w-full h-auto block" draggable={false} />

        {/* Hotspot regions */}
        {(data.regions ?? []).map((region) => {
          const revealed = isCompleted || revealedIds.has(region.id)
          return (
            <button
              key={region.id}
              className={`absolute transition-all rounded-sm border-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                revealed
                  ? 'border-emerald-400 bg-emerald-400/20 dark:bg-emerald-400/10'
                  : 'border-indigo-400 bg-indigo-400/20 dark:bg-indigo-400/10 hover:bg-indigo-400/30 animate-pulse'
              }`}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
                cursor: data.revealMode === 'click' ? 'pointer' : 'default',
              }}
              onClick={() => data.revealMode === 'click' && handleReveal(region)}
              onMouseEnter={() => handleHover(region)}
              onMouseLeave={() => handleHover(null)}
              aria-label={`Hotspot: ${region.label}`}
            >
              {revealed && (
                <Info className="absolute top-1 right-1 w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          )
        })}

        {/* Tooltip popup */}
        <AnimatePresence>
          {activeRegion && (
            <motion.div
              key={activeRegion.id}
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-3"
              style={{
                left: `${Math.min(activeRegion.x + activeRegion.width, 70)}%`,
                top: `${activeRegion.y}%`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {activeRegion.label}
                </p>
                {data.revealMode === 'click' && (
                  <button
                    onClick={() => setActiveRegion(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {activeRegion.content && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeRegion.content}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Semua area telah dieksplorasi!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
