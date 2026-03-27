// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { EngagementSegment, EngagementSummaryRow } from '../types'
import { useTheme } from '@/src/contexts/ThemeContext'

const SEGMENT_COLORS: Record<EngagementSegment, string> = {
  high: '#10b981',
  medium: '#6366f1',
  low: '#f59e0b',
  at_risk: '#ef4444',
}

const SEGMENT_LABELS: Record<EngagementSegment, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  at_risk: 'Berisiko',
}

interface SegmentPieChartProps {
  data: EngagementSummaryRow[]
}

// ⚡ Perf: stable formatter/label refs — avoids Recharts detecting prop change every render
const pieLabel = ({ name, percent }: { name?: string; percent?: number }) =>
  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
const tooltipFormatter = (value: unknown): [string, string] => [`${value}`, 'Siswa']

export function SegmentPieChart({ data }: SegmentPieChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  if (data.length === 0)
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada data engagement.</p>

  // ⚡ Perf: memoize chart data transform
  const chartData = useMemo(
    () =>
      data.map((row) => ({
        name: SEGMENT_LABELS[row.segment],
        value: row.student_count,
        segment: row.segment,
      })),
    [data]
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={pieLabel}
          labelLine={false}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={SEGMENT_COLORS[entry.segment]} />
          ))}
        </Pie>
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
      </PieChart>
    </ResponsiveContainer>
  )
}
