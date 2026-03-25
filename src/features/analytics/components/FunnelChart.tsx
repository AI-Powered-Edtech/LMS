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

export function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0) return null

  const chartData = data.map((step) => ({
    name: EVENT_LABELS[step.event_type] ?? step.event_type,
    users: step.user_count,
    conversion: step.conversion_rate,
    dropOff: step.drop_off_rate,
  }))

  const maxUsers = Math.max(...chartData.map((d) => d.users), 1)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 16, right: 48, top: 8, bottom: 8 }}
        >
          <XAxis type="number" domain={[0, maxUsers]} hide />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'users') return [value, 'Pengguna']
              return [value, name]
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="users" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={STEP_COLORS[i % STEP_COLORS.length]} />
            ))}
            <LabelList
              dataKey="conversion"
              position="right"
              formatter={(v: unknown) => `${v}%`}
              style={{ fontSize: 11, fill: '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
