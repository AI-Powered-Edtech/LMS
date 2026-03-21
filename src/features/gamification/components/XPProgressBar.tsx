import { motion } from 'motion/react'
import { Star, Zap } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useStudentXPProfile } from '../queries/gamificationQueries'
import { getLevelTier } from './LevelBadge'
import { computeXPToNextLevel } from '@/src/utils/clientCompute'

interface XPProgressBarProps {
  compact?: boolean
}

export function XPProgressBar({ compact }: XPProgressBarProps) {
  const { data: profile } = useStudentXPProfile()

  const totalXP = profile?.total_xp ?? 0
  const level = profile?.level ?? 1

  // Use clientCompute for progress bar math (authoritative level stays server-sourced)
  const { current: xpInLevel, needed: xpNeeded, pct: progressPct } = computeXPToNextLevel(totalXP)

  const { label, color } = getLevelTier(level)
  const nextLevel = level + 1
  const xpRemaining = Math.max(0, xpNeeded - xpInLevel)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm',
            color
          )}
        >
          Lv {level}
        </span>
        <div className="relative w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500">
          {totalXP.toLocaleString('id-ID')} XP
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top row: level info + XP fraction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Level {level}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">— {label}</span>
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
          {xpInLevel.toLocaleString('id-ID')} / {xpNeeded.toLocaleString('id-ID')} XP
        </span>
      </div>

      {/* Progress bar with gradient fill */}
      <div className="relative w-full h-4 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* Shine overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        {/* Percentage label inside bar (only if enough space) */}
        {progressPct >= 15 && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-sm">
            {progressPct}%
          </span>
        )}
      </div>

      {/* Bottom row: level labels on each end */}
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-white shadow-sm',
            color
          )}
        >
          Lv {level}
        </span>

        {level < 10 ? (
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            Butuh{' '}
            <strong className="text-yellow-600 dark:text-yellow-400 mx-1">
              {xpRemaining.toLocaleString('id-ID')} XP
            </strong>
            lagi
          </span>
        ) : (
          <span className="text-yellow-600 dark:text-yellow-400 font-bold">Level Maks!</span>
        )}

        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-white shadow-sm opacity-60',
            getLevelTier(nextLevel).color
          )}
        >
          Lv {nextLevel}
        </span>
      </div>
    </div>
  )
}
