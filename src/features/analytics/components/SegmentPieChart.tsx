<<<<<<< Updated upstream
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { EngagementSegment, EngagementSummaryRow } from '../types'
=======
import { Cell, Pie, PieChart, ResponsiveContainer,Tooltip } from 'recharts'

import { EngagementSegment,EngagementSummaryRow } from '../types'
>>>>>>> Stashed changes

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

export function SegmentPieChart({ data }: SegmentPieChartProps) {
  if (data.length === 0)
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada data engagement.</p>

  const chartData = data.map((row) => ({
    name: SEGMENT_LABELS[row.segment],
    value: row.student_count,
    segment: row.segment,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={SEGMENT_COLORS[entry.segment]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Siswa']} contentStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
