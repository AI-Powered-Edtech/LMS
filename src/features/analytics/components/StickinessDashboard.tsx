import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { RetentionRow } from '../types'
import { useTheme } from '@/src/contexts/ThemeContext'

interface StickinessDashboardProps {
  data: RetentionRow[]
}

export function StickinessDashboard({ data }: StickinessDashboardProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const metrics = useMemo(() => {
    const cohortWeeks = [...new Set(data.map((r) => r.cohort_week))]

    const week1Rates = cohortWeeks
      .map((w) => data.find((r) => r.cohort_week === w && r.period_offset === 1)?.retention_rate)
      .filter((r): r is number => r !== null && r !== undefined)

    const week4Rates = cohortWeeks
      .map((w) => data.find((r) => r.cohort_week === w && r.period_offset === 4)?.retention_rate)
      .filter((r): r is number => r !== null && r !== undefined)

    const avgWeek1 =
      week1Rates.length > 0
        ? Math.round(week1Rates.reduce((s, r) => s + r, 0) / week1Rates.length)
        : null
    const avgWeek4 =
      week4Rates.length > 0
        ? Math.round(week4Rates.reduce((s, r) => s + r, 0) / week4Rates.length)
        : null

    // Trend: week 1 retention by cohort week (sorted asc)
    const trendData = cohortWeeks
      .sort()
      .map((w) => {
        const r = data.find((row) => row.cohort_week === w && row.period_offset === 1)
        const d = new Date(w)
        return {
          week: `${d.getDate()}/${d.getMonth() + 1}`,
          rate: r?.retention_rate ?? null,
        }
      })
      .filter((d) => d.rate !== null)

    return { avgWeek1, avgWeek4, trendData }
  }, [data])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500">Retensi Minggu 1</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {metrics.avgWeek1 !== null ? `${metrics.avgWeek1}%` : '–'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500">Retensi Minggu 4</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {metrics.avgWeek4 !== null ? `${metrics.avgWeek4}%` : '–'}
          </p>
        </div>
      </div>

      {metrics.trendData.length >= 2 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Tren Retensi Minggu 1</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={metrics.trendData}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                tickLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                tickLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
              />
              <Tooltip
                formatter={(v: unknown) => [`${v}%`, 'Retensi']}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '0.5rem',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
                labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
