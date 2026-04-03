/**
 * QuestCard — displays a single quest with progress, XP reward, and type chip.
 * Phase 36A: Learning Quests System
 */

import { CheckCircle2, Zap } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { Quest } from '../types'
import { QUEST_TYPE_COLORS, QUEST_TYPE_LABELS } from '../types'

interface QuestCardProps {
  quest: Quest
  className?: string
}

export function QuestCard({ quest, className }: QuestCardProps) {
  const colors = QUEST_TYPE_COLORS[quest.quest_type]
  const progressPct = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-2xl border p-4 transition-shadow',
        'bg-white dark:bg-slate-800',
        'border-slate-200 dark:border-slate-700',
        'shadow-sm hover:shadow-md',
        quest.is_completed && 'ring-2 ring-emerald-400 dark:ring-emerald-500',
        className
      )}
    >
      {/* Completed overlay badge */}
      {quest.is_completed && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Selesai!
        </div>
      )}

      {/* Header: icon + title + type chip */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
            colors.bg,
            colors.darkBg,
            quest.is_completed && 'opacity-70'
          )}
          aria-hidden="true"
        >
          {quest.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {/* Quest type chip */}
            <span
              className={cn(
                'inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                colors.bg,
                colors.text,
                colors.border,
                colors.darkBg,
                colors.darkText
              )}
            >
              {QUEST_TYPE_LABELS[quest.quest_type]}
            </span>
          </div>

          <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
            {quest.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      {quest.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {quest.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {quest.progress} / {quest.target}
          </span>
          <span
            className={cn(
              'font-semibold',
              quest.is_completed
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-300'
            )}
          >
            {Math.round(progressPct)}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuenow={quest.progress}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-label={`Progress misi: ${quest.progress} dari ${quest.target}`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              quest.is_completed
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : cn(
                    quest.quest_type === 'daily' && 'bg-blue-500',
                    quest.quest_type === 'weekly' && 'bg-purple-500',
                    quest.quest_type === 'milestone' && 'bg-amber-500',
                    quest.quest_type === 'challenge' && 'bg-red-500'
                  )
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* XP reward badge */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
            quest.is_completed
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          )}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />+{quest.xp_reward} XP
        </span>
      </div>
    </div>
  )
}
