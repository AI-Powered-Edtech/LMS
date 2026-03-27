// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { cn } from '@/src/utils/cn'

import type { LearningPath, PathStep } from '../types'

interface Props {
  paths: LearningPath[]
  selectedHash?: string | null
  onSelect?: (hash: string) => void
}

function StepNode({ step, index }: { step: PathStep; index: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[80px] max-w-[100px]">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
          step.is_completed
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        )}
      >
        {index + 1}
      </div>
      <span className="text-center text-[10px] leading-tight text-slate-600 dark:text-slate-400 line-clamp-2">
        {step.lesson_title}
      </span>
      <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            'h-1 rounded-full',
            step.completion_pct >= 80
              ? 'bg-emerald-500'
              : step.completion_pct >= 50
                ? 'bg-amber-500'
                : 'bg-red-400'
          )}
          style={%DOPEN% width: `${step.completion_pct}%` %DCLOSE%}
        />
      </div>
    </div>
  )
}

export function PathFlowDiagram({ paths, selectedHash, onSelect }: Props) {
  if (paths.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
        Belum ada data jalur belajar. Data dihitung setiap minggu.
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-x-auto">
      {paths.map((path) => (
        <button
          key={path.path_hash}
          onClick={() => onSelect?.(path.path_hash)}
          className={cn(
            'flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors',
            'hover:bg-slate-50 dark:hover:bg-slate-800/50',
            selectedHash === path.path_hash
              ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-900/20'
              : path.is_optimal
                ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
                : 'border-slate-200 dark:border-slate-700'
          )}
        >
          {/* Meta */}
          <div className="flex min-w-[90px] flex-col gap-1 pt-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {path.user_count} siswa
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {path.avg_completion_rate.toFixed(0)}% selesai
            </span>
            {path.is_optimal && (
              <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Optimal
              </span>
            )}
          </div>

          {/* Steps */}
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {path.path_steps.slice(0, 8).map((step, i) => (
              <div key={step.lesson_id} className="flex items-center">
                <StepNode step={step} index={i} />
                {i < Math.min(path.path_steps.length - 1, 7) && (
                  <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>
                )}
              </div>
            ))}
            {path.path_steps.length > 8 && (
              <span className="ml-1 self-center text-xs text-slate-400">
                +{path.path_steps.length - 8}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
