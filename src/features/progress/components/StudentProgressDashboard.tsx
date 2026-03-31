import { AlertCircle, BookOpen, CheckCircle2, Lock, Star, Trophy, Zap } from 'lucide-react'

import { EmptyState } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

import type { AchievementData, ModuleStatus } from '../api/studentProgressService'
import { useStudentAchievements, useStudentProgressSummary } from '../queries/progressQueries'
import { ProgressSkeleton } from './ProgressSkeleton'

// --- Sub-components ---

function XPSummaryCard({ xp, completedCount }: { xp: number; completedCount: number }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-yellow-300" />
        <span className="font-semibold text-lg">Perkembangan Belajar</span>
      </div>
      <div className="flex items-baseline gap-4">
        <div>
          <p className="text-3xl font-bold">{xp.toLocaleString('id-ID')}</p>
          <p className="text-indigo-200 text-sm mt-0.5">Total XP</p>
        </div>
        <div className="h-10 w-px bg-indigo-400/50" />
        <div>
          <p className="text-3xl font-bold">{completedCount}</p>
          <p className="text-indigo-200 text-sm mt-0.5">Pelajaran Selesai</p>
        </div>
      </div>
    </div>
  )
}

const moduleStatusConfig: Record<
  ModuleStatus,
  { label: string; icon: typeof CheckCircle2; colorClass: string; bgClass: string }
> = {
  mastered: {
    label: 'Dikuasai',
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
  },
  active: {
    label: 'Aktif',
    icon: BookOpen,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50',
  },
  needs_review: {
    label: 'Perlu Ulang',
    icon: AlertCircle,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
  },
  locked: {
    label: 'Terkunci',
    icon: Lock,
    colorClass: 'text-slate-400 dark:text-slate-500',
    bgClass:
      'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 opacity-70',
  },
}

function ModuleItem({
  title,
  status,
  index,
}: {
  title: string
  status: ModuleStatus
  index: number
}) {
  const config = moduleStatusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-colors',
        config.bgClass
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          status === 'mastered'
            ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300'
            : status === 'active'
              ? 'bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300'
              : status === 'needs_review'
                ? 'bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        )}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            status === 'locked'
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'
          )}
        >
          {title}
        </p>
      </div>
      <div
        className={cn('flex items-center gap-1 text-xs font-medium shrink-0', config.colorClass)}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{config.label}</span>
      </div>
    </div>
  )
}

const ICON_MAP: Record<string, string> = {
  crown: '👑',
  zap: '⚡',
  target: '🎯',
  star: '⭐',
  trophy: '🏆',
  fire: '🔥',
  book: '📚',
  check: '✅',
}

function AchievementBadge({ achievement }: { achievement: AchievementData }) {
  const emoji = ICON_MAP[achievement.icon] ?? '🏅'

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center min-w-[80px] shadow-sm"
      title={achievement.title}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight line-clamp-2">
        {achievement.title}
      </p>
      {achievement.unlockedAt && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          {achievement.unlockedAt.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      )}
    </div>
  )
}

// --- Main component ---

interface StudentProgressDashboardProps {
  /** Override userId — defaults to the currently authenticated user */
  userId?: string
  className?: string
}

export function StudentProgressDashboard({ userId, className }: StudentProgressDashboardProps) {
  const { user } = useAuth()
  const resolvedUserId = userId ?? user?.id ?? ''

  const {
    xp,
    modules,
    completedCount,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useStudentProgressSummary(resolvedUserId)

  const {
    data: achievements,
    isLoading: achievementsLoading,
    isError: achievementsError,
  } = useStudentAchievements(resolvedUserId)

  const isLoading = summaryLoading || achievementsLoading
  const isError = summaryError || achievementsError

  if (isLoading) {
    return <ProgressSkeleton />
  }

  if (isError) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-6 text-center',
          className
        )}
      >
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 dark:text-red-400 mb-2" />
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          Gagal memuat data perkembangan
        </p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">Coba muat ulang halaman.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* XP Summary */}
      <XPSummaryCard xp={xp} completedCount={completedCount} />

      {/* Module List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Modul</h2>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {modules.length} modul
          </span>
        </div>
        <div className="p-4">
          {modules.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="Belum ada modul"
              description="Modul akan muncul setelah kursus tersedia."
            />
          ) : (
            <div className="space-y-2">
              {modules.map((mod, index) => (
                <ModuleItem key={mod.id} title={mod.title} status={mod.status} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pencapaian</h2>
          {achievements && achievements.length > 0 && (
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              {achievements.length} badge
            </span>
          )}
        </div>
        <div className="p-4">
          {!achievements || achievements.length === 0 ? (
            <EmptyState
              icon={<Star className="h-10 w-10" />}
              title="Belum ada pencapaian"
              description="Selesaikan pelajaran dan kuis untuk mendapatkan badge."
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              {achievements.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
