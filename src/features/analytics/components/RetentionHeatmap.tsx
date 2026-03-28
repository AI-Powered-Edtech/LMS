import { useMemo } from 'react'

import { RetentionRow } from '../types'

interface RetentionHeatmapProps {
  data: RetentionRow[]
}

function rateColor(rate: number | null): string {
  if (rate === null) return 'bg-slate-100 dark:bg-slate-800'
  if (rate >= 80) return 'bg-emerald-500'
  if (rate >= 60) return 'bg-emerald-400'
  if (rate >= 40) return 'bg-yellow-400'
  if (rate >= 20) return 'bg-orange-400'
  return 'bg-red-400'
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}`
}

export function RetentionHeatmap({ data }: RetentionHeatmapProps) {
  const maxOffset = 7

  const { cohortWeeks, matrix } = useMemo(() => {
    const weeks = [...new Set(data.map((r) => r.cohort_week))].sort((a, b) => b.localeCompare(a))
    const mat: Record<string, Record<number, RetentionRow>> = {}
    for (const row of data) {
      if (!mat[row.cohort_week]) mat[row.cohort_week] = {}
      mat[row.cohort_week][row.period_offset] = row
    }
    return { cohortWeeks: weeks, matrix: mat }
  }, [data])

  if (cohortWeeks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Belum ada data retensi tersedia.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-slate-500">Kohort</th>
            <th className="px-2 py-1 text-center font-medium text-slate-500">Ukuran</th>
            {Array.from({ length: maxOffset + 1 }, (_, i) => (
              <th key={i} className="px-1 py-1 text-center font-medium text-slate-500">
                Mg {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortWeeks.map((week) => {
            const row0 = matrix[week]?.[0]
            const cohortSize = row0?.cohort_size ?? 0
            return (
              <tr key={week}>
                <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{formatWeek(week)}</td>
                <td className="px-2 py-1 text-center font-medium text-slate-900 dark:text-white">
                  {cohortSize}
                </td>
                {Array.from({ length: maxOffset + 1 }, (_, offset) => {
                  const cell = matrix[week]?.[offset]
                  const rate = cell?.retention_rate ?? (offset === 0 && cohortSize > 0 ? 100 : null)
                  return (
                    <td key={offset} className="px-1 py-1 text-center">
                      <div
                        className={`mx-auto flex h-8 w-14 items-center justify-center rounded text-white text-xs font-medium ${rateColor(rate)}`}
                        title={rate !== null ? `${rate}% retained` : 'N/A'}
                      >
                        {rate !== null ? `${rate}%` : '–'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
