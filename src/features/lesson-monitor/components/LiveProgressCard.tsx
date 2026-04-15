import { BookOpen, Clock, TrendingUp, Users } from 'lucide-react'

import type { LiveProgressCardData } from '../types'

interface LiveProgressCardProps {
  data: LiveProgressCardData
}

export function LiveProgressCard({ data }: LiveProgressCardProps) {
  const completionRate =
    data.totalStudents > 0 ? Math.round((data.completedStudents / data.totalStudents) * 100) : 0

  const progressColor =
    completionRate >= 80
      ? 'text-green-600'
      : completionRate >= 60
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {data.lessonTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.courseName}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          LIVE
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-black ${progressColor}`}>{completionRate}%</div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Selesai
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
            {data.averageProgress}%
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Progress Rata-rata
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selesai</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {data.completedStudents}/{data.totalStudents}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Sedang Mengerjakan
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {data.inProgressStudents}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Belum Mulai
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {data.notStartedStudents}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Waktu Rata-rata
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {Math.round(data.averageTimeSpent)}m
          </span>
        </div>
      </div>
    </div>
  )
}
