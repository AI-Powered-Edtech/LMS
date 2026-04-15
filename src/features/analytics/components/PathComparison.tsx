import { cn } from '@/utils/cn'

import type { LearningPath } from '../types'

interface Props {
  paths: LearningPath[]
  selectedHashes: [string | null, string | null]
}

export function PathComparison({ paths, selectedHashes }: Props) {
  const [hashA, hashB] = selectedHashes
  const pathA = paths.find((p) => p.path_hash === hashA)
  const pathB = paths.find((p) => p.path_hash === hashB)

  if (!pathA && !pathB) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        Pilih dua jalur dari tab "Alur Belajar" untuk membandingkan.
      </div>
    )
  }

  if (!pathA || !pathB) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        Pilih satu jalur lagi untuk membandingkan.
      </div>
    )
  }

  const maxSteps = Math.max(pathA.path_steps.length, pathB.path_steps.length)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 pr-4 text-left font-medium text-slate-500 dark:text-slate-400 w-8">
              #
            </th>
            <th className="py-2 pr-4 text-left font-medium text-indigo-600 dark:text-indigo-400">
              Jalur A — {pathA.user_count} siswa ({pathA.avg_completion_rate.toFixed(0)}%)
              {pathA.is_optimal && ' ⭐'}
            </th>
            <th className="py-2 text-left font-medium text-purple-600 dark:text-purple-400">
              Jalur B — {pathB.user_count} siswa ({pathB.avg_completion_rate.toFixed(0)}%)
              {pathB.is_optimal && ' ⭐'}
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxSteps }).map((_, i) => {
            const stepA = pathA.path_steps[i]
            const stepB = pathB.path_steps[i]
            const differ = stepA?.lesson_id !== stepB?.lesson_id
            return (
              <tr
                key={i}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800',
                  differ && 'bg-amber-50/50 dark:bg-amber-900/10'
                )}
              >
                <td className="py-2 pr-4 text-slate-400 dark:text-slate-500 font-mono">{i + 1}</td>
                <td className="py-2 pr-4">
                  {stepA ? (
                    <span
                      className={cn(
                        'text-slate-700 dark:text-slate-300',
                        !stepA.is_completed && 'opacity-60'
                      )}
                    >
                      {stepA.lesson_title}
                      {!stepA.is_completed && ' (belum selesai)'}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2">
                  {stepB ? (
                    <span
                      className={cn(
                        'text-slate-700 dark:text-slate-300',
                        !stepB.is_completed && 'opacity-60'
                      )}
                    >
                      {stepB.lesson_title}
                      {!stepB.is_completed && ' (belum selesai)'}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
