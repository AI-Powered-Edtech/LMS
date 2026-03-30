import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useTheme } from '@/src/contexts/ThemeContext'

import { FunnelStepResult } from '../types'

const EVENT_LABELS: Record<string, string> = {
  LESSON_STARTED: 'Mulai Pelajaran',
  LESSON_COMPLETED: 'Selesai Pelajaran',
  BLOCK_VIEWED: 'Lihat Konten',
  VIDEO_PROGRESS: 'Tonton Video',
  QUIZ_STARTED: 'Mulai Kuis',
  QUIZ_SUBMITTED: 'Kumpul Kuis',
  ASSIGNMENT_SUBMITTED: 'Kumpul Tugas',
  FILE_DOWNLOADED: 'Unduh File',
}

const STEP_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#ddd6fe',
  '#ede9fe',
  '#f5f3ff',
  '#faf5ff',
]

interface FunnelChartProps {
  data: FunnelStepResult[]
}

// ⚡ Perf: stable formatter refs — avoids Recharts detecting prop change every render
const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
  if (name === 'users') return [`${value}`, 'Pengguna']
  return [`${value}`, `${name}`]
}
const labelFormatter = (v: unknown) => `${v}%`

export function FunnelChart({ data }: FunnelChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // ⚡ Perf: memoize chart data transform + maxUsers computation
  const { chartData, maxUsers } = useMemo(() => {
    const mapped = data.map((step) => ({
      name: EVENT_LABELS[step.event_type] ?? step.event_type,
      users: step.user_count,
      conversion: step.conversion_rate,
      dropOff: step.drop_off_rate,
    }))
    return {
      chartData: mapped,
      maxUsers: Math.max(...mapped.map((d) => d.users), 1),
    }
  }, [data])

  if (data.length === 0) return null

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 16, right: 48, top: 8, bottom: 8 }}
        >
          <XAxis type="number" domain={[0, maxUsers]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
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
          <Bar dataKey="users" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={STEP_COLORS[i % STEP_COLORS.length]} />
            ))}
            <LabelList
              dataKey="conversion"
              position="right"
              formatter={labelFormatter}
              style={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
