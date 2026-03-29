import { useVirtualizer } from '@tanstack/react-virtual'
import { Calendar, Filter, Flame, TrendingUp, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { EmptyState, OptimizedImage, SkeletonCard } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { rankLeaderboard } from '@/src/utils/clientCompute'
import { cn } from '@/src/utils/cn'

import { useLeaderboardV2 } from '../queries/gamificationQueries'
import type { LeaderboardPeriod, LeaderboardSortBy, LeaderboardV2Entry } from '../types'
import { LevelBadge } from './LevelBadge'

const PERIODS: { value: LeaderboardPeriod; label: string; icon: typeof TrendingUp }[] = [
  { value: 'weekly', label: 'Mingguan', icon: Calendar },
  { value: 'monthly', label: 'Bulanan', icon: Calendar },
  { value: 'all_time', label: 'Sepanjang Waktu', icon: TrendingUp },
]

const SORT_OPTIONS: { value: LeaderboardSortBy; label: string }[] = [
  { value: 'xp', label: 'XP' },
  { value: 'streak', label: 'Streak' },
]

const MEDALS = ['🥇', '🥈', '🥉']

const rankColors: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white',
  2: 'bg-gradient-to-br from-slate-300 to-slate-400 text-white',
  3: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white',
}
const rankEmojis: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const rankRowColors: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800/50',
  2: 'bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 border border-slate-200 dark:border-slate-700/50',
  3: 'bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-900/20 border border-orange-200/50 dark:border-orange-800/30',
}

export function LeaderboardV2() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time')
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('xp')
  const currentUserRef = useRef<HTMLDivElement>(null)

  const { data: entries, isLoading } = useLeaderboardV2({ sortBy, period })

  // Client-side re-sort for instant UI response when user switches sort tabs
  // No new API call needed — uses cached data from useLeaderboardV2
  const rankedEntries = useMemo(() => {
    if (!entries) return []
    return rankLeaderboard(
      entries.map((e) => ({ ...e, id: e.user_id, total_xp: e.value, streak_current: e.streak })),
      sortBy
    )
  }, [entries, sortBy])

  const list = rankedEntries

  const isCurrentUser = (e: LeaderboardV2Entry) => e.user_id === user?.id
  const currentUserEntry = list.find(isCurrentUser)

  const parentRef = useRef<HTMLDivElement>(null)
  const listTail = list.slice(3)

  const rowVirtualizer = useVirtualizer({
    count: listTail.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
  })

  useEffect(() => {
    if (currentUserEntry && currentUserRef.current) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [currentUserEntry])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full w-7 h-7 shrink-0" />
              <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full w-9 h-9 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-3 w-32" />
                <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-2.5 w-20" />
              </div>
              <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
          <Trophy className="w-7 h-7 text-yellow-500 fill-yellow-500" />
          Papan Peringkat
        </h1>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Period tabs */}
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                period === p.value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <Filter className="h-3.5 w-3.5 text-slate-400 ml-2" />
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                sortBy === s.value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-12 h-12" />}
          title="Belum ada peringkat"
          description="Kerjakan pelajaran dan kuis untuk mendapatkan XP!"
        />
      ) : (
        <>
          {/* Podium (top 3) */}
          <div className="overflow-x-auto">
            <div className="flex justify-center items-end gap-2 md:gap-6 h-56 min-w-[280px]">
              {/* 2nd */}
              {list[1] && (
                <PodiumCard
                  entry={list[1]}
                  rank={2}
                  isCurrent={isCurrentUser(list[1])}
                  sortBy={sortBy}
                />
              )}
              {/* 1st */}
              {list[0] && (
                <PodiumCard
                  entry={list[0]}
                  rank={1}
                  isCurrent={isCurrentUser(list[0])}
                  sortBy={sortBy}
                />
              )}
              {/* 3rd */}
              {list[2] && (
                <PodiumCard
                  entry={list[2]}
                  rank={3}
                  isCurrent={isCurrentUser(list[2])}
                  sortBy={sortBy}
                />
              )}
            </div>
          </div>

          {/* Rest of list */}
          {listTail.length > 0 && (
            <div
              ref={parentRef}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 md:p-4 max-h-[400px] overflow-y-auto"
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vRow) => {
                  const entry = listTail[vRow.index]
                  return (
                    <motion.div
                      ref={isCurrentUser(entry) ? currentUserRef : null}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: vRow.index * 0.03 }}
                      key={entry.user_id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vRow.start}px)`,
                      }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-colors',
                        isCurrentUser(entry)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                          : entry.rank <= 3 && rankRowColors[entry.rank]
                            ? rankRowColors[entry.rank]
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      {entry.rank <= 3 && rankColors[entry.rank] && !isCurrentUser(entry) ? (
                        <span
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                            rankColors[entry.rank]
                          )}
                        >
                          {rankEmojis[entry.rank]}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'w-7 text-center font-bold text-sm',
                            isCurrentUser(entry)
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400'
                          )}
                        >
                          {entry.rank}
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <OptimizedImage
                          src={
                            entry.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.student_name}`
                          }
                          alt={entry.student_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-bold text-sm truncate',
                            isCurrentUser(entry)
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-800 dark:text-slate-200'
                          )}
                        >
                          {entry.student_name}
                          {isCurrentUser(entry) && (
                            <span className="ml-2 inline-block bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              Anda
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <LevelBadge level={entry.level} size="sm" />
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                            {entry.streak}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-bold text-sm shrink-0',
                          isCurrentUser(entry)
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-yellow-600 dark:text-yellow-500'
                        )}
                      >
                        {entry.value} {sortBy === 'streak' ? 'hari' : 'XP'}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PodiumCard({
  entry,
  rank,
  isCurrent,
  sortBy,
}: {
  entry: LeaderboardV2Entry
  rank: 1 | 2 | 3
  isCurrent: boolean
  sortBy: LeaderboardSortBy
}) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }
  const sizes = { 1: 'w-28 md:w-36', 2: 'w-22 md:w-28', 3: 'w-22 md:w-28' }
  const avatarSize = rank === 1 ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12 md:w-16 md:h-16'
  const podiumGradient = isCurrent
    ? 'bg-gradient-to-t from-blue-200 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/20 border-blue-400'
    : rank === 1
      ? 'bg-gradient-to-t from-yellow-200 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-900/10 border-yellow-400'
      : rank === 2
        ? 'bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/30 border-slate-300'
        : 'bg-gradient-to-t from-orange-200 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/10 border-orange-300'

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: rank === 1 ? 0 : rank * 0.15 }}
      className={cn('flex flex-col items-center', sizes[rank], rank === 1 && 'z-10')}
    >
      {isCurrent && (
        <span className="mb-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
          Anda
        </span>
      )}
      <div className="relative mb-3">
        <div
          className={cn(
            'rounded-full overflow-hidden border-4',
            avatarSize,
            isCurrent
              ? 'border-blue-500 ring-4 ring-blue-200 dark:ring-blue-800/50'
              : rank === 1
                ? 'border-yellow-400'
                : rank === 2
                  ? 'border-slate-300'
                  : 'border-orange-300'
          )}
        >
          <OptimizedImage
            src={
              entry.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.student_name}`
            }
            alt={entry.student_name}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-lg">
          {MEDALS[rank - 1]}
        </span>
      </div>
      <p
        className={cn(
          'font-bold text-xs md:text-sm truncate w-full text-center',
          isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
        )}
      >
        {entry.student_name}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <LevelBadge level={entry.level} size="sm" />
        <span className="text-xs font-bold text-yellow-600">
          {entry.value} {sortBy === 'streak' ? '🔥' : 'XP'}
        </span>
      </div>
      <div className={cn('w-full rounded-t-2xl border-t-4 mt-2', heights[rank], podiumGradient)} />
    </motion.div>
  )
}
