/**
 * QuestBoard — displays all active quests for the current student.
 * Supports filter tabs and shows completion summary.
 * Phase 36A: Learning Quests System
 */

import { Trophy } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import { useActiveQuests } from '../queries/questQueries'
import type { QuestType } from '../types'
import { QUEST_TYPE_LABELS } from '../types'
import { QuestCard } from './QuestCard'

interface QuestBoardProps {
  tenantId: string
}

type FilterTab = 'all' | QuestType

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'daily', label: QUEST_TYPE_LABELS.daily },
  { value: 'weekly', label: QUEST_TYPE_LABELS.weekly },
  { value: 'milestone', label: QUEST_TYPE_LABELS.milestone },
  { value: 'challenge', label: QUEST_TYPE_LABELS.challenge },
]

function QuestSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex gap-3">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="mb-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-6 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export function QuestBoard({ tenantId }: QuestBoardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const { data: quests, isLoading, isError } = useActiveQuests(tenantId)

  const filtered =
    activeFilter === 'all'
      ? (quests ?? [])
      : (quests ?? []).filter((q) => q.quest_type === activeFilter)

  const totalCount = quests?.length ?? 0
  const completedCount = quests?.filter((q) => q.is_completed).length ?? 0

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Misi Pembelajaran
          </h2>
        </div>

        {totalCount > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span>{' '}
            misi selesai minggu ini
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Filter misi berdasarkan tipe"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeFilter === tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              activeFilter === tab.value
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quest grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <QuestSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Gagal memuat misi. Silakan coba lagi.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-600 dark:bg-slate-800/50">
          <Trophy
            className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {activeFilter === 'all'
              ? 'Belum ada misi yang tersedia.'
              : `Tidak ada misi ${QUEST_TYPE_LABELS[activeFilter as QuestType]} saat ini.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quest) => (
            <QuestCard key={quest.quest_id} quest={quest} />
          ))}
        </div>
      )}
    </section>
  )
}
