import { BookOpen, CheckCircle, ChevronRight, Clock, Layers } from 'lucide-react'
import { motion } from 'motion/react'

import { cn } from '@/src/utils/cn'

export interface ModuleWithProgress {
  id: string
  title: string
  order: number
  lessonCount: number
  completedLessons: number
  durationMinutes: number
}

interface ModuleListProps {
  modules: ModuleWithProgress[]
  onSelectModule: (moduleId: string) => void
  nextIncompleteModuleId?: string
}

export function ModuleList({ modules, onSelectModule, nextIncompleteModuleId }: ModuleListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.16 }}
    >
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-slate-400" />
        Daftar Modul
      </h2>

      {modules.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Belum ada modul di kursus ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, mi) => {
            const isComplete = mod.lessonCount > 0 && mod.completedLessons >= mod.lessonCount
            const isNext = mod.id === nextIncompleteModuleId
            const percentage =
              mod.lessonCount > 0 ? Math.round((mod.completedLessons / mod.lessonCount) * 100) : 0

            return (
              <motion.button
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + mi * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectModule(mod.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border text-left transition-all duration-200 group',
                  isComplete
                    ? 'bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-50'
                    : isNext
                      ? 'bg-white border-blue-300 shadow-md shadow-blue-100/50 hover:shadow-lg hover:shadow-blue-100/60 ring-1 ring-blue-200/50'
                      : 'bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/40'
                )}
              >
                {/* Module number / check */}
                {isComplete ? (
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold border shadow-sm transition-all',
                      isNext
                        ? 'bg-blue-500 text-white border-blue-500 shadow-blue-500/20'
                        : 'bg-white text-slate-500 border-slate-200 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500'
                    )}
                  >
                    {mod.order}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isNext && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Lanjutkan
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'font-semibold truncate transition-colors text-sm md:text-base',
                      isComplete
                        ? 'text-emerald-800'
                        : isNext
                          ? 'text-blue-800'
                          : 'text-slate-700 group-hover:text-blue-700'
                    )}
                  >
                    {mod.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {mod.lessonCount} pelajaran
                    </span>
                    {mod.durationMinutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mod.durationMinutes} menit
                      </span>
                    )}
                  </div>

                  {/* Mini progress bar */}
                  {mod.lessonCount > 0 && percentage > 0 && !isComplete && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isComplete
                      ? 'text-emerald-400'
                      : isNext
                        ? 'text-blue-400'
                        : 'text-slate-300 group-hover:text-blue-500'
                  )}
                />
              </motion.button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
