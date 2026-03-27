// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EngagementTrendPoint } from '../types'
import { useTheme } from '@/src/contexts/ThemeContext'

interface EngagementTrendProps {
  data: EngagementTrendPoint[]
}

// ⚡ Perf: stable formatter ref — avoids Recharts detecting prop change every render
const tooltipFormatter = (value: unknown) => [`${value}`, 'Skor Rata-rata']

export function EngagementTrend({ data }: EngagementTrendProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-slate-400">Belum ada data tren engagement.</p>
    )

  // ⚡ Perf: memoize Date construction per item — typically 7-30 points
  const formatted = useMemo(
    () =>
      data.map((d) => {
        const date = new Date(d.day)
        return {
          ...d,
          label: `${date.getDate()}/${date.getMonth() + 1}`,
        }
      }),
    [data]
  )

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={%DOPEN% top: 8, right: 8, bottom: 0, left: 0 %DCLOSE%}>
        <defs>
          <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis
          dataKey="label"
          tick={%DOPEN% fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' %DCLOSE%}
          axisLine={%DOPEN% stroke: isDark ? '#334155' : '#e2e8f0' %DCLOSE%}
          tickLine={%DOPEN% stroke: isDark ? '#334155' : '#e2e8f0' %DCLOSE%}
        />
        <YAxis
          domain={[0, 100]}
          tick={%DOPEN% fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' %DCLOSE%}
          axisLine={%DOPEN% stroke: isDark ? '#334155' : '#e2e8f0' %DCLOSE%}
          tickLine={%DOPEN% stroke: isDark ? '#334155' : '#e2e8f0' %DCLOSE%}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={%DOPEN%
            fontSize: 12,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            color: isDark ? '#f1f5f9' : '#0f172a',
          %DCLOSE%}
          labelStyle={%DOPEN% color: isDark ? '#94a3b8' : '#64748b' %DCLOSE%}
        />
        <Area
          type="monotone"
          dataKey="avg_score"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#engGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
