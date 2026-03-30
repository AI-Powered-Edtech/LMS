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

import { useTheme } from '@/src/contexts/ThemeContext'

import { EngagementTrendPoint } from '../types'

interface EngagementTrendProps {
  data: EngagementTrendPoint[]
}

// ⚡ Perf: stable formatter ref — avoids Recharts detecting prop change every render
const tooltipFormatter = (value: unknown) => [`${value}`, 'Skor Rata-rata']

export function EngagementTrend({ data }: EngagementTrendProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

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

  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-slate-400">Belum ada data tren engagement.</p>
    )

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis
          dataKey="label"
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
          formatter={tooltipFormatter}
          contentStyle={{
            fontSize: 12,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            color: isDark ? '#f1f5f9' : '#0f172a',
          }}
          labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
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
