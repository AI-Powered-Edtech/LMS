import { Crown, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, EmptyState } from '@/src/components/ui'
import type { LeaderboardEntry } from '@/src/features/gamification'

interface LeaderboardPreviewProps {
  xp: number
  leaderboardList: LeaderboardEntry[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

export function LeaderboardPreview({
  xp,
  leaderboardList,
  loading,
  error,
  onRetry,
}: LeaderboardPreviewProps) {
  const hasData = leaderboardList.length > 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Cuplikan Papan Peringkat
        </h2>
        <Link
          to="/app/student/leaderboard"
          className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Lihat Peringkat
        </Link>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Gagal memuat leaderboard</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs text-red-500 dark:text-red-400 underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      ) : loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : hasData ? (
        <div className="flex flex-col justify-center items-center text-center p-4 sm:p-6 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-slate-900 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner border-4 border-white dark:border-slate-800">
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{xp} XP</h3>
          <div
            role="progressbar"
            aria-valuenow={xp % 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progres: ${xp % 100}%`}
            className="w-full max-w-xs bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2 mt-4"
          >
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${xp % 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Butuh{' '}
            <strong className="text-yellow-600 dark:text-yellow-400">{100 - (xp % 100)} XP</strong>{' '}
            lagi untuk naik peringkat
          </p>
        </div>
      ) : (
        <EmptyState
          icon={<Trophy className="w-10 h-10" />}
          title="Belum ada peringkat"
          description="Gabung ke kelas dan selesaikan aktivitas untuk masuk leaderboard."
        />
      )}
    </Card>
  )
}
