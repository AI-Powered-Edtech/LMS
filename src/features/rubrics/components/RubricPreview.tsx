import { ClipboardList } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { Rubric } from '../types'

interface RubricPreviewProps {
  rubric: Rubric
}

export function RubricPreview({ rubric }: RubricPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
          <ClipboardList className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{rubric.title}</h3>
          {rubric.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {rubric.description}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-1">
            {rubric.total_points} poin total
          </span>
        </div>
      </div>

      {/* Criteria Table */}
      {rubric.criteria.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6 italic">
          Belum ada kriteria pada rubrik ini.
        </p>
      ) : (
        <div className="space-y-4">
          {rubric.criteria
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((criterion) => (
              <div
                key={criterion.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Criterion Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                      {criterion.title}
                    </span>
                    {criterion.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {criterion.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg shrink-0 ml-3">
                    {criterion.max_points} poin
                  </span>
                </div>

                {/* Levels */}
                <div
                  className={cn(
                    'grid divide-x divide-slate-100 dark:divide-slate-700',
                    criterion.levels.length > 0
                      ? `grid-cols-${Math.min(criterion.levels.length, 4)}`
                      : 'grid-cols-1'
                  )}
                >
                  {criterion.levels
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((level) => (
                      <div
                        key={level.id}
                        className="p-3 bg-white dark:bg-slate-900/50 text-center min-w-0"
                      >
                        <div className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate">
                          {level.label}
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          {level.points} poin
                        </div>
                        {level.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {level.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
